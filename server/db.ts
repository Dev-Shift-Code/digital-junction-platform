import { and, asc, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../drizzle/schema";
import { caseStudies, deliverables, digitalProducts, guestCheckoutRequests, InsertUser, inquiries, milestones, paymentDeliveryEntitlements, paymentMethods, paymentProviderSettings, paymentTransactions, paymentWebhookEvents, portalContents, productAccess, productFiles, productInquiries, projectClients, projects, publicSiteContent, users, voucherProducts, vouchers } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

/** Configure the primary application database from the Cloudflare Workers D1 binding. */
export function configureD1(database: unknown) {
  _db = drizzle(database as any, { schema });
}

// The Worker entry point configures D1 once per isolate. Tests may replace this module.
export async function getDb() {
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet as any,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createLocalUser(input: { openId: string; email: string; passwordHash: string; role?: "user" | "admin"; name?: string | null }) {
  const db = requireDatabase(await getDb());
  await db.insert(users).values({
    openId: input.openId,
    email: input.email,
    name: input.name ?? input.email.split("@")[0] ?? "Digital Junction customer",
    passwordHash: input.passwordHash,
    loginMethod: "digital-junction",
    role: input.role ?? "user",
    lastSignedIn: new Date(),
  });
  const user = await getUserByOpenId(input.openId);
  if (!user) throw new Error("Unable to create account");
  return user;
}

export async function hasAdminUser() {
  const db = requireDatabase(await getDb());
  const result = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
  return Boolean(result[0]);
}

export async function recordUserSignIn(openId: string) {
  const db = requireDatabase(await getDb());
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.openId, openId));
}

export async function setUserPassword(userId: number, passwordHash: string) {
  const db = requireDatabase(await getDb());
  await db.update(users).set({ passwordHash, loginMethod: "digital-junction" }).where(eq(users.id, userId));
}

/** Promotes a token-verified recovery account to the owner role without touching unrelated users. */
export async function promoteUserToAdmin(userId: number) {
  const db = requireDatabase(await getDb());
  await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
}

function requireDatabase<T>(database: T | null): T {
  if (!database) throw new Error("Database is not available");
  return database;
}

export async function getClientProjects(userId: number) {
  const db = requireDatabase(await getDb());
  return db
    .select({ project: projects })
    .from(projectClients)
    .innerJoin(projects, eq(projectClients.projectId, projects.id))
    .where(eq(projectClients.userId, userId))
    .orderBy(desc(projects.updatedAt));
}

export async function getAllProjects() {
  const db = requireDatabase(await getDb());
  return db.select().from(projects).orderBy(desc(projects.updatedAt));
}

export async function getClientProjectDetail(userId: number, projectId: number) {
  const db = requireDatabase(await getDb());
  const membership = await db
    .select({ project: projects })
    .from(projectClients)
    .innerJoin(projects, eq(projectClients.projectId, projects.id))
    .where(and(eq(projectClients.userId, userId), eq(projectClients.projectId, projectId)))
    .limit(1);
  if (!membership[0]) return null;

  const [projectMilestones, projectDeliverables] = await Promise.all([
    db.select().from(milestones).where(eq(milestones.projectId, projectId)).orderBy(asc(milestones.sortOrder)),
    db
      .select()
      .from(deliverables)
      .where(and(eq(deliverables.projectId, projectId), eq(deliverables.isClientVisible, true)))
      .orderBy(desc(deliverables.createdAt)),
  ]);
  return { project: membership[0].project, milestones: projectMilestones, deliverables: projectDeliverables };
}

export async function getPublishedPortalContent() {
  const db = requireDatabase(await getDb());
  return db
    .select()
    .from(portalContents)
    .where(eq(portalContents.isPublished, true))
    .orderBy(asc(portalContents.sortOrder), desc(portalContents.createdAt));
}

export async function getAllPortalContent() {
  const db = requireDatabase(await getDb());
  return db.select().from(portalContents).orderBy(asc(portalContents.sortOrder), desc(portalContents.createdAt));
}

export async function getClientUsers() {
  const db = requireDatabase(await getDb());
  return db.select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt }).from(users).where(eq(users.role, "user")).orderBy(asc(users.name));
}

export async function createProject(values: typeof projects.$inferInsert) {
  const db = requireDatabase(await getDb());
  const result = await db.insert(projects).values(values);
  const created = await db.select().from(projects).where(eq(projects.id, Number(result.meta.last_row_id))).limit(1);
  return created[0];
}

export async function updateProject(projectId: number, values: Partial<typeof projects.$inferInsert>) {
  const db = requireDatabase(await getDb());
  await db.update(projects).set(values).where(eq(projects.id, projectId));
  const updated = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  return updated[0];
}

export async function assignClientToProject(projectId: number, userId: number) {
  const db = requireDatabase(await getDb());
  await db.insert(projectClients).values({ projectId, userId }).onConflictDoUpdate({ target: [projectClients.projectId, projectClients.userId], set: { userId } });
}

export async function createMilestone(values: typeof milestones.$inferInsert) {
  const db = requireDatabase(await getDb());
  const result = await db.insert(milestones).values(values);
  const created = await db.select().from(milestones).where(eq(milestones.id, Number(result.meta.last_row_id))).limit(1);
  return created[0];
}

export async function updateMilestone(milestoneId: number, values: Partial<typeof milestones.$inferInsert>) {
  const db = requireDatabase(await getDb());
  await db.update(milestones).set(values).where(eq(milestones.id, milestoneId));
  const updated = await db.select().from(milestones).where(eq(milestones.id, milestoneId)).limit(1);
  return updated[0];
}

export async function createDeliverable(values: typeof deliverables.$inferInsert) {
  const db = requireDatabase(await getDb());
  const result = await db.insert(deliverables).values(values);
  const created = await db.select().from(deliverables).where(eq(deliverables.id, Number(result.meta.last_row_id))).limit(1);
  return created[0];
}

export async function savePortalContent(values: typeof portalContents.$inferInsert, contentId?: number) {
  const db = requireDatabase(await getDb());
  if (contentId) {
    await db.update(portalContents).set(values).where(eq(portalContents.id, contentId));
    const updated = await db.select().from(portalContents).where(eq(portalContents.id, contentId)).limit(1);
    return updated[0];
  }
  const result = await db.insert(portalContents).values(values);
  const created = await db.select().from(portalContents).where(eq(portalContents.id, Number(result.meta.last_row_id))).limit(1);
  return created[0];
}

export async function createInquiry(values: typeof inquiries.$inferInsert) {
  const db = requireDatabase(await getDb());
  const result = await db.insert(inquiries).values(values);
  const created = await db.select().from(inquiries).where(eq(inquiries.id, Number(result.meta.last_row_id))).limit(1);
  return created[0];
}

export async function getAllInquiries() {
  const db = requireDatabase(await getDb());
  return db.select().from(inquiries).orderBy(desc(inquiries.createdAt));
}

export async function updateInquiryStatus(inquiryId: number, status: "new" | "contacted" | "closed") {
  const db = requireDatabase(await getDb());
  await db.update(inquiries).set({ status }).where(eq(inquiries.id, inquiryId));
  const updated = await db.select().from(inquiries).where(eq(inquiries.id, inquiryId)).limit(1);
  return updated[0] || null;
}

export async function getAdminProjectDetail(projectId: number) {
  const db = requireDatabase(await getDb());
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project[0]) return null;
  const [projectMilestones, projectDeliverables] = await Promise.all([
    db.select().from(milestones).where(eq(milestones.projectId, projectId)).orderBy(asc(milestones.sortOrder)),
    db.select().from(deliverables).where(eq(deliverables.projectId, projectId)).orderBy(desc(deliverables.createdAt)),
  ]);
  return { project: project[0], milestones: projectMilestones, deliverables: projectDeliverables };
}

export async function updateDeliverable(deliverableId: number, values: Partial<typeof deliverables.$inferInsert>) {
  const db = requireDatabase(await getDb());
  await db.update(deliverables).set(values).where(eq(deliverables.id, deliverableId));
  const updated = await db.select().from(deliverables).where(eq(deliverables.id, deliverableId)).limit(1);
  return updated[0];
}

export async function getPublishedCaseStudies() {
  const db = requireDatabase(await getDb());
  return db.select().from(caseStudies).where(eq(caseStudies.isPublished, true)).orderBy(asc(caseStudies.sortOrder), desc(caseStudies.createdAt));
}

export async function getAllCaseStudies() {
  const db = requireDatabase(await getDb());
  return db.select().from(caseStudies).orderBy(asc(caseStudies.sortOrder), desc(caseStudies.createdAt));
}

export async function getCaseStudyById(caseStudyId: number) {
  const db = requireDatabase(await getDb());
  const rows = await db.select().from(caseStudies).where(eq(caseStudies.id, caseStudyId)).limit(1);
  return rows[0] ?? null;
}

export async function saveCaseStudy(values: typeof caseStudies.$inferInsert, caseStudyId?: number) {
  const db = requireDatabase(await getDb());
  if (caseStudyId) {
    await db.update(caseStudies).set(values).where(eq(caseStudies.id, caseStudyId));
    const updated = await db.select().from(caseStudies).where(eq(caseStudies.id, caseStudyId)).limit(1);
    return updated[0];
  }
  const result = await db.insert(caseStudies).values(values);
  const created = await db.select().from(caseStudies).where(eq(caseStudies.id, Number(result.meta.last_row_id))).limit(1);
  return created[0];
}

export async function updateCaseStudyCover(caseStudyId: number, coverImageUrl: string | null) {
  const db = requireDatabase(await getDb());
  await db.update(caseStudies).set({ coverImageUrl }).where(eq(caseStudies.id, caseStudyId));
  const updated = await db.select().from(caseStudies).where(eq(caseStudies.id, caseStudyId)).limit(1);
  return updated[0];
}

export async function deleteCaseStudy(caseStudyId: number) {
  const db = requireDatabase(await getDb());
  await db.delete(caseStudies).where(eq(caseStudies.id, caseStudyId));
  return { deleted: true as const };
}

export async function getPublishedDigitalProducts() {
  const db = requireDatabase(await getDb());
  return db.select().from(digitalProducts).where(and(eq(digitalProducts.isPublished, true), eq(digitalProducts.isArchived, false))).orderBy(desc(digitalProducts.isFeatured), asc(digitalProducts.sortOrder), desc(digitalProducts.createdAt));
}

export async function getDigitalProductBySlug(slug: string) {
  const db = requireDatabase(await getDb());
  const product = await db.select().from(digitalProducts).where(and(eq(digitalProducts.slug, slug), eq(digitalProducts.isPublished, true), eq(digitalProducts.isArchived, false))).limit(1);
  return product[0] ?? null;
}

export async function getPublishedDigitalProductById(productId: number) {
  const db = requireDatabase(await getDb());
  const product = await db.select().from(digitalProducts).where(and(eq(digitalProducts.id, productId), eq(digitalProducts.isPublished, true), eq(digitalProducts.isArchived, false))).limit(1);
  return product[0] ?? null;
}

export async function getDigitalProductById(productId: number) {
  const db = requireDatabase(await getDb());
  const product = await db.select().from(digitalProducts).where(eq(digitalProducts.id, productId)).limit(1);
  return product[0] ?? null;
}

export async function getAllDigitalProducts() {
  const db = requireDatabase(await getDb());
  return db.select().from(digitalProducts).orderBy(asc(digitalProducts.sortOrder), desc(digitalProducts.createdAt));
}

export async function saveDigitalProduct(values: typeof digitalProducts.$inferInsert, productId?: number) {
  const db = requireDatabase(await getDb());
  if (productId) {
    await db.update(digitalProducts).set(values).where(eq(digitalProducts.id, productId));
    const updated = await db.select().from(digitalProducts).where(eq(digitalProducts.id, productId)).limit(1);
    return updated[0];
  }
  const result = await db.insert(digitalProducts).values(values);
  const created = await db.select().from(digitalProducts).where(eq(digitalProducts.id, Number(result.meta.last_row_id))).limit(1);
  return created[0];
}

export async function updateDigitalProductCover(productId: number, coverImageUrl: string | null) {
  const db = requireDatabase(await getDb());
  await db.update(digitalProducts).set({ coverImageUrl }).where(eq(digitalProducts.id, productId));
  const updated = await db.select().from(digitalProducts).where(eq(digitalProducts.id, productId)).limit(1);
  return updated[0];
}

export async function deleteDigitalProduct(productId: number) {
  const db = requireDatabase(await getDb());
  const [order, access, inquiry] = await Promise.all([
    db.select({ id: guestCheckoutRequests.id }).from(guestCheckoutRequests).where(eq(guestCheckoutRequests.productId, productId)).limit(1),
    db.select({ id: productAccess.id }).from(productAccess).where(eq(productAccess.productId, productId)).limit(1),
    db.select({ id: productInquiries.id }).from(productInquiries).where(eq(productInquiries.productId, productId)).limit(1),
  ]);
  if (order[0] || access[0] || inquiry[0]) {
    return { deleted: false as const, reason: "This product has related buyer records and cannot be deleted. Archive it instead." };
  }
  await db.delete(productFiles).where(eq(productFiles.productId, productId));
  await db.delete(digitalProducts).where(eq(digitalProducts.id, productId));
  return { deleted: true as const };
}

export async function getUserProductAccess(userId: number) {
  const db = requireDatabase(await getDb());
  return db
    .select({ access: productAccess, product: digitalProducts })
    .from(productAccess)
    .innerJoin(digitalProducts, eq(productAccess.productId, digitalProducts.id))
    .where(eq(productAccess.userId, userId))
    .orderBy(desc(productAccess.updatedAt));
}

export async function getAuthorizedProductDownload(userId: number, accessId: number) {
  const db = requireDatabase(await getDb());
  const rows = await db
    .select({ access: productAccess, product: digitalProducts })
    .from(productAccess)
    .innerJoin(digitalProducts, eq(productAccess.productId, digitalProducts.id))
    .where(and(eq(productAccess.id, accessId), eq(productAccess.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAllProductAccess() {
  const db = requireDatabase(await getDb());
  return db
    .select({ access: productAccess, product: digitalProducts, user: users })
    .from(productAccess)
    .innerJoin(digitalProducts, eq(productAccess.productId, digitalProducts.id))
    .innerJoin(users, eq(productAccess.userId, users.id))
    .orderBy(desc(productAccess.updatedAt));
}

export async function grantProductAccess(input: { productId: number; userId: number; deliveryUrl: string; deliveryFileName: string; grantedByUserId: number }) {
  const db = requireDatabase(await getDb());
  await db.insert(productAccess).values(input).onConflictDoUpdate({
    target: [productAccess.productId, productAccess.userId],
    set: {
      deliveryUrl: input.deliveryUrl,
      deliveryFileName: input.deliveryFileName,
      grantedByUserId: input.grantedByUserId,
      updatedAt: new Date(),
    },
  });
  const rows = await db.select().from(productAccess).where(and(eq(productAccess.productId, input.productId), eq(productAccess.userId, input.userId))).limit(1);
  return rows[0];
}

export async function createProductInquiry(values: typeof productInquiries.$inferInsert) {
  const db = requireDatabase(await getDb());
  const result = await db.insert(productInquiries).values(values);
  const created = await db.select().from(productInquiries).where(eq(productInquiries.id, Number(result.meta.last_row_id))).limit(1);
  return created[0];
}

export async function createGuestCheckoutRequest(values: typeof guestCheckoutRequests.$inferInsert) {
  const db = requireDatabase(await getDb());
  const result = await db.insert(guestCheckoutRequests).values(values);
  const created = await db.select().from(guestCheckoutRequests).where(eq(guestCheckoutRequests.id, Number(result.meta.last_row_id))).limit(1);
  return created[0];
}

type PaymentProvider = "payrex" | "paypal";
type ProviderCheckoutOrderInput = { productId: number; name: string; email: string; company?: string | null; message?: string | null; publicToken?: string | null; paymentReference?: string | null; paymentMethodId?: number | null; paymentMethodName: string; paymentMethodType: string; paymentInstructionsSnapshot?: string | null; paymentQrCodeUrlSnapshot?: string | null; voucherId?: number | null; voucherCodeSnapshot?: string | null; subtotalCents: number; discountCents: number; totalCents: number };

async function createProviderCheckoutOrder(input: ProviderCheckoutOrderInput) {
  const db = requireDatabase(await getDb());
  const result = await db.insert(guestCheckoutRequests).values({
    productId: input.productId, name: input.name, email: input.email, company: input.company || null, message: input.message || null,
    status: "submitted", commerceStatus: "pending_payment", paymentPublicToken: input.publicToken || null,
    paymentMethodId: input.paymentMethodId || null, paymentMethodName: input.paymentMethodName, paymentMethodType: input.paymentMethodType, paymentInstructionsSnapshot: input.paymentInstructionsSnapshot || null, paymentQrCodeUrlSnapshot: input.paymentQrCodeUrlSnapshot || null, paymentReference: input.paymentReference || null, voucherId: input.voucherId || null, voucherCodeSnapshot: input.voucherCodeSnapshot || null, subtotalCents: input.subtotalCents, discountCents: input.discountCents, totalCents: input.totalCents, paymentStatus: "awaiting_payment",
  });
  const created = await db.select().from(guestCheckoutRequests).where(eq(guestCheckoutRequests.id, Number(result.meta.last_row_id))).limit(1);
  if (!created[0]) throw new Error("Unable to create checkout order");
  return created[0];
}

export async function createPayrexCheckoutOrder(input: { productId: number; name: string; email: string; company?: string | null; message?: string | null; publicToken: string; paymentReference: string; voucherId?: number | null; voucherCodeSnapshot?: string | null; subtotalCents: number; discountCents: number; totalCents: number }) {
  return createProviderCheckoutOrder({ ...input, paymentMethodName: "GCash", paymentMethodType: "GCash" });
}

export async function createPaypalCheckoutOrder(input: { productId: number; name: string; email: string; company?: string | null; message?: string | null; publicToken: string; paymentReference: string; voucherId?: number | null; voucherCodeSnapshot?: string | null; subtotalCents: number; discountCents: number; totalCents: number }) {
  return createProviderCheckoutOrder({ ...input, paymentMethodName: "PayPal", paymentMethodType: "PayPal" });
}

export async function createManualCheckoutOrder(input: { productId: number; name: string; email: string; company?: string | null; message?: string | null; paymentMethodId: number; paymentMethodName: string; paymentMethodType: string; paymentInstructionsSnapshot: string; paymentQrCodeUrlSnapshot?: string | null; paymentReference?: string | null; voucherId?: number | null; voucherCodeSnapshot?: string | null; subtotalCents: number; discountCents: number; totalCents: number }) {
  return createProviderCheckoutOrder(input);
}

type ProviderTransactionInput = { provider: PaymentProvider; paymentMethod: string; orderId: number; publicToken: string; amountCents: number; providerCheckoutSessionId: string; providerPaymentIntentId?: string | null; checkoutUrl: string; expiresAt?: Date | null };

async function createProviderPaymentTransaction(input: ProviderTransactionInput) {
  const db = requireDatabase(await getDb());
  const result = await db.insert(paymentTransactions).values({
    orderId: input.orderId, publicToken: input.publicToken, provider: input.provider, paymentMethod: input.paymentMethod, amountCents: input.amountCents, currency: "PHP", status: "pending",
    providerCheckoutSessionId: input.providerCheckoutSessionId, providerPaymentIntentId: input.providerPaymentIntentId || null, checkoutUrl: input.checkoutUrl, expiresAt: input.expiresAt || null,
  });
  const created = await db.select().from(paymentTransactions).where(eq(paymentTransactions.id, Number(result.meta.last_row_id))).limit(1);
  if (!created[0]) throw new Error("Unable to record payment transaction");
  return created[0];
}

export async function createPayrexPaymentTransaction(input: { orderId: number; publicToken: string; amountCents: number; providerCheckoutSessionId: string; providerPaymentIntentId?: string | null; checkoutUrl: string; expiresAt?: Date | null }) {
  return createProviderPaymentTransaction({ ...input, provider: "payrex", paymentMethod: "gcash" });
}

export async function createPaypalPaymentTransaction(input: { orderId: number; publicToken: string; amountCents: number; providerOrderId: string; approvalUrl: string }) {
  return createProviderPaymentTransaction({ provider: "paypal", paymentMethod: "paypal", orderId: input.orderId, publicToken: input.publicToken, amountCents: input.amountCents, providerCheckoutSessionId: input.providerOrderId, providerPaymentIntentId: input.providerOrderId, checkoutUrl: input.approvalUrl });
}

export async function getPayrexPaymentStatus(publicToken: string) {
  const db = requireDatabase(await getDb());
  const rows = await db.select({ transaction: paymentTransactions, order: guestCheckoutRequests, product: digitalProducts })
    .from(paymentTransactions).innerJoin(guestCheckoutRequests, eq(paymentTransactions.orderId, guestCheckoutRequests.id))
    .innerJoin(digitalProducts, eq(guestCheckoutRequests.productId, digitalProducts.id)).where(eq(paymentTransactions.publicToken, publicToken)).limit(1);
  return rows[0] ?? null;
}

async function registerProviderWebhookEvent(input: { provider: PaymentProvider; providerEventId: string; eventType: string; providerPaymentIntentId?: string | null; payloadHash: string }) {
  const db = requireDatabase(await getDb());
  const existing = await db.select({ id: paymentWebhookEvents.id }).from(paymentWebhookEvents).where(and(eq(paymentWebhookEvents.provider, input.provider), eq(paymentWebhookEvents.providerEventId, input.providerEventId))).limit(1);
  if (existing[0]) return false;
  try {
    await db.insert(paymentWebhookEvents).values({ provider: input.provider, providerEventId: input.providerEventId, eventType: input.eventType, providerPaymentIntentId: input.providerPaymentIntentId || null, payloadHash: input.payloadHash, processedAt: new Date() });
    return true;
  } catch { return false; }
}

export async function registerPayrexWebhookEvent(input: { providerEventId: string; eventType: string; providerPaymentIntentId?: string | null; payloadHash: string }) {
  return registerProviderWebhookEvent({ ...input, provider: "payrex" });
}

export async function registerPaypalWebhookEvent(input: { providerEventId: string; eventType: string; providerOrderId?: string | null; payloadHash: string }) {
  return registerProviderWebhookEvent({ provider: "paypal", providerEventId: input.providerEventId, eventType: input.eventType, providerPaymentIntentId: input.providerOrderId || null, payloadHash: input.payloadHash });
}

async function markProviderPaymentPaid(input: { provider: PaymentProvider; match: "providerPaymentIntentId" | "providerCheckoutSessionId"; providerReference: string; providerPaymentId?: string | null }) {
  const db = requireDatabase(await getDb());
  const matchColumn = input.match === "providerPaymentIntentId" ? paymentTransactions.providerPaymentIntentId : paymentTransactions.providerCheckoutSessionId;
  const rows = await db.select().from(paymentTransactions).where(and(eq(paymentTransactions.provider, input.provider), eq(matchColumn, input.providerReference))).limit(1);
  const transaction = rows[0];
  if (!transaction) return null;
  if (transaction.status !== "paid") {
    const paidAt = new Date();
    await db.update(paymentTransactions).set({ status: "paid", providerPaymentId: input.providerPaymentId || transaction.providerPaymentId, paidAt }).where(eq(paymentTransactions.id, transaction.id));
    await db.update(guestCheckoutRequests).set({ paymentStatus: "verified", commerceStatus: "paid", paidAt }).where(eq(guestCheckoutRequests.id, transaction.orderId));
    const orders = await db.select({ voucherId: guestCheckoutRequests.voucherId }).from(guestCheckoutRequests).where(eq(guestCheckoutRequests.id, transaction.orderId)).limit(1);
    await incrementVoucherRedemption(orders[0]?.voucherId || null);
  }
  return transaction;
}

export async function markPayrexPaymentPaid(providerPaymentIntentId: string, providerPaymentId?: string | null) {
  return markProviderPaymentPaid({ provider: "payrex", match: "providerPaymentIntentId", providerReference: providerPaymentIntentId, providerPaymentId });
}

export async function markPaypalPaymentPaid(providerOrderId: string, providerCaptureId?: string | null) {
  return markProviderPaymentPaid({ provider: "paypal", match: "providerCheckoutSessionId", providerReference: providerOrderId, providerPaymentId: providerCaptureId });
}

export async function getPaypalTransactionForPublicToken(publicToken: string) {
  const db = requireDatabase(await getDb());
  const rows = await db.select().from(paymentTransactions).where(and(eq(paymentTransactions.publicToken, publicToken), eq(paymentTransactions.provider, "paypal"))).limit(1);
  return rows[0] || null;
}

export async function listPaidDeliveryFiles(paymentPublicToken: string) {
  const db = requireDatabase(await getDb());
  const transaction = await db.select({ transaction: paymentTransactions, order: guestCheckoutRequests }).from(paymentTransactions)
    .innerJoin(guestCheckoutRequests, eq(paymentTransactions.orderId, guestCheckoutRequests.id))
    .where(eq(paymentTransactions.publicToken, paymentPublicToken)).limit(1);
  const record = transaction[0];
  if (!record || record.transaction.status !== "paid" || record.order.paymentStatus !== "verified") return null;
  const files = (await db.select({ id: productFiles.id, fileName: productFiles.fileName, fileUrl: productFiles.fileUrl, mimeType: productFiles.mimeType, sizeBytes: productFiles.sizeBytes })
    .from(productFiles).where(eq(productFiles.productId, record.order.productId)).orderBy(asc(productFiles.sortOrder), asc(productFiles.createdAt))).filter(file => file.fileUrl.includes("/raw/private/")).map(({ fileUrl: _fileUrl, ...file }) => file);
  return { transaction: record.transaction, order: record.order, files };
}

export async function createOneTimeDeliveryEntitlement(input: { paymentPublicToken: string; productFileId: number; tokenHash: string; expiresAt: Date }) {
  const db = requireDatabase(await getDb());
  const delivery = await listPaidDeliveryFiles(input.paymentPublicToken);
  if (!delivery) return null;
  const file = delivery.files.find(candidate => candidate.id === input.productFileId);
  if (!file) return null;
  const fileRows = await db.select().from(productFiles).where(eq(productFiles.id, input.productFileId)).limit(1);
  const productFile = fileRows[0];
  if (!productFile?.fileKey) return null;
  await db.update(paymentDeliveryEntitlements).set({ status: "revoked", revokedAt: new Date() }).where(and(eq(paymentDeliveryEntitlements.paymentTransactionId, delivery.transaction.id), eq(paymentDeliveryEntitlements.productFileId, productFile.id), eq(paymentDeliveryEntitlements.status, "active")));
  const result = await db.insert(paymentDeliveryEntitlements).values({ orderId: delivery.order.id, paymentTransactionId: delivery.transaction.id, productFileId: productFile.id, fileName: productFile.fileName, fileKey: productFile.fileKey, fileMimeType: productFile.mimeType || null, tokenHash: input.tokenHash, status: "active", expiresAt: input.expiresAt });
  const created = await db.select().from(paymentDeliveryEntitlements).where(eq(paymentDeliveryEntitlements.id, Number(result.meta.last_row_id))).limit(1);
  return created[0] || null;
}

export async function consumeOneTimeDeliveryEntitlement(tokenHash: string) {
  const db = requireDatabase(await getDb());
  const rows = await db.select().from(paymentDeliveryEntitlements).where(eq(paymentDeliveryEntitlements.tokenHash, tokenHash)).limit(1);
  const entitlement = rows[0];
  if (!entitlement || entitlement.status !== "active" || entitlement.expiresAt.getTime() < Date.now()) return null;
  const claimed = await db.update(paymentDeliveryEntitlements).set({ status: "used", usedAt: new Date() }).where(and(eq(paymentDeliveryEntitlements.id, entitlement.id), eq(paymentDeliveryEntitlements.status, "active")));
  if (Number(claimed.meta.changes || 0) !== 1) return null;
  return entitlement;
}

export async function revokeDeliveryEntitlementsForOrder(orderId: number) {
  const db = requireDatabase(await getDb());
  await db.update(paymentDeliveryEntitlements).set({ status: "revoked", revokedAt: new Date() }).where(and(eq(paymentDeliveryEntitlements.orderId, orderId), eq(paymentDeliveryEntitlements.status, "active")));
  return { revoked: true as const };
}

export async function getActivePaymentMethods() {
  const db = requireDatabase(await getDb());
  return db.select().from(paymentMethods).where(eq(paymentMethods.isActive, true)).orderBy(asc(paymentMethods.sortOrder), asc(paymentMethods.createdAt));
}

export async function getAllPaymentMethods() {
  const db = requireDatabase(await getDb());
  return db.select().from(paymentMethods).orderBy(asc(paymentMethods.sortOrder), asc(paymentMethods.createdAt));
}

export async function getPaymentMethodById(paymentMethodId: number) {
  const db = requireDatabase(await getDb());
  const rows = await db.select().from(paymentMethods).where(eq(paymentMethods.id, paymentMethodId)).limit(1);
  return rows[0] ?? null;
}

export async function savePaymentMethod(values: typeof paymentMethods.$inferInsert, paymentMethodId?: number) {
  const db = requireDatabase(await getDb());
  if (paymentMethodId) {
    await db.update(paymentMethods).set(values).where(eq(paymentMethods.id, paymentMethodId));
    const updated = await db.select().from(paymentMethods).where(eq(paymentMethods.id, paymentMethodId)).limit(1);
    return updated[0];
  }
  const result = await db.insert(paymentMethods).values(values);
  const created = await db.select().from(paymentMethods).where(eq(paymentMethods.id, Number(result.meta.last_row_id))).limit(1);
  return created[0];
}

export async function getPaymentProviderSettings() {
  const db = requireDatabase(await getDb());
  return db.select().from(paymentProviderSettings).orderBy(asc(paymentProviderSettings.provider));
}

export async function getPaymentProviderSetting(provider: "payrex" | "paypal") {
  const db = requireDatabase(await getDb());
  const setting = await db.select().from(paymentProviderSettings).where(eq(paymentProviderSettings.provider, provider)).limit(1);
  return setting[0] || null;
}

export async function setPaymentProviderActive(provider: "payrex" | "paypal", isActive: boolean) {
  const db = requireDatabase(await getDb());
  await db.insert(paymentProviderSettings).values({ provider, isActive }).onConflictDoUpdate({ target: paymentProviderSettings.provider, set: { isActive, updatedAt: new Date() } });
  return getPaymentProviderSetting(provider);
}

export async function getAllVouchers() {
  const db = requireDatabase(await getDb());
  const [rows, scopes] = await Promise.all([
    db.select().from(vouchers).orderBy(desc(vouchers.createdAt)),
    db.select().from(voucherProducts),
  ]);
  return rows.map(voucher => ({ ...voucher, productIds: scopes.filter(scope => scope.voucherId === voucher.id).map(scope => scope.productId) }));
}

export async function saveVoucher(input: { voucherId?: number; code: string; label: string; scope: "general" | "selected_products"; discountKind: "percent" | "fixed"; discountValue: number; maxRedemptions?: number | null; startsAt?: Date | null; endsAt?: Date | null; isActive: boolean; productIds: number[] }) {
  const db = requireDatabase(await getDb());
  const values = { code: input.code.trim().toUpperCase(), label: input.label.trim(), scope: input.scope, discountKind: input.discountKind, discountValue: input.discountValue, maxRedemptions: input.maxRedemptions || null, startsAt: input.startsAt || null, endsAt: input.endsAt || null, isActive: input.isActive };
  let voucherId = input.voucherId;
  if (voucherId) {
    await db.update(vouchers).set({ ...values, updatedAt: new Date() }).where(eq(vouchers.id, voucherId));
    await db.delete(voucherProducts).where(eq(voucherProducts.voucherId, voucherId));
  } else {
    const result = await db.insert(vouchers).values(values);
    voucherId = Number(result.meta.last_row_id);
  }
  if (!voucherId) throw new Error("Voucher could not be saved.");
  const productIds = input.scope === "selected_products" ? Array.from(new Set(input.productIds)) : [];
  for (const productId of productIds) await db.insert(voucherProducts).values({ voucherId, productId });
  const voucher = await db.select().from(vouchers).where(eq(vouchers.id, voucherId)).limit(1);
  return { ...voucher[0], productIds };
}

export async function setVoucherActive(voucherId: number, isActive: boolean) {
  const db = requireDatabase(await getDb());
  await db.update(vouchers).set({ isActive, updatedAt: new Date() }).where(eq(vouchers.id, voucherId));
  const voucher = await db.select().from(vouchers).where(eq(vouchers.id, voucherId)).limit(1);
  return voucher[0] || null;
}

export async function getVoucherDiscount(input: { code: string; productId: number; subtotalCents: number; now?: Date }) {
  const db = requireDatabase(await getDb());
  const now = input.now || new Date();
  const found = await db.select().from(vouchers).where(eq(vouchers.code, input.code.trim().toUpperCase())).limit(1);
  const voucher = found[0];
  if (!voucher || !voucher.isActive || (voucher.startsAt && voucher.startsAt > now) || (voucher.endsAt && voucher.endsAt < now) || (voucher.maxRedemptions !== null && voucher.redemptionCount >= voucher.maxRedemptions)) return null;
  if (voucher.scope === "selected_products") {
    const scoped = await db.select({ id: voucherProducts.id }).from(voucherProducts).where(and(eq(voucherProducts.voucherId, voucher.id), eq(voucherProducts.productId, input.productId))).limit(1);
    if (!scoped[0]) return null;
  }
  const discountCents = voucher.discountKind === "percent" ? Math.floor(input.subtotalCents * voucher.discountValue / 100) : Math.min(input.subtotalCents, voucher.discountValue);
  return { voucher, discountCents: Math.max(0, discountCents), totalCents: Math.max(0, input.subtotalCents - discountCents) };
}

async function incrementVoucherRedemption(voucherId: number | null) {
  if (!voucherId) return;
  const db = requireDatabase(await getDb());
  await db.update(vouchers).set({ redemptionCount: sql`${vouchers.redemptionCount} + 1`, updatedAt: new Date() }).where(eq(vouchers.id, voucherId));
}

export async function deletePaymentMethod(paymentMethodId: number) {
  const db = requireDatabase(await getDb());
  const referencedOrder = await db.select({ id: guestCheckoutRequests.id }).from(guestCheckoutRequests).where(eq(guestCheckoutRequests.paymentMethodId, paymentMethodId)).limit(1);
  if (referencedOrder.length) throw new Error("This payment method has recorded order history and cannot be deleted.");
  await db.delete(paymentMethods).where(eq(paymentMethods.id, paymentMethodId));
  return { deleted: true as const };
}

export async function getGuestCheckoutRequests() {
  const db = requireDatabase(await getDb());
  const rows = await db.select({ order: guestCheckoutRequests, product: digitalProducts }).from(guestCheckoutRequests).innerJoin(digitalProducts, eq(guestCheckoutRequests.productId, digitalProducts.id)).orderBy(desc(guestCheckoutRequests.createdAt));
  const privateFiles = (await db.select().from(productFiles)).filter(file => file.fileUrl.includes("/raw/private/"));
  const entitlements = await db.select().from(paymentDeliveryEntitlements);
  const transactions = await db.select().from(paymentTransactions);
  return rows.map(row => {
    const files = privateFiles.filter(file => file.productId === row.order.productId);
    const entries = entitlements.filter(entry => entry.orderId === row.order.id);
    const transaction = transactions.find(candidate => candidate.orderId === row.order.id) || null;
    return { ...row, paymentTransaction: transaction ? { id: transaction.id, provider: transaction.provider, status: transaction.status, amountCents: transaction.amountCents, currency: transaction.currency, providerPaymentIntentId: transaction.providerPaymentIntentId, paidAt: transaction.paidAt, expiresAt: transaction.expiresAt } : null, delivery: { eligibleFileCount: files.length, activeLinkCount: entries.filter(entry => entry.status === "active" && entry.expiresAt.getTime() >= Date.now()).length, usedLinkCount: entries.filter(entry => entry.status === "used").length, revokedLinkCount: entries.filter(entry => entry.status === "revoked").length, latestExpiresAt: entries.filter(entry => entry.status === "active").sort((left, right) => right.expiresAt.getTime() - left.expiresAt.getTime())[0]?.expiresAt || null, files: files.map(file => ({ id: file.id, fileName: file.fileName, mimeType: file.mimeType, sizeBytes: file.sizeBytes })) } };
  });
}

export async function createOwnerOneTimeDeliveryEntitlement(input: { orderId: number; productFileId: number; tokenHash: string; expiresAt: Date }) {
  const db = requireDatabase(await getDb());
  const orderRows = await db.select().from(guestCheckoutRequests).where(eq(guestCheckoutRequests.id, input.orderId)).limit(1);
  const order = orderRows[0];
  if (!order || order.paymentStatus !== "verified") return null;
  const transactionRows = await db.select().from(paymentTransactions).where(eq(paymentTransactions.orderId, order.id)).limit(1);
  const transaction = transactionRows[0];
  if (!transaction || transaction.status !== "paid") return null;
  const files = (await db.select().from(productFiles).where(and(eq(productFiles.id, input.productFileId), eq(productFiles.productId, order.productId))).limit(1)).filter(file => file.fileUrl.includes("/raw/private/"));
  const file = files[0];
  if (!file?.fileKey) return null;
  await db.update(paymentDeliveryEntitlements).set({ status: "revoked", revokedAt: new Date() }).where(and(eq(paymentDeliveryEntitlements.paymentTransactionId, transaction.id), eq(paymentDeliveryEntitlements.productFileId, file.id), eq(paymentDeliveryEntitlements.status, "active")));
  const result = await db.insert(paymentDeliveryEntitlements).values({ orderId: order.id, paymentTransactionId: transaction.id, productFileId: file.id, fileName: file.fileName, fileKey: file.fileKey, fileMimeType: file.mimeType || null, tokenHash: input.tokenHash, status: "active", expiresAt: input.expiresAt });
  const created = await db.select().from(paymentDeliveryEntitlements).where(eq(paymentDeliveryEntitlements.id, Number(result.meta.last_row_id))).limit(1);
  return created[0] || null;
}

export async function updateGuestCheckoutRequestStatus(orderId: number, status: "submitted" | "contacted" | "fulfilled" | "cancelled") {
  const db = requireDatabase(await getDb());
  await db.update(guestCheckoutRequests).set({ status }).where(eq(guestCheckoutRequests.id, orderId));
  const updated = await db.select().from(guestCheckoutRequests).where(eq(guestCheckoutRequests.id, orderId)).limit(1);
  return updated[0];
}

export async function updateGuestCheckoutPaymentReview(orderId: number, paymentStatus: "verified" | "rejected", paymentReviewNote?: string | null) {
  const db = requireDatabase(await getDb());
  const existing = await db.select({ paymentStatus: guestCheckoutRequests.paymentStatus, voucherId: guestCheckoutRequests.voucherId }).from(guestCheckoutRequests).where(eq(guestCheckoutRequests.id, orderId)).limit(1);
  const transaction = await db.select({ id: paymentTransactions.id }).from(paymentTransactions).where(eq(paymentTransactions.orderId, orderId)).limit(1);
  if (transaction[0]) throw new Error("Provider payments can be marked paid only by verified provider webhook processing.");
  const reviewedAt = new Date();
  await db.update(guestCheckoutRequests).set({ paymentStatus, paymentReviewedAt: reviewedAt, paymentReviewNote: paymentReviewNote || null, commerceStatus: paymentStatus === "verified" ? "paid" : "pending_payment", paidAt: paymentStatus === "verified" ? reviewedAt : null }).where(eq(guestCheckoutRequests.id, orderId));
  if (paymentStatus === "verified" && existing[0]?.paymentStatus !== "verified") await incrementVoucherRedemption(existing[0]?.voucherId || null);
  const updated = await db.select().from(guestCheckoutRequests).where(eq(guestCheckoutRequests.id, orderId)).limit(1);
  return updated[0];
}

export async function getProductFiles(productId: number) {
  const db = requireDatabase(await getDb());
  return db.select().from(productFiles).where(eq(productFiles.productId, productId)).orderBy(asc(productFiles.sortOrder), asc(productFiles.createdAt));
}

export async function saveProductFile(values: typeof productFiles.$inferInsert) {
  const db = requireDatabase(await getDb());
  const result = await db.insert(productFiles).values(values);
  const created = await db.select().from(productFiles).where(eq(productFiles.id, Number(result.meta.last_row_id))).limit(1);
  return created[0];
}

export async function deleteProductFile(productFileId: number) {
  const db = requireDatabase(await getDb());
  await db.delete(productFiles).where(eq(productFiles.id, productFileId));
}

export async function getPublicSiteContent(page?: string) {
  const db = requireDatabase(await getDb());
  const where = page ? eq(publicSiteContent.page, page) : undefined;
  const rows = await db.select().from(publicSiteContent).where(where).orderBy(asc(publicSiteContent.page), asc(publicSiteContent.section));
  return rows.map(row => row.isPublished ? row : {
    ...row,
    title: null,
    body: null,
    imageUrl: null,
    ctaLabel: null,
    ctaHref: null,
  });
}

export async function getAllPublicSiteContent() {
  const db = requireDatabase(await getDb());
  return db.select().from(publicSiteContent).orderBy(asc(publicSiteContent.page), asc(publicSiteContent.section));
}

export async function savePublicSiteContent(values: typeof publicSiteContent.$inferInsert, contentId?: number) {
  const db = requireDatabase(await getDb());
  if (contentId) {
    await db.update(publicSiteContent).set(values).where(eq(publicSiteContent.id, contentId));
    const updated = await db.select().from(publicSiteContent).where(eq(publicSiteContent.id, contentId)).limit(1);
    return updated[0];
  }
  await db.insert(publicSiteContent).values(values).onConflictDoUpdate({ target: [publicSiteContent.page, publicSiteContent.section], set: values });
  const saved = await db.select().from(publicSiteContent).where(and(eq(publicSiteContent.page, values.page), eq(publicSiteContent.section, values.section))).limit(1);
  return saved[0];
}
