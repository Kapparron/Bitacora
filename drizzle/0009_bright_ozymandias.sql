CREATE TABLE `meals` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer
);

--> statement-breakpoint
INSERT INTO `meals` (`id`, `name`, `position`) VALUES ('breakfast', 'Desayuno', 0), ('lunch', 'Comida', 1), ('dinner', 'Cena', 2), ('snack', 'Snacks', 3);
