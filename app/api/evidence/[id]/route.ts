import { ensureDatabase, rawDb } from '@/db/runtime';
import { apiError, getActor, requireRole } from '@/lib/authz';

type EvidenceUpdateInput = { title?: unknown; description?: unknown; evidenceType?: unknown };
const allowedEvidenceTypes = new Set(['achievement','certification','feedback','learning']);

function readText(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }

export async function PATCH(request: Request, context: { params: Promise<{ id:string }> }) {
  try {
    const actor = await getActor(request);
    requireRole(actor, ['collaborator']);
    const { id } = await context.params;
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) return Response.json({ error:'Identificador de evidencia no válido.' }, { status:400 });
    let body: EvidenceUpdateInput;
    try { body = await request.json() as EvidenceUpdateInput; }
    catch { return Response.json({ error:'La solicitud debe contener JSON válido.' }, { status:400 }); }
    const title = readText(body.title);
    const description = readText(body.description);
    const evidenceType = readText(body.evidenceType);
    if (title.length < 3 || title.length > 120) return Response.json({ error:'El título debe tener entre 3 y 120 caracteres.' }, { status:400 });
    if (description.length < 10 || description.length > 1200) return Response.json({ error:'Describe el avance en 10 a 1200 caracteres.' }, { status:400 });
    if (!allowedEvidenceTypes.has(evidenceType)) return Response.json({ error:'Selecciona un tipo de evidencia válido.' }, { status:400 });

    await ensureDatabase();
    const db = rawDb();
    const before = await db.prepare(`SELECT id, title, description, evidence_type AS evidenceType, validation_status AS validationStatus, work_activity_id AS workActivityId FROM evidence WHERE id = ? AND user_id = ?`).bind(id, actor.id).first<{ id:string; title:string; description:string; evidenceType:string; validationStatus:string; workActivityId:string|null }>();
    if (!before) return Response.json({ error:'Evidencia no encontrada.' }, { status:404 });
    if (!before.workActivityId) return Response.json({ error:'Los registros históricos se conservan solo para consulta.' }, { status:409 });
    const timestamp = Date.now();
    await db.batch([
      db.prepare(`UPDATE evidence SET title = ?, description = ?, evidence_type = ?, validation_status = 'draft', leader_feedback = NULL, reviewed_by = NULL, reviewed_at = NULL WHERE id = ? AND user_id = ?`).bind(title, description, evidenceType, id, actor.id),
      db.prepare(`UPDATE work_activities SET validation_status = 'pending_review', submitted_for_review = 0, reviewed_by = NULL, reviewed_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?`).bind(timestamp, before.workActivityId, actor.id),
      db.prepare(`DELETE FROM profile_analyses WHERE user_id = ?`).bind(actor.id),
      db.prepare(`INSERT INTO audit_log (id, actor_id, target_user_id, action, entity_type, entity_id, before_json, after_json, created_at) VALUES (?, ?, ?, 'update', 'evidence', ?, ?, ?, ?)`).bind(crypto.randomUUID(), actor.id, actor.id, id, JSON.stringify(before), JSON.stringify({ title, description, evidenceType, validationStatus:'draft', workActivityId:before.workActivityId }), timestamp),
    ]);
    return Response.json({ id, title, description, evidenceType, validationStatus:'draft', workActivityId:before.workActivityId });
  } catch (error) { return apiError(error); }
}
