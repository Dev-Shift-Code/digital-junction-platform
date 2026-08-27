CREATE TABLE `productFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(512),
	`mimeType` varchar(160),
	`sizeBytes` int,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `publicSiteContent` (
	`id` int AUTO_INCREMENT NOT NULL,
	`page` varchar(64) NOT NULL,
	`section` varchar(64) NOT NULL,
	`title` varchar(300),
	`body` text,
	`imageUrl` text,
	`ctaLabel` varchar(120),
	`ctaHref` varchar(500),
	`isPublished` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `publicSiteContent_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_site_content_page_section_unique` UNIQUE(`page`,`section`)
);
--> statement-breakpoint
CREATE INDEX `product_files_product_idx` ON `productFiles` (`productId`);--> statement-breakpoint
CREATE INDEX `public_site_content_page_idx` ON `publicSiteContent` (`page`,`isPublished`);