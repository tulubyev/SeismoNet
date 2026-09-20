import { db, schema } from "../db";
import { asc, eq } from "drizzle-orm";
import { InsertSensor, InsertSensorInstallation, Sensor, SensorInstallation, sensorInstallations, sensors } from "@shared/schema";
import { customerWhere, objectIdsWhere, stationInCustomer, andAll } from "./scope";
import type { Scope } from "./types";

const installationScope = (scope: Scope) =>
  andAll(stationInCustomer(scope, schema.sensorInstallations.stationId), objectIdsWhere(scope, schema.sensorInstallations.objectId));

const sensorScope = (scope: Scope) =>
  andAll(customerWhere(scope, schema.sensors.customerId), objectIdsWhere(scope, schema.sensors.objectId));

export const sensorsStorage = {
  // ─── Sensor installation operations ──────────────────────────────────────────

  async getSensorInstallations(objectId: number | undefined, scope: Scope): Promise<SensorInstallation[]> {
    // Plain select builder, not db.query.*: the relational query API wraps the
    // table in a camelCase-aliased subquery, which breaks the correlated EXISTS
    // inside installationScope ("invalid reference to FROM-clause entry").
    return db.select().from(schema.sensorInstallations).where(andAll(
      objectId !== undefined ? eq(schema.sensorInstallations.objectId, objectId) : undefined,
      installationScope(scope),
    ));
  },

  async getSensorInstallation(id: number, scope: Scope): Promise<SensorInstallation | undefined> {
    const [row] = await db.select().from(schema.sensorInstallations)
      .where(andAll(eq(schema.sensorInstallations.id, id), installationScope(scope)))
      .limit(1);
    return row;
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

  async getSensors(stationId: string | undefined, objectId: number | undefined, scope: Scope): Promise<Sensor[]> {
    const where = andAll(
      objectId != null ? eq(schema.sensors.objectId, objectId) : undefined,
      objectId == null && stationId ? eq(schema.sensors.stationId, stationId) : undefined,
      sensorScope(scope),
    );
    const orderBy = objectId != null
      ? [asc(schema.sensors.floor), asc(schema.sensors.sensorCode)]
      : stationId
        ? [asc(schema.sensors.sensorCode)]
        : [asc(schema.sensors.stationId), asc(schema.sensors.sensorCode)];
    return db.query.sensors.findMany({ where, orderBy });
  },

  async getSensor(id: number, scope: Scope): Promise<Sensor | undefined> {
    return db.query.sensors.findFirst({ where: andAll(eq(schema.sensors.id, id), sensorScope(scope)) });
  },

  async getSensorBySensorCode(code: string, scope: Scope): Promise<Sensor | undefined> {
    return db.query.sensors.findFirst({ where: andAll(eq(schema.sensors.sensorCode, code), sensorScope(scope)) });
  },

  async createSensor(sensor: InsertSensor, customerId: number): Promise<Sensor> {
    const [row] = await db.insert(schema.sensors).values({ ...sensor, customerId }).returning();
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
