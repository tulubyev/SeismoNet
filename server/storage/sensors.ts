import { db, schema } from "../db";
import { and, asc, eq, inArray, type SQL } from "drizzle-orm";
import { InsertSensor, InsertSensorInstallation, Sensor, SensorInstallation, sensorInstallations, sensors } from "@shared/schema";
import type { ObjectScope } from "./types";

export const sensorsStorage = {
  // ─── Sensor installation operations ──────────────────────────────────────────

  async getSensorInstallations(objectId?: number, scope?: ObjectScope): Promise<SensorInstallation[]> {
    const conds: SQL[] = [];
    if (objectId !== undefined) conds.push(eq(schema.sensorInstallations.objectId, objectId));
    if (scope) conds.push(inArray(schema.sensorInstallations.objectId, scope.objectIds.length ? scope.objectIds : [-1]));
    return db.query.sensorInstallations.findMany({ where: conds.length ? and(...conds) : undefined });
  },

  async getSensorInstallation(id: number): Promise<SensorInstallation | undefined> {
    return db.query.sensorInstallations.findFirst({
      where: (t, { eq }) => eq(t.id, id)
    });
  },

  async createSensorInstallation(inst: InsertSensorInstallation): Promise<SensorInstallation> {
    const [newInst] = await db.insert(schema.sensorInstallations).values(inst).returning();
    return newInst;
  },

  async updateSensorInstallation(id: number, data: Partial<InsertSensorInstallation>): Promise<SensorInstallation | undefined> {
    const [updated] = await db
      .update(schema.sensorInstallations)
      .set(data)
      .where(eq(schema.sensorInstallations.id, id))
      .returning();
    return updated;
  },

  async deleteSensorInstallation(id: number): Promise<boolean> {
    const result = await db.delete(schema.sensorInstallations).where(eq(schema.sensorInstallations.id, id)).returning();
    return result.length > 0;
  },

  // ─── Sensor device operations ─────────────────────────────────────────────────

  async getSensors(stationId?: string, objectId?: number, scope?: ObjectScope): Promise<Sensor[]> {
    const conds: SQL[] = [];
    if (objectId != null) conds.push(eq(schema.sensors.objectId, objectId));
    else if (stationId) conds.push(eq(schema.sensors.stationId, stationId));
    if (scope) conds.push(inArray(schema.sensors.objectId, scope.objectIds.length ? scope.objectIds : [-1]));
    const orderBy = objectId != null
      ? [asc(schema.sensors.floor), asc(schema.sensors.sensorCode)]
      : stationId
        ? [asc(schema.sensors.sensorCode)]
        : [asc(schema.sensors.stationId), asc(schema.sensors.sensorCode)];
    return db.query.sensors.findMany({ where: conds.length ? and(...conds) : undefined, orderBy });
  },

  // Unscoped on purpose: the only scoped role (staff) has `none` on this module
  // (shared/permissions.test.ts guards that). Add a `scope` parameter before
  // granting staff any access here.
  async getSensor(id: number): Promise<Sensor | undefined> {
    return db.query.sensors.findFirst({ where: (t, { eq }) => eq(t.id, id) });
  },

  async getSensorBySensorCode(code: string): Promise<Sensor | undefined> {
    return db.query.sensors.findFirst({ where: (t, { eq }) => eq(t.sensorCode, code) });
  },

  async createSensor(sensor: InsertSensor): Promise<Sensor> {
    const [row] = await db.insert(schema.sensors).values(sensor).returning();
    return row;
  },

  async updateSensor(id: number, data: Partial<InsertSensor>): Promise<Sensor | undefined> {
    const [row] = await db.update(schema.sensors).set(data).where(eq(schema.sensors.id, id)).returning();
    return row;
  },

  async deleteSensor(id: number): Promise<boolean> {
    const result = await db.delete(schema.sensors).where(eq(schema.sensors.id, id)).returning();
    return result.length > 0;
  },
};
