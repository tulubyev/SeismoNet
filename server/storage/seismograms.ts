import { db, schema } from "../db";
import { desc, eq, inArray } from "drizzle-orm";
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

  // Plain select builder, not db.query.*: the relational query API wraps the
  // table in a camelCase-aliased subquery, which breaks the correlated EXISTS
  // inside stationScope ("invalid reference to FROM-clause entry").
  async getSeismogramRecords(stationId: string | undefined, limit: number = 50, scope: Scope): Promise<SeismogramRecord[]> {
    return db.select().from(schema.seismogramRecords)
      .where(andAll(stationId ? eq(schema.seismogramRecords.stationId, stationId) : undefined, await stationScope(scope)))
      .orderBy(desc(schema.seismogramRecords.startTime))
      .limit(limit);
  },

  async getSeismogramRecord(id: number, scope: Scope): Promise<SeismogramRecord | undefined> {
    const [row] = await db.select().from(schema.seismogramRecords)
      .where(andAll(eq(schema.seismogramRecords.id, id), await stationScope(scope)))
      .limit(1);
    return row;
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
