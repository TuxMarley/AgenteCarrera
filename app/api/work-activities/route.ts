import { ensureDatabase, rawDb } from '@/db/runtime';
import { apiError, getActor, requireRole } from '@/lib/authz';

type ActivityInput = { title?: unknown; description?: unknown; status?: unknown };
const statuses = new Set(['in_progress', 'completed']);

function text(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }

export async function GET(request: Request) {
  try {
    const actor = await getActor(request);
    requireRole(actor, ['collaborator']);
    await ensureDatabase();
    const result = await rawDb().prepare(`SELECT id, title, description, status, validation_status AS validationStatus, submitted_for_review AS submittedForReview, started_at AS startedAt, completed_at AS completedAt, created_at AS createdAt, updated_at AS updatedAt FROM work_activities WHERE user_id = ? ORDER BY updated_at DESC`).bind(actor.id).all();
    return Response.json({ workActivities: result.results });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await getActor(request);
    requireRole(actor, ['collaborator']);
    let body: ActivityInput;
    try { body = await request.json() as ActivityInput; }
    catch { return Response.json({ error:'La solicitud debe contener JSON válido.' }, { status:400 }); }
    const title = text(body.title);
    const description = text(body.description);
    const status = text(body.status || 'in_progress');
    if (title.length < 3 || title.length > 160) return Response.json({ error:'El titulo debe tener entre 3 y 160 caracteres.' }, { status:400 });
    if (description.length < 10 || description.length > 1600) return Response.json({ error:'Describe la tarea en 10 a 1600 caracteres.' }, { status:400 });
    if (!statuses.has(status)) return Response.json({ error:'El estado de la tarea no es valido.' }, { status:400 });

    await ensureDatabase();
    const timestamp = Date.now();
    const id = crypto.randomUUID();
    const activity = { id, title, description, status, validationStatus:'pending_review', submittedForReview:false, startedAt:timestamp, completedAt:status === 'completed' ? timestamp : null, createdAt:timestamp, updatedAt:timestamp };
    const db = rawDb();
    await db.batch([
      db.prepare(`INSERT INTO work_activities (id, user_id, title, description, status, validation_status, submitted_for_review, started_at, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'pending_review', 0, ?, ?, ?, ?)`).bind(id, actor.id, title, description, status, timestamp, activity.completedAt, timestamp, timestamp),
      db.prepare(`DELETE FROM profile_analyses WHERE user_id = ?`).bind(actor.id),
      db.prepare(`INSERT INTO audit_log (id, actor_id, target_user_id, action, entity_type, entity_id, after_json, created_at) VALUES (?, ?, ?, 'create', 'work_activity', ?, ?, ?)`).bind(crypto.randomUUID(), actor.id, actor.id, id, JSON.stringify(activity), timestamp),
    ]);
    return Response.json(activity, { status:201 });
  } catch (error) { return apiError(error); }
}
