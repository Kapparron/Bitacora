ALTER TABLE `routine_exercises` ADD `plan` text;
--> statement-breakpoint
UPDATE `routine_exercises` SET `plan` = rtrim(replace(hex(zeroblob(max(coalesce(`target_sets`, 3), 1))), '00', 'normal,'), ',');
