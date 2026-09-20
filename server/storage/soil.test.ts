import { describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
// vi.mock is hoisted above these declarations; vi.hoisted keeps findMany/findFirst
// accessible inside the factory without tripping the TDZ ("cannot access before
// initialization") that a bare top-level `const findMany = vi.fn()` runs into here.
const { findMany, findFirst, selectWhere } = vi.hoisted(() => ({
  findMany: vi.fn(async () => []),
  findFirst: vi.fn(async () => undefined),
  // Captures the SQL passed to .where() on the plain select builder (used by
  // getSoilLayer — db.select(), not db.query.*, per the EXISTS-aliasing fix).
  selectWhere: vi.fn((_where: unknown) => {}),
}));
vi.mock('../db', async () => {
  const real = await vi.importActual<typeof import('@shared/schema')>('@shared/schema');
  return {
    db: {
      query: { soilProfiles: { findMany, findFirst } },
      // getSQL() makes the returned object a valid drizzle SQLWrapper so that
      // exists(...) (used by layerScope's nested subquery) can inline it —
      // exists() just needs something with .getSQL(), it doesn't execute it.
      select: () => ({
        from: () => ({
          where: (w: unknown) => {
            selectWhere(w);
            return { getSQL: () => w, limit: async () => [] };
          },
        }),
      }),
    },
    schema: real,
  };
});
import { soilStorage } from './soil';

const whereOf = (call: { where?: unknown }) => new PgDialect().sqlToQuery(call.where as never);
const sqlOf = (sql: unknown) => new PgDialect().sqlToQuery(sql as never);

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

  it('getSoilLayer narrows through the parent profile by customer and bound object ids', async () => {
    await soilStorage.getSoilLayer(3, { customerId: 7, objectIds: [4] });
    const q = sqlOf(selectWhere.mock.calls.at(-1)![0]);
    expect(q.params).toEqual(expect.arrayContaining([3, 7, 4]));
  });
});
