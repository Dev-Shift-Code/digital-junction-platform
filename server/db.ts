import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { caseStudies, deliverables, digitalProducts, guestCheckoutRequests, InsertUser, inquiries, milestones, portalContents, productAccess, productFiles, productInquiries, projectClients, projects, publicSiteContent, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
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

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
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

export async function createLocalUser(input: { openId: string; email: string; passwordHash: string }) {
  const db = requireDatabase(await getDb());
  await db.insert(users).values({
    openId: input.openId,
    email: input.email,
    name: input.email.split("@")[0] ?? "Digital Junction customer",
    passwordHash: input.passwordHash,
    loginMethod: "digital-junction",
    role: "user",
    lastSignedIn: new Date(),
  });
  const user = await getUserByOpenId(input.openId);
  if (!user) throw new Error("Unable to create account");
  return user;
}

export async function recordUserSignIn(openId: string) {
  const db = requireDatabase(await getDb());
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.openId, openId));
}

export async function setUserPassword(userId: number, passwordHash: string) {
  const db = requireDatabase(await getDb());
  await db.update(users).set({ passwordHash, loginMethod: "digital-junction" }).where(eq(users.id, userId));
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
  const created = await db.select().from(projects).where(eq(projects.id, Number(result[0].insertId))).limit(1);
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
  await db.insert(projectClients).values({ projectId, userId }).onDuplicateKeyUpdate({ set: { userId } });
}

export async function createMilestone(values: typeof milestones.$inferInsert) {
  const db = requireDatabase(await getDb());
  const result = await db.insert(milestones).values(values);
  const created = await db.select().from(milestones).where(eq(milestones.id, Number(result[0].insertId))).limit(1);
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
  const created = await db.select().from(deliverables).where(eq(deliverables.id, Number(result[0].insertId))).limit(1);
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
  const created = await db.select().from(portalContents).where(eq(portalContents.id, Number(result[0].insertId))).limit(1);
  return created[0];
}

export async function createInquiry(values: typeof inquiries.$inferInsert) {
  const db = requireDatabase(await getDb());
  const result = await db.insert(inquiries).values(values);
  const created = await db.select().from(inquiries).where(eq(inquiries.id, Number(result[0].insertId))).limit(1);
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

export async function saveCaseStudy(values: typeof caseStudies.$inferInsert, caseStudyId?: number) {
  const db = requireDatabase(await getDb());
  if (caseStudyId) {
    await db.update(caseStudies).set(values).where(eq(caseStudies.id, caseStudyId));
    const updated = await db.select().from(caseStudies).where(eq(caseStudies.id, caseStudyId)).limit(1);
    return updated[0];
  }
  const result = await db.insert(caseStudies).values(values);
  const created = await db.select().from(caseStudies).where(eq(caseStudies.id, Number(result[0].insertId))).limit(1);
  return created[0];
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
  const created = await db.select().from(digitalProducts).where(eq(digitalProducts.id, Number(result[0].insertId))).limit(1);
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
  await db.insert(productAccess).values(input).onDuplicateKeyUpdate({
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
  const created = await db.select().from(productInquiries).where(eq(productInquiries.id, Number(result[0].insertId))).limit(1);
  return created[0];
}

export async function createGuestCheckoutRequest(values: typeof guestCheckoutRequests.$inferInsert) {
  const db = requireDatabase(await getDb());
  const result = await db.insert(guestCheckoutRequests).values(values);
  const created = await db.select().from(guestCheckoutRequests).where(eq(guestCheckoutRequests.id, Number(result[0].insertId))).limit(1);
  return created[0];
}

export async function getGuestCheckoutRequests() {
  const db = requireDatabase(await getDb());
  return db.select({ order: guestCheckoutRequests, product: digitalProducts }).from(guestCheckoutRequests).innerJoin(digitalProducts, eq(guestCheckoutRequests.productId, digitalProducts.id)).orderBy(desc(guestCheckoutRequests.createdAt));
}

export async function updateGuestCheckoutRequestStatus(orderId: number, status: "submitted" | "contacted" | "fulfilled" | "cancelled") {
  const db = requireDatabase(await getDb());
  await db.update(guestCheckoutRequests).set({ status }).where(eq(guestCheckoutRequests.id, orderId));
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
  const created = await db.select().from(productFiles).where(eq(productFiles.id, Number(result[0].insertId))).limit(1);
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
  await db.insert(publicSiteContent).values(values).onDuplicateKeyUpdate({ set: values });
  const saved = await db.select().from(publicSiteContent).where(and(eq(publicSiteContent.page, values.page), eq(publicSiteContent.section, values.section))).limit(1);
  return saved[0];
}
