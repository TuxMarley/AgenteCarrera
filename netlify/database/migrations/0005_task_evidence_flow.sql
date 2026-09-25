-- Phase 3: evidences belong to a work task and tasks explicitly enter the review queue.
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS work_activity_id TEXT;
ALTER TABLE work_activities ADD COLUMN IF NOT EXISTS submitted_for_review BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_evidence_work_activity ON evidence(work_activity_id);
