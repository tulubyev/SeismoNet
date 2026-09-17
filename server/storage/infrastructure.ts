import { db, schema } from "../db";
import { eq } from "drizzle-orm";
import { Developer, InfrastructureObject, InsertDeveloper, InsertInfrastructureObject, InsertObjectCategory, ObjectCategory, infrastructureObjects, objectCategories, sensorInstallations } from "@shared/schema";
import type { ObjectScope } from "./types";

export const infrastructureStorage = {
  // ─── Infrastructure object operations ────────────────────────────────────────

  async getInfrastructureObjects(scope?: ObjectScope): Promise<InfrastructureObject[]> {
    return db.query.infrastructureObjects.findMany({
      where: scope ? (t, { inArray }) => inArray(t.id, scope.objectIds.length ? scope.objectIds : [-1]) : undefined,
      orderBy: (t, { asc }) => [asc(t.name)],
    });
  },

  async getInfrastructureObject(id: number, scope?: ObjectScope): Promise<InfrastructureObject | undefined> {
    if (scope && !scope.objectIds.includes(id)) return undefined;
    return db.query.infrastructureObjects.findFirst({ where: (t, { eq }) => eq(t.id, id) });
  },

  async getInfrastructureObjectByObjectId(objectId: string): Promise<InfrastructureObject | undefined> {
    return db.query.infrastructureObjects.findFirst({
      where: (t, { eq }) => eq(t.objectId, objectId)
    });
  },

  async createInfrastructureObject(obj: InsertInfrastructureObject): Promise<InfrastructureObject> {
    const [newObj] = await db.insert(schema.infrastructureObjects).values(obj).returning();
    return newObj;
  },

  async updateInfrastructureObject(id: number, data: Partial<InsertInfrastructureObject>): Promise<InfrastructureObject | undefined> {
    const [updated] = await db
      .update(schema.infrastructureObjects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.infrastructureObjects.id, id))
      .returning();
    return updated;
  },

  async deleteInfrastructureObject(id: number): Promise<boolean> {
    await db
      .delete(schema.sensorInstallations)
      .where(eq(schema.sensorInstallations.objectId, id));
    const result = await db
      .delete(schema.infrastructureObjects)
      .where(eq(schema.infrastructureObjects.id, id))
      .returning({ id: schema.infrastructureObjects.id });
    return result.length > 0;
  },

  // ─── Developer operations ────────────────────────────────────────────────────

  async getDevelopers(): Promise<Developer[]> {
    return db.query.developers.findMany({
      orderBy: (t, { asc }) => [asc(t.name)]
    });
  },

  async getDeveloper(id: number): Promise<Developer | undefined> {
    return db.query.developers.findFirst({
      where: (t, { eq }) => eq(t.id, id)
    });
  },

  async getDeveloperByName(name: string): Promise<Developer | undefined> {
    return db.query.developers.findFirst({
      where: (t, { eq }) => eq(t.name, name)
    });
  },

  async createDeveloper(dev: InsertDeveloper): Promise<Developer> {
    const [created] = await db.insert(schema.developers).values(dev).returning();
    return created;
  },

  async updateDeveloper(id: number, data: Partial<InsertDeveloper>): Promise<Developer | undefined> {
    const [updated] = await db
      .update(schema.developers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.developers.id, id))
      .returning();
    return updated;
  },

  async deleteDeveloper(id: number): Promise<boolean> {
    const result = await db
      .delete(schema.developers)
      .where(eq(schema.developers.id, id))
      .returning({ id: schema.developers.id });
    return result.length > 0;
  },

  // ─── Object category operations ──────────────────────────────────────────────
  async getObjectCategories(): Promise<ObjectCategory[]> {
    return db.query.objectCategories.findMany({
      orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
    });
  },
  async getObjectCategory(id: number): Promise<ObjectCategory | undefined> {
    return db.query.objectCategories.findFirst({ where: (t, { eq }) => eq(t.id, id) });
  },
  async getObjectCategoryBySlug(slug: string): Promise<ObjectCategory | undefined> {
    return db.query.objectCategories.findFirst({ where: (t, { eq }) => eq(t.slug, slug) });
  },
  async createObjectCategory(cat: InsertObjectCategory): Promise<ObjectCategory> {
    const [newCat] = await db.insert(schema.objectCategories).values(cat).returning();
    return newCat;
  },
  async updateObjectCategory(id: number, data: Partial<InsertObjectCategory>): Promise<ObjectCategory | undefined> {
    const [updated] = await db.update(schema.objectCategories).set(data).where(eq(schema.objectCategories.id, id)).returning();
    return updated;
  },
  async deleteObjectCategory(id: number): Promise<boolean> {
    const result = await db.delete(schema.objectCategories).where(eq(schema.objectCategories.id, id)).returning();
    return result.length > 0;
  },
};
