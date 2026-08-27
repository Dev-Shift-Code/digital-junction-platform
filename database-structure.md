# Digital Junction Development Co. — Database Structure

This reference lists the current application tables and their columns. It contains **no database records**. To protect the owner and customers, password hashes, identity-provider identifiers, storage keys, and direct protected-file URLs are intentionally omitted.

## Core identity and legacy project workspace

| Table | Purpose | Columns shown |
|---|---|---|
| `users` | Registered owner and customer accounts. | `id`, `name`, `email`, `loginMethod`, `role`, `createdAt`, `updatedAt`, `lastSignedIn` |
| `projects` | Legacy client-service project records. | `id`, `title`, `slug`, `serviceCategory`, `description`, `status`, `progress`, `startDate`, `targetDate`, `createdAt`, `updatedAt` |
| `projectClients` | Links a registered customer to a legacy service project. | `id`, `projectId`, `userId`, `createdAt` |
| `milestones` | Milestones under a service project. | `id`, `projectId`, `title`, `description`, `status`, `dueDate`, `completedAt`, `sortOrder`, `createdAt`, `updatedAt` |
| `deliverables` | Legacy project deliverable metadata. | `id`, `projectId`, `title`, `description`, `fileName`, `isClientVisible`, `createdAt`, `updatedAt` |
| `portalContents` | Legacy client-portal announcements, welcome content, and resources. | `id`, `title`, `body`, `placement`, `isPublished`, `sortOrder`, `createdAt`, `updatedAt` |

## Public website, projects, and contact

| Table | Purpose | Columns shown |
|---|---|---|
| `caseStudies` | Owner-managed projects shown on the public Projects page. | `id`, `title`, `slug`, `category`, `clientName`, `summary`, `problem`, `solution`, `results`, `technologies`, `coverImageUrl`, `isPublished`, `sortOrder`, `createdAt`, `updatedAt` |
| `publicSiteContent` | Owner-editable public-site section content. | `id`, `page`, `section`, `eyebrow`, `title`, `body`, `imageUrl`, `ctaLabel`, `ctaHref`, `isPublished`, `updatedAt` |
| `inquiries` | Public service/contact enquiries. | `id`, `name`, `email`, `company`, `serviceInterest`, `message`, `status`, `createdAt` |

## Digital products and controlled delivery

| Table | Purpose | Columns shown |
|---|---|---|
| `digitalProducts` | Owner-managed digital product catalogue. | `id`, `title`, `slug`, `category`, `summary`, `description`, `deliveryNotes`, `price`, `coverImageUrl`, `isPublished`, `isFeatured`, `isArchived`, `sortOrder`, `createdAt`, `updatedAt` |
| `productFiles` | Buyer delivery-file metadata for a digital product. | `id`, `productId`, `fileName`, `mimeType`, `sizeBytes`, `sortOrder`, `createdAt`, `updatedAt` |
| `productInquiries` | Product-specific enquiries. | `id`, `productId`, `name`, `email`, `message`, `status`, `createdAt` |
| `productAccess` | Legacy owner-granted customer product-access records. | `id`, `productId`, `userId`, `deliveryFileName`, `grantedByUserId`, `createdAt`, `updatedAt` |

## Manual payment and guest checkout

| Table | Purpose | Columns shown |
|---|---|---|
| `paymentMethods` | Owner-configured manual payment methods. | `id`, `methodType`, `displayName`, `logoUrl`, `qrCodeUrl`, `instructions`, `isActive`, `sortOrder`, `createdAt`, `updatedAt` |
| `guestCheckoutRequests` | Guest buyer requests with an immutable payment-method snapshot and manual review status. | `id`, `productId`, `name`, `email`, `company`, `message`, `status`, `paymentMethodId`, `paymentMethodName`, `paymentMethodType`, `paymentInstructionsSnapshot`, `paymentLogoUrlSnapshot`, `paymentQrCodeUrlSnapshot`, `paymentReference`, `paymentProofFileName`, `paymentProofMimeType`, `paymentProofSizeBytes`, `paymentStatus`, `paymentReviewedAt`, `paymentReviewNote`, `createdAt`, `updatedAt` |

## Database maintenance

| Table | Purpose | Columns shown |
|---|---|---|
| `__drizzle_migrations` | Internal migration history used to track applied schema changes. | Migration metadata only; not used for DJDC business records. |

> **Sensitive fields intentionally excluded:** account password hashes, third-party identity identifiers, storage object keys, and direct protected-file locations. The application keeps only storage references in the database; file bytes are not stored in database tables.
