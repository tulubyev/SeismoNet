import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requirePermission, loginLimiter, activeOrFalse, customerActiveOrFalse, sessionUserFrom, attachScope, resolveScope, resolveSessionUser, limiterKey } from './auth';
import { storage } from './storage';

vi.mock('./storage', () => ({
  storage: { getUserObjectIds: vi.fn(), getUser: vi.fn(), getCustomer: vi.fn(), getUsers: vi.fn() },
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

describe('customerActiveOrFalse', () => {
  beforeEach(() => vi.mocked(storage.getCustomer).mockReset());

  it('bypasses the customer check for superadmin', async () => {
    const user = { id: 1, role: 'superadmin', customerId: null } as never;
    expect(await customerActiveOrFalse(user)).toBe(user);
    expect(storage.getCustomer).not.toHaveBeenCalled();
  });

  it('bypasses the customer check for a user with no customer', async () => {
    const user = { id: 2, role: 'designer', customerId: null } as never;
    expect(await customerActiveOrFalse(user)).toBe(user);
    expect(storage.getCustomer).not.toHaveBeenCalled();
  });

  it('passes a user whose customer is active', async () => {
    const user = { id: 3, role: 'designer', customerId: 5 } as never;
    vi.mocked(storage.getCustomer).mockResolvedValueOnce({ id: 5, active: true } as never);
    expect(await customerActiveOrFalse(user)).toBe(user);
    expect(storage.getCustomer).toHaveBeenCalledWith(5);
  });

  it('locks out a user whose customer is inactive', async () => {
    const user = { id: 4, role: 'designer', customerId: 5 } as never;
    vi.mocked(storage.getCustomer).mockResolvedValueOnce({ id: 5, active: false } as never);
    expect(await customerActiveOrFalse(user)).toBe(false);
  });

  it('locks out a user whose customer no longer exists', async () => {
    const user = { id: 5, role: 'designer', customerId: 5 } as never;
    vi.mocked(storage.getCustomer).mockResolvedValueOnce(undefined);
    expect(await customerActiveOrFalse(user)).toBe(false);
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

describe('attachScope', () => {
  it('sets {customerId, objectIds} for staff', async () => {
    vi.mocked(storage.getUserObjectIds).mockResolvedValueOnce([3, 5]);
    const req = { user: { id: 1, role: 'staff', customerId: 2 }, path: '/stations', session: {} } as never as { scope?: unknown };
    const next = vi.fn();
    await attachScope(req as never, {} as never, next);
    expect(req.scope).toEqual({ customerId: 2, objectIds: [3, 5] });
    expect(next).toHaveBeenCalledWith();
  });
  it('sets {customerId} for a designer with a customer', async () => {
    const req = { user: { id: 1, role: 'designer', customerId: 2 }, path: '/stations', session: {} } as never as { scope?: unknown };
    const next = vi.fn();
    await attachScope(req as never, {} as never, next);
    expect(req.scope).toEqual({ customerId: 2 });
    expect(next).toHaveBeenCalledWith();
  });
  it('leaves scope undefined for anonymous', async () => {
    const req = { user: undefined, path: '/stations', session: {} } as never as { scope?: unknown };
    const next = vi.fn();
    await attachScope(req as never, {} as never, next);
    expect(req.scope).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });
  it('forwards storage errors to next(err)', async () => {
    const boom = new Error('db down');
    vi.mocked(storage.getUserObjectIds).mockRejectedValueOnce(boom);
    const next = vi.fn();
    await attachScope({ user: { id: 1, role: 'staff', customerId: 2 }, path: '/stations', session: {} } as never, {} as never, next);
    expect(next).toHaveBeenCalledWith(boom);
  });
  it('403 no_customer for a customer-less designer on a data route', async () => {
    const res = mockRes(); const next = vi.fn();
    await attachScope({ user: { id: 2, role: 'designer', customerId: null }, path: '/stations', session: {} } as never, res as never, next);
    expect(res.statusCode).toBe(403); expect(res.body).toEqual({ error: 'no_customer' }); expect(next).not.toHaveBeenCalled();
  });
  it('lets /user through for a customer-less designer', async () => {
    const res = mockRes(); const next = vi.fn();
    await attachScope({ user: { id: 2, role: 'designer', customerId: null }, path: '/user', session: {} } as never, res as never, next);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('resolveScope', () => {
  const objs = async () => [4, 5];
  it('superadmin without a session choice → all customers', async () => {
    expect(await resolveScope({ id: 1, role: 'superadmin', customerId: null }, undefined, objs)).toEqual({ customerId: null });
  });
  it('superadmin with a session choice → that customer', async () => {
    expect(await resolveScope({ id: 1, role: 'superadmin', customerId: null }, 3, objs)).toEqual({ customerId: 3 });
  });
  it('other roles → their own customer, ignoring the session', async () => {
    expect(await resolveScope({ id: 2, role: 'designer', customerId: 2 }, 3, objs)).toEqual({ customerId: 2 });
  });
  it('staff → own customer + bound objects', async () => {
    expect(await resolveScope({ id: 9, role: 'staff', customerId: 2 }, undefined, objs)).toEqual({ customerId: 2, objectIds: [4, 5] });
  });
  it('non-superadmin without a customer → no_customer', async () => {
    expect(await resolveScope({ id: 2, role: 'designer', customerId: null }, undefined, objs)).toBe('no_customer');
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
