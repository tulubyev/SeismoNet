import { db, schema } from "../db";
import { eq } from "drizzle-orm";
import { InsertSensor, InsertSensorInstallation, Sensor, SensorInstallation, sensorInstallations, sensors } from "@shared/schema";

export const sensorsStorage = {
  // ─── Sensor installation operations ──────────────────────────────────────────

  async getSensorInstallations(objectId?: number): Promise<SensorInstallation[]> {
    if (objectId !== undefined) {
      return db.query.sensorInstallations.findMany({
        where: (t, { eq }) => eq(t.objectId, objectId)
      });
    }
    return db.query.sensorInstallations.findMany();
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

  async getSensors(stationId?: string, objectId?: number): Promise<Sensor[]> {
    if (objectId != null) {
      return db.query.sensors.findMany({
        where: (t, { eq }) => eq(t.objectId, objectId),
        orderBy: (t, { asc }) => [asc(t.floor), asc(t.sensorCode)]
      });
    }
    if (stationId) {
      return db.query.sensors.findMany({
        where: (t, { eq }) => eq(t.stationId, stationId),
        orderBy: (t, { asc }) => [asc(t.sensorCode)]
      });
    }
    return db.query.sensors.findMany({ orderBy: (t, { asc }) => [asc(t.stationId), asc(t.sensorCode)] });
  },

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
