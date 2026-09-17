import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requirePermission, loginLimiter } from './auth';

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
  it('allows five failures, blocks the sixth, resets on success', () => {
    for (let i = 0; i < 5; i++) { expect(loginLimiter.check('k')).toBe(true); loginLimiter.fail('k'); }
    expect(loginLimiter.check('k')).toBe(false);
    loginLimiter.reset('k');
    expect(loginLimiter.check('k')).toBe(true);
  });
});
