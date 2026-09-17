import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requirePermission, loginLimiter, activeOrFalse } from './auth';

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
