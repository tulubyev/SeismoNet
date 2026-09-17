import { describe, expect, it } from 'vitest';
import { PERMISSIONS, ROLES, MODULES, can, ROLE_LABELS, type Access, type Role } from './permissions';

// docs/roles-specification.md — «Матрица доступа», transcribed cell by cell in
// MODULES order. `analytics` (superadmin-only) is not in the doc's table; the
// spec states settings/users/analytics are superadmin-exclusive.
//        monitoring objects sensors stations seismicMap events seismograms spectral soil  mtsm   norms  calibration settings users  analytics
const EXPECTED: Record<Role, Access[]> = {
  superadmin:     ['write','write','write','write','write','write','write','write','write','write','write','write','write','write','write'],
  designer:       ['read', 'write','write','read', 'read', 'none', 'none', 'none', 'read', 'read', 'write','none', 'none','none','none'],
  seismologist:   ['read', 'read', 'read', 'read', 'write','write','write','write','write','write','read', 'read', 'none','none','none'],
  data_analyst:   ['read', 'read', 'none', 'none', 'read', 'write','write','write','read', 'write','read', 'none', 'none','none','none'],
  device_manager: ['write','read', 'write','write','none', 'none', 'read', 'none', 'none', 'none', 'none', 'write','none','none','none'],
  staff:          ['read', 'read', 'none', 'none', 'read', 'read', 'none', 'none', 'none', 'none', 'none', 'none', 'none','none','none'],
};

describe('PERMISSIONS matrix', () => {
  it('matches the specification table in every one of the 90 cells', () => {
    expect(Object.keys(EXPECTED).sort()).toEqual([...ROLES].sort());
    for (const role of ROLES) {
      expect(EXPECTED[role]).toHaveLength(MODULES.length);
      MODULES.forEach((m, i) => {
        expect(`${role}.${m}=${PERMISSIONS[role][m]}`).toBe(`${role}.${m}=${EXPECTED[role][i]}`);
      });
    }
  });

  it('defines every module for every role', () => {
    for (const role of ROLES) for (const m of MODULES) expect(PERMISSIONS[role][m]).toMatch(/^(none|read|write)$/);
  });

  it('superadmin can write everything', () => {
    for (const m of MODULES) expect(can('superadmin', m, 'write')).toBe(true);
  });

  it('keeps settings/users/analytics superadmin-only', () => {
    for (const role of ROLES.filter(r => r !== 'superadmin')) {
      expect(PERMISSIONS[role].settings).toBe('none');
      expect(PERMISSIONS[role].users).toBe('none');
      expect(PERMISSIONS[role].analytics).toBe('none');
    }
  });

  it('can(): read is implied by write, none blocks both, unknown role blocks', () => {
    expect(can('seismologist', 'seismograms', 'read')).toBe(true);
    expect(can('seismologist', 'objects', 'write')).toBe(false);
    expect(can('staff', 'seismograms', 'read')).toBe(false);
    expect(can(null, 'monitoring', 'read')).toBe(false);
    expect(can('nobody' as never, 'monitoring', 'read')).toBe(false);
  });

  it('has a Russian label for every role', () => {
    for (const role of ROLES) expect(ROLE_LABELS[role].length).toBeGreaterThan(2);
  });
});
