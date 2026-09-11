import { ensureDatabase, rawDb } from '@/db/runtime';
import { apiError, getActor, requireRole } from '@/lib/authz';

type ReviewInput = { decision?: unknown; feedback?: unknown };

function readText(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }

export async function POST(request: Request, context: { params: Promise<{ id:string }> }) {
  try {
    const actor = await getActor(request);
    requireRole(actor, ['leader', 'admin']);
    const { id } = await context.params;
    let body: ReviewInput;
    try { body = await request.json() as ReviewInput; }
    catch { return Response.json({ error:'La solicitud debe contener JSON válido.' }, { status:400 }); }

    const decision = readText(body.decision);
    const feedback = readText(body.feedback);
    if (decision !== 'validate' && decision !== 'reject') return Response.json({ error:'Selecciona una decisión válida.' }, { status:400 });
    if (feedback.length > 1200) return Response.json({ error:'El feedback no puede superar los 1200 caracteres.' }, { status:400 });
    if (decision === 'reject' && feedback.length < 10) return Response.json({ error:'Explica en al menos 10 caracteres por qué la evidencia no se puede validar.' }, { status:400 });

    await ensureDatabase();
    const db = rawDb();
    const evidence = await db.prepare(`SELECT evidence.id, evidence.user_id AS userId, evidence.validation_status AS validationStatus, evidence.leader_feedback AS leaderFeedback, user.manager_id AS managerId FROM evidence JOIN users user ON user.id = evidence.user_id WHERE evidence.id = ?`).bind(id).first<{ id:string; userId:string; validationStatus:string; leaderFeedback:string|null; managerId:string|null }>();
    if (!evidence) return Response.json({ error:'Evidencia no encontrada.' }, { status:404 });
    if (actor.role === 'leader' && evidence.managerId !== actor.id) return Response.json({ error:'Solo puedes revisar evidencias de personas asignadas a tu equipo.' }, { status:403 });
    if (evidence.validationStatus !== 'pending') return Response.json({ error:'Esta evidencia no está pendiente de revisión.' }, { status:409 });

    const validationStatus = decision === 'validate' ? 'validated' : 'rejected';
    const timestamp = Date.now();
    await db.batch([
      db.prepare(`UPDATE evidence SET validation_status = ?, leader_feedback = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?`).bind(validationStatus, feedback || null, actor.id, timestamp, id),
      db.prepare(`DELETE FROM profile_analyses WHERE user_id = ?`).bind(evidence.userId),
      db.prepare(`INSERT INTO audit_log (id, actor_id, target_user_id, action, entity_type, entity_id, before_json, after_json, created_at) VALUES (?, ?, ?, 'review', 'evidence', ?, ?, ?, ?)`).bind(crypto.randomUUID(), actor.id, evidence.userId, id, JSON.stringify({ validationStatus:evidence.validationStatus, leaderFeedback:evidence.leaderFeedback }), JSON.stringify({ validationStatus, feedback:feedback || null }), timestamp),
    ]);
    return Response.json({ id, validationStatus, leaderFeedback:feedback || null, reviewedAt:timestamp, reviewedByName:actor.fullName });
  } catch (error) { return apiError(error); }
}
