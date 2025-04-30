import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schemaImport from "@shared/schema";

// Extract table definitions
const { stations, events, waveformData, researchNetworks, systemStatus, alerts } = schemaImport;

// Export the schema for direct use in other files
export const schema = {
  stations,
  events,
  waveformData,
  researchNetworks,
  systemStatus,
  alerts
};

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });