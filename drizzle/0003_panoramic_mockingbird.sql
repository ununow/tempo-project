CREATE TABLE `favorite_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`blockType` enum('todo','free','team_task','private') NOT NULL DEFAULT 'free',
	`durationMinutes` int NOT NULL DEFAULT 60,
	`color` varchar(20),
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorite_blocks_id` PRIMARY KEY(`id`)
);
