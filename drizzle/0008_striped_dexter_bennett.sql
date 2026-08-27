CREATE TABLE `guestCheckoutRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(320) NOT NULL,
	`company` varchar(180),
	`message` text,
	`status` enum('submitted','contacted','fulfilled','cancelled') NOT NULL DEFAULT 'submitted',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guestCheckoutRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `guest_checkout_product_idx` ON `guestCheckoutRequests` (`productId`);--> statement-breakpoint
CREATE INDEX `guest_checkout_status_idx` ON `guestCheckoutRequests` (`status`);