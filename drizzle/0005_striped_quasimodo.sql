ALTER TABLE `organizations` ADD `tenantCode` varchar(20);--> statement-breakpoint
ALTER TABLE `todos` ADD `assignedTo` int;--> statement-breakpoint
ALTER TABLE `todos` ADD `carryOverReason` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `onboardingDone` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `organizations` ADD CONSTRAINT `organizations_tenantCode_unique` UNIQUE(`tenantCode`);