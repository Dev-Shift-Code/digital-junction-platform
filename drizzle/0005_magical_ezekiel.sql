DROP INDEX `digital_products_public_idx` ON `digitalProducts`;--> statement-breakpoint
ALTER TABLE `digitalProducts` ADD `isArchived` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `digital_products_public_idx` ON `digitalProducts` (`isPublished`,`isArchived`,`isFeatured`,`category`);