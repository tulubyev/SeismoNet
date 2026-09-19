import { describe, expect, it, vi } from 'vitest';
const insert = vi.fn(); const returning = vi.fn();
vi.mock('../db', () => ({
  db: { insert: () => ({ values: (v: unknown) => { insert(v); return { returning }; } }) },
  schema: { customers: {} },
}));
import { customersStorage } from './customers';

describe('customersStorage.createCustomer', () => {
  it('lower-cases and trims the code before insert', async () => {
    returning.mockResolvedValueOnce([{ id: 1, code: 'dagestan', name: 'ГАУ РД' }]);
    const c = await customersStorage.createCustomer({ code: '  Dagestan ', name: 'ГАУ РД' });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ code: 'dagestan' }));
    expect(c.id).toBe(1);
  });
});
