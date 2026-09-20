import { db, schema } from "../db";
import { eq, inArray } from "drizzle-orm";
import { InsertSeismogramRecord, SeismogramRecord, seismogramRecords } from "@shared/schema";
import { stationInCustomer, andAll } from "./scope";
import { scopedStationIds } from "./stations";
import type { Scope } from "./types";

async function stationScope(scope: Scope) {
  const ids = await scopedStationIds(scope);
  return andAll(
    stationInCustomer(scope, schema.seismogramRecords.stationId),
    ids ? inArray(schema.seismogramRecords.stationId, ids.length ? ids : ["__none__"]) : undefined,
  );
}

export const seismogramsStorage = {
  // ─── Seismogram record operations ─────────────────────────────────────────────

  async getSeismogramRecords(stationId: string | undefined, limit: number = 50, scope: Scope): Promise<SeismogramRecord[]> {
    return db.query.seismogramRecords.findMany({
      where: andAll(stationId ? eq(schema.seismogramRecords.stationId, stationId) : undefined, await stationScope(scope)),
      orderBy: (t, { desc }) => [desc(t.startTime)],
      limit,
    });
  },

  async getSeismogramRecord(id: number, scope: Scope): Promise<SeismogramRecord | undefined> {
    return db.query.seismogramRecords.findFirst({
      where: andAll(eq(schema.seismogramRecords.id, id), await stationScope(scope)),
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
