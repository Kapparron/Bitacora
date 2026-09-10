ALTER TABLE `routines` ADD `schedule_type` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `routines` ADD `schedule_weekdays` text;--> statement-breakpoint
ALTER TABLE `routines` ADD `schedule_interval_days` integer;--> statement-breakpoint
ALTER TABLE `routines` ADD `schedule_anchor` text;