import { getDashboard } from '@/db/repository';
import { ensureDatabase, rawDb } from '@/db/runtime';
import { apiError, getActor, requireRole } from '@/lib/authz';
import { compactRecords, compactText } from '@/lib/ai-context';
import { CAREER_MODEL_VERSION, getCareerRoleSelectionByLabel, getNextRole } from '@/lib/career-roles';
import { feedbackCategoryLabels, type FeedbackCategory } from '@/lib/feedback-categories';

type ProfileOrientation = {
  maturityBand: 'T1' | 'T2' | 'T3';
  maturityConfidence: 'low' | 'medium' | 'high';
  maturitySummary: string;
  workSummary: string;
  waysOfWorking: string[];
  profileNeeds: string[];
  developmentGuidance: string[];
  missingInformation: string[];
  humanValidationRequired: true;
};

const instructions = `Eres una guía de desarrollo de carrera. Generas un borrador de orientación para que una persona y su líder conversen sobre desarrollo.
Tu tarea específica es analizar qué hace la persona y cómo parece trabajar a partir de su perfil, tareas y evidencias declaradas. Contrasta esas señales con lo que necesita su rol actual y usa el siguiente rol solo como referencia de desarrollo.
Debes proponer un tramo orientativo Growth Mindset siguiendo estrictamente esta rúbrica:
- T1: está adquiriendo autonomía; trabaja principalmente dentro de un alcance o plan definido, necesita feedback frecuente y está desarrollando nuevos conocimientos para realizar el rol con éxito.
- T2: muestra madurez y autonomía en el rol; organiza y resuelve su trabajo con criterio, perfecciona su rol y está aclarando qué camino o desafíos quiere recorrer.
- T3: además de autonomía sostenida, ha elegido de forma explícita su camino o siguiente desafío y aporta evidencias de preparación para asumir retos alineados con él. No asignes T3 si esa claridad y preparación no están descritas.
Si la información es insuficiente, selecciona el tramo provisional más cercano con confianza baja. Nunca interpretes la ausencia de evidencia como falta de capacidad.
No evalúas el valor, desempeño o potencial de la persona ni tomas decisiones de promoción, categoría, compensación o elegibilidad. La orientación es una referencia conversacional, no una decisión laboral.
El campo técnico "maturityBand" se usa solo internamente. En todos los campos textuales dirigidos a personas, no escribas T1, T2 ni T3; usa en su lugar frases cualitativas completas sobre autonomía y preparación.
El campo "rolActual" es el cargo en el que la empresa posicionó a la persona. El campo "siguienteRol" es la referencia del modelo para el siguiente escalón; úsala solo como orientación de desarrollo.
Usa exclusivamente el contexto entregado. Relaciona tareas y evidencias solo con los criterios explicitamente incluidos; si no hay suficiente respaldo, dilo como información faltante. Las tareas y evidencias son declaraciones de la persona, no hechos validados. Una evidencia o tarea con estado de revisión "validated" fue revisada por una persona; las que estén pendientes, rechazadas o con ajustes solicitados no confirman un hecho ni deben usarse como prueba suficiente.
No infieras atributos sensibles. Distingue hechos declarados de inferencias. Presenta toda conclusión como una sugerencia de orientación que puede no reflejar por completo el caso real. Debe contrastarse directamente con el líder y cualquier validación o cambio oficial requiere la aprobación de People. Responde en español claro y toda salida debe requerir validación humana.`;
const privateReviewInstruction = `Si el contexto incluye "observacionPrivadaDeRevision" o "feedbackPrivadoLiderSobreTareas", úsalo únicamente como contexto interno para priorizar qué señales conviene contrastar. Nunca cites, parafrasees, menciones ni reveles la observación, el feedback ni su existencia en ningún campo de salida. No uses información privada por sí sola como evidencia de desempeño, potencial o una decisión laboral; si no coincide con información declarada, señala de forma neutral la información que falta por contrastar.`;

const outputBrevity = 'Sé conciso: maturitySummary debe tener entre 35 y 65 palabras, no debe incluir códigos como T1, T2 o T3 y debe explicar por qué la orientación se relaciona con las acciones descritas; workSummary hasta 90 palabras; hasta 3 elementos breves por lista y hasta 2 en missingInformation.';

const responseSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    maturityBand: { type: 'string', enum: ['T1', 'T2', 'T3'] },
    maturityConfidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    maturitySummary: { type: 'string' },
    workSummary: { type: 'string' },
    waysOfWorking: { type: 'array', items: { type: 'string' }, maxItems: 3 },
    profileNeeds: { type: 'array', items: { type: 'string' }, maxItems: 3 },
    developmentGuidance: { type: 'array', items: { type: 'string' }, maxItems: 3 },
    missingInformation: { type: 'array', items: { type: 'string' }, maxItems: 2 },
    humanValidationRequired: { type: 'boolean', const: true },
  },
  required: ['maturityBand', 'maturityConfidence', 'maturitySummary', 'workSummary', 'waysOfWorking', 'profileNeeds', 'developmentGuidance', 'missingInformation', 'humanValidationRequired'],
};

function extractOutputText(payload: unknown): string {
  const response = payload as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && content.text) return content.text;
    }
  }
  throw new Error('El modelo no devolvió un borrador estructurado.');
}

function localFallback(
  currentRole: string,
  nextRole: string | undefined,
  validatedCompletedTasks: number,
  taskCount: number,
  evidenceCount: number,
  roleNeeds: string[],
): ProfileOrientation {
  const nextLabel = nextRole ?? 'el siguiente rol de referencia';
  const maturityBand = validatedCompletedTasks > 0 ? 'T2' : 'T1';
  return {
    maturityBand,
    maturityConfidence: 'low',
    maturitySummary: maturityBand === 'T2'
      ? `Según las acciones que describes, muestras autonomía y madurez al ejecutar trabajo propio del rol de ${currentRole}. Falta contrastar con tu líder la consistencia de esa autonomía y la claridad del desafío que quieres asumir.`
      : `Según las acciones disponibles, estás desarrollando autonomía en el rol de ${currentRole}. Esta lectura tiene confianza baja porque todavía faltan ejemplos de resultados y de decisiones que hayas gestionado con autonomía.`,
    workSummary: `Tu perfil registra ${taskCount} tarea${taskCount === 1 ? '' : 's'} y ${evidenceCount} evidencia${evidenceCount === 1 ? '' : 's'}. Estas declaraciones permiten conversar sobre tu aporte actual y preparar el desarrollo hacia ${nextLabel}, sin confirmar desempeño ni promoción.`,
    waysOfWorking: [
      'Aplicas conocimientos del rol en tareas concretas y haces visible el contexto de tu aporte.',
      'Registras avances que pueden convertirse en ejemplos observables para conversar con tu líder.',
    ],
    profileNeeds: roleNeeds.slice(0, 3),
    developmentGuidance: [
      `Explicita qué decisiones tomaste con autonomía y qué apoyo necesitaste en las tareas vinculadas a ${currentRole}.`,
      `Compara tus resultados con las necesidades del rol actual antes de usar ${nextLabel} como referencia.`,
      'Solicita feedback sobre una situación concreta y contrasta esta orientación con tu líder.',
    ],
    missingInformation: [
      'Resultados observables y decisiones tomadas de manera autónoma.',
      'Feedback reciente de personas que hayan observado el trabajo.',
    ],
    humanValidationRequired: true,
  };
}

export async function POST(request: Request) {
  try {
    const actor = await getActor(request);
    requireRole(actor, ['collaborator']);

    // El servidor puede acceder al contexto privado de revisión; el dashboard del colaborador nunca lo recibe.
    const dashboard = await getDashboard(actor.id, true);
    const profile = dashboard.profile as {
      currentJobRole: string | null;
      workContext: string | null;
      developmentGoal: string | null;
      reviewerPrivateObservation?: string | null;
      profileCompleted: boolean;
      officialCategory: string | null;
    } | null;
    const workActivities = dashboard.workActivities as Array<{ title: string; description: string; status: string; validationStatus: string; privateFeedback?: Array<{ category:FeedbackCategory; content:string; createdAt:number }> }>;
    const evidence = dashboard.evidence as Array<{ title: string; description: string; evidenceType: string; validationStatus: string }>;

    if (!profile?.profileCompleted) {
      return Response.json({ error: 'Completa primero tu perfil para solicitar orientación.' }, { status: 400 });
    }
    if (workActivities.length === 0 && evidence.length === 0) {
      return Response.json({ error: 'Registra al menos una tarea o evidencia para solicitar orientación.' }, { status: 400 });
    }

    // Resolver rol actual y siguiente escalón desde el modelo de carrera
    const currentRoleSelection = getCareerRoleSelectionByLabel(profile.currentJobRole);
    const currentRoleLabel = currentRoleSelection?.role.label ?? profile.currentJobRole ?? 'Rol no identificado';
    const currentRoleId = currentRoleSelection?.role.id ?? '';
    const nextRoleInfo = currentRoleId ? getNextRole(currentRoleId) : undefined;
    const nextRoleLabel = nextRoleInfo?.role.label ?? undefined;

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-5.6-terra';
    const promptCache = model.startsWith('gpt-5.6')
      ? { prompt_cache_key: 'career-profile-orientation-v2', prompt_cache_options: { ttl: '30m' } }
      : {};

    let orientation: ProfileOrientation;

    if (!apiKey && process.env.NODE_ENV === 'development') {
      orientation = localFallback(
        currentRoleLabel,
        nextRoleLabel,
        workActivities.filter((item) => item.status === 'completed' && item.validationStatus === 'validated').length,
        workActivities.length,
        evidence.length,
        currentRoleSelection?.role.profileNeeds ?? [],
      );
    } else {
      if (!apiKey) return Response.json({ error: 'El servicio de orientación no está configurado.' }, { status: 503 });

      const context = {
        rolActual: {
          label: currentRoleLabel,
          familia: currentRoleSelection?.family.canonicalLabel ?? null,
          ruta: currentRoleSelection?.track.label ?? null,
          paginaModelo: currentRoleSelection?.role.sourcePage ?? null,
        },
        siguienteRol: nextRoleInfo
          ? {
              label: nextRoleInfo.role.label,
              paginaModelo: nextRoleInfo.role.sourcePage,
              nota: 'Referencia orientativa del modelo de carrera GDNe-2026.1. No es una decisión de promoción.',
            }
          : null,
        perfilDeclarado: {
          trabajoActual: compactText(profile.workContext, 400),
          focoDesarrollo: compactText(profile.developmentGoal, 200),
        },
        observacionPrivadaDeRevision: profile.reviewerPrivateObservation
          ? { texto: compactText(profile.reviewerPrivateObservation, 600), uso: 'Contexto interno: no debe aparecer ni inferirse en la respuesta.' }
          : null,
        necesidadesRolActual: currentRoleSelection?.role.profileNeeds ?? [],
        formasTrabajoEsperadasRolActual: currentRoleSelection?.role.waysOfWorking ?? [],
        necesidadesSiguienteRol: nextRoleInfo?.role.profileNeeds ?? [],
        growthMindset: {
          T1:'Adquiere autonomía; requiere feedback frecuente y desarrolla conocimientos para ejecutar el rol.',
          T2:'Muestra madurez y autonomía; perfecciona el rol y aclara el camino que quiere recorrer.',
          T3:'Ha elegido su camino y muestra preparación para un desafío concreto alineado con él.',
        },
        tareasDeclaradas: compactRecords(workActivities, 8).map(({ title, description, status, validationStatus }) => ({
          titulo: compactText(title, 120),
          detalle: compactText(description, 400),
          estado: status,
          estadoRevision: validationStatus,
        })),
        feedbackPrivadoLiderSobreTareas: compactRecords(
          workActivities.flatMap((activity) => (activity.privateFeedback ?? []).map((feedback) => ({
            tarea: activity.title,
            categoria: feedbackCategoryLabels[feedback.category],
            texto: feedback.content,
            registradoEn: feedback.createdAt,
          }))),
          8,
        ).map(({ tarea, categoria, texto, registradoEn }) => ({
          tarea: compactText(tarea, 120),
          categoria,
          texto: compactText(texto, 600),
          registradoEn,
          uso: 'Contexto interno: no debe aparecer ni inferirse en la respuesta.',
        })),
        evidencias: compactRecords(evidence, 6).map(({ title, description, evidenceType, validationStatus }) => ({
          titulo: compactText(title, 100),
          detalle: compactText(description, 240),
          tipo: evidenceType,
          estado: validationStatus,
        })),
        modelVersion: CAREER_MODEL_VERSION,
      };

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          store: false,
          reasoning: { effort: 'low' },
          max_output_tokens: 900,
          ...promptCache,
          instructions: instructions + '\n' + privateReviewInstruction + '\n' + outputBrevity,
          input: [{ role: 'user', content: [{ type: 'input_text', text: JSON.stringify(context) }] }],
          text: {
            verbosity: 'low',
            format: { type: 'json_schema', name: 'profile_orientation', strict: true, schema: responseSchema },
          },
        }),
      });

      if (!response.ok) throw new Error(`OpenAI Responses API devolvió ${response.status}`);
      orientation = JSON.parse(extractOutputText(await response.json())) as ProfileOrientation;
    }

    // Persistir el análisis (upsert por user_id); se reemplaza cada vez que se solicita con más info
    const timestamp = Date.now();
    await ensureDatabase();
    const db = rawDb();
    const existingAnalysis = await db.prepare(`SELECT created_at AS createdAt FROM profile_analyses WHERE user_id = ?`).bind(actor.id).first<{ createdAt:number }>();
    const isFirstAnalysis = !existingAnalysis;
    await db.batch([
      db.prepare(
        `INSERT INTO profile_analyses (user_id, current_role, next_role, analysis_json, model, model_version, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           current_role = excluded.current_role,
           next_role = excluded.next_role,
           analysis_json = excluded.analysis_json,
           model = excluded.model,
           model_version = excluded.model_version,
           updated_at = excluded.updated_at`,
      ).bind(
        actor.id,
        currentRoleLabel,
        nextRoleLabel ?? null,
        JSON.stringify(orientation),
        apiKey ? model : 'local-demo',
        CAREER_MODEL_VERSION,
        existingAnalysis?.createdAt ?? timestamp,
        timestamp,
      ),
      // Registro en audit_log para trazabilidad
      db.prepare(
        `INSERT INTO audit_log (id, actor_id, target_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
         VALUES (?, ?, ?, ?, 'profile_analysis', ?, NULL, ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        actor.id,
        actor.id,
        isFirstAnalysis ? 'create' : 'update',
        actor.id,
        JSON.stringify({ currentRole: currentRoleLabel, nextRole: nextRoleLabel ?? null, maturityBand: orientation.maturityBand, summary: orientation.maturitySummary.slice(0, 300) }),
        timestamp,
      ),
    ]);

    return Response.json({
      ...orientation,
      currentRole: currentRoleLabel,
      nextRole: nextRoleLabel ?? null,
      updatedAt: timestamp,
    });
  } catch (error) {
    return apiError(error);
  }
}
