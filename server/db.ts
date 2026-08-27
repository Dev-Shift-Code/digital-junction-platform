import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../drizzle/schema";
import { caseStudies, deliverables, digitalProducts, guestCheckoutRequests, InsertUser, inquiries, milestones, paymentDeliveryEntitlements, paymentMethods, paymentTransactions, paymentWebhookEvents, portalContents, productAccess, productFiles, productInquiries, projectClients, projects, publicSiteContent, users } from "../drizzle/schema";
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

export async function createPayrexCheckoutOrder(input: { productId: number; quantity: number; name: string; email: string; company?: string | null; message?: string | null; publicToken: string; paymentReference: string }) {
  const db = requireDatabase(await getDb());
  const result = await db.insert(guestCheckoutRequests).values({
    productId: input.productId, quantity: input.quantity, name: input.name, email: input.email, company: input.company || null, message: input.message || null,
    status: "submitted", commerceStatus: "pending_payment", paymentPublicToken: input.publicToken,
    paymentMethodName: "GCash", paymentMethodType: "GCash", paymentReference: input.paymentReference, paymentStatus: "awaiting_payment",
  });
  const created = await db.select().from(guestCheckoutRequests).where(eq(guestCheckoutRequests.id, Number(result.meta.last_row_id))).limit(1);
  if (!created[0]) throw new Error("Unable to create checkout order");
  return created[0];
}

export async function createPayrexPaymentTransaction(input: { orderId: number; publicToken: string; amountCents: number; providerCheckoutSessionId: string; providerPaymentIntentId?: string | null; checkoutUrl: string; expiresAt?: Date | null }) {
  const db = requireDatabase(await getDb());
  const result = await db.insert(paymentTransactions).values({
    orderId: input.orderId, publicToken: input.publicToken, provider: "payrex", paymentMethod: "gcash", amountCents: input.amountCents, currency: "PHP", status: "pending",
    providerCheckoutSessionId: input.providerCheckoutSessionId, providerPaymentIntentId: input.providerPaymentIntentId || null, checkoutUrl: input.checkoutUrl, expiresAt: input.expiresAt || null,
  });
  const created = await db.select().from(paymentTransactions).where(eq(paymentTransactions.id, Number(result.meta.last_row_id))).limit(1);
  if (!created[0]) throw new Error("Unable to record PayRex payment transaction");
  return created[0];
}

export async function getPayrexPaymentStatus(publicToken: string) {
  const db = requireDatabase(await getDb());
  const rows = await db.select({ transaction: paymentTransactions, order: guestCheckoutRequests, product: digitalProducts })
    .from(paymentTransactions).innerJoin(guestCheckoutRequests, eq(paymentTransactions.orderId, guestCheckoutRequests.id))
    .innerJoin(digitalProducts, eq(guestCheckoutRequests.productId, digitalProducts.id)).where(eq(paymentTransactions.publicToken, publicToken)).limit(1);
  return rows[0] ?? null;
}

export async function registerPayrexWebhookEvent(input: { providerEventId: string; eventType: string; providerPaymentIntentId?: string | null; payloadHash: string }) {
  const db = requireDatabase(await getDb());
  const existing = await db.select({ id: paymentWebhookEvents.id }).from(paymentWebhookEvents).where(and(eq(paymentWebhookEvents.provider, "payrex"), eq(paymentWebhookEvents.providerEventId, input.providerEventId))).limit(1);
  if (existing[0]) return false;
  try {
    await db.insert(paymentWebhookEvents).values({ provider: "payrex", providerEventId: input.providerEventId, eventType: input.eventType, providerPaymentIntentId: input.providerPaymentIntentId || null, payloadHash: input.payloadHash, processedAt: new Date() });
    return true;
  } catch { return false; }
}

export async function markPayrexPaymentPaid(providerPaymentIntentId: string, providerPaymentId?: string | null) {
  const db = requireDatabase(await getDb());
  const rows = await db.select().from(paymentTransactions).where(eq(paymentTransactions.providerPaymentIntentId, providerPaymentIntentId)).limit(1);
  const transaction = rows[0];
  if (!transaction) return null;
  if (transaction.status !== "paid") {
    const paidAt = new Date();
    await db.update(paymentTransactions).set({ status: "paid", providerPaymentId: providerPaymentId || transaction.providerPaymentId, paidAt }).where(eq(paymentTransactions.id, transaction.id));
    await db.update(guestCheckoutRequests).set({ paymentStatus: "verified", commerceStatus: "paid", paidAt }).where(eq(guestCheckoutRequests.id, transaction.orderId));
  }
  return transaction;
}

export async function listPaidDeliveryFiles(paymentPublicToken: string) {
  const db = requireDatabase(await getDb());
  const transaction = await db.select({ transaction: paymentTransactions, order: guestCheckoutRequests }).from(paymentTransactions)
    .innerJoin(guestCheckoutRequests, eq(paymentTransactions.orderId, guestCheckoutRequests.id))
    .where(eq(paymentTransactions.publicToken, paymentPublicToken)).limit(1);
  const record = transaction[0];
  if (!record || record.transaction.status !== "paid" || record.order.paymentStatus !== "verified") return null;
  const files = await db.select({ id: productFiles.id, fileName: productFiles.fileName, mimeType: productFiles.mimeType, sizeBytes: productFiles.sizeBytes })
    .from(productFiles).where(and(eq(productFiles.productId, record.order.productId), eq(productFiles.storageProvider, "cloudinary_private"))).orderBy(asc(productFiles.sortOrder), asc(productFiles.createdAt));
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
  const privateFiles = await db.select().from(productFiles).where(eq(productFiles.storageProvider, "cloudinary_private"));
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
  const files = await db.select().from(productFiles).where(and(eq(productFiles.id, input.productFileId), eq(productFiles.productId, order.productId), eq(productFiles.storageProvider, "cloudinary_private"))).limit(1);
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
  await db.update(guestCheckoutRequests).set({ paymentStatus, paymentReviewedAt: new Date(), paymentReviewNote: paymentReviewNote || null }).where(eq(guestCheckoutRequests.id, orderId));
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
