import { describe, expect, it, vi } from 'vitest';
import { authorizeUpgrade } from './ws';
import { resolveSessionUser } from './auth';
import { storage } from './storage';

vi.mock('./services/unisender', () => ({ sendLowBatteryAlert: vi.fn() }));
vi.mock('./services/telegram', () => ({ sendLowBatteryAlert: vi.fn() }));
vi.mock('./auth', () => ({ resolveSessionUser: vi.fn() }));
vi.mock('./storage', () => ({ storage: { getUserObjectIds: vi.fn() } }));

describe('authorizeUpgrade', () => {
  it('rejects anonymous upgrades', async () => {
    vi.mocked(resolveSessionUser).mockResolvedValueOnce(false);
    expect(await authorizeUpgrade({ headers: {} } as never)).toBeNull();
  });
  it('scopes staff to their objects', async () => {
    vi.mocked(resolveSessionUser).mockResolvedValueOnce({ id: 9, role: 'staff' } as never);
    vi.mocked(storage.getUserObjectIds).mockResolvedValueOnce([4]);
    expect(await authorizeUpgrade({ headers: {} } as never)).toEqual({ user: { id: 9, role: 'staff' }, scope: { objectIds: [4] } });
  });
  it('leaves other roles unscoped', async () => {
    vi.mocked(resolveSessionUser).mockResolvedValueOnce({ id: 1, role: 'superadmin' } as never);
    expect(await authorizeUpgrade({ headers: {} } as never)).toEqual({ user: { id: 1, role: 'superadmin' }, scope: undefined });
  });
  it('treats a session-store error as anonymous', async () => {
    vi.mocked(resolveSessionUser).mockRejectedValueOnce(new Error('store down'));
    expect(await authorizeUpgrade({ headers: {} } as never)).toBeNull();
  });
});
