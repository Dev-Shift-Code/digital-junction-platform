CREATE TABLE `caseStudies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`slug` varchar(180) NOT NULL,
	`category` varchar(100) NOT NULL,
	`clientName` varchar(180),
	`summary` text NOT NULL,
	`problem` text,
	`solution` text,
	`results` text,
	`technologies` text,
	`coverImageUrl` text,
	`isPublished` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `caseStudies_id` PRIMARY KEY(`id`),
	CONSTRAINT `caseStudies_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE INDEX `case_studies_public_idx` ON `caseStudies` (`isPublished`,`category`);