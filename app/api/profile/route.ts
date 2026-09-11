import { ensureDatabase, rawDb } from '@/db/runtime';
import { apiError, getActor, requireRole } from '@/lib/authz';
import { CAREER_MODEL_SOURCE, CAREER_MODEL_VERSION, getCareerRoleSelection } from '@/lib/career-roles';

type ProfileInput = { careerRoleId?: unknown; workContext?: unknown; developmentGoal?: unknown };

function readText(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }

export async function PUT(request: Request) {
  try {
    const actor = await getActor(request);
    requireRole(actor, ['collaborator']);
    let body: ProfileInput;
    try { body = await request.json() as ProfileInput; }
    catch { return Response.json({ error:'La solicitud debe contener JSON válido.' }, { status:400 }); }
    const careerRoleId = readText(body.careerRoleId);
    const workContext = readText(body.workContext);
    const developmentGoal = readText(body.developmentGoal);
    const selection = getCareerRoleSelection(careerRoleId);

    if (!selection) return Response.json({ error:'Selecciona una posición válida del mapa de talento.' }, { status:400 });
    if (workContext.length < 10 || workContext.length > 1200) return Response.json({ error:'Describe tu contexto de trabajo en 10 a 1200 caracteres.' }, { status:400 });
    if (developmentGoal.length > 600) return Response.json({ error:'El foco de desarrollo no puede superar los 600 caracteres.' }, { status:400 });

    await ensureDatabase();
    const db = rawDb();
    const before = await db.prepare(`SELECT declared_job_role AS declaredJobRole, work_context AS workContext, development_goal AS developmentGoal, validation_status AS validationStatus, leader_feedback AS leaderFeedback, reviewer_private_observation AS reviewerPrivateObservation FROM career_profiles WHERE user_id = ?`).bind(actor.id).first();
    const timestamp = Date.now();
    const after = {
      declaredJobRole:selection.role.label,
      careerRoleId:selection.role.id,
      careerFamily:selection.family.canonicalLabel,
      careerTrack:selection.track.label,
      modelVersion:CAREER_MODEL_VERSION,
      source:CAREER_MODEL_SOURCE,
      sourcePage:selection.role.sourcePage,
      workContext,
      developmentGoal,
      validationStatus:'pending_review',
    };
    await db.batch([
      db.prepare(`INSERT INTO career_profiles (user_id, declared_job_role, work_context, development_goal, validation_status, reviewed_by, reviewed_at, leader_feedback, reviewer_private_observation, completed_at, updated_at) VALUES (?, ?, ?, ?, 'pending_review', NULL, NULL, NULL, NULL, ?, ?) ON CONFLICT(user_id) DO UPDATE SET declared_job_role = excluded.declared_job_role, work_context = excluded.work_context, development_goal = excluded.development_goal, validation_status = 'pending_review', reviewed_by = NULL, reviewed_at = NULL, leader_feedback = NULL, reviewer_private_observation = NULL, updated_at = excluded.updated_at`).bind(actor.id, selection.role.label, workContext, developmentGoal, timestamp, timestamp),
      db.prepare(`DELETE FROM profile_analyses WHERE user_id = ?`).bind(actor.id),
      db.prepare(`INSERT INTO audit_log (id, actor_id, target_user_id, action, entity_type, entity_id, before_json, after_json, created_at) VALUES (?, ?, ?, ?, 'career_profile', ?, ?, ?, ?)`).bind(crypto.randomUUID(), actor.id, actor.id, before ? 'update' : 'create', actor.id, before ? JSON.stringify(before) : null, JSON.stringify(after), timestamp),
    ]);
    return Response.json({ ...after, profileCompleted:true, updatedAt:timestamp });
  } catch (error) { return apiError(error); }
}
