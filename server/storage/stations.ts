import { db, schema } from "../db";
import { eq, inArray } from "drizzle-orm";
import { InsertRegion, InsertStation, Region, Station, regions, stations } from "@shared/schema";
import { customerWhere, andAll, NO_ROWS } from "./scope";
import type { Scope } from "./types";

/** staff: station ids carrying a sensor installation on a bound object; undefined = no narrowing. */
export async function scopedStationIds(scope: Scope): Promise<string[] | undefined> {
  if (!scope.objectIds) return undefined;
  const ids = scope.objectIds.length ? scope.objectIds : NO_ROWS;
  const rows = await db.selectDistinct({ stationId: schema.sensorInstallations.stationId })
    .from(schema.sensorInstallations).where(inArray(schema.sensorInstallations.objectId, ids));
  return rows.map(r => r.stationId);
}

async function stationWhere(scope: Scope) {
  const ids = await scopedStationIds(scope);
  return andAll(customerWhere(scope, schema.stations.customerId), ids ? inArray(schema.stations.stationId, ids.length ? ids : ["__none__"]) : undefined);
}

export const stationsStorage = {
  // Region operations
  async getRegions(): Promise<Region[]> {
    return db.query.regions.findMany();
  },

  async getRegion(id: number): Promise<Region | undefined> {
    return db.query.regions.findFirst({
      where: (regions, { eq }) => eq(regions.id, id)
    });
  },

  async getRegionByName(name: string): Promise<Region | undefined> {
    return db.query.regions.findFirst({
      where: (regions, { eq }) => eq(regions.name, name)
    });
  },

  async createRegion(region: InsertRegion): Promise<Region> {
    const [newRegion] = await db.insert(schema.regions).values(region).returning();
    return newRegion;
  },

  // Station operations
  async getStations(scope: Scope): Promise<Station[]> {
    return db.query.stations.findMany({ where: await stationWhere(scope) });
  },

  async getStationsByRegionId(regionId: number, scope: Scope): Promise<Station[]> {
    return db.query.stations.findMany({ where: andAll(eq(schema.stations.regionId, regionId), await stationWhere(scope)) });
  },

  async getStation(id: number, scope: Scope): Promise<Station | undefined> {
    return db.query.stations.findFirst({ where: andAll(eq(schema.stations.id, id), await stationWhere(scope)) });
  },

  async getStationByStationId(stationId: string, scope: Scope): Promise<Station | undefined> {
    return db.query.stations.findFirst({ where: andAll(eq(schema.stations.stationId, stationId), await stationWhere(scope)) });
  },

  async createStation(station: InsertStation, customerId: number): Promise<Station> {
    const [newStation] = await db.insert(schema.stations).values({ ...station, customerId }).returning();
    return newStation;
  },

  async updateStation(stationId: string, updates: Partial<Station>): Promise<Station | undefined> {
    const { id: _id, stationId: _sid, ...safeUpdates } = updates;
    const [updatedStation] = await db
      .update(schema.stations)
      .set({ ...safeUpdates, lastUpdate: new Date() })
      .where(eq(schema.stations.stationId, stationId))
      .returning();
    return updatedStation;
  },

  async updateStationStatus(stationId: string, status: string): Promise<Station | undefined> {
    const [updatedStation] = await db
      .update(schema.stations)
      .set({ status, lastUpdate: new Date() })
      .where(eq(schema.stations.stationId, stationId))
      .returning();
    return updatedStation;
  },

  async updateStationBatteryInfo(
    stationId: string,
    batteryLevel: number,
    batteryVoltage: number,
    powerConsumption: number
  ): Promise<Station | undefined> {
    // Convert floating point values to integers to avoid the type error
    const batteryLevelInt = Math.round(batteryLevel);
    const batteryVoltageInt = Math.round(batteryVoltage * 100) / 100; // Keep two decimal places
    const powerConsumptionInt = Math.round(powerConsumption * 100) / 100; // Keep two decimal places

    const [updatedStation] = await db
      .update(schema.stations)
      .set({
        batteryLevel: batteryLevelInt,
        batteryVoltage: batteryVoltageInt,
        powerConsumption: powerConsumptionInt,
        lastUpdate: new Date()
      })
      .where(eq(schema.stations.stationId, stationId))
      .returning();
    return updatedStation;
  },

  async updateStationStorageInfo(stationId: string, storageRemaining: number): Promise<Station | undefined> {
    // Convert floating point values to integers to avoid the type error
    const storageRemainingInt = Math.round(storageRemaining);

    const [updatedStation] = await db
      .update(schema.stations)
      .set({
        storageRemaining: storageRemainingInt,
        lastUpdate: new Date()
      })
      .where(eq(schema.stations.stationId, stationId))
      .returning();
    return updatedStation;
  },
};
