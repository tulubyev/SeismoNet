import { db, schema } from "../db";
import { eq } from "drizzle-orm";
import { Developer, InfrastructureObject, InsertDeveloper, InsertInfrastructureObject, InsertObjectCategory, ObjectCategory, infrastructureObjects, objectCategories, sensorInstallations } from "@shared/schema";
import { customerWhere, objectIdsWhere, andAll } from "./scope";
import type { Scope } from "./types";

const objectWhere = (scope: Scope) => andAll(customerWhere(scope, schema.infrastructureObjects.customerId), objectIdsWhere(scope, schema.infrastructureObjects.id));

export const infrastructureStorage = {
  // ─── Infrastructure object operations ────────────────────────────────────────

  async getInfrastructureObjects(scope: Scope): Promise<InfrastructureObject[]> {
    return db.query.infrastructureObjects.findMany({
      where: objectWhere(scope),
      orderBy: (t, { asc }) => [asc(t.name)],
    });
  },

  async getInfrastructureObject(id: number, scope: Scope): Promise<InfrastructureObject | undefined> {
    return db.query.infrastructureObjects.findFirst({ where: andAll(eq(schema.infrastructureObjects.id, id), objectWhere(scope)) });
  },

  async getInfrastructureObjectByObjectId(objectId: string, scope: Scope): Promise<InfrastructureObject | undefined> {
    return db.query.infrastructureObjects.findFirst({
      where: andAll(eq(schema.infrastructureObjects.objectId, objectId), objectWhere(scope)),
    });
  },

  async createInfrastructureObject(obj: InsertInfrastructureObject, customerId: number): Promise<InfrastructureObject> {
    const [newObj] = await db.insert(schema.infrastructureObjects).values({ ...obj, customerId }).returning();
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

  async getDevelopers(scope: Scope): Promise<Developer[]> {
    return db.query.developers.findMany({
      where: customerWhere(scope, schema.developers.customerId),
      orderBy: (t, { asc }) => [asc(t.name)],
    });
  },

  async getDeveloper(id: number, scope: Scope): Promise<Developer | undefined> {
    return db.query.developers.findFirst({
      where: andAll(eq(schema.developers.id, id), customerWhere(scope, schema.developers.customerId)),
    });
  },

  async getDeveloperByName(name: string, scope: Scope): Promise<Developer | undefined> {
    return db.query.developers.findFirst({
      where: andAll(eq(schema.developers.name, name), customerWhere(scope, schema.developers.customerId)),
    });
  },

  async createDeveloper(dev: InsertDeveloper, customerId: number): Promise<Developer> {
    const [created] = await db.insert(schema.developers).values({ ...dev, customerId }).returning();
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
