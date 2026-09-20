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
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS session_epoch integer NOT NULL DEFAULT 0`);
    // Case-insensitive username/email lookups (server/storage/users.ts use lower()) need a matching
    // uniqueness constraint, or two accounts differing only in case could collide at auth time.
    // drizzle-orm can't express a functional unique index cleanly in shared/schema.ts, so it lives here.
    await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (lower(username))`);
    await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email))`);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id serial PRIMARY KEY,
        at timestamptz NOT NULL DEFAULT now(),
        actor_id integer,
        actor_username text NOT NULL,
        ip text,
        action text NOT NULL,
        target_type text,
        target_id integer,
        details jsonb
      )
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS audit_log_at_idx ON audit_log (at DESC)`);
    console.log('Startup migrations applied (seismic_calculations + page_visit_logs + is_managed + sensors table + SEN-O* migration + user_objects + cleanup + session_epoch + users lower() unique indexes + audit_log).');
  } catch (e) {
    console.error(`Startup migration error (seismic_calculations columns):: ${describeError(e)}`);
  }

  try {
    // Customers (multi-tenant isolation, spec 2026-09-19). Forward-only.
    await db.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id serial PRIMARY KEY,
        code text NOT NULL UNIQUE,
        name text NOT NULL,
        region_id integer REFERENCES regions(id),
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(`
      INSERT INTO regions (name, description, center_latitude, center_longitude, radius_km)
      VALUES ('Махачкала', 'Республика Дагестан', 42.9849, 47.5047, 50),
             ('Алматы', 'Казахстан', 43.2389, 76.8897, 50),
             ('Улан-Батор', 'Монголия', 47.9184, 106.9177, 50)
      ON CONFLICT (name) DO NOTHING
    `);
    await db.execute(`
      INSERT INTO customers (code, name, region_id)
      SELECT 'ecsem', 'ЕЦСЭМ', (SELECT id FROM regions WHERE name = 'Иркутск' LIMIT 1)
      ON CONFLICT (code) DO NOTHING
    `);
    for (const table of ['infrastructure_objects', 'stations', 'developers', 'soil_profiles',
                         'seismic_calculations', 'sensors', 'calibration_sessions', 'comparison_sets']) {
      await db.execute(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS customer_id integer REFERENCES customers(id)`);
      await db.execute(`UPDATE ${table} SET customer_id = (SELECT id FROM customers WHERE code = 'ecsem') WHERE customer_id IS NULL`);
      await db.execute(`ALTER TABLE ${table} ALTER COLUMN customer_id SET NOT NULL`);
      await db.execute(`CREATE INDEX IF NOT EXISTS ${table}_customer_id_idx ON ${table} (customer_id)`);
    }
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_id integer REFERENCES customers(id)`);
    await db.execute(`UPDATE users SET customer_id = (SELECT id FROM customers WHERE code = 'ecsem') WHERE customer_id IS NULL AND role <> 'superadmin'`);
    await db.execute(`ALTER TABLE infrastructure_objects ADD COLUMN IF NOT EXISTS region_id integer REFERENCES regions(id)`);
    // One-time backfill for the original customer's (ecsem/Иркутск) pre-migration rows only —
    // must NOT re-stamp objects/stations created for other customers (Махачкала, Алматы, Улан-Батор)
    // without an explicit regionId, or every restart would silently relabel them Irkutsk.
    await db.execute(`
      UPDATE infrastructure_objects SET region_id = (SELECT id FROM regions WHERE name = 'Иркутск' LIMIT 1)
      WHERE region_id IS NULL AND customer_id = (SELECT id FROM customers WHERE code = 'ecsem')
    `);
    await db.execute(`
      UPDATE stations SET region_id = (SELECT id FROM regions WHERE name = 'Иркутск' LIMIT 1)
      WHERE region_id IS NULL AND customer_id = (SELECT id FROM customers WHERE code = 'ecsem')
    `);
    console.log('Customers migration applied.');
  } catch (e) {
    console.error(`Customers migration error: ${describeError(e)}`);
  }

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
