import { getDashboard } from '@/db/repository';
import { ensureDatabase, rawDb } from '@/db/runtime';
import { apiError, getActor } from '@/lib/authz';
import { compactRecords, compactText } from '@/lib/ai-context';
import { getCareerRoleSelectionByLabel, getNextRole } from '@/lib/career-roles';

type Guidance = { answer: string; suggestedActions: string[]; missingInformation: string[]; humanValidationRequired: true };

const instructions = `Eres una guía de desarrollo de carrera. Tu función es interpretar el análisis del perfil, explicar lo que necesita el rol y sugerir formas concretas de desarrollo.
Nunca evalúes el valor de una persona, nunca decidas promociones, categorías, compensación, desempeño o elegibilidad y nunca afirmes que un criterio está cumplido.
Trata el tramo Growth Mindset como una referencia orientativa generada a partir de declaraciones de la persona. Diferencia hechos declarados, inferencias de IA y validaciones del líder.
Usa solo el contexto entregado. Si falta evidencia, dilo. No infieras atributos sensibles. Toda propuesta debe presentarse como una sugerencia de orientación, no como una representación automática del caso real, y quedar explícitamente sujeta a contraste directo con el líder. Cualquier validación o cambio oficial requiere además la aprobación de RR. HH.
Responde en español claro, respetuoso y accionable.`;

const outputBrevity = 'Responde de forma concisa: hasta 180 palabras en answer y hasta 3 elementos por lista.';

const responseSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    answer: { type:'string' },
    suggestedActions: { type:'array', items:{type:'string'}, maxItems:3 },
    missingInformation: { type:'array', items:{type:'string'}, maxItems:3 },
    humanValidationRequired: { type:'boolean', const:true },
  },
  required: ['answer','suggestedActions','missingInformation','humanValidationRequired'],
};

function localFallback(question: string): Guidance {
  return {
    answer: `Para trabajar “${question.slice(0,80)}”, conecta una tarea real con lo que necesita tu perfil: explica el contexto, qué decisión tomaste, cuánto apoyo requeriste y qué resultado obtuviste. Esta es una sugerencia para preparar la conversación, no una evaluación automática de tu caso; contrástala con tu líder y con RR. HH. antes de cualquier validación oficial.`,
    suggestedActions: ['Documentar una situación, la decisión tomada y su resultado observable.','Comparar ese ejemplo con las responsabilidades del rol actual.','Solicitar feedback específico a una persona que haya observado el trabajo.'],
    missingInformation: ['Feedback reciente del líder','Resultado observable asociado a la evidencia'],
    humanValidationRequired: true,
  };
}

function extractOutputText(payload: unknown): string {
  const candidate = payload as { output?: Array<{type?:string;content?:Array<{type?:string;text?:string}>}> };
  for (const item of candidate.output ?? []) for (const content of item.content ?? []) if (content.type === 'output_text' && content.text) return content.text;
  throw new Error('El modelo no devolvió texto estructurado.');
}

export async function POST(request: Request) {
  try {
    const actor = await getActor(request); let body: { question?:string };
    try { body = await request.json() as { question?:string }; }
    catch { return Response.json({ error:'La solicitud debe contener JSON válido.' }, { status:400 }); }
    const question = String(body.question ?? '').trim();
    if (question.length < 3 || question.length > 800) return Response.json({error:'La pregunta debe tener entre 3 y 800 caracteres.'},{status:400});
    const dashboard = await getDashboard(actor.id); const apiKey = process.env.OPENAI_API_KEY; const model = process.env.OPENAI_MODEL || 'gpt-5.6-terra';
    const promptCache = model.startsWith('gpt-5.6') ? { prompt_cache_key:'career-guide-v1', prompt_cache_options:{ ttl:'30m' } } : {};
    let guidance: Guidance;
    if (!apiKey && process.env.NODE_ENV === 'development') guidance = localFallback(question);
    else {
      if (!apiKey) return Response.json({error:'El servicio de orientación no está configurado.'},{status:503});
      const profile = dashboard.profile as { currentJobRole?:string; workContext?:string; developmentGoal?:string } | null;
      const roleSelection = getCareerRoleSelectionByLabel(profile?.currentJobRole);
      const nextRole = roleSelection ? getNextRole(roleSelection.role.id)?.role : undefined;
      let latestAnalysis: unknown = null;
      try { latestAnalysis = dashboard.profileAnalysis ? JSON.parse(dashboard.profileAnalysis.analysisJson) : null; } catch { latestAnalysis = null; }
      const minimalContext = {
        currentJobRole: profile?.currentJobRole,
        workContext: compactText(profile?.workContext, 320),
        developmentGoal: compactText(profile?.developmentGoal, 180),
        currentRoleNeeds: roleSelection?.role.profileNeeds ?? [],
        currentRoleWaysOfWorking: roleSelection?.role.waysOfWorking ?? [],
        nextRole: nextRole ? { label:nextRole.label, needs:nextRole.profileNeeds ?? [] } : null,
        latestOrientativeAnalysis: latestAnalysis,
        workActivities: compactRecords(dashboard.workActivities as Array<{title:string;description:string;status:string}>, 5)
          .map(({ title, description, status }) => ({ title:compactText(title, 100), detail:compactText(description, 260), status })),
        evidence: compactRecords(dashboard.evidence as Array<{title:string;evidenceType:string;validationStatus:string}>, 4)
          .map(({ title, evidenceType, validationStatus }) => ({ title:compactText(title, 100), evidenceType, validationStatus })),
      };
      const response = await fetch('https://api.openai.com/v1/responses', {
        method:'POST', headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
        body:JSON.stringify({model,store:false,reasoning:{effort:'low'},max_output_tokens:900,...promptCache,instructions:instructions + '\n' + outputBrevity,input:[{role:'user',content:[{type:'input_text',text:JSON.stringify({question,context:minimalContext})}]}],text:{verbosity:'low',format:{type:'json_schema',name:'career_guidance',strict:true,schema:responseSchema}}}),
      });
      if(!response.ok) throw new Error(`OpenAI Responses API devolvió ${response.status}`);
      guidance = JSON.parse(extractOutputText(await response.json())) as Guidance;
    }
    await ensureDatabase();
    await rawDb().prepare(`INSERT INTO ai_guidance (id, user_id, prompt_category, response_summary, model, status, created_at) VALUES (?, ?, 'career_guidance', ?, ?, 'draft', ?)`).bind(crypto.randomUUID(),actor.id,guidance.answer.slice(0,500),apiKey?model:'local-demo',Date.now()).run();
    return Response.json(guidance);
  } catch(error){ return apiError(error); }
}
