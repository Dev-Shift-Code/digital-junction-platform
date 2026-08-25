import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { caseStudies, deliverables, InsertUser, inquiries, milestones, portalContents, projectClients, projects, users } from "../drizzle/schema";
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
