import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), authUserId: text('auth_user_id').notNull(), email: text('email').notNull(), fullName: text('full_name').notNull(),
  role: text('role', { enum: ['collaborator', 'leader', 'admin'] }).notNull(), managerId: text('manager_id'), currentJobRole: text('current_job_role').notNull(),
  officialCategory: text('official_category'), orientativeBand: text('orientative_band'), createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(),
}, (table) => [uniqueIndex('idx_users_auth_user_id').on(table.authUserId), uniqueIndex('idx_users_email').on(table.email), index('idx_users_manager_id').on(table.managerId)]);

/** Datos declarados por la persona al completar su perfil. No modifica datos oficiales. */
export const careerProfiles = sqliteTable('career_profiles', {
  userId: text('user_id').primaryKey(), declaredJobRole: text('declared_job_role').notNull(), workContext: text('work_context').notNull(),
  developmentGoal: text('development_goal').notNull(), validationStatus: text('validation_status', { enum: ['pending_review', 'validated', 'changes_requested'] }).notNull().default('pending_review'),
  reviewedBy: text('reviewed_by'), reviewedAt: integer('reviewed_at'), leaderFeedback: text('leader_feedback'), reviewerPrivateObservation: text('reviewer_private_observation'),
  completedAt: integer('completed_at').notNull(), updatedAt: integer('updated_at').notNull(),
}, (table) => [index('idx_career_profiles_updated').on(table.updatedAt), index('idx_career_profiles_status').on(table.validationStatus)]);

export const competencies = sqliteTable('competencies', {
  id: text('id').primaryKey(), name: text('name').notNull(), description: text('description').notNull(), modelVersion: text('model_version').notNull(),
}, (table) => [uniqueIndex('idx_competencies_name_version').on(table.name, table.modelVersion)]);

export const userCompetencies = sqliteTable('user_competencies', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), competencyId: text('competency_id').notNull(), selfLevel: integer('self_level').notNull(),
  leaderLevel: integer('leader_level'), targetLevel: integer('target_level').notNull(), coveragePercent: integer('coverage_percent').notNull(),
  validationStatus: text('validation_status', { enum: ['self_assessed', 'pending', 'validated', 'changes_requested'] }).notNull(), updatedAt: integer('updated_at').notNull(),
}, (table) => [uniqueIndex('idx_user_competencies_user_competency').on(table.userId, table.competencyId), index('idx_user_competencies_user_status').on(table.userId, table.validationStatus)]);

export const evidence = sqliteTable('evidence', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), title: text('title').notNull(), description: text('description').notNull(), evidenceType: text('evidence_type').notNull(),
  occurredAt: integer('occurred_at').notNull(), validationStatus: text('validation_status', { enum: ['draft', 'pending', 'validated', 'rejected'] }).notNull(), objectKey: text('object_key'),
  originalFilename: text('original_filename'), contentType: text('content_type'), sizeBytes: integer('size_bytes'), leaderFeedback: text('leader_feedback'), reviewedBy: text('reviewed_by'), reviewedAt: integer('reviewed_at'), createdAt: integer('created_at').notNull(),
}, (table) => [index('idx_evidence_user_created').on(table.userId, table.createdAt), index('idx_evidence_user_status').on(table.userId, table.validationStatus)]);

/** Tareas de trabajo declaradas por la persona; son insumo de orientación, no una evaluación. */
export const workActivities = sqliteTable('work_activities', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), title: text('title').notNull(), description: text('description').notNull(),
  status: text('status', { enum: ['in_progress', 'completed'] }).notNull(), startedAt: integer('started_at'), completedAt: integer('completed_at'),
  createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(),
}, (table) => [index('idx_work_activities_user_updated').on(table.userId, table.updatedAt), index('idx_work_activities_user_status').on(table.userId, table.status)]);

export const actionItems = sqliteTable('action_items', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), title: text('title').notNull(), description: text('description').notNull(),
  source: text('source', { enum: ['ai_draft', 'collaborator', 'leader'] }).notNull(), status: text('status', { enum: ['draft', 'pending_leader', 'approved', 'changes_requested', 'completed'] }).notNull(),
  dueAt: integer('due_at'), leaderFeedback: text('leader_feedback'), createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(),
}, (table) => [index('idx_action_items_user_status').on(table.userId, table.status), index('idx_action_items_due_at').on(table.dueAt)]);

export const careerEvents = sqliteTable('career_events', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), actorId: text('actor_id').notNull(), eventType: text('event_type').notNull(), title: text('title').notNull(), details: text('details').notNull(), occurredAt: integer('occurred_at').notNull(),
}, (table) => [index('idx_career_events_user_occurred').on(table.userId, table.occurredAt)]);

export const aiGuidance = sqliteTable('ai_guidance', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), promptCategory: text('prompt_category').notNull(), responseSummary: text('response_summary').notNull(), model: text('model').notNull(),
  status: text('status', { enum: ['draft', 'discarded', 'accepted_for_review'] }).notNull(), createdAt: integer('created_at').notNull(),
}, (table) => [index('idx_ai_guidance_user_created').on(table.userId, table.createdAt)]);

export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(), actorId: text('actor_id').notNull(), targetUserId: text('target_user_id').notNull(), action: text('action').notNull(), entityType: text('entity_type').notNull(), entityId: text('entity_id').notNull(), beforeJson: text('before_json'), afterJson: text('after_json'), createdAt: integer('created_at').notNull(),
}, (table) => [index('idx_audit_target_created').on(table.targetUserId, table.createdAt)]);

export const careerModelVersions = sqliteTable('career_model_versions', {
  id: text('id').primaryKey(), label: text('label').notNull(), sourceDigest: text('source_digest').notNull(), status: text('status', { enum: ['draft', 'active', 'archived'] }).notNull(), createdAt: integer('created_at').notNull(),
}, (table) => [uniqueIndex('idx_model_versions_label').on(table.label)]);

/**
 * Análisis orientativo de perfil generado por IA. Un registro por usuario (upsert).
 * Se reemplaza cada vez que la persona solicita un nuevo análisis con información actualizada.
 * Nunca modifica datos oficiales; siempre requiere validación humana.
 */
export const profileAnalyses = sqliteTable('profile_analyses', {
  userId: text('user_id').primaryKey(),
  currentRole: text('current_role').notNull(),
  nextRole: text('next_role'),
  analysisJson: text('analysis_json').notNull(),
  model: text('model').notNull(),
  modelVersion: text('model_version').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
