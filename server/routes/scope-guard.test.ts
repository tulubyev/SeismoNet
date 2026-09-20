import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';

// No route may call a scoped getter without passing the request scope, and no
// route may create a tenant row without requireCustomer().
const SCOPED_GETTERS = /storage\.(getStations|getStationsByRegionId|getStation|getStationByStationId|getInfrastructureObjects|getInfrastructureObject|getInfrastructureObjectByObjectId|getDevelopers|getDeveloper|getDeveloperByName|getSoilProfiles|getSoilProfile|getSoilProfileNearCoords|getSensorInstallations|getSensorInstallation|getSensors|getSensor|getSensorBySensorCode|getSeismicCalculations|getSeismicCalculation|getComparisonSets|getComparisonSet|getSeismogramRecords|getSeismogramRecord|getCalibrationSessions|getCalibrationSession|getAlerts|getMaintenanceRecords|getMaintenanceRecord|getUpcomingMaintenanceRecords|getUsers)\(([^;]*)\)/g;
const CREATES = /storage\.(createStation|createInfrastructureObject|createDeveloper|createSoilProfile|createSensor|createSeismicCalculation|createComparisonSet|createCalibrationSession)\(/; // no /g: RegExp.test with a global flag is stateful

describe('routes pass the request scope', () => {
  const dir = path.resolve(__dirname);
  for (const f of readdirSync(dir).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'))) {
    const src = readFileSync(path.join(dir, f), 'utf8');
    it(`${f}: every scoped getter receives scopeOf(req) or scope`, () => {
      for (const m of src.matchAll(SCOPED_GETTERS)) expect(m[2], `${f}: ${m[0]}`).toMatch(/scopeOf\(req\)|\bscope\b/);
    });
    it(`${f}: every tenant create is preceded by requireCustomer`, () => {
      if (CREATES.test(src)) expect(src).toMatch(/requireCustomer\(req, res\)/);
    });
  }
});
