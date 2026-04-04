CREATE TABLE `boards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`icon` varchar(50) DEFAULT 'MessageSquare',
	`allowedRoles` text DEFAULT ('all'),
	`canWrite` text DEFAULT ('all'),
	`sortOrder` int DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `boards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `external_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`url` text NOT NULL,
	`icon` varchar(50) DEFAULT 'Link',
	`category` varchar(50) DEFAULT 'custom',
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `external_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`invitedBy` int NOT NULL,
	`email` varchar(320),
	`tempoRole` enum('owner','center_manager','sub_manager','trainer','viewer') NOT NULL DEFAULT 'trainer',
	`teamId` int,
	`usedBy` int,
	`usedAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`boardId` int NOT NULL,
	`authorId` int NOT NULL,
	`title` varchar(300) NOT NULL,
	`content` text NOT NULL,
	`isPinned` boolean NOT NULL DEFAULT false,
	`viewCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`href` varchar(200) NOT NULL,
	`label` varchar(100) NOT NULL,
	`icon` varchar(50) DEFAULT 'Star',
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_favorites_id` PRIMARY KEY(`id`)
);
