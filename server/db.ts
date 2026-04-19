import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schemaImport from "@shared/schema";

const { Pool } = pg;

const {
  users,
  regions,
  stations,
  events,
  waveformData,
  researchNetworks,
  systemStatus,
  alerts,
  maintenanceRecords,
  infrastructureObjects,
  objectCategories,
  soilProfiles,
  soilLayers,
  sensorInstallations,
  buildingNorms,
  seismogramRecords,
  calibrationSessions,
  calibrationAfc
} = schemaImport;

export const schema = {
  users,
  regions,
  stations,
  events,
  waveformData,
  researchNetworks,
  systemStatus,
  alerts,
  maintenanceRecords,
  infrastructureObjects,
  objectCategories,
  soilProfiles,
  soilLayers,
  sensorInstallations,
  buildingNorms,
  seismogramRecords,
  calibrationSessions,
  calibrationAfc
};

const connectionString = process.env.VPS_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "VPS_DATABASE_URL or DATABASE_URL must be set."
  );
}

export const pool = new Pool({ connectionString, ssl: false });
export const db = drizzle(pool, { schema });
