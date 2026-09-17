import { and } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { describeError } from "./lib/errors";

// Ensure columns added after initial table creation exist in all environments
export async function runStartupMigrations() {
  try {
    await db.execute(
      `ALTER TABLE seismic_calculations ADD COLUMN IF NOT EXISTS notes_updated_at timestamp`
    );
    await db.execute(
      `ALTER TABLE seismic_calculations ADD COLUMN IF NOT EXISTS notes_updated_by text`
    );
    await db.execute(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_system_status_pageviews ON system_status (component) WHERE component = 'PageViews'`
    );
    await db.execute(`
      CREATE TABLE IF NOT EXISTS page_visit_logs (
        id SERIAL PRIMARY KEY,
        ip TEXT NOT NULL,
        country TEXT,
        country_code TEXT,
        region TEXT,
        city TEXT,
        user_agent TEXT,
        visited_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(`ALTER TABLE stations ADD COLUMN IF NOT EXISTS is_managed boolean NOT NULL DEFAULT false`);
    await db.execute(`UPDATE stations SET is_managed = true WHERE station_id LIKE 'IRK-%' AND is_managed = false`);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sensors (
        id SERIAL PRIMARY KEY,
        sensor_code TEXT NOT NULL UNIQUE,
        station_id TEXT REFERENCES stations(station_id),
        model TEXT,
        serial_number TEXT,
        sensor_type TEXT NOT NULL DEFAULT 'accelerometer',
        axes TEXT NOT NULL DEFAULT 'Z,NS,EW',
        sensitivity REAL,
        frequency_range TEXT,
        installation_date TIMESTAMP,
        calibration_date TIMESTAMP,
        is_active BOOLEAN NOT NULL DEFAULT true,
        location TEXT,
        notes TEXT
      )
    `);
    // Make station_id nullable if it was created with NOT NULL
    await db.execute(`ALTER TABLE sensors ALTER COLUMN station_id DROP NOT NULL`);
    // Add object_id and floor columns for building-mounted sensors
    await db.execute(`ALTER TABLE sensors ADD COLUMN IF NOT EXISTS object_id INTEGER REFERENCES infrastructure_objects(id)`);
    await db.execute(`ALTER TABLE sensors ADD COLUMN IF NOT EXISTS floor INTEGER`);
    // Migrate SEN-O* pseudo-stations into sensors table before removal (idempotent)
    await db.execute(`
      INSERT INTO sensors (sensor_code, object_id, floor, location, sensor_type, axes, model, is_active)
      SELECT
        SUBSTRING(s.station_id FROM 5) AS sensor_code,
        CAST(SUBSTRING(s.station_id FROM 'SEN-OBJ(\\d+)-') AS INTEGER) AS object_id,
        CASE
          WHEN s.station_id ~ '-F\\d+-ACC'
          THEN CAST(SUBSTRING(s.station_id FROM '-F(\\d+)-ACC') AS INTEGER)
          ELSE NULL
        END AS floor,
        CASE
          WHEN s.station_id LIKE '%-FND-%' THEN 'foundation'
          WHEN s.station_id LIKE '%-RF-%'  THEN 'roof'
          WHEN s.station_id ~ '-F01-ACC'   THEN 'ground_floor'
          WHEN s.station_id ~ '-F\\d+-ACC' THEN 'mid_floor'
          ELSE 'foundation'
        END AS location,
        CASE WHEN s.station_id LIKE '%-FND-%' THEN 'seismometer' ELSE 'accelerometer' END AS sensor_type,
        CASE
          WHEN s.station_id LIKE '%-Z'  THEN 'Z'
          WHEN s.station_id LIKE '%-NS' THEN 'NS'
          WHEN s.station_id LIKE '%-EW' THEN 'EW'
          ELSE 'Z,NS,EW'
        END AS axes,
        CASE WHEN s.station_id LIKE '%-FND-%' THEN 'СМ-3КВ' ELSE 'ЦСС-1М' END AS model,
        CASE WHEN s.status = 'online' THEN TRUE ELSE FALSE END AS is_active
      FROM stations s
      WHERE s.station_id LIKE 'SEN-OBJ%'
        AND EXISTS (
          SELECT 1 FROM infrastructure_objects io
          WHERE io.id = CAST(SUBSTRING(s.station_id FROM 'SEN-OBJ(\\d+)-') AS INTEGER)
        )
      ON CONFLICT (sensor_code) DO NOTHING
    `);
    // Remove SEN-O* pseudo-stations now that data is preserved in sensors table
    await db.execute(`DELETE FROM sensor_installations WHERE station_id LIKE 'SEN-%'`);
    await db.execute(`DELETE FROM stations WHERE station_id LIKE 'SEN-%'`);
    // Roles (migration 0006): the binding table is safe to create here, but the
    // user_role enum swap is not — it must go through `npm run migrate:roles`.
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_objects (
        user_id   integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        object_id integer NOT NULL REFERENCES infrastructure_objects(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, object_id)
      )
    `);
    const roleLabels = await db.execute(
      `SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'user_role'`
    );
    const labels = ((roleLabels as { rows?: Array<{ enumlabel?: string }> }).rows ?? []).map(r => r.enumlabel);
    if (!labels.includes('superadmin')) {
      console.error('****************************************************************');
      console.error('ROLES MIGRATION MISSING: run `npm run migrate:roles` — every user will get 403 until then');
      console.error(`  current user_role labels: ${labels.length ? labels.join(', ') : '(enum not found)'}`);
      console.error('****************************************************************');
    }
    console.log('Startup migrations applied (seismic_calculations + page_visit_logs + is_managed + sensors table + SEN-O* migration + user_objects + cleanup).');
  } catch (e) {
    console.error(`Startup migration error (seismic_calculations columns):: ${describeError(e)}`);
  }
}

// Function to ensure all research networks are initialized
export async function initializeResearchNetworks() {
  console.log('Initializing research networks...');
  
  // Initialize JMA network if it doesn't exist
  let jmaNetwork = await storage.getResearchNetworkByNetworkId("JMA");
  if (!jmaNetwork) {
    jmaNetwork = await storage.createResearchNetwork({
      networkId: "JMA",
      name: "Japan Meteorological Agency",
      region: "Japan",
      connectionStatus: "connected",
      lastSyncTimestamp: new Date(),
      syncedDataVolume: 95.7,
      apiEndpoint: "https://www.jma.go.jp/bosai/quake/data/list.json"
    });
    console.log("Created JMA research network:", jmaNetwork);
  } else {
    console.log("JMA research network already exists");
  }
}

// Function to send a message to all connected WebSocket clients
