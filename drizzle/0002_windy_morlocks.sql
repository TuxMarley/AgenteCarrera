CREATE TABLE `profile_analyses` (
	`user_id` text PRIMARY KEY NOT NULL,
	`current_role` text NOT NULL,
	`next_role` text,
	`analysis_json` text NOT NULL,
	`model` text NOT NULL,
	`model_version` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
