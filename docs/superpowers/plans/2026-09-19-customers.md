# Customers (Multi-Tenant Isolation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Isolate all tenant data by customer (organization): every user belongs to one customer and sees only its objects, stations, sensors, soil, calculations, seismograms, events and alerts; superadmin switches between customers or views all.

**Architecture:** A `customers` table plus a `customer_id` column on the root tenant tables; a per-request `Scope { customerId, objectIds? }` computed once in `attachScope` (from the user, or from the superadmin's session choice) and passed to every storage list/detail getter. Derived tables (installations, seismograms, events, alerts, maintenance) are filtered through their station/object. Schema changes only via `runStartupMigrations()`; forward-only.

**Tech Stack:** Express 4, express-session, Passport, Drizzle ORM (node-postgres), React 18 + TanStack Query 5 + shadcn/ui, vitest 2.

**Spec:** `docs/superpowers/specs/2026-09-19-customers-design.md`

## Global Constraints

- Branch `feature/customers`. No `npm run db:push`, no drizzle migration files; all DDL in `server/startup.ts` `runStartupMigrations()`, idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`), forward-only.
- `Scope = { customerId: number | null; objectIds?: number[] }` (in `server/storage/types.ts`). `customerId === null` means "all customers" and is only ever produced for `superadmin`.
- Every list/detail getter of a tenant table takes `scope: Scope` as a **required** parameter; create methods of tenant tables take `customerId: number` explicitly; clients never send `customerId` for tenant rows (insert zod schemas omit it).
- Tenant tables with `customer_id NOT NULL`: `infrastructure_objects`, `stations`, `developers`, `soil_profiles`, `seismic_calculations`, `sensors`, `calibration_sessions`, `comparison_sets` (spec amendment: comparison sets carry their own `customer_id`; `calc_ids` is an integer array, joining through calculations is not practical). `users.customer_id` nullable (NULL only for `superadmin`).
- Derived tables scoped through station (`station_id` → `stations.customer_id`): `sensor_installations`, `seismogram_records`, `events`, `alerts`, `maintenance_records`, `waveform_data`; through parent row: `soil_layers`, `calibration_afc`, `calculation_note_history`.
- Shared (never filtered): `regions`, `object_categories`, `building_norms`, `research_networks`, `system_status`, `page_visit_logs`, `audit_log`, external earthquake catalogs.
- Error contract: superadmin in "all" mode creating a tenant row → `400 {"error":"select_customer"}`; a non-superadmin user without a customer → `403 {"error":"no_customer"}` on every `/api/*` route except `/api/user`, `/api/logout`, `/api/health`; a row of another customer → plain 404.
- New permission module `customers` (16th): superadmin `write`, every other role `none`.
- UI strings Russian. `npm run check` must stay ≤ 49 errors (`npm run check 2>&1 | grep -c 'error TS'`); `npx vitest run` green after every task. Commit messages: conventional prefix, trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Startup migration order: create `customers` → insert `ecsem` → insert regions → add `customer_id` columns + backfill + `SET NOT NULL` + index → users backfill → `region_id` backfills.

---

## File map

| File | Responsibility |
|---|---|
| `shared/schema.ts` | `customers` table, `customer_id` columns, `infrastructure_objects.region_id`, `SessionUser` type, insert schemas omit `customerId` |
| `shared/permissions.ts` (+test) | module `customers` |
| `server/db.ts` | `customers` in the schema map |
| `server/startup.ts` | customers DDL + backfills |
| `server/storage/types.ts` | `Scope`, `IStorage` signatures |
| `server/storage/scope.ts` (new, +test) | the only place that builds scope SQL: `customerWhere`, `stationInCustomer`, `objectInCustomer`, `objectIdsWhere`, `andAll` |
| `server/storage/customers.ts` (new) | customers CRUD |
| `server/storage/{stations,infrastructure,soil,sensors,calculations,seismograms,calibration,events,monitoring,maintenance,users}.ts` | scoped getters, explicit `customerId` on create |
| `server/auth.ts` (+test) | `attachScope`, `scopeOf`, `sessionUserPayload`, customer-active check, `PUT /api/session/customer` |
| `server/routes/customers.ts` (new) | `/api/customers` |
| `server/routes/*.ts` | `req.scope` everywhere, `select_customer` guard, ownership via detail getters |
| `server/routes/users.ts` | `customerId` on create/patch, scoped list, object binding within customer |
| `server/ws.ts` | scope from session for WS |
| `server/seed.ts` | seeds under `ecsem` |
| `client/src/hooks/use-auth.tsx` | `customer`, `customerScope`, `setCustomer` |
| `client/src/components/layout/AppLayout.tsx` | customer switcher / label |
| `client/src/pages/admin/Customers.tsx` + `admin/customers/{CreateDialog,EditDialog}.tsx` (new) | customers admin |
| `client/src/pages/admin/users/*.tsx`, `Users.tsx` | customer column + select |
| `client/src/pages/{InfrastructureObjects,AddStation,Archive}.tsx`, `components/stations/StationList.tsx`, `SystemManagement.tsx`, `App.tsx` | region select, "all" mode guards, tile, route |
| `CLAUDE.md`, `docs/DEPLOY.md`, `README.md` | docs |

---

### Task 1: Schema, startup migration, customers storage

**Files:**
- Modify: `shared/schema.ts` (users table ~line 9, after `userObjects` ~line 36, `infrastructureObjects` ~line 221, `stations` ~line 69, `developers`, `soilProfiles`, `seismicCalculations`, `sensors`, `calibrationSessions`, `comparisonSets`, insert schemas ~line 499–527)
- Modify: `server/db.ts` (schema map)
- Modify: `server/startup.ts` (after the `audit_log` block)
- Create: `server/storage/customers.ts`
- Modify: `server/storage/types.ts`, `server/storage/index.ts`
- Test: `server/storage/customers.test.ts` (new)

**Interfaces:**
- Produces: table `customers` (`Customer`, `InsertCustomer`, `insertCustomerSchema`), column `customerId` on the tenant tables and `users`, `infrastructureObjects.regionId`; `storage.getCustomers(): Promise<Customer[]>`, `getCustomer(id: number)`, `getCustomerByCode(code: string)`, `createCustomer(c: InsertCustomer): Promise<Customer>`, `updateCustomer(id: number, data: Partial<InsertCustomer>): Promise<Customer | undefined>`, `countCustomerRows(id: number): Promise<{ objects: number; users: number }>`; insert schemas of tenant tables **omit** `customerId`.

- [ ] **Step 1: Failing test** — `server/storage/customers.test.ts`:

```ts
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
```

- [ ] **Step 2: Run** `npx vitest run server/storage/customers.test.ts` — FAIL (module missing).

- [ ] **Step 3: Schema** — in `shared/schema.ts`:

After `userObjects` add:
```ts
// Tenant = customer organization (ЕЦСЭМ, ГАУ РД «Сейсмобезопасность», …). Every tenant
// row carries customer_id; users belong to exactly one customer (NULL = superadmin).
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  regionId: integer("region_id").references(() => regions.id),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```
(`regions` is declared later in the file — move the `customers` declaration **below** `regions` (~line 58) to keep the reference order valid.)

In `users` add after `sessionEpoch`: `customerId: integer("customer_id").references(() => customers.id),` — `users` is declared before `regions`/`customers`; use a lazy reference `references(() => customers.id)` (drizzle resolves lazily, but TS `const` ordering matters: since `customers` is declared later, this compiles because the arrow is evaluated lazily; verify with `npm run check`).

Add `customerId: integer("customer_id").notNull().references(() => customers.id),` to: `infrastructureObjects`, `stations`, `developers`, `soilProfiles`, `seismicCalculations`, `sensors`, `calibrationSessions`, `comparisonSets`. Add `regionId: integer("region_id").references(() => regions.id),` to `infrastructureObjects`.

Insert schemas: add `customerId: true` to the `.omit({...})` of `insertStationSchema`, `insertInfrastructureObjectSchema`, `insertDeveloperSchema`, `insertSoilProfileSchema`, `insertSeismicCalculationSchema`, `insertSensorSchema`, `insertCalibrationSessionSchema`, `insertComparisonSetSchema`. `insertUserSchema` keeps `customerId` (optional).

New exports next to the other insert schemas:
```ts
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

/** What GET /api/user, /api/login and PUT /api/session/customer return. */
export type SessionUser = Omit<User, "password"> & {
  customer: Pick<Customer, "id" | "code" | "name" | "regionId"> | null;
  customerScope: "all" | "one";
};
```

- [ ] **Step 4: db.ts** — add `customers: schemaImport.customers,` to the schema map next to `auditLog`.

- [ ] **Step 5: Startup migration** — append to `runStartupMigrations()` after the `audit_log` index, before the roles-enum check:

```ts
    // Customers (multi-tenant isolation, spec 2026-09-19). Forward-only.
    await db.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id serial PRIMARY KEY,
        code text NOT NULL UNIQUE,
        name text NOT NULL,
        region_id integer REFERENCES regions(id),
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(`
      INSERT INTO regions (name, description, center_latitude, center_longitude, radius_km)
      VALUES ('Махачкала', 'Республика Дагестан', 42.9849, 47.5047, 50),
             ('Алматы', 'Казахстан', 43.2389, 76.8897, 50),
             ('Улан-Батор', 'Монголия', 47.9184, 106.9177, 50)
      ON CONFLICT (name) DO NOTHING
    `);
    await db.execute(`
      INSERT INTO customers (code, name, region_id)
      SELECT 'ecsem', 'ЕЦСЭМ', (SELECT id FROM regions WHERE name = 'Иркутск' LIMIT 1)
      ON CONFLICT (code) DO NOTHING
    `);
    for (const table of ['infrastructure_objects', 'stations', 'developers', 'soil_profiles',
                         'seismic_calculations', 'sensors', 'calibration_sessions', 'comparison_sets']) {
      await db.execute(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS customer_id integer REFERENCES customers(id)`);
      await db.execute(`UPDATE ${table} SET customer_id = (SELECT id FROM customers WHERE code = 'ecsem') WHERE customer_id IS NULL`);
      await db.execute(`ALTER TABLE ${table} ALTER COLUMN customer_id SET NOT NULL`);
      await db.execute(`CREATE INDEX IF NOT EXISTS ${table}_customer_id_idx ON ${table} (customer_id)`);
    }
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_id integer REFERENCES customers(id)`);
    await db.execute(`UPDATE users SET customer_id = (SELECT id FROM customers WHERE code = 'ecsem') WHERE customer_id IS NULL AND role <> 'superadmin'`);
    await db.execute(`ALTER TABLE infrastructure_objects ADD COLUMN IF NOT EXISTS region_id integer REFERENCES regions(id)`);
    await db.execute(`UPDATE infrastructure_objects SET region_id = (SELECT id FROM regions WHERE name = 'Иркутск' LIMIT 1) WHERE region_id IS NULL`);
    await db.execute(`UPDATE stations SET region_id = (SELECT id FROM regions WHERE name = 'Иркутск' LIMIT 1) WHERE region_id IS NULL`);
```
Extend the final `console.log` with ` + customers`.

- [ ] **Step 6: Storage** — `server/storage/customers.ts`:

```ts
import { db, schema } from "../db";
import { eq, sql } from "drizzle-orm";
import type { Customer, InsertCustomer } from "@shared/schema";

export const customersStorage = {
  async getCustomers(): Promise<Customer[]> {
    return db.query.customers.findMany({ orderBy: (t, { asc }) => [asc(t.name)] });
  },
  async getCustomer(id: number): Promise<Customer | undefined> {
    return db.query.customers.findFirst({ where: (t, { eq }) => eq(t.id, id) });
  },
  async getCustomerByCode(code: string): Promise<Customer | undefined> {
    return db.query.customers.findFirst({ where: (t, { eq }) => eq(t.code, code.trim().toLowerCase()) });
  },
  async createCustomer(c: InsertCustomer): Promise<Customer> {
    const [row] = await db.insert(schema.customers).values({ ...c, code: c.code.trim().toLowerCase() }).returning();
    return row;
  },
  async updateCustomer(id: number, data: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const { code: _code, ...rest } = data; // code is immutable after creation
    const [row] = await db.update(schema.customers).set(rest).where(eq(schema.customers.id, id)).returning();
    return row;
  },
  /** For the admin table: how many objects and users the customer owns. */
  async countCustomerRows(id: number): Promise<{ objects: number; users: number }> {
    const [o] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.infrastructureObjects).where(eq(schema.infrastructureObjects.customerId, id));
    const [u] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.users).where(eq(schema.users.customerId, id));
    return { objects: o?.n ?? 0, users: u?.n ?? 0 };
  },
};
```
`types.ts`: import `Customer, InsertCustomer`; add section `// Customers` with the six signatures. `index.ts`: import and spread `customersStorage`.

- [ ] **Step 7: Verify** — `npx vitest run` green. `npm run check`: the tenant tables now require `customerId` while the storage create methods still spread the old insert types, so tsc will report **new errors mentioning `customerId` in `server/storage/*.ts`** (and possibly `server/seed.ts`). That is expected for this task; Tasks 5–7 remove them. Report the exact count and the file list; any new error NOT about `customerId` must be fixed here. Restart the dev server (`pkill -f 'tsx server/index.ts'`, then `npm run dev` in the background) and confirm the startup log ends with `+ customers` and shows no migration error; through the tunnel: `SELECT code,name,region_id FROM customers` → `ecsem`, `SELECT count(*) FROM stations WHERE customer_id IS NULL` → 0, `SELECT count(*) FROM regions` → 4.

- [ ] **Step 8: Commit**

```bash
git add shared/schema.ts server/db.ts server/startup.ts server/storage/customers.ts server/storage/customers.test.ts server/storage/types.ts server/storage/index.ts
git commit -m "feat(customers): customers table, customer_id on tenant tables, startup backfill to ecsem

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: `Scope` type and SQL helpers

**Files:**
- Modify: `server/storage/types.ts:11-12` (replace `ObjectScope`)
- Create: `server/storage/scope.ts`
- Test: `server/storage/scope.test.ts` (new)

**Interfaces:**
- Produces: `export type Scope = { customerId: number | null; objectIds?: number[] }`; `export type ObjectScope = Scope` (temporary alias so existing files keep compiling until Tasks 5–6 remove the last uses); in `scope.ts`: `customerWhere(scope: Scope, column: PgColumn): SQL | undefined`, `stationInCustomer(scope: Scope, stationIdColumn: PgColumn): SQL | undefined`, `objectInCustomer(scope: Scope, objectIdColumn: PgColumn): SQL | undefined`, `objectIdsWhere(scope: Scope, objectIdColumn: PgColumn): SQL | undefined`, `andAll(...conds: (SQL | undefined)[]): SQL | undefined`, `const NO_ROWS = [-1]`.

- [ ] **Step 1: Failing test** — `server/storage/scope.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { schema } from '../db';
import { customerWhere, stationInCustomer, objectInCustomer, objectIdsWhere, andAll } from './scope';

const render = (s: ReturnType<typeof customerWhere>) => (s ? new PgDialect().sqlToQuery(s) : undefined);

describe('scope helpers', () => {
  it('customerWhere: null customer → no condition, number → equality', () => {
    expect(customerWhere({ customerId: null }, schema.stations.customerId)).toBeUndefined();
    const q = render(customerWhere({ customerId: 7 }, schema.stations.customerId))!;
    expect(q.sql).toMatch(/"stations"\."customer_id" = \$1/);
    expect(q.params).toEqual([7]);
  });
  it('stationInCustomer builds an EXISTS on stations', () => {
    const q = render(stationInCustomer({ customerId: 7 }, schema.events.stationId))!;
    expect(q.sql).toMatch(/exists/i);
    expect(q.sql).toMatch(/"stations"\."customer_id" = \$1/);
    expect(q.params).toEqual([7]);
    expect(stationInCustomer({ customerId: null }, schema.events.stationId)).toBeUndefined();
  });
  it('objectInCustomer builds an EXISTS on infrastructure_objects', () => {
    const q = render(objectInCustomer({ customerId: 3 }, schema.soilProfiles.objectId))!;
    expect(q.sql).toMatch(/"infrastructure_objects"\."customer_id" = \$1/);
  });
  it('objectIdsWhere: no objectIds → undefined; empty list → impossible id; list → IN', () => {
    expect(objectIdsWhere({ customerId: 1 }, schema.sensors.objectId)).toBeUndefined();
    expect(render(objectIdsWhere({ customerId: 1, objectIds: [] }, schema.sensors.objectId))!.params).toEqual([-1]);
    expect(render(objectIdsWhere({ customerId: 1, objectIds: [4, 5] }, schema.sensors.objectId))!.params).toEqual([4, 5]);
  });
  it('andAll drops undefined and returns undefined when nothing is left', () => {
    expect(andAll(undefined, undefined)).toBeUndefined();
    expect(render(andAll(undefined, customerWhere({ customerId: 2 }, schema.stations.customerId)))!.params).toEqual([2]);
  });
});
```

- [ ] **Step 2: Run** — FAIL (module missing).

- [ ] **Step 3: types.ts** — replace the `ObjectScope` declaration with:

```ts
/**
 * Per-request row filter. `customerId === null` = all customers (superadmin only).
 * `objectIds` narrows further for `staff` (only bound infrastructure objects).
 */
export type Scope = { customerId: number | null; objectIds?: number[] };
/** @deprecated transitional alias, removed once every storage file takes `Scope`. */
export type ObjectScope = Scope;
```
Note: existing code does `scope.objectIds.length` on `ObjectScope`'s old shape (`{objectIds}` | undefined) — those files will not compile until Tasks 5–6; that is expected and recorded in the task report.

- [ ] **Step 4: scope.ts**:

```ts
import { and, eq, exists, inArray, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { db, schema } from "../db";
import type { Scope } from "./types";

/** `inArray(col, [])` is invalid SQL; an impossible id yields an empty result instead. */
export const NO_ROWS = [-1];

/** `<column> = customerId`, or no condition in "all customers" mode. */
export function customerWhere(scope: Scope, column: PgColumn): SQL | undefined {
  return scope.customerId === null ? undefined : eq(column, scope.customerId);
}

/** Row belongs to the customer through its station (station_id text FK). */
export function stationInCustomer(scope: Scope, stationIdColumn: PgColumn): SQL | undefined {
  if (scope.customerId === null) return undefined;
  return exists(
    db.select({ one: schema.stations.id }).from(schema.stations)
      .where(and(eq(schema.stations.stationId, stationIdColumn), eq(schema.stations.customerId, scope.customerId))),
  );
}

/** Row belongs to the customer through its infrastructure object (object_id integer FK). */
export function objectInCustomer(scope: Scope, objectIdColumn: PgColumn): SQL | undefined {
  if (scope.customerId === null) return undefined;
  return exists(
    db.select({ one: schema.infrastructureObjects.id }).from(schema.infrastructureObjects)
      .where(and(eq(schema.infrastructureObjects.id, objectIdColumn), eq(schema.infrastructureObjects.customerId, scope.customerId))),
  );
}

/** staff narrowing: object id must be one of the bound objects. */
export function objectIdsWhere(scope: Scope, objectIdColumn: PgColumn): SQL | undefined {
  if (!scope.objectIds) return undefined;
  return inArray(objectIdColumn, scope.objectIds.length ? scope.objectIds : NO_ROWS);
}

/** and() over the defined conditions; undefined when none. */
export function andAll(...conds: (SQL | undefined)[]): SQL | undefined {
  const defined = conds.filter((c): c is SQL => c !== undefined);
  return defined.length ? and(...defined) : undefined;
}
```

- [ ] **Step 5: Run** the test — PASS. `npx vitest run` (other suites) — green. Record the tsc count (expected temporarily > 49 due to `ObjectScope` shape change; list the affected files).

- [ ] **Step 6: Commit**

```bash
git add server/storage/types.ts server/storage/scope.ts server/storage/scope.test.ts
git commit -m "feat(storage): Scope type and customer/object scope SQL helpers

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Permission module `customers`

**Files:**
- Modify: `shared/permissions.ts:7-10, 21-28, MODULE_LABELS`
- Test: `shared/permissions.test.ts:8-16`

- [ ] **Step 1: Failing test** — in `shared/permissions.test.ts` add `'customers'` as the 16th column of every `EXPECTED` row (comment header too): superadmin `'write'`, every other role `'none'`. Add:

```ts
it('customers module is superadmin-only', () => {
  for (const role of ROLES) expect(can(role, 'customers', 'read')).toBe(role === 'superadmin');
});
```
Run `npx vitest run shared/permissions.test.ts` — FAIL (`'customers'` not a Module / length mismatch).

- [ ] **Step 2: Implement** — `MODULES` gets `'customers'` appended; each `ROW([...])` gets a 16th entry (`W` for superadmin, `N` otherwise); `MODULE_LABELS.customers = 'Заказчики'`. Update the column comment above `ROW`.

- [ ] **Step 3: Run** — PASS. `npm run check` — no new errors from this task.

- [ ] **Step 4: Commit**

```bash
git add shared/permissions.ts shared/permissions.test.ts
git commit -m "feat(permissions): customers module (superadmin only)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Auth — `attachScope`, session customer, session payload, customer-active login check

**Files:**
- Modify: `server/auth.ts` (global `Request` typing ~line 13-17, `activeOrFalse` ~73, `sessionUserFrom` ~80, `attachObjectScope` ~203, `/api/user` ~174, `/api/login` success, dev-login)
- Modify: `server/storage/users.ts` (`getUsers(scope)`)
- Modify: `server/storage/types.ts` (`getUsers(scope: Scope)`)
- Test: `server/auth.test.ts`

**Interfaces:**
- Consumes: `Scope`, `storage.getCustomer`, `SessionUser` (Task 1), module `customers` (Task 3).
- Produces: `req.scope?: Scope` (Express `Request`), `export async function attachScope(req, res, next)` (replaces `attachObjectScope`), `export function scopeOf(req: Request): Scope` (throws `Error("scope missing")` if absent), `export async function sessionUserPayload(user: SelectUser, session: { customerId?: number | null }): Promise<SessionUser>`, `export function resolveScope(user: Pick<SelectUser,'id'|'role'|'customerId'>, sessionCustomerId: number | null | undefined, objectIds: () => Promise<number[]>): Promise<Scope | 'no_customer'>` (pure decision, used by both HTTP and WS), `PUT /api/session/customer`; `express-session` `SessionData.customerId?: number | null`; `storage.getUsers(scope: Scope)`.

- [ ] **Step 1: Failing tests** — append to `server/auth.test.ts` (the file already mocks `./storage` with `getUserObjectIds`/`getUser`; extend the mock factory with `getCustomer: vi.fn()`):

```ts
import { resolveScope } from './auth';

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

describe('attachScope', () => {
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
```
Replace the old `attachObjectScope` tests: rename to `attachScope` and adapt expectations — staff → `req.scope` equals `{ customerId: 2, objectIds: [3, 5] }` (give the mock user `customerId: 2`); designer → `{ customerId: 2 }`; anonymous → `req.scope` undefined and `next()` called.

- [ ] **Step 2: Run** `npx vitest run server/auth.test.ts` — FAIL.

- [ ] **Step 3: Implement** in `server/auth.ts`:

```ts
import type { Scope } from "./storage";
import type { Customer, User as SelectUser, SessionUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
    interface Request { scope?: Scope }
  }
}
declare module "express-session" {
  interface SessionData { customerId?: number | null }
}

const OPEN_PATHS = new Set(["/user", "/logout", "/health"]); // relative to the /api mount

/** Which rows this user may see. 'no_customer' = a non-superadmin without a customer. */
export async function resolveScope(
  user: Pick<SelectUser, "id" | "role" | "customerId">,
  sessionCustomerId: number | null | undefined,
  objectIds: () => Promise<number[]>,
): Promise<Scope | "no_customer"> {
  if (user.role === "superadmin") return { customerId: sessionCustomerId ?? null };
  if (user.customerId == null) return "no_customer";
  if (user.role === "staff") return { customerId: user.customerId, objectIds: await objectIds() };
  return { customerId: user.customerId };
}

export async function attachScope(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as SelectUser | undefined;
    if (!user) return next();
    const scope = await resolveScope(user, req.session?.customerId, () => storage.getUserObjectIds(user.id));
    if (scope === "no_customer") {
      if (OPEN_PATHS.has(req.path)) return next();
      return res.status(403).json({ error: "no_customer" });
    }
    req.scope = scope;
    next();
  } catch (e) { next(e); }
}

/** Routes behind requirePermission always have a scope; a missing one is a wiring bug. */
export function scopeOf(req: Request): Scope {
  if (!req.scope) throw new Error("scope missing — attachScope not applied");
  return req.scope;
}

/** /api/user payload: user (no password) + effective customer. */
export async function sessionUserPayload(user: SelectUser, session: { customerId?: number | null }): Promise<SessionUser> {
  const { password: _pw, ...safe } = user;
  const effectiveId = user.role === "superadmin" ? (session.customerId ?? null) : user.customerId;
  const c = effectiveId == null ? undefined : await storage.getCustomer(effectiveId);
  const customer = c ? { id: c.id, code: c.code, name: c.name, regionId: c.regionId } : null;
  return { ...safe, customer, customerScope: user.role === "superadmin" && effectiveId == null ? "all" : "one" };
}
```
Wire-up inside `setupAuth`: `app.use("/api", attachScope);` (replace `attachObjectScope`). `/api/user`, `/api/login` success, dev-login: respond with `await sessionUserPayload(user, req.session)` instead of the bare `safe` object. On login success set `req.session.customerId = undefined` (fresh choice per login).

Customer-active check: `deserializeUser` — after `sessionUserFrom` yields a user with `customerId != null` and role ≠ superadmin, load `storage.getCustomer(customerId)`; if missing or `!active` → `done(null, false)`. Same in `LocalStrategy` before `comparePasswords` (inactive customer → treated like an inactive user: dummy compare + generic message).

New route in `setupAuth` (after `/api/user`):
```ts
  app.put("/api/session/customer", requirePermission("customers", "read"), async (req, res, next) => {
    try {
      const parsed = z.object({ customerId: z.number().int().positive().nullable() }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "validation" });
      if (parsed.data.customerId !== null) {
        const c = await storage.getCustomer(parsed.data.customerId);
        if (!c || !c.active) return res.status(404).json({ error: "not found" });
      }
      req.session.customerId = parsed.data.customerId;
      const user = req.user as SelectUser;
      void storage.logAudit({ actorId: user.id, actorUsername: user.username, ip: req.ip ?? null, action: "session.customer", targetType: "customer", targetId: parsed.data.customerId });
      res.json(await sessionUserPayload(user, req.session));
    } catch (e) { next(e); }
  });
```
(import `z` from `zod`.) `requirePermission` is declared later in the file — function declarations hoist, fine.

`server/storage/users.ts`: `getUsers(scope: Scope)` → `db.query.users.findMany({ where: scope.customerId === null ? undefined : (t, { eq }) => eq(t.customerId, scope.customerId!) })`; `types.ts` signature `getUsers(scope: Scope): Promise<User[]>`. Update the two callers in `server/routes/users.ts` (`GET /api/users` → `storage.getUsers(scopeOf(req))`; the superadmin-count guard in `updateUserGuarded` uses raw SQL, unaffected).

- [ ] **Step 4: Run** `npx vitest run` — green. `npm run check` — errors only from the still-unconverted storage files (list them).

- [ ] **Step 5: Commit**

```bash
git add server/auth.ts server/auth.test.ts server/storage/users.ts server/storage/types.ts server/routes/users.ts
git commit -m "feat(auth): per-request customer scope, session customer switch, customer-active login check

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Scoped storage — stations, infrastructure objects, developers

**Files:**
- Modify: `server/storage/stations.ts`, `server/storage/infrastructure.ts`, `server/storage/types.ts`
- Test: `server/storage/stations.test.ts` (new)

**Interfaces:**
- Consumes: `Scope`, helpers from `./scope` (Task 2).
- Produces (signatures in `IStorage`):
  - `getStations(scope: Scope)`, `getStationsByRegionId(regionId: number, scope: Scope)`, `getStation(id: number, scope: Scope)`, `getStationByStationId(stationId: string, scope: Scope)`, `createStation(station: InsertStation, customerId: number)`; update methods unchanged.
  - `getInfrastructureObjects(scope: Scope)`, `getInfrastructureObject(id: number, scope: Scope)`, `getInfrastructureObjectByObjectId(objectId: string, scope: Scope)`, `createInfrastructureObject(obj: InsertInfrastructureObject, customerId: number)`.
  - `getDevelopers(scope: Scope)`, `getDeveloper(id: number, scope: Scope)`, `getDeveloperByName(name: string, scope: Scope)`, `createDeveloper(dev: InsertDeveloper, customerId: number)`.
  - Export `export async function scopedStationIds(scope: Scope): Promise<string[] | undefined>` from `stations.ts` (undefined = no staff narrowing).

- [ ] **Step 1: Failing test** — `server/storage/stations.test.ts` (mock `../db` so `db.query.stations.findMany` records its `where` and returns `[]`; render the `where` with `PgDialect`):

```ts
import { describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
const findMany = vi.fn(async () => []);
const findFirst = vi.fn(async () => undefined);
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
```
If the `exists` subquery inside `scopedStationIds` makes the mock too fiddly, restrict the test to `getStations`/`getStation` with `customerId` only (no `objectIds`) — that is what the spec's guard requires; note it in the report.

- [ ] **Step 2: Run** — FAIL (signature/where shape).

- [ ] **Step 3: stations.ts** — rewrite the getters (keep regions + update methods):

```ts
import { and, eq, inArray } from "drizzle-orm";
import { customerWhere, andAll, NO_ROWS } from "./scope";
import type { Scope } from "./types";

/** staff: station ids carrying a sensor installation on a bound object; undefined = no narrowing. */
export async function scopedStationIds(scope: Scope): Promise<string[] | undefined> {
  if (!scope.objectIds) return undefined;
  const ids = scope.objectIds.length ? scope.objectIds : NO_ROWS;
  const rows = await db.selectDistinct({ stationId: schema.sensorInstallations.stationId })
    .from(schema.sensorInstallations).where(inArray(schema.sensorInstallations.objectId, ids));
  return rows.map(r => r.stationId);
}

async function stationWhere(scope: Scope) {
  const ids = await scopedStationIds(scope);
  return andAll(customerWhere(scope, schema.stations.customerId), ids ? inArray(schema.stations.stationId, ids.length ? ids : ["__none__"]) : undefined);
}

  async getStations(scope: Scope): Promise<Station[]> {
    return db.query.stations.findMany({ where: await stationWhere(scope) });
  },
  async getStationsByRegionId(regionId: number, scope: Scope): Promise<Station[]> {
    return db.query.stations.findMany({ where: andAll(eq(schema.stations.regionId, regionId), await stationWhere(scope)) });
  },
  async getStation(id: number, scope: Scope): Promise<Station | undefined> {
    return db.query.stations.findFirst({ where: andAll(eq(schema.stations.id, id), await stationWhere(scope)) });
  },
  async getStationByStationId(stationId: string, scope: Scope): Promise<Station | undefined> {
    return db.query.stations.findFirst({ where: andAll(eq(schema.stations.stationId, stationId), await stationWhere(scope)) });
  },
  async createStation(station: InsertStation, customerId: number): Promise<Station> {
    const [row] = await db.insert(schema.stations).values({ ...station, customerId }).returning();
    return row;
  },
```
Remove the "Unscoped on purpose" comments.

- [ ] **Step 4: infrastructure.ts** — objects:

```ts
import { customerWhere, objectIdsWhere, andAll } from "./scope";
const objectWhere = (scope: Scope) => andAll(customerWhere(scope, schema.infrastructureObjects.customerId), objectIdsWhere(scope, schema.infrastructureObjects.id));

  async getInfrastructureObjects(scope: Scope) {
    return db.query.infrastructureObjects.findMany({ where: objectWhere(scope), orderBy: (t, { asc }) => [asc(t.name)] });
  },
  async getInfrastructureObject(id: number, scope: Scope) {
    return db.query.infrastructureObjects.findFirst({ where: andAll(eq(schema.infrastructureObjects.id, id), objectWhere(scope)) });
  },
  async getInfrastructureObjectByObjectId(objectId: string, scope: Scope) {
    return db.query.infrastructureObjects.findFirst({ where: andAll(eq(schema.infrastructureObjects.objectId, objectId), objectWhere(scope)) });
  },
  async createInfrastructureObject(obj: InsertInfrastructureObject, customerId: number) {
    const [row] = await db.insert(schema.infrastructureObjects).values({ ...obj, customerId }).returning();
    return row;
  },
```
Developers: `getDevelopers(scope)` → `where: customerWhere(scope, schema.developers.customerId)`; `getDeveloper(id, scope)` / `getDeveloperByName(name, scope)` → `andAll(eq(...), customerWhere(...))`; `createDeveloper(dev, customerId)` stamps it.

`types.ts`: update the signatures listed under Interfaces.

- [ ] **Step 5: Run** the new test + `npx vitest run` — green. `npm run check` — remaining errors only in not-yet-converted files (sensors/soil/calculations/seismograms/calibration/events/monitoring/maintenance, routes, ws, seed); list them.

- [ ] **Step 6: Commit**

```bash
git add server/storage/stations.ts server/storage/stations.test.ts server/storage/infrastructure.ts server/storage/types.ts
git commit -m "feat(storage): customer-scoped stations, infrastructure objects and developers

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Scoped storage — soil, sensors, calculations, seismograms, calibration, events, alerts, maintenance

**Files:**
- Modify: `server/storage/{soil,sensors,calculations,seismograms,calibration,events,monitoring,maintenance}.ts`, `server/storage/types.ts`
- Test: `server/storage/scope-guard.test.ts` (new)

**Interfaces:**
- Consumes: helpers from `./scope`.
- Produces (all in `IStorage`):
  - soil: `getSoilProfiles(objectId: number | undefined, scope: Scope)`, `getSoilProfile(id, scope)`, `getSoilProfileNearCoords(lat, lng, scope)`, `createSoilProfile(profile, customerId)`; `getSoilLayers(profileId)` unchanged (routes check the profile first).
  - sensors: `getSensorInstallations(objectId: number | undefined, scope)`, `getSensorInstallation(id, scope)`, `getSensors(stationId: string | undefined, objectId: number | undefined, scope)`, `getSensor(id, scope)`, `getSensorBySensorCode(code, scope)`, `createSensor(sensor, customerId)`; `createSensorInstallation` unchanged (route validates station/object ownership first).
  - calculations: `getSeismicCalculations(calcType: string | undefined, limit: number, scope)`, `getSeismicCalculation(id, scope)`, `createSeismicCalculation(calc, customerId)`, `getComparisonSets(scope)`, `getComparisonSet(id, scope)`, `createComparisonSet(set, customerId)`.
  - seismograms: `getSeismogramRecords(stationId: string | undefined, limit: number, scope)`, `getSeismogramRecord(id, scope)`.
  - calibration: `getCalibrationSessions(installationId: number | undefined, scope)`, `getCalibrationSession(id, scope)`, `createCalibrationSession(session, customerId)`.
  - events: `getEvents(scope)`, `getRecentEvents(limit, scope)`, `getEvent(id, scope)`, `getEventByEventId(eventId, scope)`; `createEvent` unchanged (sync jobs create events for known stations).
  - monitoring: `getAlerts(limit, scope)`.
  - maintenance: `getMaintenanceRecords(stationId, scope)`, `getMaintenanceRecord(id, scope)`, `getUpcomingMaintenanceRecords(days, scope)`.

Scoping rule per table: own column → `customerWhere(scope, t.customerId)` (+ `objectIdsWhere(scope, t.objectId)` where the table has `object_id`: soil_profiles, sensors, seismic_calculations); `station_id` tables → `stationInCustomer(scope, t.stationId)` (+ for staff: `inArray(t.stationId, await scopedStationIds(scope))` — import from `./stations`); `sensor_installations` → `stationInCustomer` + `objectIdsWhere(scope, t.objectId)`; `comparison_sets` → own column.

- [ ] **Step 1: Failing guard test** — `server/storage/scope-guard.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// Every getter that returns tenant rows must declare `scope: Scope`. A getter added
// without it would silently leak other customers' data.
const SCOPED = [
  'getStations', 'getStationsByRegionId', 'getStation', 'getStationByStationId',
  'getInfrastructureObjects', 'getInfrastructureObject', 'getInfrastructureObjectByObjectId',
  'getDevelopers', 'getDeveloper', 'getDeveloperByName',
  'getSoilProfiles', 'getSoilProfile', 'getSoilProfileNearCoords',
  'getSensorInstallations', 'getSensorInstallation', 'getSensors', 'getSensor', 'getSensorBySensorCode',
  'getSeismicCalculations', 'getSeismicCalculation', 'getComparisonSets', 'getComparisonSet',
  'getSeismogramRecords', 'getSeismogramRecord', 'getCalibrationSessions', 'getCalibrationSession',
  'getEvents', 'getRecentEvents', 'getEvent', 'getEventByEventId', 'getAlerts',
  'getMaintenanceRecords', 'getMaintenanceRecord', 'getUpcomingMaintenanceRecords', 'getUsers',
];

describe('IStorage tenant getters take a Scope', () => {
  const src = readFileSync(path.resolve(__dirname, 'types.ts'), 'utf8');
  for (const name of SCOPED) {
    it(`${name}(…, scope: Scope)`, () => {
      const m = src.match(new RegExp(`^\\s+${name}\\(([^)]*)\\)`, 'm'));
      expect(m, `${name} not found in IStorage`).toBeTruthy();
      expect(m![1]).toMatch(/scope: Scope/);
    });
  }
});
```

- [ ] **Step 2: Run** — FAIL for every not-yet-converted getter.

- [ ] **Step 3: Implement** each file following the rule above. Representative code:

`events.ts`:
```ts
import { and, desc, eq, inArray } from "drizzle-orm";
import { stationInCustomer, andAll } from "./scope";
import { scopedStationIds } from "./stations";
async function eventWhere(scope: Scope) {
  const ids = await scopedStationIds(scope);
  return andAll(stationInCustomer(scope, schema.events.stationId), ids ? inArray(schema.events.stationId, ids.length ? ids : ["__none__"]) : undefined);
}
  async getEvents(scope: Scope) { return db.query.events.findMany({ where: await eventWhere(scope), orderBy: (t, { desc }) => [desc(t.timestamp)] }); }
  async getRecentEvents(limit: number, scope: Scope) { return db.query.events.findMany({ where: await eventWhere(scope), orderBy: (t, { desc }) => [desc(t.timestamp)], limit }); }
  async getEvent(id: number, scope: Scope) { return db.query.events.findFirst({ where: andAll(eq(schema.events.id, id), await eventWhere(scope)) }); }
  async getEventByEventId(eventId: string, scope: Scope) { return db.query.events.findFirst({ where: andAll(eq(schema.events.eventId, eventId), await eventWhere(scope)) }); }
```
(keep the existing orderBy of each getter; only add the `where`.)

`sensors.ts` `getSensors`:
```ts
  async getSensors(stationId: string | undefined, objectId: number | undefined, scope: Scope) {
    const where = andAll(
      stationId ? eq(schema.sensors.stationId, stationId) : undefined,
      objectId ? eq(schema.sensors.objectId, objectId) : undefined,
      customerWhere(scope, schema.sensors.customerId),
      objectIdsWhere(scope, schema.sensors.objectId),
    );
    return db.query.sensors.findMany({ where, orderBy });
  },
```
`soil.ts` `getSoilProfileNearCoords(lat, lng, scope)`: keep the existing distance logic but restrict the candidate query with `customerWhere(scope, schema.soilProfiles.customerId)`.

`calculations.ts` `createComparisonSet(set, customerId)` and `getComparisonSets(scope)` use `customerWhere(scope, schema.comparisonSets.customerId)`.

Services (`server/services/earthquakeApi.ts:177`, `jmaEarthquakeApi.ts:265`) call `getEventByEventId(eventId)` for de-duplication of the global catalog — pass `{ customerId: null }` there with a comment `// catalog sync runs outside any customer`.

`types.ts`: update every signature listed under Interfaces.

- [ ] **Step 4: Run** `npx vitest run` — all green including the guard. `npm run check` — remaining errors only in `server/routes/*`, `server/ws.ts`, `server/seed.ts` (list them).

- [ ] **Step 5: Commit**

```bash
git add server/storage server/services
git commit -m "feat(storage): customer scope on soil, sensors, calculations, seismograms, calibration, events, alerts, maintenance; scope guard test

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Routes, WebSocket and seed on the new scope

**Files:**
- Modify: `server/routes/{stations,infrastructure,developers,soil,sensors,calculations,seismograms,calibration,monitoring,earthquakes,notifications}.ts`, `server/ws.ts`, `server/seed.ts`, `server/routes/users.ts:145` (objects binding)
- Test: `server/routes/scope-guard.test.ts` (new)

**Interfaces:**
- Consumes: `scopeOf(req)`, `resolveScope` (Task 4), all Task 5–6 signatures, `storage.getCustomerByCode` (Task 1).
- Produces: `export function requireCustomer(req: Request, res: Response): number | undefined` in `server/auth.ts` — returns `scope.customerId` or sends `400 {error:"select_customer"}` and returns undefined.

- [ ] **Step 1: Failing test** — `server/routes/scope-guard.test.ts` (text guard, like the storage one):

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';

// No route may call a scoped getter without passing the request scope, and no
// route may create a tenant row without requireCustomer().
const SCOPED_GETTERS = /storage\.(getStations|getStationsByRegionId|getStation|getStationByStationId|getInfrastructureObjects|getInfrastructureObject|getInfrastructureObjectByObjectId|getDevelopers|getDeveloper|getDeveloperByName|getSoilProfiles|getSoilProfile|getSoilProfileNearCoords|getSensorInstallations|getSensorInstallation|getSensors|getSensor|getSensorBySensorCode|getSeismicCalculations|getSeismicCalculation|getComparisonSets|getComparisonSet|getSeismogramRecords|getSeismogramRecord|getCalibrationSessions|getCalibrationSession|getEvents|getRecentEvents|getEvent|getEventByEventId|getAlerts|getMaintenanceRecords|getMaintenanceRecord|getUpcomingMaintenanceRecords|getUsers)\(([^;]*)\)/g;
const CREATES = /storage\.(createStation|createInfrastructureObject|createDeveloper|createSoilProfile|createSensor|createSeismicCalculation|createComparisonSet|createCalibrationSession)\(/g;

describe('routes pass the request scope', () => {
  const dir = path.resolve(__dirname);
  for (const f of readdirSync(dir).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'))) {
    const src = readFileSync(path.join(dir, f), 'utf8');
    it(`${f}: every scoped getter receives scopeOf(req) or scope`, () => {
      for (const m of src.matchAll(SCOPED_GETTERS)) expect(m[2], `${f}: ${m[0]}`).toMatch(/scopeOf\(req\)|\bscope\b/);
    });
    it(`${f}: every tenant create is preceded by requireCustomer`, () => {
      if (CREATES.test(src)) expect(src).toMatch(/requireCustomer\(req, res\)/);
    });
  }
});
```

- [ ] **Step 2: Run** — FAIL on most route files.

- [ ] **Step 3: `requireCustomer`** in `server/auth.ts`:

```ts
/** Creating a tenant row needs a concrete customer; superadmin in "all" mode must pick one. */
export function requireCustomer(req: Request, res: Response): number | undefined {
  const id = scopeOf(req).customerId;
  if (id === null) { res.status(400).json({ error: "select_customer" }); return undefined; }
  return id;
}
```

- [ ] **Step 4: Routes** — pattern for every file (apply mechanically):

```ts
import { requirePermission, scopeOf, requireCustomer } from "../auth";
// list:
const stations = await storage.getStations(scopeOf(req));
// detail (404 when other customer):
const station = await storage.getStationByStationId(req.params.stationId, scopeOf(req));
if (!station) return res.status(404).json({ message: 'Station not found' });
// create:
const customerId = requireCustomer(req, res); if (customerId === undefined) return;
const { customerId: _ignored, ...body } = req.body ?? {};
const created = await storage.createInfrastructureObject(body, customerId);
// update/delete: fetch with scope first, 404 if missing, then call the unscoped update/delete by id.
```
Specific points:
- `stations.ts`: maintenance POST/PATCH — verify the station via `getStationByStationId(stationId, scopeOf(req))` before creating/updating; `getMaintenanceRecord(id, scopeOf(req))`.
- `monitoring.ts`: `/api/regions*` stay unscoped (shared); `/api/regions/:id/stations` → `getStationsByRegionId(regionId, scopeOf(req))`; `getRecentEvents(limit, scopeOf(req))`, `getAlerts(limit, scopeOf(req))`, `getEventByEventId(id, scopeOf(req))`.
- `earthquakes.ts:98`: `getRecentEvents(limit, scopeOf(req))`.
- `notifications.ts`: `getEventByEventId(eventId, scopeOf(req))`.
- `sensors.ts`: installation POST — the station (`getStationByStationId(body.stationId, scope)`) and, when given, the object (`getInfrastructureObject(body.objectId, scope)`) must resolve, else 400 `{error:"unknown station/object"}`; sensor POST → `createSensor(body, customerId)` with the same station/object check.
- `soil.ts`: `getSoilProfiles(objectId, scopeOf(req))`, layers routes: load the profile with scope first (404), then layer ops.
- `calculations.ts`: `getSeismicCalculations(calcType, limit, scopeOf(req))`, `createSeismicCalculation(parsed.data, customerId)`, comparison sets likewise; note-history routes load the calculation with scope first.
- `calibration.ts`: sessions with scope; AFC routes load the session with scope first.
- `seismograms.ts`: `getSeismogramRecords(stationId, limit, scopeOf(req))`; POST verifies the station via scope, then `createSeismogramRecord` (unchanged signature).
- `developers.ts`: scope + `createDeveloper(parsed.data, customerId)`.
- `infrastructure.ts`: scope + `createInfrastructureObject(body, customerId)`; PATCH/DELETE after `getInfrastructureObject(id, scope)`.
- `users.ts:145` (`PUT /api/users/:id/objects`): the known-objects set must be the **target user's** customer: `const target = await storage.getUser(id); const known = new Set((await storage.getInfrastructureObjects({ customerId: target.customerId ?? -1 })).map(o => o.id));` (a superadmin target has no customer → binding rejected with 400 `{error:"superadmin has no objects"}`).

- [ ] **Step 5: ws.ts** — `authorizeUpgrade`:

```ts
    const scope = await resolveScope(user, (req as { session?: { customerId?: number | null } }).session?.customerId, () => storage.getUserObjectIds(user.id));
    if (scope === "no_customer") return null;
    return { user, scope };
```
(`resolveSessionUser` already ran the session middleware, so `req.session` is populated — read it from the same request object.) `WsContext.scope: Scope`; `getRecentEvents(5, ctx.scope)` / `(1, scope)`; `getStationByStationId(randomStationId, scope)`; `startSimulation(ws, scope: Scope)`; remove the `ObjectScope` import.

- [ ] **Step 6: seed.ts** — at the top of `seedDatabase()`: `const ecsem = await storage.getCustomerByCode("ecsem"); if (!ecsem) { console.error("seed: customer ecsem missing"); return; } const cid = ecsem.id;` and pass `cid` as the second argument to every `createStation`, `createInfrastructureObject`, `createDeveloper`, `createSoilProfile`, `createSensor` call; the existence checks in seed that used `getStationByStationId`/`getInfrastructureObjectByObjectId`/`getDeveloperByName` get `{ customerId: cid }`.

- [ ] **Step 7: Verify** — `npx vitest run` green (both guards); `npm run check` ≤ 49 (baseline restored — no `customerId`/`scope` errors left; if old pre-existing errors shifted, report the count and the list of any new ones). Restart the dev server; via curl with the dev-login cookie (admin = superadmin, no session choice → "all"): `GET /api/stations` → 28 rows; `POST /api/infrastructure-objects` → 400 `select_customer`; `PUT /api/session/customer {"customerId":1}` → payload with `customer.code === "ecsem"`, then the same POST → 201 (delete the created object afterwards via the API); anonymous `/ws` → 401; logged-in WS still receives `station_status`.

- [ ] **Step 8: Commit**

```bash
git add server/routes server/ws.ts server/seed.ts server/auth.ts
git commit -m "feat(api): request scope on every route and WS, select_customer guard, seed under ecsem

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Customers API and users API customer binding

**Files:**
- Create: `server/routes/customers.ts`
- Modify: `server/routes.ts` (mount after `usersRouter`), `server/routes/users.ts` (schemas + handlers), `server/storage/users.ts` (`updateUserGuarded` accepts `customerId`)
- Test: `server/routes/customers.test.ts` (new)

**Interfaces:**
- Consumes: `customersStorage` (Task 1), `requirePermission("customers", …)`, `logAudit`, `scopeOf`.
- Produces: `GET /api/customers` → `Array<Customer & { regionName: string | null; objects: number; users: number }>`; `POST /api/customers` (201) ; `PATCH /api/customers/:id`; users API accepts `customerId`.

- [ ] **Step 1: Failing test** — `server/routes/customers.test.ts` tests the exported zod schemas (export them from the router module):

```ts
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
```
(`z.object` is non-strict by default; use `.strict()` on `patchCustomerSchema` so `code` is rejected.)

- [ ] **Step 2: Run** — FAIL (module missing).

- [ ] **Step 3: `server/routes/customers.ts`**:

```ts
import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requirePermission } from "../auth";
import { describeError } from "../lib/errors";
import type { User } from "@shared/schema";

const router = Router();
const guard = (level: "read" | "write") => requirePermission("customers", level);
const idOf = (raw: string) => { const n = Number(raw); return Number.isInteger(n) && n > 0 ? n : null; };
const actorOf = (req: { user?: unknown; ip?: string }) => { const me = req.user as User; return { actorId: me.id, actorUsername: me.username, ip: req.ip ?? null }; };

export const createCustomerSchema = z.object({
  code: z.string().regex(/^[a-z0-9-]{2,32}$/),
  name: z.string().min(2).max(120),
  regionId: z.number().int().positive().nullable().optional(),
});
export const patchCustomerSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  regionId: z.number().int().positive().nullable().optional(),
  active: z.boolean().optional(),
}).strict();

router.get("/api/customers", guard("read"), async (_req, res) => {
  try {
    const [customers, regions] = await Promise.all([storage.getCustomers(), storage.getRegions()]);
    const regionName = new Map(regions.map(r => [r.id, r.name]));
    res.json(await Promise.all(customers.map(async c => ({ ...c, regionName: c.regionId ? regionName.get(c.regionId) ?? null : null, ...(await storage.countCustomerRows(c.id)) }))));
  } catch (error) { console.error(`customers route error: ${describeError(error)}`); res.status(500).json({ error: "internal error" }); }
});

router.post("/api/customers", guard("write"), async (req, res) => {
  try {
    const parsed = createCustomerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "validation", issues: parsed.error.issues });
    if (await storage.getCustomerByCode(parsed.data.code)) return res.status(409).json({ error: "Код уже занят" });
    if (parsed.data.regionId && !(await storage.getRegion(parsed.data.regionId))) return res.status(400).json({ error: "unknown region" });
    const c = await storage.createCustomer(parsed.data);
    void storage.logAudit({ ...actorOf(req), action: "customer.create", targetType: "customer", targetId: c.id, details: { code: c.code, name: c.name } });
    res.status(201).json(c);
  } catch (error) { console.error(`customers route error: ${describeError(error)}`); res.status(500).json({ error: "internal error" }); }
});

router.patch("/api/customers/:id", guard("write"), async (req, res) => {
  try {
    const id = idOf(req.params.id);
    if (!id) return res.status(400).json({ error: "bad id" });
    const parsed = patchCustomerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "validation", issues: parsed.error.issues });
    if (!(await storage.getCustomer(id))) return res.status(404).json({ error: "not found" });
    if (parsed.data.active === false && req.session.customerId === id) return res.status(409).json({ error: "Сначала переключитесь на другого заказчика" });
    if (parsed.data.regionId && !(await storage.getRegion(parsed.data.regionId))) return res.status(400).json({ error: "unknown region" });
    const c = await storage.updateCustomer(id, parsed.data);
    void storage.logAudit({ ...actorOf(req), action: "customer.update", targetType: "customer", targetId: id, details: parsed.data });
    res.json(c);
  } catch (error) { console.error(`customers route error: ${describeError(error)}`); res.status(500).json({ error: "internal error" }); }
});

export default router;
```
Mount in `server/routes.ts`: `import customersRouter from "./routes/customers";` and `app.use(customersRouter);` after `auditRouter`.

- [ ] **Step 4: users API** — `server/routes/users.ts`:
  - `createSchema`: add `customerId: z.number().int().positive().nullable().optional()`; after parsing: `const customerId = parsed.data.role === "superadmin" ? null : parsed.data.customerId ?? null; if (parsed.data.role !== "superadmin" && customerId === null) return res.status(400).json({ error: "customer_required" }); if (customerId !== null && !(await storage.getCustomer(customerId))) return res.status(400).json({ error: "unknown customer" });` and pass `customerId` into `createUser`.
  - `patchSchema`: add `customerId: z.number().int().positive().nullable().optional()`. Before `updateUserGuarded`: compute `nextRole = parsed.data.role ?? target.role`, `nextCustomer = parsed.data.customerId !== undefined ? parsed.data.customerId : target.customerId`; if `nextRole === "superadmin"` force `customerId: null` into the patch; else if `nextCustomer === null` → 400 `customer_required`; if `nextCustomer !== null` validate it exists. Include `customerId` in the patch passed to `updateUserGuarded` (it already accepts `Partial<InsertUser>`, and `insertUserSchema` keeps `customerId`).
  - `GET /api/users` already uses `getUsers(scopeOf(req))` (Task 4).
  - `safe()` also strips nothing new; `customerId` is part of the payload.

- [ ] **Step 5: Verify** — `npx vitest run` green; `npm run check` ≤ 49. Restart dev server; with the admin cookie: `POST /api/customers {"code":"probe","name":"Тестовый заказчик"}` → 201; `GET /api/customers` → 2 rows with counts; `POST /api/users` for role `designer` without `customerId` → 400 `customer_required`; with `customerId` = probe id → 201; `PATCH /api/customers/<probe>` `{"active":false}` after `PUT /api/session/customer {"customerId":<probe>}` → 409; switch back to `null`, then deactivate → 200, and the new designer's login → 401. Leave the probe customer **inactive** and the probe user in place — the final verification reuses them (record their ids in the report).

- [ ] **Step 6: Commit**

```bash
git add server/routes/customers.ts server/routes/customers.test.ts server/routes.ts server/routes/users.ts server/storage/users.ts
git commit -m "feat(customers): /api/customers CRUD, customer binding in users API

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Client — auth customer state, header switcher, `/admin/customers`

**Files:**
- Modify: `client/src/hooks/use-auth.tsx`, `client/src/hooks/use-permission.ts`, `client/src/components/layout/AppLayout.tsx:186-197, 270-292`, `client/src/pages/SystemManagement.tsx:26-33`, `client/src/App.tsx:69-` (route)
- Create: `client/src/pages/admin/Customers.tsx`, `client/src/pages/admin/customers/{CreateDialog,EditDialog}.tsx`

**Interfaces:**
- Consumes: `SessionUser` (Task 1), `PUT /api/session/customer`, `/api/customers`, `apiJson` (existing in `client/src/lib/queryClient.ts`), `usePermission`, `RoleSelect`/`useErrorToast` pattern from `pages/admin/users/shared.tsx`.
- Produces: `useAuth()` returns `user: SessionUser | null`, `customer`, `customerScope: 'all' | 'one' | null`, `setCustomer(id: number | null): Promise<void>`; `usePermission()` adds `customerScope` and `canCreate: boolean` (`customerScope !== 'all'`).

- [ ] **Step 1: use-auth** — change the `User` type to `SessionUser` (`import type { SessionUser } from "@shared/schema"`), keep everything else; add:

```ts
const setCustomer = async (customerId: number | null) => {
  const next = await apiJson<SessionUser>("PUT", "/api/session/customer", { customerId });
  queryClient.clear();
  queryClient.setQueryData(["/api/user"], next);
};
```
and expose `customer: user?.customer ?? null`, `customerScope: user?.customerScope ?? null`, `setCustomer` in the context type/value. (`apiJson` import from `@/lib/queryClient`.)

- [ ] **Step 2: use-permission** — add `customerScope` and `canCreate: user?.customerScope !== 'all'` to the returned object.

- [ ] **Step 3: AppLayout** — replace the hard-coded `г. Иркутск` span (line ~194) with `{customer?.name ?? (customerScope === 'all' ? 'Все заказчики' : '')}`. Next to the user dropdown add, for superadmin only, a `Select` (from `@/components/ui/select`) with the customers list (`useQuery<CustomerRow[]>({ queryKey: ['/api/customers'], enabled: isSuperadmin })`, active ones only), value `customer?.id ?? 'all'`, items «Все заказчики» + each customer name; `onValueChange={v => setCustomer(v === 'all' ? null : Number(v))}`. For other roles render the customer name as plain text in the dropdown label under the role.

- [ ] **Step 4: `/admin/customers`** — `client/src/pages/admin/Customers.tsx` (default export, table: код, название, регион, объекты, пользователи, активен `Switch` → `PATCH`, кнопка «Изменить», кнопка «Создать»), `customers/CreateDialog.tsx` (code/name/region `Select` from `/api/regions`; validation: code regex `/^[a-z0-9-]{2,32}$/` → «Код: латиница, цифры, дефис, 2–32 символа», name ≥ 2; `apiJson("POST", "/api/customers", …)`; invalidate `['/api/customers']`), `customers/EditDialog.tsx` (name/region/active; `apiJson("PATCH", …)`). Errors via `useErrorToast` from `../users/shared`. Deactivation 409 message surfaces via toast.

- [ ] **Step 5: Wiring** — `App.tsx`: `const AdminCustomers = lazy(() => import("@/pages/admin/Customers"));` and `["/admin/customers", page(AdminCustomers, 'customers')]`. `SystemManagement.tsx`: tile `{ href: '/admin/customers', icon: Building2, title: 'Заказчики', desc: 'Организации и их площадки', badge: null, color: …, bg: …, module: 'customers' }` (icon from `lucide-react`; reuse the color pattern of the users tile).

- [ ] **Step 6: Verify** — `npm run check` ≤ 49 (new files clean); `npx vitest run` green. Browser (dev-login as admin): header shows «Все заказчики»; switching to «ЕЦСЭМ» reloads data; `/admin/customers` lists ЕЦСЭМ + the probe customer with counts; create «demo2» → appears; edit → saved; trying to deactivate the currently selected customer → toast with the 409 message. No console errors.

- [ ] **Step 7: Commit**

```bash
git add client/src/hooks/use-auth.tsx client/src/hooks/use-permission.ts client/src/components/layout/AppLayout.tsx client/src/pages/SystemManagement.tsx client/src/App.tsx client/src/pages/admin/Customers.tsx client/src/pages/admin/customers
git commit -m "feat(client): customer switcher, /admin/customers, customer in auth state

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Client — users customer select, region selects, "all" mode guards, de-Irkutsk

**Files:**
- Modify: `client/src/pages/admin/Users.tsx`, `client/src/pages/admin/users/{CreateDialog,EditDialog,shared}.tsx`
- Modify: `client/src/pages/InfrastructureObjects.tsx` (object form + create button), `client/src/pages/AddStation.tsx` (region select), `client/src/pages/Developers.tsx`, `client/src/pages/SoilDatabase.tsx` (create buttons), `client/src/pages/Stations.tsx` (link to `/stations/new`), `client/src/pages/Calculations.tsx` (save), `client/src/pages/Seismograms.tsx` (upload), `client/src/pages/analysis/ResponseTab.tsx` (save calculation)
- Modify: `client/src/components/stations/StationList.tsx:22-25`, `client/src/pages/Archive.tsx:404`

- [ ] **Step 1: users admin** — `shared.tsx`: add `CustomerSelect: FC<{ value: number | null; onChange: (id: number | null) => void; disabled?: boolean }>` (options from `/api/customers`, active only). `CreateDialog`: add the select (required unless role is superadmin; hidden when role superadmin); send `customerId`. `EditDialog`: same. `Users.tsx`: column «Заказчик» (name via the customers query; «—» for superadmin).

- [ ] **Step 2: region selects** — `InfrastructureObjects.tsx` create/edit form: `Select` «Регион» from `/api/regions`, default `customer?.regionId`; send `regionId`. `AddStation.tsx`: same for `regionId`.

- [ ] **Step 3: "all" mode guards** — every create/add button on tenant pages: `const { canCreate } = usePermission();` → `disabled={!canCreate || …}` with `title="Выберите заказчика"` when `!canCreate`. Known locations (from `grep -rn "Создать\|Добавить" client/src/pages`): `InfrastructureObjects.tsx`, `Developers.tsx`, `SoilDatabase.tsx`, `analysis/ResponseTab.tsx`; plus the `/stations/new` link in `Stations.tsx`, the save action in `Calculations.tsx`, the upload in `Seismograms.tsx`, and the sensor/installation/calibration create actions inside `InfrastructureObjects.tsx` (3D scheme) and `Analysis.tsx` (calibration tab) — grep each file for `mutate(` on a POST to find the trigger button. In "all" mode object/station lists show a «Заказчик» column — the API rows carry `customerId`; map to names with the customers query (superadmin only).

- [ ] **Step 4: de-Irkutsk** — `StationList.tsx`: keep `IRKUTSK_DISTRICTS` but use it only when `customer?.regionId` is the Иркутск region (compare by region name from `/api/regions`); otherwise render a free-text district input. `Archive.tsx:404`: «База данных грунтов и объектов — {customer?.name ?? 'все заказчики'}».

- [ ] **Step 5: Verify** — `npm run check` ≤ 49; browser as admin in "all" mode: create buttons disabled with the tooltip; switch to ЕЦСЭМ → enabled; `/admin/users` shows the customer column, creating a `designer` without a customer → inline error; object form shows the region select defaulting to Иркутск.

- [ ] **Step 6: Commit**

```bash
git add client/src
git commit -m "feat(client): customer select for users, region selects, all-customers mode guards, customer-aware labels

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Docs

**Files:**
- Modify: `CLAUDE.md` (architecture map, conventions, «Известные проблемы»), `docs/DEPLOY.md` («Обновление»), `README.md`

- [ ] **Step 1: CLAUDE.md** — architecture map: `server/storage/scope.ts — SQL скоупа (customerWhere/stationInCustomer/objectInCustomer)`, `server/storage/customers.ts`, `server/routes/customers.ts`, `client/src/pages/admin/Customers.tsx + admin/customers/*`. Conventions: add «Мультитенантность: каждая tenant-таблица имеет `customer_id`; list/detail-геттеры принимают `scope: Scope` (страховка `server/storage/scope-guard.test.ts`), роуты передают `scopeOf(req)`, создание tenant-строк — через `requireCustomer(req, res)` (страховка `server/routes/scope-guard.test.ts`). Общие таблицы: regions, object_categories, building_norms, research_networks, system_status». «Известные проблемы»: RLS не включён (второе кольцо), линейные объекты — точки типа `pipeline`.
- [ ] **Step 2: DEPLOY.md** — under «Обновление»: after this release the container creates `customers` and backfills everything to «ЕЦСЭМ» at start (`Startup migrations applied (... + customers)`); superadmins start in «Все заказчики» mode; nothing to run manually.
- [ ] **Step 3: README** — one paragraph «Заказчики»: what a customer is, where to create them, that a non-superadmin user must have one.
- [ ] **Step 4: Verify** — `npx vitest run` green (final count reported), `npm run check` ≤ 49, `npm run build` passes.
- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md docs/DEPLOY.md README.md
git commit -m "docs: customers (multi-tenant) conventions, deploy note, README

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Final verification (controller)

- `npx vitest run`, `npm run check` ≤ 49, `npm run build`.
- Through the tunnel with two customers (ЕЦСЭМ and the probe customer re-activated): a `designer` of the probe customer sees 0 objects / 0 stations by REST and `station_status` payload length 0 by WS; `GET /api/infrastructure-objects/<ecsem object id>` → 404; superadmin in "all" mode sees 34 objects and `POST` → 400; after `PUT /api/session/customer` → 201; deactivating the probe customer → its designer's next request 401.
- Deactivate the probe customer again and leave the probe rows documented in the memory file.
