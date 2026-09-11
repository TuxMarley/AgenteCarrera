import { ensureDatabase, rawDb } from '@/db/runtime';
import { apiError, getActor, requireRole } from '@/lib/authz';

const statuses = new Set(['in_progress', 'completed']);

export async function PATCH(request: Request, context: { params: Promise<{ id:string }> }) {
  try {
    const actor = await getActor(request);
    requireRole(actor, ['collaborator']);
    const { id } = await context.params;
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) return Response.json({ error:'Identificador de tarea no valido.' }, { status:400 });
    let body: { status?: unknown };
    try { body = await request.json() as { status?: unknown }; }
    catch { return Response.json({ error:'La solicitud debe contener JSON válido.' }, { status:400 }); }
    const status = typeof body.status === 'string' ? body.status : '';
    if (!statuses.has(status)) return Response.json({ error:'El estado de la tarea no es valido.' }, { status:400 });

    await ensureDatabase();
    const db = rawDb();
    const before = await db.prepare(`SELECT id, title, description, status, started_at AS startedAt, completed_at AS completedAt FROM work_activities WHERE id = ? AND user_id = ?`).bind(id, actor.id).first();
    if (!before) return Response.json({ error:'No encontramos esta tarea.' }, { status:404 });
    const timestamp = Date.now();
    const completedAt = status === 'completed' ? timestamp : null;
    await db.batch([
      db.prepare(`UPDATE work_activities SET status = ?, completed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?`).bind(status, completedAt, timestamp, id, actor.id),
      db.prepare(`INSERT INTO audit_log (id, actor_id, target_user_id, action, entity_type, entity_id, before_json, after_json, created_at) VALUES (?, ?, ?, 'update_status', 'work_activity', ?, ?, ?, ?)`).bind(crypto.randomUUID(), actor.id, actor.id, id, JSON.stringify(before), JSON.stringify({ ...(before as object), status, completedAt }), timestamp),
    ]);
    return Response.json({ id, status, completedAt, updatedAt:timestamp });
  } catch (error) { return apiError(error); }
}
