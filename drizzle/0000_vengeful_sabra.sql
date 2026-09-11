CREATE TABLE `action_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`due_at` integer,
	`leader_feedback` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_action_items_user_status` ON `action_items` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_action_items_due_at` ON `action_items` (`due_at`);--> statement-breakpoint
CREATE TABLE `ai_guidance` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`prompt_category` text NOT NULL,
	`response_summary` text NOT NULL,
	`model` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ai_guidance_user_created` ON `ai_guidance` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`target_user_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_target_created` ON `audit_log` (`target_user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `career_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`event_type` text NOT NULL,
	`title` text NOT NULL,
	`details` text NOT NULL,
	`occurred_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_career_events_user_occurred` ON `career_events` (`user_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `career_model_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`source_digest` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_model_versions_label` ON `career_model_versions` (`label`);--> statement-breakpoint
CREATE TABLE `competencies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`model_version` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_competencies_name_version` ON `competencies` (`name`,`model_version`);--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`evidence_type` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`validation_status` text NOT NULL,
	`object_key` text,
	`original_filename` text,
	`content_type` text,
	`size_bytes` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_evidence_user_created` ON `evidence` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_evidence_user_status` ON `evidence` (`user_id`,`validation_status`);--> statement-breakpoint
CREATE TABLE `user_competencies` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`competency_id` text NOT NULL,
	`self_level` integer NOT NULL,
	`leader_level` integer,
	`target_level` integer NOT NULL,
	`coverage_percent` integer NOT NULL,
	`validation_status` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_user_competencies_user_competency` ON `user_competencies` (`user_id`,`competency_id`);--> statement-breakpoint
CREATE INDEX `idx_user_competencies_user_status` ON `user_competencies` (`user_id`,`validation_status`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`auth_user_id` text NOT NULL,
	`email` text NOT NULL,
	`full_name` text NOT NULL,
	`role` text NOT NULL,
	`manager_id` text,
	`current_job_role` text NOT NULL,
	`official_category` text,
	`orientative_band` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_auth_user_id` ON `users` (`auth_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_manager_id` ON `users` (`manager_id`);