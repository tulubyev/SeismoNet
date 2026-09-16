import { db, schema } from "../db";
import { desc, eq } from "drizzle-orm";
import { CalibrationAfc, CalibrationSession, InsertCalibrationAfc, InsertCalibrationSession } from "@shared/schema";

export const calibrationStorage = {
  // ─── Calibration session operations ────────────────────────────────────────

  async getCalibrationSessions(installationId?: number): Promise<CalibrationSession[]> {
    if (installationId !== undefined) {
      return db.query.calibrationSessions.findMany({
        where: (t, { eq }) => eq(t.installationId, installationId),
        orderBy: (t, { desc }) => [desc(t.sessionDate)]
      });
    }
    return db.query.calibrationSessions.findMany({
      orderBy: (t, { desc }) => [desc(t.sessionDate)]
    });
  },

  async getCalibrationSession(id: number): Promise<CalibrationSession | undefined> {
    return db.query.calibrationSessions.findFirst({
      where: (t, { eq }) => eq(t.id, id)
    });
  },

  async createCalibrationSession(session: InsertCalibrationSession): Promise<CalibrationSession> {
    const [newSession] = await db.insert(schema.calibrationSessions).values(session).returning();
    return newSession;
  },

  async updateCalibrationSession(id: number, data: Partial<InsertCalibrationSession>): Promise<CalibrationSession | undefined> {
    const [updated] = await db
      .update(schema.calibrationSessions)
      .set(data)
      .where(eq(schema.calibrationSessions.id, id))
      .returning();
    return updated;
  },

  async deleteCalibrationSession(id: number): Promise<boolean> {
    await db.delete(schema.calibrationAfc).where(eq(schema.calibrationAfc.sessionId, id));
    const result = await db.delete(schema.calibrationSessions).where(eq(schema.calibrationSessions.id, id));
    return (result.rowCount ?? 0) > 0;
  },

  // ─── AFC operations ─────────────────────────────────────────────────────────

  async getCalibrationAfc(sessionId: number): Promise<CalibrationAfc[]> {
    return db.query.calibrationAfc.findMany({
      where: (t, { eq }) => eq(t.sessionId, sessionId),
      orderBy: (t, { asc }) => [asc(t.frequency)]
    });
  },

  async createCalibrationAfcPoint(point: InsertCalibrationAfc): Promise<CalibrationAfc> {
    const [newPoint] = await db.insert(schema.calibrationAfc).values(point).returning();
    return newPoint;
  },

  async deleteCalibrationAfcPoint(id: number): Promise<boolean> {
    const result = await db.delete(schema.calibrationAfc).where(eq(schema.calibrationAfc.id, id));
    return (result.rowCount ?? 0) > 0;
  },

  async replaceCalibrationAfc(sessionId: number, points: InsertCalibrationAfc[]): Promise<CalibrationAfc[]> {
    await db.delete(schema.calibrationAfc).where(eq(schema.calibrationAfc.sessionId, sessionId));
    if (points.length === 0) return [];
    const inserted = await db.insert(schema.calibrationAfc)
      .values(points.map(p => ({ ...p, sessionId })))
      .returning();
    return inserted;
  },
};
