import { describe, expect, it, vi } from 'vitest';

const insert = vi.fn();
vi.mock('../db', () => ({
  db: { insert: () => ({ values: insert }) },
  schema: { auditLog: {} },
}));

import { auditStorage } from './audit';

describe('auditStorage.logAudit', () => {
  it('inserts the entry', async () => {
    insert.mockResolvedValueOnce(undefined);
    await auditStorage.logAudit({ actorUsername: 'admin', action: 'user.create', targetType: 'user', targetId: 5 });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ action: 'user.create', targetId: 5 }));
  });
  it('swallows storage errors so the calling request still succeeds', async () => {
    insert.mockRejectedValueOnce(new Error('disk full'));
    await expect(auditStorage.logAudit({ actorUsername: 'admin', action: 'user.update' })).resolves.toBeUndefined();
  });
});
