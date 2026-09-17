import { db, schema } from "../db";
import { eq, inArray } from "drizzle-orm";
import { InsertRegion, InsertStation, Region, Station, regions, stations } from "@shared/schema";
import type { ObjectScope } from "./types";

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
  async getStations(scope?: ObjectScope): Promise<Station[]> {
    if (!scope) return db.query.stations.findMany();
    // staff: only stations that carry an installation on one of their objects
    const ids = scope.objectIds.length ? scope.objectIds : [-1];
    const rows = await db.selectDistinct({ stationId: schema.sensorInstallations.stationId })
      .from(schema.sensorInstallations)
      .where(inArray(schema.sensorInstallations.objectId, ids));
    const stationIds = rows.map(r => r.stationId);
    if (!stationIds.length) return [];
    return db.query.stations.findMany({ where: (t, { inArray }) => inArray(t.stationId, stationIds) });
  },
  
  async getStationsByRegionId(regionId: number): Promise<Station[]> {
    return db.query.stations.findMany({
      where: (stations, { eq }) => eq(stations.regionId, regionId)
    });
  },
  
  async getStation(id: number): Promise<Station | undefined> {
    return db.query.stations.findFirst({
      where: (stations, { eq }) => eq(stations.id, id)
    });
  },
  
  async getStationByStationId(stationId: string): Promise<Station | undefined> {
    return db.query.stations.findFirst({
      where: (stations, { eq }) => eq(stations.stationId, stationId)
    });
  },
  
  async createStation(station: InsertStation): Promise<Station> {
    const [newStation] = await db.insert(schema.stations).values(station).returning();
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
