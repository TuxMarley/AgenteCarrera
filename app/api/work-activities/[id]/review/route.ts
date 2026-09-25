import { ensureDatabase, rawDb } from '@/db/runtime';
import { apiError, getActor, requireRole } from '@/lib/authz';

type ReviewInput = { decision?: unknown };

function readText(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }

export async function POST(request: Request, context: { params: Promise<{ id:string }> }) {
  try {
    const actor = await getActor(request);
    requireRole(actor, ['leader']);
    const { id } = await context.params;
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) return Response.json({ error:'Identificador de tarea no válido.' }, { status:400 });
    let body: ReviewInput;
    try { body = await request.json() as ReviewInput; }
    catch { return Response.json({ error:'La solicitud debe contener JSON válido.' }, { status:400 }); }
    const decision = readText(body.decision);
    if (decision !== 'validate' && decision !== 'changes') return Response.json({ error:'Selecciona una decisión válida.' }, { status:400 });

    await ensureDatabase();
    const db = rawDb();
    const activity = await db.prepare(`SELECT activity.id, activity.user_id AS userId, activity.validation_status AS validationStatus, user.manager_id AS managerId FROM work_activities activity JOIN users user ON user.id = activity.user_id WHERE activity.id = ?`).bind(id).first<{ id:string; userId:string; validationStatus:string; managerId:string|null }>();
    if (!activity) return Response.json({ error:'Tarea no encontrada.' }, { status:404 });
    if (activity.managerId !== actor.id) return Response.json({ error:'Solo puedes revisar tareas de personas asignadas a tu equipo.' }, { status:403 });
    if (activity.validationStatus !== 'pending_review') return Response.json({ error:'Esta tarea no está pendiente de revisión.' }, { status:409 });

    const validationStatus = decision === 'validate' ? 'validated' : 'changes_requested';
    const timestamp = Date.now();
    await db.batch([
      db.prepare(`UPDATE work_activities SET validation_status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?`).bind(validationStatus, actor.id, timestamp, id),
      db.prepare(`DELETE FROM profile_analyses WHERE user_id = ?`).bind(activity.userId),
      db.prepare(`INSERT INTO audit_log (id, actor_id, target_user_id, action, entity_type, entity_id, before_json, after_json, created_at) VALUES (?, ?, ?, 'review', 'work_activity', ?, ?, ?, ?)`).bind(crypto.randomUUID(), actor.id, activity.userId, id, JSON.stringify({ validationStatus:activity.validationStatus }), JSON.stringify({ validationStatus }), timestamp),
    ]);
    return Response.json({ id, validationStatus, reviewedAt:timestamp, reviewedByName:actor.fullName });
  } catch (error) { return apiError(error); }
}
