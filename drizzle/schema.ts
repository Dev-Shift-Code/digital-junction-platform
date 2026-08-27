import { sql } from "drizzle-orm";
import { index, integer, numeric, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const createdAt = () => integer({ mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`);
const updatedAt = () => integer({ mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`).$onUpdate(() => new Date());

export const users = sqliteTable("users", {
  id: integer().primaryKey({ autoIncrement: true }), openId: text().notNull(), name: text(), email: text(), passwordHash: text(), loginMethod: text(),
  role: text({ enum: ["user", "admin"] }).notNull().default("user"), createdAt: createdAt(), updatedAt: updatedAt(), lastSignedIn: integer({ mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
}, table => [uniqueIndex("users_open_id_unique").on(table.openId), uniqueIndex("users_email_unique").on(table.email)]);
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const projects = sqliteTable("projects", {
  id: integer().primaryKey({ autoIncrement: true }), title: text().notNull(), slug: text().notNull(), serviceCategory: text().notNull(), description: text(),
  status: text({ enum: ["discovery", "in_progress", "review", "complete", "on_hold"] }).notNull().default("discovery"), progress: integer().notNull().default(0), startDate: integer({ mode: "timestamp_ms" }), targetDate: integer({ mode: "timestamp_ms" }), createdAt: createdAt(), updatedAt: updatedAt(),
}, table => [uniqueIndex("projects_slug_unique").on(table.slug), index("projects_status_idx").on(table.status)]);

export const projectClients = sqliteTable("projectClients", {
  id: integer().primaryKey({ autoIncrement: true }), projectId: integer().notNull(), userId: integer().notNull(), createdAt: createdAt(),
}, table => [uniqueIndex("project_client_unique").on(table.projectId, table.userId), index("project_clients_user_idx").on(table.userId)]);

export const milestones = sqliteTable("milestones", {
  id: integer().primaryKey({ autoIncrement: true }), projectId: integer().notNull(), title: text().notNull(), description: text(), status: text({ enum: ["upcoming", "in_progress", "completed"] }).notNull().default("upcoming"), dueDate: integer({ mode: "timestamp_ms" }), completedAt: integer({ mode: "timestamp_ms" }), sortOrder: integer().notNull().default(0), createdAt: createdAt(), updatedAt: updatedAt(),
}, table => [index("milestones_project_idx").on(table.projectId)]);

export const deliverables = sqliteTable("deliverables", {
  id: integer().primaryKey({ autoIncrement: true }), projectId: integer().notNull(), title: text().notNull(), description: text(), fileName: text().notNull(), fileUrl: text().notNull(), fileKey: text(), isClientVisible: integer({ mode: "boolean" }).notNull().default(true), createdAt: createdAt(), updatedAt: updatedAt(),
}, table => [index("deliverables_project_idx").on(table.projectId)]);

export const portalContents = sqliteTable("portalContents", {
  id: integer().primaryKey({ autoIncrement: true }), title: text().notNull(), body: text().notNull(), placement: text({ enum: ["welcome", "announcement", "resource"] }).notNull().default("announcement"), isPublished: integer({ mode: "boolean" }).notNull().default(false), sortOrder: integer().notNull().default(0), createdAt: createdAt(), updatedAt: updatedAt(),
}, table => [index("portal_content_placement_idx").on(table.placement, table.isPublished)]);

export const inquiries = sqliteTable("inquiries", {
  id: integer().primaryKey({ autoIncrement: true }), name: text().notNull(), email: text().notNull(), company: text(), serviceInterest: text(), message: text().notNull(), status: text({ enum: ["new", "contacted", "closed"] }).notNull().default("new"), createdAt: createdAt(),
}, table => [index("inquiries_status_idx").on(table.status)]);

export const caseStudies = sqliteTable("caseStudies", {
  id: integer().primaryKey({ autoIncrement: true }), title: text().notNull(), slug: text().notNull(), category: text().notNull(), clientName: text(), summary: text().notNull(), problem: text(), solution: text(), results: text(), technologies: text(), coverImageUrl: text(), isPublished: integer({ mode: "boolean" }).notNull().default(false), sortOrder: integer().notNull().default(0), createdAt: createdAt(), updatedAt: updatedAt(),
}, table => [uniqueIndex("case_studies_slug_unique").on(table.slug), index("case_studies_public_idx").on(table.isPublished, table.category)]);

export const digitalProducts = sqliteTable("digitalProducts", {
  id: integer().primaryKey({ autoIncrement: true }), title: text().notNull(), slug: text().notNull(), category: text().notNull(), summary: text().notNull(), description: text(), deliveryNotes: text(), price: numeric().notNull(), coverImageUrl: text(), isPublished: integer({ mode: "boolean" }).notNull().default(false), isFeatured: integer({ mode: "boolean" }).notNull().default(false), isArchived: integer({ mode: "boolean" }).notNull().default(false), sortOrder: integer().notNull().default(0), createdAt: createdAt(), updatedAt: updatedAt(),
}, table => [uniqueIndex("digital_products_slug_unique").on(table.slug), index("digital_products_public_idx").on(table.isPublished, table.isArchived, table.isFeatured, table.category)]);

export const productAccess = sqliteTable("productAccess", {
  id: integer().primaryKey({ autoIncrement: true }), productId: integer().notNull(), userId: integer().notNull(), deliveryUrl: text().notNull(), deliveryFileName: text().notNull(), grantedByUserId: integer().notNull(), createdAt: createdAt(), updatedAt: updatedAt(),
}, table => [uniqueIndex("product_access_user_product_unique").on(table.productId, table.userId), index("product_access_user_idx").on(table.userId), index("product_access_product_idx").on(table.productId)]);

export const productInquiries = sqliteTable("productInquiries", {
  id: integer().primaryKey({ autoIncrement: true }), productId: integer().notNull(), name: text().notNull(), email: text().notNull(), message: text().notNull(), status: text({ enum: ["new", "contacted", "closed"] }).notNull().default("new"), createdAt: createdAt(),
}, table => [index("product_inquiries_product_idx").on(table.productId), index("product_inquiries_status_idx").on(table.status)]);

export const paymentMethods = sqliteTable("paymentMethods", {
  id: integer().primaryKey({ autoIncrement: true }), methodType: text().notNull(), displayName: text().notNull(), logoUrl: text(), logoKey: text(), qrCodeUrl: text(), qrCodeKey: text(), instructions: text().notNull(), isActive: integer({ mode: "boolean" }).notNull().default(true), sortOrder: integer().notNull().default(0), createdAt: createdAt(), updatedAt: updatedAt(),
}, table => [index("payment_methods_active_idx").on(table.isActive, table.sortOrder)]);

export const guestCheckoutRequests = sqliteTable("guestCheckoutRequests", {
  id: integer().primaryKey({ autoIncrement: true }), productId: integer().notNull(), name: text().notNull(), email: text().notNull(), company: text(), message: text(), status: text({ enum: ["submitted", "contacted", "fulfilled", "cancelled"] }).notNull().default("submitted"), paymentMethodId: integer(), paymentMethodName: text(), paymentMethodType: text(), paymentInstructionsSnapshot: text(), paymentLogoUrlSnapshot: text(), paymentQrCodeUrlSnapshot: text(), paymentReference: text(), paymentProofUrl: text(), paymentProofKey: text(), paymentProofFileName: text(), paymentProofMimeType: text(), paymentProofSizeBytes: integer(), paymentStatus: text({ enum: ["awaiting_payment", "submitted", "verified", "rejected"] }).notNull().default("awaiting_payment"), paymentReviewedAt: integer({ mode: "timestamp_ms" }), paymentReviewNote: text(), createdAt: createdAt(), updatedAt: updatedAt(),
}, table => [index("guest_checkout_product_idx").on(table.productId), index("guest_checkout_status_idx").on(table.status), index("guest_checkout_payment_status_idx").on(table.paymentStatus)]);

export const productFiles = sqliteTable("productFiles", {
  id: integer().primaryKey({ autoIncrement: true }), productId: integer().notNull(), fileName: text().notNull(), fileUrl: text().notNull(), fileKey: text(), mimeType: text(), sizeBytes: integer(), sortOrder: integer().notNull().default(0), createdAt: createdAt(), updatedAt: updatedAt(),
}, table => [index("product_files_product_idx").on(table.productId)]);

export const publicSiteContent = sqliteTable("publicSiteContent", {
  id: integer().primaryKey({ autoIncrement: true }), page: text().notNull(), section: text().notNull(), eyebrow: text(), title: text(), body: text(), imageUrl: text(), ctaLabel: text(), ctaHref: text(), isPublished: integer({ mode: "boolean" }).notNull().default(true), updatedAt: updatedAt(),
}, table => [uniqueIndex("public_site_content_page_section_unique").on(table.page, table.section), index("public_site_content_page_idx").on(table.page, table.isPublished)]);
