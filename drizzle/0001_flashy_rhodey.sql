DROP INDEX `exercises_name_unique`;--> statement-breakpoint
ALTER TABLE `exercises` ADD `external_id` text;--> statement-breakpoint
ALTER TABLE `exercises` ADD `name_en` text;--> statement-breakpoint
ALTER TABLE `exercises` ADD `body_part` text;--> statement-breakpoint
ALTER TABLE `exercises` ADD `steps` text;--> statement-breakpoint
ALTER TABLE `exercises` ADD `image_path` text;--> statement-breakpoint
ALTER TABLE `exercises` ADD `gif_path` text;--> statement-breakpoint
CREATE UNIQUE INDEX `exercises_external_id_unique` ON `exercises` (`external_id`);