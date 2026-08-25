CREATE TABLE `digitalProducts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`slug` varchar(180) NOT NULL,
	`category` varchar(100) NOT NULL,
	`summary` text NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`coverImageUrl` text,
	`isPublished` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `digitalProducts_id` PRIMARY KEY(`id`),
	CONSTRAINT `digitalProducts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `productInquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(320) NOT NULL,
	`message` text NOT NULL,
	`status` enum('new','contacted','closed') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `productInquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `digital_products_public_idx` ON `digitalProducts` (`isPublished`,`category`);--> statement-breakpoint
CREATE INDEX `product_inquiries_product_idx` ON `productInquiries` (`productId`);--> statement-breakpoint
CREATE INDEX `product_inquiries_status_idx` ON `productInquiries` (`status`);