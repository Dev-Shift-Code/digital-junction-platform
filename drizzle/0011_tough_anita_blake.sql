CREATE TABLE `paymentMethods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`methodType` varchar(64) NOT NULL,
	`displayName` varchar(120) NOT NULL,
	`logoUrl` text,
	`logoKey` varchar(512),
	`qrCodeUrl` text,
	`qrCodeKey` varchar(512),
	`instructions` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paymentMethods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `guestCheckoutRequests` ADD `paymentMethodId` int;--> statement-breakpoint
ALTER TABLE `guestCheckoutRequests` ADD `paymentMethodName` varchar(120);--> statement-breakpoint
ALTER TABLE `guestCheckoutRequests` ADD `paymentMethodType` varchar(64);--> statement-breakpoint
ALTER TABLE `guestCheckoutRequests` ADD `paymentInstructionsSnapshot` text;--> statement-breakpoint
ALTER TABLE `guestCheckoutRequests` ADD `paymentLogoUrlSnapshot` text;--> statement-breakpoint
ALTER TABLE `guestCheckoutRequests` ADD `paymentQrCodeUrlSnapshot` text;--> statement-breakpoint
ALTER TABLE `guestCheckoutRequests` ADD `paymentReference` varchar(180);--> statement-breakpoint
ALTER TABLE `guestCheckoutRequests` ADD `paymentProofUrl` text;--> statement-breakpoint
ALTER TABLE `guestCheckoutRequests` ADD `paymentProofKey` varchar(512);--> statement-breakpoint
ALTER TABLE `guestCheckoutRequests` ADD `paymentProofFileName` varchar(255);--> statement-breakpoint
ALTER TABLE `guestCheckoutRequests` ADD `paymentProofMimeType` varchar(160);--> statement-breakpoint
ALTER TABLE `guestCheckoutRequests` ADD `paymentProofSizeBytes` int;--> statement-breakpoint
ALTER TABLE `guestCheckoutRequests` ADD `paymentStatus` enum('awaiting_payment','submitted','verified','rejected') DEFAULT 'awaiting_payment' NOT NULL;--> statement-breakpoint
ALTER TABLE `guestCheckoutRequests` ADD `paymentReviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `guestCheckoutRequests` ADD `paymentReviewNote` text;--> statement-breakpoint
CREATE INDEX `payment_methods_active_idx` ON `paymentMethods` (`isActive`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `guest_checkout_payment_status_idx` ON `guestCheckoutRequests` (`paymentStatus`);