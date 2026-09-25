import { ensureDatabase, rawDb } from '@/db/runtime';
import { apiError, getActor, requireRole } from '@/lib/authz';

type FeedbackInput = { content?: unknown };

function readText(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }

export async function POST(request: Request, context: { params: Promise<{ id:string }> }) {
  try {
    const actor = await getActor(request);
    requireRole(actor, ['leader']);
    const { id } = await context.params;
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) return Response.json({ error:'Identificador de tarea no válido.' }, { status:400 });
    let body: FeedbackInput;
    try { body = await request.json() as FeedbackInput; }
    catch { return Response.json({ error:'La solicitud debe contener JSON válido.' }, { status:400 }); }
    const content = readText(body.content);
    if (content.length < 10 || content.length > 600) return Response.json({ error:'El feedback privado debe tener entre 10 y 600 caracteres.' }, { status:400 });

    await ensureDatabase();
    const db = rawDb();
    const activity = await db.prepare(`SELECT activity.id, activity.user_id AS userId, user.manager_id AS managerId FROM work_activities activity JOIN users user ON user.id = activity.user_id WHERE activity.id = ?`).bind(id).first<{ id:string; userId:string; managerId:string|null }>();
    if (!activity) return Response.json({ error:'Tarea no encontrada.' }, { status:404 });
    if (activity.managerId !== actor.id) return Response.json({ error:'Solo puedes registrar feedback para tareas de personas asignadas a tu equipo.' }, { status:403 });

    const feedbackId = crypto.randomUUID();
    const timestamp = Date.now();
    await db.batch([
      db.prepare(`INSERT INTO work_activity_feedback (id, work_activity_id, author_id, content, created_at) VALUES (?, ?, ?, ?, ?)`).bind(feedbackId, id, actor.id, content, timestamp),
      db.prepare(`DELETE FROM profile_analyses WHERE user_id = ?`).bind(activity.userId),
      db.prepare(`INSERT INTO audit_log (id, actor_id, target_user_id, action, entity_type, entity_id, after_json, created_at) VALUES (?, ?, ?, 'create_private_feedback', 'work_activity_feedback', ?, ?, ?)`).bind(crypto.randomUUID(), actor.id, activity.userId, feedbackId, JSON.stringify({ workActivityId:id, contentLength:content.length }), timestamp),
    ]);
    return Response.json({ id:feedbackId, workActivityId:id, createdAt:timestamp, authorName:actor.fullName }, { status:201 });
  } catch (error) { return apiError(error); }
}
