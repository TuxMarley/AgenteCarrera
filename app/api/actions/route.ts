import { ensureDatabase, rawDb } from '@/db/runtime';
import { apiError, getActor, requireRole } from '@/lib/authz';

type ActionInput = { title?: unknown; description?: unknown; dueAt?: unknown; source?: unknown };
const allowedSources = new Set(['collaborator', 'ai_draft']);

function text(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }

export async function POST(request: Request) {
  try {
    const actor = await getActor(request);
    requireRole(actor, ['collaborator']);
    let body: ActionInput;
    try { body = await request.json() as ActionInput; }
    catch { return Response.json({ error: 'La solicitud debe contener JSON válido.' }, { status: 400 }); }

    const title = text(body.title);
    const description = text(body.description);
    const source = text(body.source || 'collaborator');
    const dueAt = typeof body.dueAt === 'number' && body.dueAt > 0 ? body.dueAt : null;

    if (title.length < 3 || title.length > 200) return Response.json({ error: 'El título debe tener entre 3 y 200 caracteres.' }, { status: 400 });
    if (description.length < 10 || description.length > 1600) return Response.json({ error: 'Describe la acción en 10 a 1600 caracteres.' }, { status: 400 });
    if (!allowedSources.has(source)) return Response.json({ error: 'Origen no válido.' }, { status: 400 });

    await ensureDatabase();
    const timestamp = Date.now();
    const id = crypto.randomUUID();
    const db = rawDb();

    const after = { id, title, description, source, status: 'draft', dueAt };
    await db.batch([
      db.prepare(
        `INSERT INTO action_items (id, user_id, title, description, source, status, due_at, leader_feedback, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'draft', ?, NULL, ?, ?)`,
      ).bind(id, actor.id, title, description, source, dueAt, timestamp, timestamp),
      db.prepare(
        `INSERT INTO audit_log (id, actor_id, target_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
         VALUES (?, ?, ?, 'create', 'action_item', ?, NULL, ?, ?)`,
      ).bind(crypto.randomUUID(), actor.id, actor.id, id, JSON.stringify(after), timestamp),
    ]);
    return Response.json({ ...after, createdAt: timestamp, updatedAt: timestamp }, { status: 201 });
  } catch (error) { return apiError(error); }
}
