import { db, schema } from "../db";
import { eq } from "drizzle-orm";
import { BuildingNorm, InsertBuildingNorm, buildingNorms } from "@shared/schema";

export const normsStorage = {
  // ─── Building norms operations ────────────────────────────────────────────────

  async getBuildingNorms(category?: string): Promise<BuildingNorm[]> {
    if (category) {
      return db.query.buildingNorms.findMany({
        where: (t, { eq }) => eq(t.category, category),
        orderBy: (t, { asc }) => [asc(t.shortCode)]
      });
    }
    return db.query.buildingNorms.findMany({
      orderBy: (t, { asc }) => [asc(t.category), asc(t.shortCode)]
    });
  },

  async getBuildingNorm(id: number): Promise<BuildingNorm | undefined> {
    return db.query.buildingNorms.findFirst({
      where: (t, { eq }) => eq(t.id, id)
    });
  },

  async getBuildingNormByCode(code: string): Promise<BuildingNorm | undefined> {
    return db.query.buildingNorms.findFirst({
      where: (t, { eq }) => eq(t.code, code)
    });
  },

  async createBuildingNorm(norm: InsertBuildingNorm): Promise<BuildingNorm> {
    const [newNorm] = await db.insert(schema.buildingNorms).values(norm).returning();
    return newNorm;
  },
};
