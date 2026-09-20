import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// Every getter that returns tenant rows must declare `scope: Scope`. A getter added
// without it would silently leak other customers' data.
const SCOPED = [
  'getStations', 'getStationsByRegionId', 'getStation', 'getStationByStationId',
  'getInfrastructureObjects', 'getInfrastructureObject', 'getInfrastructureObjectByObjectId',
  'getDevelopers', 'getDeveloper', 'getDeveloperByName',
  'getSoilProfiles', 'getSoilProfile', 'getSoilProfileNearCoords',
  'getSensorInstallations', 'getSensorInstallation', 'getSensors', 'getSensor', 'getSensorBySensorCode',
  'getSeismicCalculations', 'getSeismicCalculation', 'getComparisonSets', 'getComparisonSet',
  'getSeismogramRecords', 'getSeismogramRecord', 'getCalibrationSessions', 'getCalibrationSession',
  'getAlerts', 'getMaintenanceRecords', 'getMaintenanceRecord', 'getUpcomingMaintenanceRecords', 'getUsers',
];

describe('IStorage tenant getters take a Scope', () => {
  const src = readFileSync(path.resolve(__dirname, 'types.ts'), 'utf8');
  for (const name of SCOPED) {
    it(`${name}(…, scope: Scope)`, () => {
      const m = src.match(new RegExp(`^\\s+${name}\\(([^)]*)\\)`, 'm'));
      expect(m, `${name} not found in IStorage`).toBeTruthy();
      expect(m![1]).toMatch(/scope: Scope/);
    });
  }
});
