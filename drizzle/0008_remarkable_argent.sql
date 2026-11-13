CREATE TABLE `task_checks` (
	`task_id` text NOT NULL,
	`date` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	PRIMARY KEY(`task_id`, `date`),
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `schedule_type` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `schedule_weekdays` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `schedule_interval_days` integer;--> statement-breakpoint
ALTER TABLE `tasks` ADD `schedule_anchor` text;