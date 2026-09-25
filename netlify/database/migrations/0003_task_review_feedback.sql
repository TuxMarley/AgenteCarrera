ALTER TABLE work_activities
  ADD COLUMN IF NOT EXISTS validation_status TEXT NOT NULL DEFAULT 'pending_review'
  CHECK (validation_status IN ('pending_review', 'validated', 'changes_requested'));

ALTER TABLE work_activities ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE work_activities ADD COLUMN IF NOT EXISTS reviewed_at BIGINT;

CREATE INDEX IF NOT EXISTS idx_work_activities_user_validation
  ON work_activities(user_id, validation_status);

CREATE TABLE IF NOT EXISTS work_activity_feedback (
  id TEXT PRIMARY KEY,
  work_activity_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_work_activity_feedback_activity_created
  ON work_activity_feedback(work_activity_id, created_at);
