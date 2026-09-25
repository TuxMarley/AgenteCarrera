-- Phase 4: private task feedback is recorded with a focused category.
ALTER TABLE work_activity_feedback
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general_ideas';
