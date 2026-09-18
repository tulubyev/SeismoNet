import { db, schema } from "../db";
import { desc } from "drizzle-orm";
import type { AuditLog, InsertAuditLog } from "@shared/schema";
import { describeError } from "../lib/errors";

export const auditStorage = {
  /** Fire-and-forget: an audit failure must never fail the action it records. */
  async logAudit(entry: InsertAuditLog): Promise<void> {
    try {
      await db.insert(schema.auditLog).values(entry);
    } catch (err) {
      console.error(`audit log write failed (${entry.action}): ${describeError(err)}`);
    }
  },

  async getAuditLog(limit: number): Promise<AuditLog[]> {
    return db.select().from(schema.auditLog).orderBy(desc(schema.auditLog.at), desc(schema.auditLog.id)).limit(limit);
  },
};
