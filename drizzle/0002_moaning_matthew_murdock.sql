CREATE TABLE `team_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`userId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `team_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`managerId` int NOT NULL,
	`organizationId` int,
	`color` varchar(20),
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trainer_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trainerId` int NOT NULL,
	`memberUid` varchar(64) NOT NULL,
	`memberName` varchar(100),
	`memberPhone` varchar(20),
	`ptType` varchar(50),
	`remainingSessions` int,
	`lastSyncAt` timestamp,
	`memo` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trainer_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `admin_sessions` ADD `cookieJar` text;--> statement-breakpoint
ALTER TABLE `todos` ADD `isCarriedOver` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `todos` ADD `originalDate` date;