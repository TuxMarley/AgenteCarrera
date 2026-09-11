ALTER TABLE `career_profiles` ADD `validation_status` text DEFAULT 'pending_review' NOT NULL;--> statement-breakpoint
ALTER TABLE `career_profiles` ADD `reviewed_by` text;--> statement-breakpoint
ALTER TABLE `career_profiles` ADD `reviewed_at` integer;--> statement-breakpoint
ALTER TABLE `career_profiles` ADD `leader_feedback` text;--> statement-breakpoint
CREATE INDEX `idx_career_profiles_status` ON `career_profiles` (`validation_status`);