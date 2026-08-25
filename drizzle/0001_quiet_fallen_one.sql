CREATE TABLE `deliverables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(512),
	`isClientVisible` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deliverables_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(320) NOT NULL,
	`company` varchar(180),
	`serviceInterest` varchar(120),
	`message` text NOT NULL,
	`status` enum('new','contacted','closed') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text,
	`status` enum('upcoming','in_progress','completed') NOT NULL DEFAULT 'upcoming',
	`dueDate` timestamp,
	`completedAt` timestamp,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portalContents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`placement` enum('welcome','announcement','resource') NOT NULL DEFAULT 'announcement',
	`isPublished` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `portalContents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectClients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectClients_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_client_unique` UNIQUE(`projectId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`slug` varchar(180) NOT NULL,
	`serviceCategory` varchar(100) NOT NULL,
	`description` text,
	`status` enum('discovery','in_progress','review','complete','on_hold') NOT NULL DEFAULT 'discovery',
	`progress` int NOT NULL DEFAULT 0,
	`startDate` timestamp,
	`targetDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `projects_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE INDEX `deliverables_project_idx` ON `deliverables` (`projectId`);--> statement-breakpoint
CREATE INDEX `inquiries_status_idx` ON `inquiries` (`status`);--> statement-breakpoint
CREATE INDEX `milestones_project_idx` ON `milestones` (`projectId`);--> statement-breakpoint
CREATE INDEX `portal_content_placement_idx` ON `portalContents` (`placement`,`isPublished`);--> statement-breakpoint
CREATE INDEX `project_clients_user_idx` ON `projectClients` (`userId`);--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`);