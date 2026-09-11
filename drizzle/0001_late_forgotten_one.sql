CREATE TABLE `career_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`declared_job_role` text NOT NULL,
	`work_context` text NOT NULL,
	`development_goal` text NOT NULL,
	`completed_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_career_profiles_updated` ON `career_profiles` (`updated_at`);--> statement-breakpoint
CREATE TABLE `work_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`status` text NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_work_activities_user_updated` ON `work_activities` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_work_activities_user_status` ON `work_activities` (`user_id`,`status`);