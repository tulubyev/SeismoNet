import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// Every IStorage method that returns tenant-owned rows must declare `scope: Scope`,
// so a getter added tomorrow without it fails this test instead of silently leaking
// other customers' data. Rather than a hand-maintained name list (which a forgotten
// entry defeats trivially), this DERIVES the set of "tenant-returning" methods by
// scanning types.ts for signatures whose return type mentions one of these entities.
const TENANT_ENTITIES = [
  'Station', 'InfrastructureObject', 'Developer', 'SoilProfile', 'SoilLayer', 'Sensor',
  'SensorInstallation', 'SeismicCalculation', 'ComparisonSet', 'SeismogramRecord',
  'CalibrationSession', 'CalibrationAfc', 'Alert', 'MaintenanceRecord', 'WaveformData', 'User',
];

// One line per IStorage member, e.g. `  getStation(id: number, scope: Scope): Promise<Station | undefined>;`.
// Params never contain literal parens in this file, so a non-greedy match up to the
// first `): Promise<` finds the right split; the greedy `returnType` then backtracks
// to the LAST `>;` on the line, which is the close of the Promise<...>.
const MEMBER_RE = /^\s*(\w+)\(([\s\S]*?)\)\s*:\s*Promise<([\s\S]*)>;\s*$/;

/**
 * Deliberate exceptions: methods that return a tenant entity but do not take `scope`.
 * Every entry must be justified — keep this list small.
 *
 *  - create-customerId: the route obtains a single customerId via requireCustomer()
 *    and passes it as an explicit param; the row can only ever be stamped into the
 *    caller's own customer, so there is nothing to scope-check against.
 *  - update-guarded: the route always loads the target row with a scoped getter
 *    (`getX(id, scopeOf(req))`) and 404s before calling the update, so an id from
 *    another customer never reaches these.
 *  - parent-scoped: the underlying table has no customer_id column at all; tenancy
 *    is inherited from a parent row (soil_profile / calibration_session / station /
 *    infrastructure_object) that the route validates against scope first.
 *  - users-superadmin-only: the `users` module is write- and read-restricted to
 *    `superadmin` alone (shared/permissions.ts) — a role that is global by design
 *    (see README "Все заказчики" ruling) — or the lookup runs pre-authentication,
 *    before any request scope exists.
 *  - dead-code: no route currently calls this method; listed here so a future route
 *    can't wire it up unscoped without this test noticing the new call site.
 */
const ALLOWLIST: Record<string, string> = {
  // create-customerId
  createStation: 'create-customerId', createInfrastructureObject: 'create-customerId',
  createSoilProfile: 'create-customerId', createSensor: 'create-customerId',
  createCalibrationSession: 'create-customerId', createDeveloper: 'create-customerId',
  createSeismicCalculation: 'create-customerId', createComparisonSet: 'create-customerId',

  // update-guarded
  updateStation: 'update-guarded', updateStationStatus: 'update-guarded',
  updateStationBatteryInfo: 'update-guarded', updateStationStorageInfo: 'update-guarded',
  updateInfrastructureObject: 'update-guarded', updateSoilProfile: 'update-guarded',
  updateSoilLayer: 'update-guarded', updateSensorInstallation: 'update-guarded',
  updateSensor: 'update-guarded', updateSeismogramProcessingStatus: 'update-guarded',
  updateCalibrationSession: 'update-guarded', updateDeveloper: 'update-guarded',
  updateSeismicCalculation: 'update-guarded', updateMaintenanceStatus: 'update-guarded',

  // parent-scoped (no customer_id column on the row itself)
  getSoilLayers: 'parent-scoped', createSoilLayer: 'parent-scoped',
  getCalibrationAfc: 'parent-scoped', createCalibrationAfcPoint: 'parent-scoped',
  replaceCalibrationAfc: 'parent-scoped', createSensorInstallation: 'parent-scoped',
  createSeismogramRecord: 'parent-scoped', createMaintenanceRecord: 'parent-scoped',
  createAlert: 'parent-scoped',

  // users-superadmin-only / pre-auth lookups
  getUser: 'users-superadmin-only', getUserByUsername: 'users-superadmin-only',
  getUserByEmail: 'users-superadmin-only', createUser: 'users-superadmin-only',
  updateUser: 'users-superadmin-only', updateUserRole: 'users-superadmin-only',
  updateUserStatus: 'users-superadmin-only', updateUserGuarded: 'users-superadmin-only',
  bumpSessionEpoch: 'users-superadmin-only',

  // dead-code (no route wires these up yet)
  getWaveformData: 'dead-code', createWaveformData: 'dead-code',
};

function parseMembers(src: string): Array<{ name: string; params: string; returnType: string }> {
  const bodyStart = src.indexOf('export interface IStorage {');
  expect(bodyStart, 'IStorage interface not found').toBeGreaterThanOrEqual(0);
  const body = src.slice(bodyStart);
  const members: Array<{ name: string; params: string; returnType: string }> = [];
  for (const line of body.split('\n')) {
    const m = line.match(MEMBER_RE);
    if (m) members.push({ name: m[1], params: m[2], returnType: m[3] });
  }
  return members;
}

function mentionsTenantEntity(returnType: string): boolean {
  return TENANT_ENTITIES.some(e => new RegExp(`\\b${e}\\b`).test(returnType));
}

describe('IStorage tenant-returning methods take a Scope (or are allowlisted)', () => {
  const src = readFileSync(path.resolve(__dirname, 'types.ts'), 'utf8');
  const members = parseMembers(src);
  // Sanity: the parser must find a realistic number of members, or a regex change
  // upstream silently turned this test into a no-op.
  it('parses a realistic number of IStorage members', () => {
    expect(members.length).toBeGreaterThan(80);
  });

  const tenantReturning = members.filter(m => mentionsTenantEntity(m.returnType));
  it('finds tenant-returning methods to check', () => {
    expect(tenantReturning.length).toBeGreaterThan(30);
  });

  for (const { name, params, returnType } of tenantReturning) {
    const isScoped = /\bscope\s*:\s*Scope\b/.test(params);
    const allowed = ALLOWLIST[name];
    it(`${name}(…): Promise<${returnType}> takes scope, or is allowlisted`, () => {
      if (!isScoped) {
        expect(allowed, `${name} returns a tenant entity but declares no scope param, and is not in ALLOWLIST`).toBeTruthy();
      }
    });
  }

  it('ALLOWLIST has no stale entries', () => {
    const currentUnscoped = new Set(
      tenantReturning.filter(m => !/\bscope\s*:\s*Scope\b/.test(m.params)).map(m => m.name),
    );
    for (const name of Object.keys(ALLOWLIST)) {
      expect(currentUnscoped.has(name), `${name} is allowlisted but is no longer an unscoped tenant-returning method — remove it`).toBe(true);
    }
  });
});
