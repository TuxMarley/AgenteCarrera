import { ensureDatabase, rawDb } from '@/db/runtime';
import { apiError, getActor, requireRole } from '@/lib/authz';

type ReviewInput = { targetUserId?: unknown; decision?: unknown; feedback?: unknown; privateObservation?: unknown };

function readText(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }

export async function POST(request: Request) {
  try {
    const actor = await getActor(request);
    requireRole(actor, ['leader']);
    let body: ReviewInput;
    try { body = await request.json() as ReviewInput; }
    catch { return Response.json({ error:'La solicitud debe contener JSON válido.' }, { status:400 }); }

    const targetUserId = readText(body.targetUserId);
    const decision = readText(body.decision);
    const feedback = readText(body.feedback);
    const privateObservation = readText(body.privateObservation);
    if (!targetUserId) return Response.json({ error:'Indica el perfil que deseas revisar.' }, { status:400 });
    if (decision !== 'validate' && decision !== 'changes') return Response.json({ error:'Selecciona una decisión válida.' }, { status:400 });
    if (feedback.length > 1200) return Response.json({ error:'El feedback no puede superar los 1200 caracteres.' }, { status:400 });
    if (privateObservation.length > 600) return Response.json({ error:'La observación privada no puede superar los 600 caracteres.' }, { status:400 });
    if (decision === 'changes' && feedback.length < 10) return Response.json({ error:'Explica en al menos 10 caracteres qué información se debe ajustar.' }, { status:400 });

    await ensureDatabase();
    const db = rawDb();
    const target = await db.prepare(`SELECT id, manager_id AS managerId FROM users WHERE id = ?`).bind(targetUserId).first<{ id:string; managerId:string|null }>();
    if (!target) return Response.json({ error:'Perfil no encontrado.' }, { status:404 });
    if (target.managerId !== actor.id) return Response.json({ error:'Solo puedes revisar perfiles de personas asignadas a tu equipo.' }, { status:403 });

    const profile = await db.prepare(`SELECT user_id AS userId, validation_status AS validationStatus, leader_feedback AS leaderFeedback, reviewer_private_observation AS reviewerPrivateObservation FROM career_profiles WHERE user_id = ?`).bind(targetUserId).first<{ userId:string; validationStatus:string; leaderFeedback:string|null; reviewerPrivateObservation:string|null }>();
    if (!profile) return Response.json({ error:'La persona todavía no ha enviado su perfil inicial.' }, { status:404 });
    if (profile.validationStatus !== 'pending_review') return Response.json({ error:'Este perfil no está pendiente de validación.' }, { status:409 });

    const validationStatus = decision === 'validate' ? 'validated' : 'changes_requested';
    const timestamp = Date.now();
    await db.batch([
      db.prepare(`UPDATE career_profiles SET validation_status = ?, reviewed_by = ?, reviewed_at = ?, leader_feedback = ?, reviewer_private_observation = ?, updated_at = ? WHERE user_id = ?`).bind(validationStatus, actor.id, timestamp, feedback || null, privateObservation || null, timestamp, targetUserId),
      db.prepare(`INSERT INTO audit_log (id, actor_id, target_user_id, action, entity_type, entity_id, before_json, after_json, created_at) VALUES (?, ?, ?, 'review', 'career_profile', ?, ?, ?, ?)`).bind(crypto.randomUUID(), actor.id, targetUserId, targetUserId, JSON.stringify({ validationStatus:profile.validationStatus, leaderFeedback:profile.leaderFeedback, reviewerPrivateObservation:profile.reviewerPrivateObservation }), JSON.stringify({ validationStatus, feedback, reviewerPrivateObservation:privateObservation || null }), timestamp),
    ]);
    return Response.json({ validationStatus, leaderFeedback:feedback || null, reviewedAt:timestamp, reviewedByName:actor.fullName });
  } catch (error) { return apiError(error); }
}
