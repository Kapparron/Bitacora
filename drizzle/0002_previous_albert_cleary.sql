-- Removes the routine folders feature.
--
-- `folder_id` carries a foreign key, so SQLite refuses to drop the column and
-- the table has to be rebuilt. Drizzle applies migrations inside a transaction,
-- where `PRAGMA foreign_keys=OFF` is a no-op, so dropping `routines` cascades
-- its exercises away and nulls the sessions' back-reference. Both are saved
-- first and restored afterwards.
CREATE TABLE `__routine_exercises_backup` AS SELECT * FROM `routine_exercises`;--> statement-breakpoint
CREATE TABLE `__workouts_routine_backup` AS SELECT `id`, `routine_id` FROM `workouts` WHERE `routine_id` IS NOT NULL;--> statement-breakpoint
CREATE TABLE `__new_routines` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`notes` text,
	`position` integer DEFAULT 0 NOT NULL,
	`last_performed_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_routines`("id", "name", "notes", "position", "last_performed_at", "created_at", "updated_at", "deleted_at") SELECT "id", "name", "notes", "position", "last_performed_at", "created_at", "updated_at", "deleted_at" FROM `routines`;--> statement-breakpoint
DROP TABLE `routines`;--> statement-breakpoint
ALTER TABLE `__new_routines` RENAME TO `routines`;--> statement-breakpoint
CREATE INDEX `routines_position_idx` ON `routines` (`position`);--> statement-breakpoint
INSERT OR IGNORE INTO `routine_exercises` SELECT * FROM `__routine_exercises_backup`;--> statement-breakpoint
UPDATE `workouts` SET `routine_id` = (SELECT `routine_id` FROM `__workouts_routine_backup` WHERE `__workouts_routine_backup`.`id` = `workouts`.`id`) WHERE `id` IN (SELECT `id` FROM `__workouts_routine_backup`);--> statement-breakpoint
DROP TABLE `__routine_exercises_backup`;--> statement-breakpoint
DROP TABLE `__workouts_routine_backup`;--> statement-breakpoint
DROP TABLE `routine_folders`;
