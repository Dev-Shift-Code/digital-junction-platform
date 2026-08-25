DROP INDEX `digital_products_public_idx` ON `digitalProducts`;--> statement-breakpoint
ALTER TABLE `digitalProducts` ADD `deliveryNotes` text;--> statement-breakpoint
ALTER TABLE `digitalProducts` ADD `isFeatured` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `digital_products_public_idx` ON `digitalProducts` (`isPublished`,`isFeatured`,`category`);