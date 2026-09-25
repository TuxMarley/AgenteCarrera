CREATE TABLE `work_activity_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`work_activity_id` text NOT NULL,
	`author_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_work_activity_feedback_activity_created` ON `work_activity_feedback` (`work_activity_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `work_activities` ADD `validation_status` text DEFAULT 'pending_review' NOT NULL;--> statement-breakpoint
ALTER TABLE `work_activities` ADD `reviewed_by` text;--> statement-breakpoint
ALTER TABLE `work_activities` ADD `reviewed_at` integer;--> statement-breakpoint
CREATE INDEX `idx_work_activities_user_validation` ON `work_activities` (`user_id`,`validation_status`);