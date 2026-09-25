import { ensureDatabase, rawDb } from '@/db/runtime';
import { apiError, getActor, requireRole } from '@/lib/authz';

export async function POST(request: Request, context: { params: Promise<{ id:string }> }) {
  try {
    const actor = await getActor(request);
    requireRole(actor, ['collaborator']);
    const { id } = await context.params;
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) return Response.json({ error:'Identificador de tarea no válido.' }, { status:400 });

    await ensureDatabase();
    const db = rawDb();
    const activity = await db.prepare(`SELECT id, user_id AS userId, validation_status AS validationStatus, submitted_for_review AS submittedForReview FROM work_activities WHERE id = ? AND user_id = ?`).bind(id, actor.id).first<{ id:string; userId:string; validationStatus:string; submittedForReview:number }>();
    if (!activity) return Response.json({ error:'No encontramos esta tarea.' }, { status:404 });
    if (activity.submittedForReview) return Response.json({ error:'Esta tarea ya está esperando revisión. Si necesitas cambiarla, actualiza la tarea o agrega una nueva evidencia.' }, { status:409 });

    const tangibleEvidence = await db.prepare(`SELECT COUNT(*) AS count FROM evidence WHERE work_activity_id = ? AND user_id = ? AND object_key IS NOT NULL`).bind(id, actor.id).first<{ count:number|string }>();
    if (Number(tangibleEvidence?.count ?? 0) < 1) return Response.json({ error:'Adjunta al menos una evidencia con archivo antes de enviar la tarea a validación.' }, { status:400 });

    const timestamp = Date.now();
    await db.batch([
      db.prepare(`UPDATE work_activities SET validation_status = 'pending_review', submitted_for_review = 1, reviewed_by = NULL, reviewed_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?`).bind(timestamp, id, actor.id),
      db.prepare(`UPDATE evidence SET validation_status = 'pending' WHERE work_activity_id = ? AND user_id = ? AND validation_status = 'draft'`).bind(id, actor.id),
      db.prepare(`DELETE FROM profile_analyses WHERE user_id = ?`).bind(actor.id),
      db.prepare(`INSERT INTO audit_log (id, actor_id, target_user_id, action, entity_type, entity_id, before_json, after_json, created_at) VALUES (?, ?, ?, 'submit_for_review', 'work_activity', ?, ?, ?, ?)`).bind(crypto.randomUUID(), actor.id, actor.id, id, JSON.stringify({ validationStatus:activity.validationStatus, submittedForReview:Boolean(activity.submittedForReview) }), JSON.stringify({ validationStatus:'pending_review', submittedForReview:true }), timestamp),
    ]);
    return Response.json({ id, validationStatus:'pending_review', submittedForReview:true, updatedAt:timestamp });
  } catch (error) { return apiError(error); }
}
