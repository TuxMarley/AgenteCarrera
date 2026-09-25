import { ensureDatabase, rawDb } from '@/db/runtime';
import { apiError, getActor, requireRole } from '@/lib/authz';

const statuses = new Set(['in_progress', 'completed']);
type ActivityUpdateInput = { title?: unknown; description?: unknown; status?: unknown };

function readText(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }

export async function PATCH(request: Request, context: { params: Promise<{ id:string }> }) {
  try {
    const actor = await getActor(request);
    requireRole(actor, ['collaborator']);
    const { id } = await context.params;
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) return Response.json({ error:'Identificador de tarea no valido.' }, { status:400 });
    let body: ActivityUpdateInput;
    try { body = await request.json() as ActivityUpdateInput; }
    catch { return Response.json({ error:'La solicitud debe contener JSON válido.' }, { status:400 }); }
    const hasTitle = typeof body.title !== 'undefined';
    const hasDescription = typeof body.description !== 'undefined';
    const hasStatus = typeof body.status !== 'undefined';
    if (!hasTitle && !hasDescription && !hasStatus) return Response.json({ error:'Indica al menos un cambio para la tarea.' }, { status:400 });

    await ensureDatabase();
    const db = rawDb();
    const before = await db.prepare(`SELECT id, title, description, status, validation_status AS validationStatus, submitted_for_review AS submittedForReview, started_at AS startedAt, completed_at AS completedAt FROM work_activities WHERE id = ? AND user_id = ?`).bind(id, actor.id).first<{ id:string; title:string; description:string; status:string; validationStatus:string; submittedForReview:number; startedAt:number|null; completedAt:number|null }>();
    if (!before) return Response.json({ error:'No encontramos esta tarea.' }, { status:404 });
    const title = hasTitle ? readText(body.title) : before.title;
    const description = hasDescription ? readText(body.description) : before.description;
    const status = hasStatus ? readText(body.status) : before.status;
    if (title.length < 3 || title.length > 160) return Response.json({ error:'El título debe tener entre 3 y 160 caracteres.' }, { status:400 });
    if (description.length < 10 || description.length > 1600) return Response.json({ error:'Describe la tarea en 10 a 1600 caracteres.' }, { status:400 });
    if (!statuses.has(status)) return Response.json({ error:'El estado de la tarea no es válido.' }, { status:400 });
    const timestamp = Date.now();
    const completedAt = status === 'completed' ? (before.status === 'completed' ? before.completedAt ?? timestamp : timestamp) : null;
    if (title === before.title && description === before.description && status === before.status) return Response.json({ error:'No encontramos cambios para guardar.' }, { status:400 });
    await db.batch([
      db.prepare(`UPDATE work_activities SET title = ?, description = ?, status = ?, completed_at = ?, validation_status = 'pending_review', submitted_for_review = 0, reviewed_by = NULL, reviewed_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?`).bind(title, description, status, completedAt, timestamp, id, actor.id),
      db.prepare(`DELETE FROM profile_analyses WHERE user_id = ?`).bind(actor.id),
      db.prepare(`INSERT INTO audit_log (id, actor_id, target_user_id, action, entity_type, entity_id, before_json, after_json, created_at) VALUES (?, ?, ?, 'update', 'work_activity', ?, ?, ?, ?)`).bind(crypto.randomUUID(), actor.id, actor.id, id, JSON.stringify(before), JSON.stringify({ ...before, title, description, status, completedAt, validationStatus:'pending_review', submittedForReview:false }), timestamp),
    ]);
    return Response.json({ id, title, description, status, completedAt, validationStatus:'pending_review', submittedForReview:false, updatedAt:timestamp });
  } catch (error) { return apiError(error); }
}
