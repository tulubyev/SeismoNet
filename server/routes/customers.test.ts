import { describe, expect, it } from 'vitest';
import { createCustomerSchema, patchCustomerSchema } from './customers';

describe('customer schemas', () => {
  it('code must be [a-z0-9-]{2,32}', () => {
    expect(createCustomerSchema.safeParse({ code: 'dagestan', name: 'ГАУ РД' }).success).toBe(true);
    expect(createCustomerSchema.safeParse({ code: 'Дагестан', name: 'ГАУ РД' }).success).toBe(false);
    expect(createCustomerSchema.safeParse({ code: 'a', name: 'x' }).success).toBe(false);
  });
  it('patch never accepts code', () => {
    expect(patchCustomerSchema.safeParse({ code: 'x' }).success).toBe(false);
    expect(patchCustomerSchema.safeParse({ name: 'Новое', active: false, regionId: null }).success).toBe(true);
  });
});
