CREATE TABLE `admin_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cacheKey` varchar(200) NOT NULL,
	`data` json NOT NULL,
	`fetchedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `admin_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_cache_cacheKey_unique` UNIQUE(`cacheKey`)
);
--> statement-breakpoint
CREATE TABLE `admin_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionToken` text,
	`csrfToken` text,
	`isValid` boolean NOT NULL DEFAULT false,
	`lastLoginAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `approval_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requesterId` int NOT NULL,
	`approverId` int,
	`organizationId` int,
	`type` enum('cancel','transfer','exception','other') NOT NULL,
	`memberName` varchar(100),
	`memberId` varchar(64),
	`title` varchar(200) NOT NULL,
	`content` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`approverComment` text,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `approval_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int,
	`reportDate` date NOT NULL,
	`totalMembers` int,
	`newMembers` int DEFAULT 0,
	`cancelledMembers` int DEFAULT 0,
	`netChange` int DEFAULT 0,
	`revenueTarget` float,
	`revenueActual` float,
	`importantMatters` json,
	`scheduleAchievementRate` float,
	`completedBlocks` int DEFAULT 0,
	`totalBlocks` int DEFAULT 0,
	`tomorrowTasks` json,
	`memo` text,
	`status` enum('draft','submitted','approved') NOT NULL DEFAULT 'draft',
	`submittedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `member_interviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trainerId` int NOT NULL,
	`memberName` varchar(100) NOT NULL,
	`memberId` varchar(64),
	`interviewDate` date NOT NULL,
	`interviewType` enum('regular','complaint','renewal','cancellation','other') NOT NULL DEFAULT 'regular',
	`content` text,
	`followUpActions` json,
	`result` enum('positive','neutral','negative','pending') NOT NULL DEFAULT 'pending',
	`nextInterviewDate` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_interviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` enum('company','center','team','tf') NOT NULL,
	`parentId` int,
	`managerId` int,
	`description` text,
	`color` varchar(20),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedule_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`blockType` enum('todo','free','team_task','template','private') NOT NULL DEFAULT 'free',
	`todoId` int,
	`date` date NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`durationMinutes` int NOT NULL,
	`color` varchar(20),
	`note` text,
	`assignedBy` int,
	`organizationId` int,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedule_blocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedule_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`organizationId` int,
	`name` varchar(100) NOT NULL,
	`dayOfWeek` tinyint NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`title` varchar(200) NOT NULL,
	`blockType` enum('todo','free','team_task','private') NOT NULL DEFAULT 'free',
	`color` varchar(20),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `schedule_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `todo_week_splits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`todoId` int NOT NULL,
	`year` int NOT NULL,
	`week` int NOT NULL,
	`plannedMinutes` int NOT NULL DEFAULT 0,
	`actualMinutes` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `todo_week_splits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `todos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`periodType` enum('annual','half_year','quarter','monthly','weekly','daily','custom') NOT NULL DEFAULT 'monthly',
	`startDate` date,
	`endDate` date,
	`year` int,
	`month` int,
	`week` int,
	`estimatedMinutes` int DEFAULT 0,
	`actualMinutes` int DEFAULT 0,
	`status` enum('pending','in_progress','done','cancelled') NOT NULL DEFAULT 'pending',
	`priority` enum('urgent','high','medium','low') NOT NULL DEFAULT 'medium',
	`category` varchar(50),
	`assignedBy` int,
	`organizationId` int,
	`isTeamTask` boolean NOT NULL DEFAULT false,
	`parentTodoId` int,
	`completionRate` float DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `todos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int,
	`year` int NOT NULL,
	`week` int NOT NULL,
	`weekStartDate` date NOT NULL,
	`weekEndDate` date NOT NULL,
	`totalMembers` int,
	`weeklyNewMembers` int DEFAULT 0,
	`weeklyCancelledMembers` int DEFAULT 0,
	`weeklyRevenue` float,
	`revenueTarget` float,
	`todoCompletionRate` float,
	`completedTodos` int DEFAULT 0,
	`totalTodos` int DEFAULT 0,
	`achievements` json,
	`issues` json,
	`nextWeekPlan` json,
	`memo` text,
	`status` enum('draft','submitted','approved') NOT NULL DEFAULT 'draft',
	`submittedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `tempoRole` enum('owner','center_manager','sub_manager','trainer','viewer') DEFAULT 'trainer' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `teamId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `bizPtTrainerId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;