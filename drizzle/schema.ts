import { boolean, decimal, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, table => [uniqueIndex("users_email_unique").on(table.email)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const projects = mysqlTable(
  "projects",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 180 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull().unique(),
    serviceCategory: varchar("serviceCategory", { length: 100 }).notNull(),
    description: text("description"),
    status: mysqlEnum("status", ["discovery", "in_progress", "review", "complete", "on_hold"])
      .default("discovery")
      .notNull(),
    progress: int("progress").default(0).notNull(),
    startDate: timestamp("startDate"),
    targetDate: timestamp("targetDate"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("projects_status_idx").on(table.status)],
);

export const projectClients = mysqlTable(
  "projectClients",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    userId: int("userId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("project_client_unique").on(table.projectId, table.userId),
    index("project_clients_user_idx").on(table.userId),
  ],
);

export const milestones = mysqlTable(
  "milestones",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description"),
    status: mysqlEnum("status", ["upcoming", "in_progress", "completed"]).default("upcoming").notNull(),
    dueDate: timestamp("dueDate"),
    completedAt: timestamp("completedAt"),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("milestones_project_idx").on(table.projectId)],
);

export const deliverables = mysqlTable(
  "deliverables",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description"),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    fileUrl: text("fileUrl").notNull(),
    fileKey: varchar("fileKey", { length: 512 }),
    isClientVisible: boolean("isClientVisible").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("deliverables_project_idx").on(table.projectId)],
);

export const portalContents = mysqlTable(
  "portalContents",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 180 }).notNull(),
    body: text("body").notNull(),
    placement: mysqlEnum("placement", ["welcome", "announcement", "resource"]).default("announcement").notNull(),
    isPublished: boolean("isPublished").default(false).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("portal_content_placement_idx").on(table.placement, table.isPublished)],
);

export const inquiries = mysqlTable(
  "inquiries",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    company: varchar("company", { length: 180 }),
    serviceInterest: varchar("serviceInterest", { length: 120 }),
    message: text("message").notNull(),
    status: mysqlEnum("status", ["new", "contacted", "closed"]).default("new").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("inquiries_status_idx").on(table.status)],
);

export const caseStudies = mysqlTable(
  "caseStudies",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 180 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull().unique(),
    category: varchar("category", { length: 100 }).notNull(),
    clientName: varchar("clientName", { length: 180 }),
    summary: text("summary").notNull(),
    problem: text("problem"),
    solution: text("solution"),
    results: text("results"),
    technologies: text("technologies"),
    coverImageUrl: text("coverImageUrl"),
    isPublished: boolean("isPublished").default(false).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("case_studies_public_idx").on(table.isPublished, table.category)],
);

export const digitalProducts = mysqlTable(
  "digitalProducts",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 180 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull().unique(),
    category: varchar("category", { length: 100 }).notNull(),
    summary: text("summary").notNull(),
    description: text("description"),
    deliveryNotes: text("deliveryNotes"),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    coverImageUrl: text("coverImageUrl"),
    isPublished: boolean("isPublished").default(false).notNull(),
    isFeatured: boolean("isFeatured").default(false).notNull(),
    isArchived: boolean("isArchived").default(false).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("digital_products_public_idx").on(table.isPublished, table.isArchived, table.isFeatured, table.category)],
);

export const productInquiries = mysqlTable(
  "productInquiries",
  {
    id: int("id").autoincrement().primaryKey(),
    productId: int("productId").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    message: text("message").notNull(),
    status: mysqlEnum("status", ["new", "contacted", "closed"]).default("new").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("product_inquiries_product_idx").on(table.productId), index("product_inquiries_status_idx").on(table.status)],
);
