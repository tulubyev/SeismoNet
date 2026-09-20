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
  return { db: { query: { stations: { findMany, findFirst } }, select: () => ({ from: () => ({ where: () => ({ toSQL: () => ({}) }) }) }) }, schema: real };
});
import { stationsStorage } from './stations';

const whereOf = (call: { where?: unknown }) => new PgDialect().sqlToQuery(call.where as never);

describe('stationsStorage scoping', () => {
  it('getStations in "all" mode adds no where', async () => {
    await stationsStorage.getStations({ customerId: null });
    expect(findMany.mock.calls.at(-1)?.[0]?.where).toBeUndefined();
  });
  it('getStations for a customer filters by customer_id', async () => {
    await stationsStorage.getStations({ customerId: 7 });
    const q = whereOf(findMany.mock.calls.at(-1)![0]);
    expect(q.sql).toMatch(/customer_id/); expect(q.params).toContain(7);
  });
  it('getStation checks ownership in the same query', async () => {
    await stationsStorage.getStation(5, { customerId: 7 });
    const q = whereOf(findFirst.mock.calls.at(-1)![0]);
    expect(q.params).toEqual(expect.arrayContaining([5, 7]));
  });
});
