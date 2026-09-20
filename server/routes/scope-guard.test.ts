import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';

// No route may call a scoped getter without passing the request scope, and no
// route may create a tenant row without requireCustomer().
const SCOPED_GETTERS = /storage\.(getStations|getStationsByRegionId|getStation|getStationByStationId|getInfrastructureObjects|getInfrastructureObject|getInfrastructureObjectByObjectId|getDevelopers|getDeveloper|getDeveloperByName|getSoilProfiles|getSoilProfile|getSoilProfileNearCoords|getSensorInstallations|getSensorInstallation|getSensors|getSensor|getSensorBySensorCode|getSeismicCalculations|getSeismicCalculation|getComparisonSets|getComparisonSet|getSeismogramRecords|getSeismogramRecord|getCalibrationSessions|getCalibrationSession|getAlerts|getMaintenanceRecords|getMaintenanceRecord|getUpcomingMaintenanceRecords|getUsers)\(([^;]*)\)/g;
// Tenant creates that take an explicit `customerId` param (see the "create-customerId"
// bucket in server/storage/scope-guard.test.ts's ALLOWLIST) — each call site must be
// preceded by a requireCustomer(req, res) that produced that id.
const CREATE_RE = /storage\.(createStation|createInfrastructureObject|createDeveloper|createSoilProfile|createSensor|createSeismicCalculation|createComparisonSet|createCalibrationSession)\(/g;
const REQUIRE_CUSTOMER_RE = /requireCustomer\(req, res\)/g;
// A bare req.body forwarded straight into an update call lets a client re-tenant
// the row via a spoofed customerId (or reassign its id). No /g: same reason as CREATES.
const UPDATE_WITH_BARE_BODY = /update[A-Z]\w*\([^)]*\breq\.body\b/;

const count = (src: string, re: RegExp) => Array.from(src.matchAll(re)).length;

describe('routes pass the request scope', () => {
  const dir = path.resolve(__dirname);
  for (const f of readdirSync(dir).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'))) {
    const src = readFileSync(path.join(dir, f), 'utf8');
    it(`${f}: every scoped getter receives scopeOf(req) or scope`, () => {
      for (const m of src.matchAll(SCOPED_GETTERS)) expect(m[2], `${f}: ${m[0]}`).toMatch(/scopeOf\(req\)|\bscope\b/);
    });
    it(`${f}: every tenant-create call site has a matching requireCustomer`, () => {
      // A file-level "does it appear at all" check passes a file with two creates and
      // only one requireCustomer call — count call sites instead, so an unguarded
      // second (or third...) create in the same file is caught.
      const creates = count(src, CREATE_RE);
      const guards = count(src, REQUIRE_CUSTOMER_RE);
      expect(guards, `${f}: ${creates} tenant-create call site(s) but only ${guards} requireCustomer(req, res) call(s)`).toBeGreaterThanOrEqual(creates);
    });
    it(`${f}: no update call forwards a bare req.body`, () => {
      expect(UPDATE_WITH_BARE_BODY.test(src), `${f}: an updateXxx(...) call passes req.body directly`).toBe(false);
    });
  }
});
