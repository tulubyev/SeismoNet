import { db, schema } from "../db";
import { eq } from "drizzle-orm";
import { InsertSoilLayer, InsertSoilProfile, SoilLayer, SoilProfile, soilLayers, soilProfiles } from "@shared/schema";
import { customerWhere, objectIdsWhere, andAll } from "./scope";
import type { Scope } from "./types";

const soilScope = (scope: Scope) =>
  andAll(customerWhere(scope, schema.soilProfiles.customerId), objectIdsWhere(scope, schema.soilProfiles.objectId));

export const soilStorage = {
  // ─── Soil profile operations ──────────────────────────────────────────────────

  async getSoilProfiles(objectId: number | undefined, scope: Scope): Promise<SoilProfile[]> {
    return db.query.soilProfiles.findMany({
      where: andAll(
        objectId !== undefined ? eq(schema.soilProfiles.objectId, objectId) : undefined,
        soilScope(scope),
      ),
    });
  },

  async getSoilProfile(id: number, scope: Scope): Promise<SoilProfile | undefined> {
    return db.query.soilProfiles.findFirst({
      where: andAll(eq(schema.soilProfiles.id, id), soilScope(scope)),
    });
  },

  async getSoilProfileNearCoords(lat: number, lng: number, scope: Scope): Promise<SoilProfile | undefined> {
    const all = await db.query.soilProfiles.findMany({ where: soilScope(scope) });
    let nearest: SoilProfile | undefined;
    let minDist = Infinity;
    for (const p of all) {
      if (!p.latitude || !p.longitude) continue;
      const dlat = parseFloat(String(p.latitude)) - lat;
      const dlng = parseFloat(String(p.longitude)) - lng;
      const dist = Math.sqrt(dlat * dlat + dlng * dlng);
      if (dist < minDist) { minDist = dist; nearest = p; }
    }
    return minDist < 0.1 ? nearest : undefined;
  },

  async createSoilProfile(profile: InsertSoilProfile, customerId: number): Promise<SoilProfile> {
    const [newProfile] = await db.insert(schema.soilProfiles).values({ ...profile, customerId }).returning();
    return newProfile;
  },

  async updateSoilProfile(id: number, data: Partial<InsertSoilProfile>): Promise<SoilProfile | undefined> {
    const [updated] = await db.update(schema.soilProfiles).set(data).where(eq(schema.soilProfiles.id, id)).returning();
    return updated;
  },

  async deleteSoilProfile(id: number): Promise<boolean> {
    const result = await db.delete(schema.soilProfiles).where(eq(schema.soilProfiles.id, id)).returning();
    return result.length > 0;
  },

  async getSoilLayers(profileId: number): Promise<SoilLayer[]> {
    return db.query.soilLayers.findMany({
      where: (t, { eq }) => eq(t.profileId, profileId),
      orderBy: (t, { asc }) => [asc(t.layerNumber)]
    });
  },

  async createSoilLayer(layer: InsertSoilLayer): Promise<SoilLayer> {
    const [newLayer] = await db.insert(schema.soilLayers).values(layer).returning();
    return newLayer;
  },

  async updateSoilLayer(id: number, data: Partial<InsertSoilLayer>): Promise<SoilLayer | undefined> {
    const [updated] = await db.update(schema.soilLayers).set(data).where(eq(schema.soilLayers.id, id)).returning();
    return updated;
  },

  async deleteSoilLayer(id: number): Promise<boolean> {
    const result = await db.delete(schema.soilLayers).where(eq(schema.soilLayers.id, id)).returning();
    return result.length > 0;
  },
};
