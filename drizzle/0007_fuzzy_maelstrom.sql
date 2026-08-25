CREATE TABLE `productAccess` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`userId` int NOT NULL,
	`deliveryUrl` text NOT NULL,
	`deliveryFileName` varchar(255) NOT NULL,
	`grantedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productAccess_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_access_user_product_unique` UNIQUE(`productId`,`userId`)
);
--> statement-breakpoint
CREATE INDEX `product_access_user_idx` ON `productAccess` (`userId`);--> statement-breakpoint
CREATE INDEX `product_access_product_idx` ON `productAccess` (`productId`);