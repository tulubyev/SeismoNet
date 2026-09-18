import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requirePermission, loginLimiter, activeOrFalse, sessionUserFrom, attachObjectScope, resolveSessionUser, limiterKey } from './auth';
import { storage } from './storage';

vi.mock('./storage', () => ({
  storage: { getUserObjectIds: vi.fn(), getUser: vi.fn() },
}));

function mockReq(user: { role: string } | null) {
  return { isAuthenticated: () => user !== null, user } as never;
}
function mockRes() {
  const res: { statusCode?: number; body?: unknown; status: (c: number) => typeof res; json: (b: unknown) => typeof res } = {
    status(c) { res.statusCode = c; return res; },
    json(b) { res.body = b; return res; },
  };
  return res;
}

describe('requirePermission', () => {
  it('401 when not logged in', () => {
    const res = mockRes(); const next = vi.fn();
    requirePermission('monitoring', 'read')(mockReq(null), res as never, next);
    expect(res.statusCode).toBe(401); expect(next).not.toHaveBeenCalled();
  });
  it('403 when the role lacks the level', () => {
    const res = mockRes(); const next = vi.fn();
    requirePermission('seismograms', 'write')(mockReq({ role: 'staff' }), res as never, next);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'forbidden', module: 'seismograms', level: 'write' });
  });
  it('calls next() when allowed (read implied by write)', () => {
    const res = mockRes(); const next = vi.fn();
    requirePermission('objects', 'read')(mockReq({ role: 'designer' }), res as never, next);
    expect(next).toHaveBeenCalledOnce(); expect(res.statusCode).toBeUndefined();
  });
});

describe('loginLimiter', () => {
  beforeEach(() => loginLimiter._clear());
  afterEach(() => vi.useRealTimers());

  it('allows five failures, blocks the sixth, resets on success', () => {
    for (let i = 0; i < 5; i++) { expect(loginLimiter.check('k')).toBe(true); loginLimiter.fail('k'); }
    expect(loginLimiter.check('k')).toBe(false);
    loginLimiter.reset('k');
    expect(loginLimiter.check('k')).toBe(true);
  });

  it('sweeps a stale entry once its window expires, so the key is allowed again and no longer tracked', () => {
    vi.useFakeTimers();
    const start = new Date('2030-01-01T00:00:00.000Z');
    vi.setSystemTime(start);

    loginLimiter.fail('stale-key');
    expect(loginLimiter._size()).toBe(1);

    vi.setSystemTime(new Date(start.getTime() + 61_000));
    expect(loginLimiter.check('stale-key')).toBe(true);

    // fail() sweeps expired entries before recording a new one.
    loginLimiter.fail('other-key');
    expect(loginLimiter._size()).toBe(1);
    expect(loginLimiter.check('stale-key')).toBe(true);
  });
});

describe('activeOrFalse', () => {
  it('passes through an active user', () => {
    const user = { id: 1, active: true } as never;
    expect(activeOrFalse(user)).toBe(user);
  });
  it('rejects a deactivated user', () => {
    expect(activeOrFalse({ id: 1, active: false } as never)).toBe(false);
  });
  it('rejects a missing user', () => {
    expect(activeOrFalse(undefined)).toBe(false);
  });
});

describe('sessionUserFrom', () => {
  const user = { id: 7, active: true, sessionEpoch: 2 } as never;
  it('accepts a matching epoch on an active user', () => {
    expect(sessionUserFrom({ id: 7, epoch: 2 }, user)).toBe(user);
  });
  it('rejects a stale epoch (password reset / deactivation bumped it)', () => {
    expect(sessionUserFrom({ id: 7, epoch: 1 }, user)).toBe(false);
  });
  it('rejects an inactive user even with a matching epoch', () => {
    expect(sessionUserFrom({ id: 7, epoch: 2 }, { id: 7, active: false, sessionEpoch: 2 } as never)).toBe(false);
  });
  it('rejects legacy numeric payloads and a missing user', () => {
    expect(sessionUserFrom(7, user)).toBe(false);
    expect(sessionUserFrom({ id: 7, epoch: 2 }, undefined)).toBe(false);
  });
});

describe('attachObjectScope', () => {
  it('sets {objectIds} for staff', async () => {
    vi.mocked(storage.getUserObjectIds).mockResolvedValueOnce([3, 5]);
    const req = { user: { id: 1, role: 'staff' } } as never as { objectScope?: unknown };
    const next = vi.fn();
    await attachObjectScope(req as never, {} as never, next);
    expect(req.objectScope).toEqual({ objectIds: [3, 5] });
    expect(next).toHaveBeenCalledWith();
  });
  it('leaves scope undefined for other roles and anonymous', async () => {
    for (const user of [{ id: 1, role: 'designer' }, undefined]) {
      const req = { user } as never as { objectScope?: unknown };
      const next = vi.fn();
      await attachObjectScope(req as never, {} as never, next);
      expect(req.objectScope).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    }
  });
  it('forwards storage errors to next(err)', async () => {
    const boom = new Error('db down');
    vi.mocked(storage.getUserObjectIds).mockRejectedValueOnce(boom);
    const next = vi.fn();
    await attachObjectScope({ user: { id: 1, role: 'staff' } } as never, {} as never, next);
    expect(next).toHaveBeenCalledWith(boom);
  });
});

describe('resolveSessionUser', () => {
  it('returns false before setupAuth installed the session middleware', async () => {
    expect(await resolveSessionUser({ headers: {} } as never)).toBe(false);
  });
});

describe('limiterKey', () => {
  it('normalizes username case so rotating case cannot dodge the rate limit', () => {
    expect(limiterKey('1.1.1.1', 'Admin')).toBe(limiterKey('1.1.1.1', 'admin'));
    expect(limiterKey('1.1.1.1', 'ADMIN')).toBe(limiterKey('1.1.1.1', 'admin'));
    expect(limiterKey('1.1.1.1', '  admin  ')).toBe(limiterKey('1.1.1.1', 'admin'));
  });
  it('keeps ip and missing-username handling stable', () => {
    expect(limiterKey('1.1.1.1', undefined)).toBe('1.1.1.1|');
    expect(limiterKey(undefined, 'admin')).toBe('undefined|admin');
  });
});

describe('loginLimiter MAX_ENTRIES backstop', () => {
  beforeEach(() => loginLimiter._clear());
  it('evicts the oldest key instead of growing past the cap', () => {
    for (let i = 0; i < 10_000; i++) loginLimiter.fail(`k${i}`);
    expect(loginLimiter._size()).toBe(10_000);
    loginLimiter.fail('overflow');
    expect(loginLimiter._size()).toBe(10_000);
    expect(loginLimiter.check('k0')).toBe(true);      // evicted → allowed again
    expect(loginLimiter.check('overflow')).toBe(true); // 1 failure < LIMIT
  });
});
