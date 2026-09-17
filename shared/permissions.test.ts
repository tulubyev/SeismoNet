import { describe, expect, it } from 'vitest';
import { PERMISSIONS, ROLES, MODULES, can, ROLE_LABELS } from './permissions';

describe('PERMISSIONS matrix', () => {
  it('defines every module for every role', () => {
    for (const role of ROLES) for (const m of MODULES) expect(PERMISSIONS[role][m]).toMatch(/^(none|read|write)$/);
  });

  it('superadmin can write everything', () => {
    for (const m of MODULES) expect(can('superadmin', m, 'write')).toBe(true);
  });

  it('matches the specification table', () => {
    // docs/roles-specification.md — «Матрица доступа»
    expect(PERMISSIONS.designer.objects).toBe('write');
    expect(PERMISSIONS.designer.sensors).toBe('write');
    expect(PERMISSIONS.designer.norms).toBe('write');
    expect(PERMISSIONS.designer.seismograms).toBe('none');
    expect(PERMISSIONS.seismologist.seismograms).toBe('write');
    expect(PERMISSIONS.seismologist.soil).toBe('write');
    expect(PERMISSIONS.seismologist.objects).toBe('read');
    expect(PERMISSIONS.data_analyst.mtsm).toBe('write');
    expect(PERMISSIONS.data_analyst.stations).toBe('none');
    expect(PERMISSIONS.device_manager.stations).toBe('write');
    expect(PERMISSIONS.device_manager.calibration).toBe('write');
    expect(PERMISSIONS.device_manager.mtsm).toBe('none');
    expect(PERMISSIONS.staff.objects).toBe('read');
    expect(PERMISSIONS.staff.events).toBe('read');
    expect(PERMISSIONS.staff.seismograms).toBe('none');
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
