import { ensureDatabase, rawDb } from '@/db/runtime';
import { apiError, getActor, requireRole } from '@/lib/authz';

/**
 * PATCH /api/actions/[id]
 *
 * Transiciones permitidas para el colaborador:
 *   - Editar título/descripción mientras está en 'draft' o 'changes_requested'
 *   - submit: draft → pending_leader
 *   - submit: changes_requested → pending_leader  (reenvío tras ajuste)
 *   - complete: approved → completed
 */

type PatchInput = { action?: unknown; title?: unknown; description?: unknown; dueAt?: unknown };

const TRANSITIONS: Record<string, string> = {
  submit: 'pending_leader',
  complete: 'completed',
};

const EDITABLE_STATUSES = new Set(['draft', 'changes_requested']);

function text(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor(request);
    requireRole(actor, ['collaborator']);
    const { id } = await context.params;

    let body: PatchInput;
    try { body = await request.json() as PatchInput; }
    catch { return Response.json({ error: 'La solicitud debe contener JSON válido.' }, { status: 400 }); }

    await ensureDatabase();
    const db = rawDb();

    const current = await db.prepare(
      `SELECT id, user_id AS userId, title, description, status, due_at AS dueAt, source FROM action_items WHERE id = ?`,
    ).bind(id).first<{ id: string; userId: string; title: string; description: string; status: string; dueAt: number | null; source: string }>();

    if (!current) return Response.json({ error: 'Acción no encontrada.' }, { status: 404 });
    if (current.userId !== actor.id) return Response.json({ error: 'No tienes permisos sobre esta acción.' }, { status: 403 });

    const action = text(body.action);
    const timestamp = Date.now();

    // Transición de estado
    if (action === 'submit' || action === 'complete') {
      const allowed =
        (action === 'submit' && (current.status === 'draft' || current.status === 'changes_requested')) ||
        (action === 'complete' && current.status === 'approved');
      if (!allowed) return Response.json({ error: `No es posible realizar "${action}" desde el estado "${current.status}".` }, { status: 409 });

      const newStatus = TRANSITIONS[action];
      await db.batch([
        db.prepare(`UPDATE action_items SET status = ?, updated_at = ? WHERE id = ?`).bind(newStatus, timestamp, id),
        db.prepare(
          `INSERT INTO audit_log (id, actor_id, target_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
           VALUES (?, ?, ?, ?, 'action_item', ?, ?, ?, ?)`,
        ).bind(
          crypto.randomUUID(), actor.id, actor.id,
          action === 'submit' ? 'submit_for_review' : 'complete',
          id,
          JSON.stringify({ status: current.status }),
          JSON.stringify({ status: newStatus }),
          timestamp,
        ),
      ]);
      return Response.json({ id, status: newStatus, updatedAt: timestamp });
    }

    // Edición de contenido (solo en estados editables)
    if (action === 'edit' || !action) {
      if (!EDITABLE_STATUSES.has(current.status)) {
        return Response.json({ error: `No se puede editar una acción en estado "${current.status}".` }, { status: 409 });
      }
      const title = text(body.title) || current.title;
      const description = text(body.description) || current.description;
      const dueAt = typeof body.dueAt === 'number' && body.dueAt > 0 ? body.dueAt : (body.dueAt === null ? null : current.dueAt);

      if (title.length < 3 || title.length > 200) return Response.json({ error: 'El título debe tener entre 3 y 200 caracteres.' }, { status: 400 });
      if (description.length < 10 || description.length > 1600) return Response.json({ error: 'Describe la acción en 10 a 1600 caracteres.' }, { status: 400 });

      await db.batch([
        db.prepare(`UPDATE action_items SET title = ?, description = ?, due_at = ?, updated_at = ? WHERE id = ?`).bind(title, description, dueAt, timestamp, id),
        db.prepare(
          `INSERT INTO audit_log (id, actor_id, target_user_id, action, entity_type, entity_id, before_json, after_json, created_at)
           VALUES (?, ?, ?, 'update', 'action_item', ?, ?, ?, ?)`,
        ).bind(
          crypto.randomUUID(), actor.id, actor.id, id,
          JSON.stringify({ title: current.title, description: current.description, dueAt: current.dueAt }),
          JSON.stringify({ title, description, dueAt }),
          timestamp,
        ),
      ]);
      return Response.json({ id, title, description, dueAt, status: current.status, updatedAt: timestamp });
    }

    return Response.json({ error: 'Acción no reconocida.' }, { status: 400 });
  } catch (error) { return apiError(error); }
}
