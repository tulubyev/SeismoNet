import { describe, expect, it, vi } from 'vitest';
vi.mock('../db', () => ({ db: {}, schema: {} }));
import { removesLastSuperadmin } from './users';

const admin = { id: 1, role: 'superadmin', active: true } as const;

describe('removesLastSuperadmin', () => {
  it('blocks demoting the only active superadmin', () => {
    expect(removesLastSuperadmin(admin, { role: 'staff' }, [1])).toBe(true);
  });
  it('blocks deactivating the only active superadmin', () => {
    expect(removesLastSuperadmin(admin, { active: false }, [1])).toBe(true);
  });
  it('allows it when another active superadmin exists', () => {
    expect(removesLastSuperadmin(admin, { role: 'staff' }, [1, 4])).toBe(false);
  });
  it('ignores an already-inactive superadmin (was an over-strict 409)', () => {
    expect(removesLastSuperadmin({ ...admin, active: false }, { role: 'staff' }, [4])).toBe(false);
  });
  it('ignores patches that keep the role and activity', () => {
    expect(removesLastSuperadmin(admin, { role: 'superadmin', active: true }, [1])).toBe(false);
    expect(removesLastSuperadmin(admin, {}, [1])).toBe(false);
  });
  it('ignores non-superadmin targets', () => {
    expect(removesLastSuperadmin({ id: 2, role: 'staff', active: true }, { active: false }, [1])).toBe(false);
  });
});
