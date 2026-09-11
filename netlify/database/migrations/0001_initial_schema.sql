CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  auth_user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('collaborator', 'leader', 'admin')),
  manager_id TEXT,
  "current_job_role" TEXT NOT NULL DEFAULT '',
  official_category TEXT,
  orientative_band TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);

CREATE TABLE IF NOT EXISTS career_profiles (
  user_id TEXT PRIMARY KEY,
  declared_job_role TEXT NOT NULL,
  work_context TEXT NOT NULL,
  development_goal TEXT NOT NULL,
  validation_status TEXT NOT NULL DEFAULT 'pending_review' CHECK (validation_status IN ('pending_review', 'validated', 'changes_requested')),
  reviewed_by TEXT,
  reviewed_at BIGINT,
  leader_feedback TEXT,
  reviewer_private_observation TEXT,
  completed_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_career_profiles_updated ON career_profiles(updated_at);
CREATE INDEX IF NOT EXISTS idx_career_profiles_status ON career_profiles(validation_status);

CREATE TABLE IF NOT EXISTS competencies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  model_version TEXT NOT NULL,
  UNIQUE (name, model_version)
);

CREATE TABLE IF NOT EXISTS user_competencies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  competency_id TEXT NOT NULL,
  self_level INTEGER NOT NULL,
  leader_level INTEGER,
  target_level INTEGER NOT NULL,
  coverage_percent INTEGER NOT NULL,
  validation_status TEXT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE (user_id, competency_id)
);

CREATE INDEX IF NOT EXISTS idx_user_competencies_user_status ON user_competencies(user_id, validation_status);

CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  occurred_at BIGINT NOT NULL,
  validation_status TEXT NOT NULL CHECK (validation_status IN ('draft', 'pending', 'validated', 'rejected')),
  object_key TEXT,
  original_filename TEXT,
  content_type TEXT,
  size_bytes BIGINT,
  leader_feedback TEXT,
  reviewed_by TEXT,
  reviewed_at BIGINT,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_evidence_user_created ON evidence(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_evidence_user_status ON evidence(user_id, validation_status);

CREATE TABLE IF NOT EXISTS work_activities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed')),
  started_at BIGINT,
  completed_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_work_activities_user_updated ON work_activities(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_work_activities_user_status ON work_activities(user_id, status);

CREATE TABLE IF NOT EXISTS action_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  due_at BIGINT,
  leader_feedback TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_action_items_user_status ON action_items(user_id, status);
CREATE INDEX IF NOT EXISTS idx_action_items_due_at ON action_items(due_at);

CREATE TABLE IF NOT EXISTS career_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT NOT NULL,
  occurred_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_career_events_user_occurred ON career_events(user_id, occurred_at);

CREATE TABLE IF NOT EXISTS ai_guidance (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  prompt_category TEXT NOT NULL,
  response_summary TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_guidance_user_created ON ai_guidance(user_id, created_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_target_created ON audit_log(target_user_id, created_at);

CREATE TABLE IF NOT EXISTS career_model_versions (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  source_digest TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS profile_analyses (
  user_id TEXT PRIMARY KEY,
  "current_role" TEXT NOT NULL,
  next_role TEXT,
  analysis_json TEXT NOT NULL,
  model TEXT NOT NULL,
  model_version TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
