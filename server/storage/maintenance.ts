import { db, schema } from "../db";
import { and, desc, eq, gt, lte } from "drizzle-orm";
import { InsertMaintenanceRecord, MaintenanceRecord, maintenanceRecords, stations } from "@shared/schema";

export const maintenanceStorage = {
  // Maintenance operations
  async getMaintenanceRecords(stationId: string): Promise<MaintenanceRecord[]> {
    return db.query.maintenanceRecords.findMany({
      where: (records, { eq }) => eq(records.stationId, stationId),
      orderBy: (records, { desc }) => [desc(records.performedAt)]
    });
  },
  
  async getMaintenanceRecord(id: number): Promise<MaintenanceRecord | undefined> {
    return db.query.maintenanceRecords.findFirst({
      where: (records, { eq }) => eq(records.id, id)
    });
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
  
  async getUpcomingMaintenanceRecords(days: number): Promise<MaintenanceRecord[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return db.query.maintenanceRecords.findMany({
      where: (records, { and, lte, gt, eq }) => 
        and(
          lte(records.scheduledAt, futureDate),
          gt(records.scheduledAt, new Date()),
          eq(records.status, "scheduled")
        ),
      orderBy: (records, { asc }) => [asc(records.scheduledAt)]
    });
  },
};
