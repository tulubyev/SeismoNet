import { describe, expect, it, vi } from 'vitest';
import type { WebSocketServer } from 'ws';
import type { Duplex } from 'stream';
import { authorizeUpgrade, handleWsUpgrade } from './ws';
import { resolveSessionUser, resolveScope } from './auth';
import { storage } from './storage';

/** Flush the microtask queue past `authorizeUpgrade`'s awaits and its `.then()`. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function fakeSocket(destroyed: boolean) {
  return { destroyed, on: vi.fn(), off: vi.fn(), write: vi.fn(), destroy: vi.fn() } as unknown as Duplex;
}

function fakeWss() {
  return { handleUpgrade: vi.fn(), emit: vi.fn() } as unknown as WebSocketServer;
}

vi.mock('./services/unisender', () => ({ sendLowBatteryAlert: vi.fn() }));
vi.mock('./services/telegram', () => ({ sendLowBatteryAlert: vi.fn() }));
vi.mock('./auth', () => ({ resolveSessionUser: vi.fn(), resolveScope: vi.fn() }));
vi.mock('./storage', () => ({ storage: { getUserObjectIds: vi.fn() } }));

describe('authorizeUpgrade', () => {
  it('rejects anonymous upgrades', async () => {
    vi.mocked(resolveSessionUser).mockResolvedValueOnce(false);
    expect(await authorizeUpgrade({ headers: {} } as never)).toBeNull();
  });
  it('scopes staff to their objects', async () => {
    vi.mocked(resolveSessionUser).mockResolvedValueOnce({ id: 9, role: 'staff' } as never);
    vi.mocked(resolveScope).mockResolvedValueOnce({ customerId: 3, objectIds: [4] });
    expect(await authorizeUpgrade({ headers: {} } as never)).toEqual({ user: { id: 9, role: 'staff' }, scope: { customerId: 3, objectIds: [4] } });
  });
  it('leaves other roles unscoped', async () => {
    vi.mocked(resolveSessionUser).mockResolvedValueOnce({ id: 1, role: 'superadmin' } as never);
    vi.mocked(resolveScope).mockResolvedValueOnce({ customerId: null });
    expect(await authorizeUpgrade({ headers: {} } as never)).toEqual({ user: { id: 1, role: 'superadmin' }, scope: { customerId: null } });
  });
  it('rejects a user with no customer', async () => {
    vi.mocked(resolveSessionUser).mockResolvedValueOnce({ id: 2, role: 'viewer' } as never);
    vi.mocked(resolveScope).mockResolvedValueOnce('no_customer');
    expect(await authorizeUpgrade({ headers: {} } as never)).toBeNull();
  });
  it('treats a session-store error as anonymous', async () => {
    vi.mocked(resolveSessionUser).mockRejectedValueOnce(new Error('store down'));
    expect(await authorizeUpgrade({ headers: {} } as never)).toBeNull();
  });
});

describe('handleWsUpgrade', () => {
  it('leaves an already-destroyed socket alone once authorization settles', async () => {
    vi.mocked(resolveSessionUser).mockResolvedValueOnce(false);
    const socket = fakeSocket(true);
    const wss = fakeWss();
    handleWsUpgrade(wss, { headers: {} } as never, socket, Buffer.alloc(0));
    await flush();
    expect(socket.write).not.toHaveBeenCalled();
    expect(socket.destroy).not.toHaveBeenCalled();
    expect(wss.handleUpgrade).not.toHaveBeenCalled();
  });

  it('rejects a still-live anonymous socket with 401 and destroys it', async () => {
    vi.mocked(resolveSessionUser).mockResolvedValueOnce(false);
    const socket = fakeSocket(false);
    const wss = fakeWss();
    handleWsUpgrade(wss, { headers: {} } as never, socket, Buffer.alloc(0));
    await flush();
    expect(socket.write).toHaveBeenCalledWith(expect.stringContaining('401'));
    expect(socket.destroy).toHaveBeenCalled();
    expect(wss.handleUpgrade).not.toHaveBeenCalled();
  });
});
