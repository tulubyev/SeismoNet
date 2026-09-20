import { db, schema } from "../db";
import { and, desc, asc, eq, gt, inArray, lte } from "drizzle-orm";
import { InsertMaintenanceRecord, MaintenanceRecord, maintenanceRecords, stations } from "@shared/schema";
import { stationInCustomer, andAll } from "./scope";
import { scopedStationIds } from "./stations";
import type { Scope } from "./types";

async function stationScope(scope: Scope) {
  const ids = await scopedStationIds(scope);
  return andAll(
    stationInCustomer(scope, schema.maintenanceRecords.stationId),
    ids ? inArray(schema.maintenanceRecords.stationId, ids.length ? ids : ["__none__"]) : undefined,
  );
}

export const maintenanceStorage = {
  // Maintenance operations
  // Plain select builder, not db.query.*: the relational query API wraps the
  // table in a camelCase-aliased subquery, which breaks the correlated EXISTS
  // inside stationScope ("invalid reference to FROM-clause entry").
  async getMaintenanceRecords(stationId: string, scope: Scope): Promise<MaintenanceRecord[]> {
    return db.select().from(schema.maintenanceRecords)
      .where(andAll(eq(schema.maintenanceRecords.stationId, stationId), await stationScope(scope)))
      .orderBy(desc(schema.maintenanceRecords.performedAt));
  },

  async getMaintenanceRecord(id: number, scope: Scope): Promise<MaintenanceRecord | undefined> {
    const [row] = await db.select().from(schema.maintenanceRecords)
      .where(andAll(eq(schema.maintenanceRecords.id, id), await stationScope(scope)))
      .limit(1);
    return row;
  },

  async createMaintenanceRecord(record: InsertMaintenanceRecord): Promise<MaintenanceRecord> {
    const [newRecord] = await db.insert(schema.maintenanceRecords).values(record).returning();

    // If calibration was performed, update the station calibration info
    if (record.calibrationPerformed) {
      await db
        .update(schema.stations)
        .set({
          sensorsCalibrated: true,
          lastCalibrationDate: record.performedAt,
          nextCalibrationDue: record.nextMaintenanceDue
        })
        .where(eq(schema.stations.stationId, record.stationId));
    }

    return newRecord;
  },

  async updateMaintenanceStatus(id: number, status: string): Promise<MaintenanceRecord | undefined> {
    const [updatedRecord] = await db
      .update(schema.maintenanceRecords)
      .set({ status })
      .where(eq(schema.maintenanceRecords.id, id))
      .returning();

    return updatedRecord;
  },

  async getUpcomingMaintenanceRecords(days: number, scope: Scope): Promise<MaintenanceRecord[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return db.select().from(schema.maintenanceRecords)
      .where(andAll(
        lte(schema.maintenanceRecords.scheduledAt, futureDate),
        gt(schema.maintenanceRecords.scheduledAt, new Date()),
        eq(schema.maintenanceRecords.status, "scheduled"),
        await stationScope(scope),
      ))
      .orderBy(asc(schema.maintenanceRecords.scheduledAt));
  },
};
