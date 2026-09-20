import { describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
// vi.mock is hoisted above these declarations; vi.hoisted keeps findMany/findFirst
// accessible inside the factory without tripping the TDZ ("cannot access before
// initialization") that a bare top-level `const findMany = vi.fn()` runs into here.
const { findMany, findFirst } = vi.hoisted(() => ({
  findMany: vi.fn(async () => []),
  findFirst: vi.fn(async () => undefined),
}));
vi.mock('../db', async () => {
  const real = await vi.importActual<typeof import('@shared/schema')>('@shared/schema');
  return { db: { query: { soilProfiles: { findMany, findFirst } }, select: () => ({ from: () => ({ where: () => ({ toSQL: () => ({}) }) }) }) }, schema: real };
});
import { soilStorage } from './soil';

const whereOf = (call: { where?: unknown }) => new PgDialect().sqlToQuery(call.where as never);

describe('soilStorage staff object narrowing', () => {
  it('getSoilProfiles narrows by customer and bound object ids', async () => {
    await soilStorage.getSoilProfiles(undefined, { customerId: 7, objectIds: [4, 5] });
    const q = whereOf(findMany.mock.calls.at(-1)![0]);
    expect(q.params).toEqual(expect.arrayContaining([7, 4, 5]));
  });

  it('getSoilProfiles with no bound objects renders an impossible id', async () => {
    await soilStorage.getSoilProfiles(undefined, { customerId: 7, objectIds: [] });
    const q = whereOf(findMany.mock.calls.at(-1)![0]);
    expect(q.params).toEqual(expect.arrayContaining([-1]));
  });
});
