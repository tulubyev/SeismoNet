import { db, schema } from "../db";
import { desc, eq } from "drizzle-orm";
import { InsertSeismogramRecord, SeismogramRecord, seismogramRecords } from "@shared/schema";

export const seismogramsStorage = {
  // ─── Seismogram record operations ─────────────────────────────────────────────

  async getSeismogramRecords(stationId?: string, limit: number = 50): Promise<SeismogramRecord[]> {
    if (stationId) {
      return db.query.seismogramRecords.findMany({
        where: (t, { eq }) => eq(t.stationId, stationId),
        orderBy: (t, { desc }) => [desc(t.startTime)],
        limit
      });
    }
    return db.query.seismogramRecords.findMany({
      orderBy: (t, { desc }) => [desc(t.startTime)],
      limit
    });
  },

  async getSeismogramRecord(id: number): Promise<SeismogramRecord | undefined> {
    return db.query.seismogramRecords.findFirst({
      where: (t, { eq }) => eq(t.id, id)
    });
  },

  async createSeismogramRecord(record: InsertSeismogramRecord): Promise<SeismogramRecord> {
    const [newRecord] = await db.insert(schema.seismogramRecords).values(record).returning();
    return newRecord;
  },

  async updateSeismogramProcessingStatus(id: number, status: string): Promise<SeismogramRecord | undefined> {
    const [updated] = await db
      .update(schema.seismogramRecords)
      .set({ processingStatus: status })
      .where(eq(schema.seismogramRecords.id, id))
      .returning();
    return updated;
  },
};
