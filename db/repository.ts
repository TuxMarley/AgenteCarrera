import { ensureDatabase, rawDb } from './runtime';

type DashboardEvidence = {
  id:string; title:string; description:string; evidenceType:string; occurredAt:number; validationStatus:string; workActivityId:string|null;
  originalFilename:string|null; contentType:string|null; sizeBytes:number|null; leaderFeedback:string|null; reviewedAt:number|null; reviewedByName:string|null;
};
type DashboardActivity = {
  id:string; title:string; description:string; status:string; validationStatus:string; submittedForReview:boolean|number;
  reviewedAt:number|null; reviewedByName:string|null; startedAt:number; completedAt:number|null; createdAt:number; updatedAt:number;
};

export async function getDashboard(userId: string, includePrivateReview = false) {
  await ensureDatabase();
  const db = rawDb();
  const [userRow, declaredProfileRow, competencyRows, actionRows, evidenceRows, activityRows, activityFeedbackRows, historyRows, profileAnalysisRow] = await Promise.all([
    db.prepare(`SELECT id, email, full_name AS fullName, role, current_job_role AS currentJobRole, official_category AS officialCategory, orientative_band AS orientativeBand FROM users WHERE id = ?`).bind(userId).first(),
    db.prepare(`SELECT profile.declared_job_role AS declaredJobRole, profile.work_context AS workContext, profile.development_goal AS developmentGoal, profile.validation_status AS validationStatus, profile.leader_feedback AS leaderFeedback, profile.reviewer_private_observation AS reviewerPrivateObservation, profile.reviewed_at AS reviewedAt, reviewer.full_name AS reviewedByName, profile.completed_at AS completedAt, profile.updated_at AS updatedAt FROM career_profiles profile LEFT JOIN users reviewer ON reviewer.id = profile.reviewed_by WHERE profile.user_id = ?`).bind(userId).first(),
    db.prepare(`SELECT uc.id, c.name, c.description, uc.self_level AS selfLevel, uc.leader_level AS leaderLevel, uc.target_level AS targetLevel, uc.coverage_percent AS coveragePercent, uc.validation_status AS validationStatus FROM user_competencies uc JOIN competencies c ON c.id = uc.competency_id WHERE uc.user_id = ? ORDER BY uc.coverage_percent DESC`).bind(userId).all(),
    db.prepare(`SELECT id, title, description, source, status, due_at AS dueAt, leader_feedback AS leaderFeedback FROM action_items WHERE user_id = ? ORDER BY created_at DESC`).bind(userId).all(),
    db.prepare(`SELECT evidence.id, evidence.title, evidence.description, evidence.evidence_type AS evidenceType, evidence.occurred_at AS occurredAt, evidence.validation_status AS validationStatus, evidence.work_activity_id AS workActivityId, evidence.original_filename AS originalFilename, evidence.content_type AS contentType, evidence.size_bytes AS sizeBytes, evidence.leader_feedback AS leaderFeedback, evidence.reviewed_at AS reviewedAt, reviewer.full_name AS reviewedByName FROM evidence LEFT JOIN users reviewer ON reviewer.id = evidence.reviewed_by WHERE evidence.user_id = ? ORDER BY evidence.created_at DESC`).bind(userId).all(),
    db.prepare(`SELECT activity.id, activity.title, activity.description, activity.status, activity.validation_status AS validationStatus, activity.submitted_for_review AS submittedForReview, activity.reviewed_at AS reviewedAt, reviewer.full_name AS reviewedByName, activity.started_at AS startedAt, activity.completed_at AS completedAt, activity.created_at AS createdAt, activity.updated_at AS updatedAt FROM work_activities activity LEFT JOIN users reviewer ON reviewer.id = activity.reviewed_by WHERE activity.user_id = ? ORDER BY activity.updated_at DESC`).bind(userId).all(),
    includePrivateReview
      ? db.prepare(`SELECT feedback.id, feedback.work_activity_id AS workActivityId, feedback.category, feedback.content, feedback.created_at AS createdAt, author.full_name AS authorName FROM work_activity_feedback feedback JOIN work_activities activity ON activity.id = feedback.work_activity_id LEFT JOIN users author ON author.id = feedback.author_id WHERE activity.user_id = ? ORDER BY feedback.created_at DESC`).bind(userId).all()
      : Promise.resolve({ results: [] as unknown[] }),
    db.prepare(`SELECT id, event_type AS eventType, title, details, occurred_at AS occurredAt FROM career_events WHERE user_id = ? ORDER BY occurred_at DESC LIMIT 20`).bind(userId).all(),
    db.prepare(`SELECT current_role AS currentRole, next_role AS nextRole, analysis_json AS analysisJson, model, model_version AS modelVersion, updated_at AS updatedAt FROM profile_analyses WHERE user_id = ?`).bind(userId).first(),
  ]);
  const user = userRow as { id:string; email:string; fullName:string; role:string; currentJobRole:string; officialCategory:string|null; orientativeBand:string|null } | null;
  const declaredProfile = declaredProfileRow as { declaredJobRole:string; workContext:string; developmentGoal:string; validationStatus:'pending_review'|'validated'|'changes_requested'; leaderFeedback:string|null; reviewerPrivateObservation:string|null; reviewedAt:number|null; reviewedByName:string|null; completedAt:number; updatedAt:number } | null;
  const profile = user ? {
    id: user.id, email: user.email, fullName: user.fullName, role: user.role,
    currentJobRole: declaredProfile?.declaredJobRole ?? null,
    workContext: declaredProfile?.workContext ?? null,
    developmentGoal: declaredProfile?.developmentGoal ?? null,
    profileCompleted: Boolean(declaredProfile),
    completedAt: declaredProfile?.completedAt ?? null,
    validationStatus: declaredProfile?.validationStatus ?? null,
    leaderFeedback: declaredProfile?.leaderFeedback ?? null,
    ...(includePrivateReview ? { reviewerPrivateObservation: declaredProfile?.reviewerPrivateObservation ?? null } : {}),
    reviewedAt: declaredProfile?.reviewedAt ?? null,
    reviewedByName: declaredProfile?.reviewedByName ?? null,
    officialCategory: user.officialCategory, orientativeBand: user.orientativeBand,
  } : null;
  const profileAnalysis = profileAnalysisRow as { currentRole:string; nextRole:string|null; analysisJson:string; model:string; modelVersion:string; updatedAt:number } | null;
  const evidence = evidenceRows.results as DashboardEvidence[];
  const activities = activityRows.results as DashboardActivity[];
  const activityFeedback = activityFeedbackRows.results as Array<{ workActivityId:string; id:string; category:string; content:string; createdAt:number; authorName:string|null }>;
  const workActivities = activities.map((activity) => ({
    ...activity,
    evidence: evidence.filter((item) => item.workActivityId === activity.id),
    ...(includePrivateReview ? { privateFeedback: activityFeedback.filter((feedback) => feedback.workActivityId === activity.id) } : {}),
  }));
  return { profile, competencies: competencyRows.results, actions: actionRows.results, evidence, workActivities, history: historyRows.results, profileAnalysis };
}

export async function getWorkActivities(userId: string) {
  await ensureDatabase();
  const result = await rawDb().prepare(`SELECT id, title, description, status, validation_status AS validationStatus, submitted_for_review AS submittedForReview, started_at AS startedAt, completed_at AS completedAt, created_at AS createdAt, updated_at AS updatedAt FROM work_activities WHERE user_id = ? ORDER BY updated_at DESC`).bind(userId).all();
  return result.results;
}

export async function getUserByIdentity(authUserId: string, email: string) {
  await ensureDatabase();
  return rawDb().prepare(`SELECT id, role, manager_id AS managerId, email, full_name AS fullName FROM users WHERE auth_user_id = ? OR email = ? LIMIT 1`).bind(authUserId, email).first<{ id:string; role:'collaborator'|'leader'|'admin'; managerId:string|null; email:string; fullName:string }>();
}
