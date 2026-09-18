# Roles Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the `/ws` anonymous-access hole and the deferred review findings of the roles branch: session invalidation on password reset/deactivation, audit log, race-free last-superadmin guard, case-insensitive identities, timing-neutral login, client polish.

**Architecture:** Express session is reused for the WebSocket upgrade through an exported `resolveSessionUser`. A `session_epoch` column on `users` is embedded in the serialized passport payload, so bumping it invalidates every session of that user regardless of store. An `audit_log` table gets rows from the users API and successful logins. Schema additions go through `runStartupMigrations()` (ad-hoc `IF NOT EXISTS`), not drizzle migrations.

**Tech Stack:** Express 4, express-session, passport-local, `ws`, Drizzle ORM (node-postgres), React 18 + TanStack Query 5 + shadcn/ui, vitest 2.

**Spec:** `docs/superpowers/specs/2026-09-18-roles-polish-design.md`

## Global Constraints

- Branch `feature/roles-polish`. No `npm run db:push`, no drizzle migration files; schema changes only via `server/startup.ts` + `shared/schema.ts`.
- Every new route carries `requirePermission(module, level)`.
- `npm run check` must stay at ≤ 49 errors (baseline). `npm test` must be green after every task.
- Tests: vitest, node environment; `server/db.ts` is importable thanks to the dummy `DATABASE_URL` in `vitest.config.ts`, but never runs queries in tests — mock `./db` / `../db` with `vi.mock` where a storage function is under test.
- UI strings in Russian. Commit messages: conventional prefix (`feat|fix|test|docs|refactor`), body optional, trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Existing behaviour to keep: dev-login only under `NODE_ENV=development`; `queryClient.clear()` on login/logout; `staff` object scoping through `req.objectScope`.

---

## File map

| File | Responsibility |
|---|---|
| `shared/schema.ts` | `users.sessionEpoch`, `auditLog` table + types |
| `server/startup.ts` | `ALTER TABLE users ADD COLUMN IF NOT EXISTS session_epoch`, `CREATE TABLE IF NOT EXISTS audit_log` |
| `server/storage/users.ts` | case-insensitive lookups, `bumpSessionEpoch`, `updateUserGuarded` + `LastSuperadminError`, pure `removesLastSuperadmin` |
| `server/storage/audit.ts` (new) | `logAudit`, `getAuditLog` |
| `server/storage/types.ts`, `server/storage/index.ts` | interface + merge |
| `server/auth.ts` | `sessionUserFrom` (pure), `resolveSessionUser`, serialize `{id, epoch}`, dummy-hash compare, `auth.login` audit |
| `server/ws.ts` | authenticated upgrade, per-client scope |
| `server/routes/users.ts` | guarded update, epoch bumps, 404 on objects, PATCH profile fields, audit calls |
| `server/routes/audit.ts` (new) | `GET /api/audit` |
| `server/routes.ts` | mount `auditRouter` |
| `client/src/hooks/useWebSocket.ts` | connect only with a user; reconnect on user change |
| `client/src/lib/queryClient.ts` | `apiJson` helper |
| `client/src/pages/admin/Users.tsx` | table only; imports dialogs |
| `client/src/pages/admin/users/{shared,CreateDialog,EditDialog,PasswordDialog,ObjectsDialog,AuditLog}.tsx` (new) | one dialog per file |
| `client/src/pages/auth-page.tsx` | own validation, `role="alert"` |
| `vitest.config.ts` | include `.test.tsx` |
| `server/storage/{sensors,calculations,stations}.ts`, `shared/permissions.test.ts`, `README.md`, `CLAUDE.md` | comments, safety test, docs |

---

### Task 1: Session epoch — schema, startup, storage, passport payload

**Files:**
- Modify: `shared/schema.ts:9-26` (users table)
- Modify: `server/startup.ts:111-119` (after `user_objects`)
- Modify: `server/storage/users.ts`
- Modify: `server/storage/types.ts:16-25`
- Modify: `server/auth.ts:96-100` (serialize/deserialize), export `sessionUserFrom`
- Test: `server/auth.test.ts`

**Interfaces:**
- Produces: `users.sessionEpoch: number` (column `session_epoch`), `storage.bumpSessionEpoch(id: number): Promise<User | undefined>`, `export type SessionPayload = { id: number; epoch: number }`, `export function sessionUserFrom(payload: unknown, user: SelectUser | undefined): SelectUser | false` in `server/auth.ts`.

- [ ] **Step 1: Write the failing test** — append to `server/auth.test.ts`:

```ts
import { sessionUserFrom } from './auth';

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
```

- [ ] **Step 2: Run** `npx vitest run server/auth.test.ts` — expect FAIL: `sessionUserFrom` is not exported.

- [ ] **Step 3: Schema** — in `shared/schema.ts` users table add after `active`:

```ts
  // Bumped on password reset / deactivation; embedded in the session payload so
  // every existing session of the user stops deserializing (server/auth.ts).
  sessionEpoch: integer("session_epoch").notNull().default(0),
```

- [ ] **Step 4: Startup migration** — in `server/startup.ts` right after the `user_objects` CREATE TABLE:

```ts
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS session_epoch integer NOT NULL DEFAULT 0`);
```
and extend the final `console.log` string with ` + session_epoch`.

- [ ] **Step 5: Storage** — in `server/storage/users.ts` add to `usersStorage`:

```ts
  /** Invalidate every session of the user (see sessionUserFrom in server/auth.ts). */
  async bumpSessionEpoch(id: number): Promise<User | undefined> {
    const [u] = await db.update(schema.users)
      .set({ sessionEpoch: sql`${schema.users.sessionEpoch} + 1`, updatedAt: new Date() })
      .where(eq(schema.users.id, id)).returning();
    return u;
  },
```
Import `sql` from `drizzle-orm`. Add `bumpSessionEpoch(id: number): Promise<User | undefined>;` to `IStorage` in `server/storage/types.ts` under "User operations".

- [ ] **Step 6: Passport payload** — in `server/auth.ts` replace the serialize/deserialize pair:

```ts
export type SessionPayload = { id: number; epoch: number };

/** Session payload → user, or false when the user is gone, inactive, or the epoch moved on. */
export function sessionUserFrom(payload: unknown, user: SelectUser | undefined): SelectUser | false {
  if (!payload || typeof payload !== "object") return false;
  const { id, epoch } = payload as Partial<SessionPayload>;
  if (typeof id !== "number" || typeof epoch !== "number") return false;
  const u = activeOrFalse(user);
  return u && u.id === id && u.sessionEpoch === epoch ? u : false;
}
```
inside `setupAuth`:
```ts
  passport.serializeUser((user, done) => done(null, { id: user.id, epoch: user.sessionEpoch } satisfies SessionPayload));
  passport.deserializeUser(async (payload: unknown, done) => {
    try {
      const id = (payload as Partial<SessionPayload>)?.id;
      done(null, sessionUserFrom(payload, typeof id === "number" ? await storage.getUser(id) : undefined));
    } catch (error) { done(error, null); }
  });
```
`passport.serializeUser` generic: if TS complains about the payload type, use `passport.serializeUser<SessionPayload>(...)` / `passport.deserializeUser<SessionPayload>(...)`.

- [ ] **Step 7: Run** `npx vitest run server/auth.test.ts` — PASS. `npm run check` — ≤ 49 errors. Start `npm run dev` (tunnel up) and log in via the form once: the startup log line must include `session_epoch`, and `GET /api/user` returns the user with `sessionEpoch: 0`.

- [ ] **Step 8: Commit**

```bash
git add shared/schema.ts server/startup.ts server/storage/users.ts server/storage/types.ts server/auth.ts server/auth.test.ts
git commit -m "feat(auth): session epoch — password reset/deactivation can invalidate sessions

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Auth hardening — session resolver for upgrades, timing-neutral login, case-insensitive lookups, tests

**Files:**
- Modify: `server/auth.ts` (module-level `sessionMiddleware`, `resolveSessionUser`, dummy hash in LocalStrategy)
- Modify: `server/storage/users.ts:17-27` (`getUserByUsername`, `getUserByEmail`)
- Modify: `server/lib/password.ts` (export `DUMMY_HASH` promise)
- Test: `server/auth.test.ts`, `server/lib/password.test.ts`

**Interfaces:**
- Produces: `export async function resolveSessionUser(req: IncomingMessage): Promise<SelectUser | false>` in `server/auth.ts`; `export const dummyHash: Promise<string>` in `server/lib/password.ts`.

- [ ] **Step 1: Failing tests** — append to `server/auth.test.ts`:

```ts
import { attachObjectScope, resolveSessionUser } from './auth';
import { storage } from './storage';

vi.mock('./storage', () => ({
  storage: { getUserObjectIds: vi.fn(), getUser: vi.fn() },
}));

describe('attachObjectScope', () => {
  it('sets {objectIds} for staff', async () => {
    vi.mocked(storage.getUserObjectIds).mockResolvedValueOnce([3, 5]);
    const req = { user: { id: 1, role: 'staff' } } as never as { objectScope?: unknown };
    const next = vi.fn();
    await attachObjectScope(req as never, {} as never, next);
    expect(req.objectScope).toEqual({ objectIds: [3, 5] });
    expect(next).toHaveBeenCalledWith();
  });
  it('leaves scope undefined for other roles and anonymous', async () => {
    for (const user of [{ id: 1, role: 'designer' }, undefined]) {
      const req = { user } as never as { objectScope?: unknown };
      const next = vi.fn();
      await attachObjectScope(req as never, {} as never, next);
      expect(req.objectScope).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    }
  });
  it('forwards storage errors to next(err)', async () => {
    const boom = new Error('db down');
    vi.mocked(storage.getUserObjectIds).mockRejectedValueOnce(boom);
    const next = vi.fn();
    await attachObjectScope({ user: { id: 1, role: 'staff' } } as never, {} as never, next);
    expect(next).toHaveBeenCalledWith(boom);
  });
});

describe('resolveSessionUser', () => {
  it('returns false before setupAuth installed the session middleware', async () => {
    expect(await resolveSessionUser({ headers: {} } as never)).toBe(false);
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
```
Note: the existing `vi.mock` must be hoisted — place the `vi.mock('./storage', …)` call right after the imports at the top of the file (vitest hoists it anyway, but keep it visible). The earlier `requirePermission` / `activeOrFalse` tests do not touch storage and keep working.

Append to `server/lib/password.test.ts`:
```ts
import { dummyHash, comparePasswords } from './password';
describe('dummyHash', () => {
  it('is a valid hash that never matches', async () => {
    const h = await dummyHash;
    expect(h).toMatch(/^[0-9a-f]{128}\.[0-9a-f]{32}$/);
    expect(await comparePasswords('anything', h)).toBe(false);
  });
});
```
(`comparePasswords` is already imported in that file — merge the import.)

- [ ] **Step 2: Run** `npx vitest run server/auth.test.ts server/lib/password.test.ts` — FAIL on missing exports.

- [ ] **Step 3: password.ts** — add:

```ts
/** Hash of a random secret; compared against on unknown logins so a miss costs the same scrypt as a hit. */
export const dummyHash: Promise<string> = hashPassword(randomBytes(32).toString("hex"));
```

- [ ] **Step 4: auth.ts** — module level (below the limiter):

```ts
import type { IncomingMessage } from "http";
import { comparePasswords, dummyHash } from "./lib/password";

let sessionMiddleware: RequestHandler | undefined;

/**
 * Resolve the logged-in user of a raw HTTP request (WebSocket upgrade) through the
 * same express-session store the API uses. `false` when anonymous, stale, or before
 * setupAuth ran.
 */
export async function resolveSessionUser(req: IncomingMessage): Promise<SelectUser | false> {
  if (!sessionMiddleware) return false;
  await new Promise<void>((resolve, reject) =>
    sessionMiddleware!(req as Request, {} as Response, (err?: unknown) => (err ? reject(err) : resolve())),
  );
  const payload = ((req as Request).session as { passport?: { user?: unknown } } | undefined)?.passport?.user;
  const id = (payload as Partial<SessionPayload> | undefined)?.id;
  return sessionUserFrom(payload, typeof id === "number" ? await storage.getUser(id) : undefined);
}
```
In `setupAuth`, replace `app.use(session({...}))` with:
```ts
  sessionMiddleware = session({ ...same options... });
  app.use(sessionMiddleware);
```
LocalStrategy: replace the two early returns with a constant-time path:
```ts
      const user = await storage.getUserByUsername(username);
      const ok = user && user.active
        ? await comparePasswords(password, user.password)
        : (await comparePasswords(password, await dummyHash), false);
      if (!ok) return done(null, false, { message: "Неверный логин или пароль" });
      await storage.setLastLogin(user!.id);
      return done(null, user!);
```

- [ ] **Step 5: storage/users.ts** — case-insensitive lookups:

```ts
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [u] = await db.select().from(schema.users).where(sql`lower(${schema.users.username}) = lower(${username})`).limit(1);
    return u;
  },
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [u] = await db.select().from(schema.users).where(sql`lower(${schema.users.email}) = lower(${email})`).limit(1);
    return u;
  },
```

- [ ] **Step 6: Run** both test files — PASS. `npm run check` ≤ 49. Manual: `curl -s -X POST localhost:5000/api/login -H 'content-type: application/json' -d '{"username":"ADMIN","password":"<wrong>"}'` → 401 in roughly the same time as a wrong password for a real user (scrypt ~50–100 ms both).

- [ ] **Step 7: Commit**

```bash
git add server/auth.ts server/auth.test.ts server/lib/password.ts server/lib/password.test.ts server/storage/users.ts
git commit -m "feat(auth): session resolver for upgrades, timing-neutral login, case-insensitive identities

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: `/ws` requires a session; staff gets scoped stations; client connects only when logged in

**Files:**
- Modify: `server/ws.ts:21-75`, `server/ws.ts:188-200` (NETWORK_STATUS in simulation)
- Modify: `client/src/hooks/useWebSocket.ts:11-55`
- Test: `server/ws.test.ts` (new)

**Interfaces:**
- Consumes: `resolveSessionUser` (Task 2), `storage.getStations(scope?: ObjectScope)`, `storage.getUserObjectIds`.
- Produces: `export async function authorizeUpgrade(req: IncomingMessage): Promise<{ user: SelectUser; scope: ObjectScope } | null>` in `server/ws.ts`.

- [ ] **Step 1: Failing test** — `server/ws.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { authorizeUpgrade } from './ws';
import { resolveSessionUser } from './auth';
import { storage } from './storage';

vi.mock('./auth', () => ({ resolveSessionUser: vi.fn() }));
vi.mock('./storage', () => ({ storage: { getUserObjectIds: vi.fn() } }));

describe('authorizeUpgrade', () => {
  it('rejects anonymous upgrades', async () => {
    vi.mocked(resolveSessionUser).mockResolvedValueOnce(false);
    expect(await authorizeUpgrade({ headers: {} } as never)).toBeNull();
  });
  it('scopes staff to their objects', async () => {
    vi.mocked(resolveSessionUser).mockResolvedValueOnce({ id: 9, role: 'staff' } as never);
    vi.mocked(storage.getUserObjectIds).mockResolvedValueOnce([4]);
    expect(await authorizeUpgrade({ headers: {} } as never)).toEqual({ user: { id: 9, role: 'staff' }, scope: { objectIds: [4] } });
  });
  it('leaves other roles unscoped', async () => {
    vi.mocked(resolveSessionUser).mockResolvedValueOnce({ id: 1, role: 'superadmin' } as never);
    expect(await authorizeUpgrade({ headers: {} } as never)).toEqual({ user: { id: 1, role: 'superadmin' }, scope: undefined });
  });
  it('treats a session-store error as anonymous', async () => {
    vi.mocked(resolveSessionUser).mockRejectedValueOnce(new Error('store down'));
    expect(await authorizeUpgrade({ headers: {} } as never)).toBeNull();
  });
});
```

- [ ] **Step 2: Run** `npx vitest run server/ws.test.ts` — FAIL (no export).

- [ ] **Step 3: ws.ts** — imports and upgrade handler:

```ts
import type { IncomingMessage, Server } from "http";
import { resolveSessionUser } from "./auth";
import { storage, type ObjectScope } from "./storage";
import type { User as SelectUser } from "@shared/schema";

type WsContext = { user: SelectUser; scope: ObjectScope };

/** Session cookie → user + object scope, or null (anonymous / stale / store error). */
export async function authorizeUpgrade(req: IncomingMessage): Promise<WsContext | null> {
  try {
    const user = await resolveSessionUser(req);
    if (!user) return null;
    const scope: ObjectScope = user.role === "staff" ? { objectIds: await storage.getUserObjectIds(user.id) } : undefined;
    return { user, scope };
  } catch (err) {
    console.error(`WS upgrade auth failed: ${describeError(err)}`);
    return null;
  }
}
```
Replace the `httpServer.on('upgrade', …)` body:
```ts
  httpServer.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    if (pathname !== '/ws') return;
    authorizeUpgrade(req).then((ctx) => {
      if (!ctx) {
        socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req, ctx));
    });
  });

  wss.on('connection', (ws, _req: IncomingMessage, ctx: WsContext) => {
```
Then, inside the connection handler and in `startSimulation`, every `storage.getStations()` becomes `storage.getStations(ctx.scope)`; `startSimulation(ws)` becomes `startSimulation(ws, ctx.scope)` with signature `function startSimulation(ws: WebSocket, scope: ObjectScope)`. Replace `console.log('WebSocket client connected')` with `` console.log(`WebSocket client connected: ${ctx.user.username}`) ``.

- [ ] **Step 4: Client** — `client/src/hooks/useWebSocket.ts`: import `useAuth`; inside the hook `const { user } = useAuth();` and change the effect:

```ts
  useEffect(() => {
    if (!user) { setIsConnected(false); return; }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
    socketRef.current = socket;
    ... (handlers unchanged) ...
    return () => {
      socketRef.current = null;
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close();
    };
  }, [user?.id]);
```
Remove the `console.log` lines for open/close (keep `console.error`).

- [ ] **Step 5: Verify** — `npx vitest run` green; `npm run check` ≤ 49. Runtime with tunnel + `npm run dev`:
  - `curl -si -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' localhost:5000/ws | head -1` → `HTTP/1.1 401 Unauthorized`.
  - Log in in the browser panel: home page still shows station status via WS, no console errors; Vite HMR works (edit a file, page updates).
  - Log out: no reconnect attempts in the Network tab.

- [ ] **Step 6: Commit**

```bash
git add server/ws.ts server/ws.test.ts client/src/hooks/useWebSocket.ts
git commit -m "fix(ws): require a valid session for /ws and scope staff station payloads

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Audit log — table, storage, route

**Files:**
- Modify: `shared/schema.ts` (after `userObjects`), `server/startup.ts`, `server/storage/types.ts`, `server/storage/index.ts`, `server/routes.ts`
- Create: `server/storage/audit.ts`, `server/routes/audit.ts`
- Test: `server/storage/audit.test.ts` (new)

**Interfaces:**
- Produces: `auditLog` table, types `AuditLog`, `InsertAuditLog`; `storage.logAudit(entry: InsertAuditLog): Promise<void>` (never throws), `storage.getAuditLog(limit: number): Promise<AuditLog[]>`; `GET /api/audit?limit=N`.

- [ ] **Step 1: Failing test** — `server/storage/audit.test.ts`:

```ts
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
```

- [ ] **Step 2: Run** `npx vitest run server/storage/audit.test.ts` — FAIL (module missing).

- [ ] **Step 3: Schema** — `shared/schema.ts` after `userObjects`:

```ts
// Privileged actions (users API, logins). Written by server/storage/audit.ts.
export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  actorId: integer("actor_id"),
  actorUsername: text("actor_username").notNull(),
  ip: text("ip"),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: integer("target_id"),
  details: jsonb("details"),
});
export const insertAuditLogSchema = createInsertSchema(auditLog).omit({ id: true, at: true });
export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
```
(`insertAuditLogSchema` goes next to the other `createInsertSchema` calls near line 476 if the file groups them there.)

- [ ] **Step 4: Startup** — after the `session_epoch` ALTER:

```ts
    await db.execute(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id serial PRIMARY KEY,
        at timestamptz NOT NULL DEFAULT now(),
        actor_id integer,
        actor_username text NOT NULL,
        ip text,
        action text NOT NULL,
        target_type text,
        target_id integer,
        details jsonb
      )
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS audit_log_at_idx ON audit_log (at DESC)`);
```
Extend the log line with ` + audit_log`.

- [ ] **Step 5: Storage** — `server/storage/audit.ts`:

```ts
import { db, schema } from "../db";
import { desc } from "drizzle-orm";
import type { AuditLog, InsertAuditLog } from "@shared/schema";
import { describeError } from "../lib/errors";

export const auditStorage = {
  /** Fire-and-forget: an audit failure must never fail the action it records. */
  async logAudit(entry: InsertAuditLog): Promise<void> {
    try {
      await db.insert(schema.auditLog).values(entry);
    } catch (err) {
      console.error(`audit log write failed (${entry.action}): ${describeError(err)}`);
    }
  },

  async getAuditLog(limit: number): Promise<AuditLog[]> {
    return db.select().from(schema.auditLog).orderBy(desc(schema.auditLog.at), desc(schema.auditLog.id)).limit(limit);
  },
};
```
`server/storage/types.ts`: import `AuditLog, InsertAuditLog`; add section
```ts
  // Audit log
  logAudit(entry: InsertAuditLog): Promise<void>;
  getAuditLog(limit: number): Promise<AuditLog[]>;
```
`server/storage/index.ts`: import `auditStorage` and spread it into `storage`.

- [ ] **Step 6: Route** — `server/routes/audit.ts`:

```ts
import { Router } from "express";
import { storage } from "../storage";
import { requirePermission } from "../auth";
import { describeError } from "../lib/errors";

const router = Router();

router.get("/api/audit", requirePermission("users", "read"), async (req, res) => {
  try {
    const raw = Number(req.query.limit ?? 100);
    const limit = Number.isInteger(raw) && raw > 0 ? Math.min(raw, 500) : 100;
    res.json(await storage.getAuditLog(limit));
  } catch (error) {
    console.error(`audit route error: ${describeError(error)}`);
    res.status(500).json({ error: "internal error" });
  }
});

export default router;
```
`server/routes.ts`: `import auditRouter from "./routes/audit";` and `app.use(auditRouter);` right after `usersRouter`.

- [ ] **Step 7: Verify** — `npx vitest run` green; `npm run check` ≤ 49; restart dev server → startup log includes `audit_log`; logged in as admin: `curl -s -b <cookie> localhost:5000/api/audit` → `[]`; anonymous → 401; `data_analyst` → 403.

- [ ] **Step 8: Commit**

```bash
git add shared/schema.ts server/startup.ts server/storage/audit.ts server/storage/audit.test.ts server/storage/types.ts server/storage/index.ts server/routes/audit.ts server/routes.ts
git commit -m "feat(audit): audit_log table, storage and GET /api/audit

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Users API — race-free superadmin guard, epoch bumps, profile PATCH, 404 objects, audit calls, login audit

**Files:**
- Modify: `server/storage/users.ts`, `server/storage/types.ts`
- Modify: `server/routes/users.ts`
- Modify: `server/auth.ts` (`/api/login` success → audit)
- Test: `server/storage/users.test.ts` (new)

**Interfaces:**
- Consumes: `storage.bumpSessionEpoch` (Task 1), `storage.logAudit` (Task 4).
- Produces: `export class LastSuperadminError extends Error`, `export function removesLastSuperadmin(target: Pick<User,'id'|'role'|'active'>, patch: Partial<Pick<InsertUser,'role'|'active'>>, activeSuperadminIds: number[]): boolean`, `storage.updateUserGuarded(id: number, patch: Partial<InsertUser>): Promise<User | undefined>` (throws `LastSuperadminError`).

- [ ] **Step 1: Failing test** — `server/storage/users.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
vi.mock('../db', () => ({ db: {}, schema: {} }));
import { removesLastSuperadmin } from './users';

const admin = { id: 1, role: 'superadmin', active: true } as const;

describe('removesLastSuperadmin', () => {
  it('blocks demoting the only active superadmin', () => {
    expect(removesLastSuperadmin(admin, { role: 'staff' }, [1])).toBe(true);
  });
  it('blocks deactivating the only active superadmin', () => {
    expect(removesLastSuperadmin(admin, { active: false }, [1])).toBe(true);
  });
  it('allows it when another active superadmin exists', () => {
    expect(removesLastSuperadmin(admin, { role: 'staff' }, [1, 4])).toBe(false);
  });
  it('ignores an already-inactive superadmin (was an over-strict 409)', () => {
    expect(removesLastSuperadmin({ ...admin, active: false }, { role: 'staff' }, [4])).toBe(false);
  });
  it('ignores patches that keep the role and activity', () => {
    expect(removesLastSuperadmin(admin, { role: 'superadmin', active: true }, [1])).toBe(false);
    expect(removesLastSuperadmin(admin, {}, [1])).toBe(false);
  });
  it('ignores non-superadmin targets', () => {
    expect(removesLastSuperadmin({ id: 2, role: 'staff', active: true }, { active: false }, [1])).toBe(false);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run server/storage/users.test.ts` — FAIL.

- [ ] **Step 3: storage/users.ts** — add:

```ts
export class LastSuperadminError extends Error {
  constructor() { super("Нельзя убрать последнего активного суперадмина"); this.name = "LastSuperadminError"; }
}

/** Pure decision used inside the guarded update; exported for tests. */
export function removesLastSuperadmin(
  target: Pick<User, "id" | "role" | "active">,
  patch: Partial<Pick<InsertUser, "role" | "active">>,
  activeSuperadminIds: number[],
): boolean {
  if (target.role !== "superadmin" || !target.active) return false;
  const losesRole = patch.role !== undefined && patch.role !== "superadmin";
  const losesActive = patch.active === false;
  if (!losesRole && !losesActive) return false;
  return activeSuperadminIds.filter(id => id !== target.id).length === 0;
}
```
and to `usersStorage`:
```ts
  /**
   * Update with the "last active superadmin" invariant enforced inside one
   * transaction: the active superadmin rows are locked FOR UPDATE, so two
   * concurrent demotions cannot both pass the count check.
   */
  async updateUserGuarded(id: number, patch: Partial<InsertUser>): Promise<User | undefined> {
    return db.transaction(async tx => {
      const locked = await tx.execute(sql`SELECT id FROM users WHERE role = 'superadmin' AND active FOR UPDATE`);
      const activeIds = ((locked as { rows?: Array<{ id: number | string }> }).rows ?? []).map(r => Number(r.id));
      const [target] = await tx.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
      if (!target) return undefined;
      if (removesLastSuperadmin(target, patch, activeIds)) throw new LastSuperadminError();
      const [updated] = await tx.update(schema.users).set({ ...patch, updatedAt: new Date() }).where(eq(schema.users.id, id)).returning();
      return updated;
    });
  },
```
`types.ts`: `updateUserGuarded(id: number, patch: Partial<InsertUser>): Promise<User | undefined>;`

- [ ] **Step 4: routes/users.ts** — rewrite the PATCH, password and GET-objects handlers:

```ts
import { LastSuperadminError } from "../storage/users";

const patchSchema = z.object({
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
  organization: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
});

const actorOf = (req: { user?: unknown; ip?: string }) => {
  const me = req.user as User;
  return { actorId: me.id, actorUsername: me.username, ip: req.ip ?? null };
};
```
(`patchSchema` already has these fields — keep as is; the change is that the client now sends them.)

POST `/api/users` after `createUser`: `void storage.logAudit({ ...actorOf(req), action: "user.create", targetType: "user", targetId: user.id, details: { username: user.username, role: user.role } });`

PATCH:
```ts
    const me = req.user as User;
    const target = await storage.getUser(id);
    if (!target) return res.status(404).json({ error: "not found" });
    const selfLockout = id === me.id && ((parsed.data.role !== undefined && parsed.data.role !== "superadmin") || parsed.data.active === false);
    if (selfLockout) return res.status(409).json({ error: "Нельзя убрать последнего активного суперадмина" });
    if (parsed.data.email && parsed.data.email.toLowerCase() !== target.email.toLowerCase()) {
      const clash = await storage.getUserByEmail(parsed.data.email);
      if (clash && clash.id !== id) return res.status(409).json({ error: "Email уже используется" });
    }
    let updated: User | undefined;
    try {
      updated = await storage.updateUserGuarded(id, parsed.data);
    } catch (e) {
      if (e instanceof LastSuperadminError) return res.status(409).json({ error: e.message });
      throw e;
    }
    if (!updated) return res.status(404).json({ error: "not found" });
    if (parsed.data.active === false && target.active) updated = (await storage.bumpSessionEpoch(id)) ?? updated;
    void storage.logAudit({ ...actorOf(req), action: "user.update", targetType: "user", targetId: id, details: parsed.data });
    res.json(safe(updated));
```
Password:
```ts
    const target = await storage.getUser(id);
    if (!target) return res.status(404).json({ error: "not found" });
    await storage.updateUser(id, { password: await hashPassword(parsed.data.password) });
    const fresh = await storage.bumpSessionEpoch(id);
    void storage.logAudit({ ...actorOf(req), action: "user.password_reset", targetType: "user", targetId: id });
    const me = req.user as User;
    if (fresh && me.id === id) {
      // Own password: keep this session alive under the new epoch.
      return req.login(fresh, (err) => (err ? res.status(500).json({ error: "internal error" }) : res.sendStatus(204)));
    }
    res.sendStatus(204);
```
GET objects: after `idOf` check add `if (!(await storage.getUser(id))) return res.status(404).json({ error: "not found" });`
PUT objects: after `setUserObjects` add `void storage.logAudit({ ...actorOf(req), action: "user.objects_set", targetType: "user", targetId: id, details: { objectIds } });`

- [ ] **Step 5: auth.ts login audit** — inside `/api/login` after `loginLimiter.reset(key)`:

```ts
          void storage.logAudit({ actorId: user.id, actorUsername: user.username, ip: req.ip ?? null, action: "auth.login" });
```

- [ ] **Step 6: Verify** — `npx vitest run` green; `npm run check` ≤ 49. Runtime (tunnel, dev server, logged in as `admin`, `$C` = cookie jar):
  - `curl -s -b $C -X PATCH localhost:5000/api/users/1 -H 'content-type: application/json' -d '{"role":"staff"}'` → 409 (self).
  - Deactivate superadmin id 5 (`administrator`) then try to demote id 4 while only 1 is left active → 409; re-activate 5.
  - `curl -s -b $C localhost:5000/api/users/999/objects` → 404.
  - Reset password of test user id 8 → 204; `GET /api/audit` lists `user.password_reset` and `auth.login`.
  - Open a second browser session as `t_designer` (re-activate id 8 first, set password), reset their password from the admin tab → the second tab's next `/api/user` returns 401.

- [ ] **Step 7: Commit**

```bash
git add server/storage/users.ts server/storage/users.test.ts server/storage/types.ts server/routes/users.ts server/auth.ts
git commit -m "fix(users): transactional last-superadmin guard, session epoch bumps, 404 on unknown user objects, audit entries

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Client — `/admin/users` split, `apiJson`, Edit dialog, Create validation, audit block

**Files:**
- Modify: `client/src/lib/queryClient.ts` (add `apiJson`)
- Modify: `client/src/pages/admin/Users.tsx` (table only)
- Create: `client/src/pages/admin/users/shared.tsx`, `CreateDialog.tsx`, `EditDialog.tsx`, `PasswordDialog.tsx`, `ObjectsDialog.tsx`, `AuditLog.tsx`
- Modify: `vitest.config.ts:14` (include `.test.tsx`)

**Interfaces:**
- Consumes: `PATCH /api/users/:id` profile fields, `GET /api/audit` (Tasks 4–5).
- Produces: `export async function apiJson<T = unknown>(method: string, url: string, body?: unknown): Promise<T>` in `client/src/lib/queryClient.ts`; `SafeUser`, `RoleSelect`, `invalidateUsers`, `useErrorToast` in `pages/admin/users/shared.tsx`.

- [ ] **Step 1: `apiJson`** — append to `client/src/lib/queryClient.ts`:

```ts
/** JSON request that surfaces the server's `{ error }` message; 204 → null. */
export async function apiJson<T = unknown>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: { Accept: "application/json", ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.status === 204 ? (null as T) : ((await res.json()) as T);
}
```

- [ ] **Step 2: `shared.tsx`**:

```tsx
import { FC } from "react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLES, ROLE_LABELS, type Role } from "@shared/permissions";
import type { User } from "@shared/schema";

export type SafeUser = Omit<User, "password">;

export const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ["/api/users"] });

export function useErrorToast() {
  const { toast } = useToast();
  return (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" });
}

export const RoleSelect: FC<{ value: Role; onChange: (r: Role) => void }> = ({ value, onChange }) => (
  <Select value={value} onValueChange={v => onChange(v as Role)}>
    <SelectTrigger><SelectValue /></SelectTrigger>
    <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
  </Select>
);
```

- [ ] **Step 3: `CreateDialog.tsx`** — move the existing component; use `apiJson("POST", "/api/users", f)`, `useErrorToast`, `invalidateUsers`; add validation before mutate:

```tsx
const validate = (f: typeof initialCreateForm): string | null => {
  if (f.username.trim().length < 3) return "Логин: минимум 3 символа";
  if (!f.fullName.trim()) return "Укажите ФИО";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return "Некорректный email";
  if (f.password.length < 8) return "Пароль: минимум 8 символов";
  return null;
};
```
state `const [formError, setFormError] = useState<string | null>(null);`; the button handler: `const err = validate(f); if (err) return setFormError(err); setFormError(null); m.mutate();`; render `{formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}` above the footer. Send `organization: f.organization || null`.

- [ ] **Step 4: `EditDialog.tsx`** (spec §4 «Изменить»):

```tsx
import { FC, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiJson } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Role } from "@shared/permissions";
import { RoleSelect, invalidateUsers, useErrorToast, type SafeUser } from "./shared";

type Form = { fullName: string; email: string; organization: string; jobTitle: string; contactPhone: string; role: Role; active: boolean };
const fromUser = (u: SafeUser): Form => ({
  fullName: u.fullName, email: u.email, organization: u.organization ?? "", jobTitle: u.jobTitle ?? "",
  contactPhone: u.contactPhone ?? "", role: u.role as Role, active: u.active,
});

export const EditDialog: FC<{ user: SafeUser | null; onClose: () => void }> = ({ user, onClose }) => {
  const { toast } = useToast();
  const onError = useErrorToast();
  const [f, setF] = useState<Form | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  useEffect(() => { setF(user ? fromUser(user) : null); setFormError(null); }, [user]);
  const m = useMutation({
    mutationFn: (body: Form) => apiJson("PATCH", `/api/users/${user!.id}`, {
      ...body, organization: body.organization || null, jobTitle: body.jobTitle || null, contactPhone: body.contactPhone || null,
    }),
    onSuccess: () => { invalidateUsers(); onClose(); toast({ title: "Пользователь обновлён" }); },
    onError,
  });
  if (!f) return null;
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = () => {
    if (!f.fullName.trim()) return setFormError("Укажите ФИО");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return setFormError("Некорректный email");
    setFormError(null); m.mutate(f);
  };
  return (
    <Dialog open={!!user} onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Изменить — {user?.username}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>ФИО</Label><Input value={f.fullName} onChange={set("fullName")} /></div>
          <div><Label>Email</Label><Input type="email" value={f.email} onChange={set("email")} /></div>
          <div><Label>Организация</Label><Input value={f.organization} onChange={set("organization")} /></div>
          <div><Label>Должность</Label><Input value={f.jobTitle} onChange={set("jobTitle")} /></div>
          <div><Label>Телефон</Label><Input value={f.contactPhone} onChange={set("contactPhone")} /></div>
          <div><Label>Роль</Label><RoleSelect value={f.role} onChange={role => setF({ ...f, role })} /></div>
          <div className="flex items-center gap-2"><Switch checked={f.active} onCheckedChange={active => setF({ ...f, active })} /><Label>Активен</Label></div>
          {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
        </div>
        <DialogFooter><Button onClick={submit} disabled={m.isPending}>Сохранить</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 5: `PasswordDialog.tsx`, `ObjectsDialog.tsx`** — move the existing components unchanged except: `send` → `apiJson`, `invalidate` → `invalidateUsers`, error toast → `useErrorToast()`. Named exports `PasswordDialog`, `ObjectsDialog`.

- [ ] **Step 6: `AuditLog.tsx`**:

```tsx
import { FC, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AuditLog as AuditRow } from "@shared/schema";

const ACTION_LABELS: Record<string, string> = {
  "user.create": "Создание пользователя", "user.update": "Изменение пользователя",
  "user.password_reset": "Сброс пароля", "user.objects_set": "Привязка объектов", "auth.login": "Вход",
};

export const AuditLog: FC = () => {
  const [open, setOpen] = useState(false);
  const { data: rows = [], isLoading } = useQuery<AuditRow[]>({ queryKey: ["/api/audit?limit=50"], enabled: open });
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Журнал действий</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setOpen(o => !o)}>{open ? "Скрыть" : "Показать"}</Button>
      </CardHeader>
      {open && (
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Загрузка…</p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">Записей нет</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Время</TableHead><TableHead>Кто</TableHead><TableHead>Действие</TableHead><TableHead>Цель</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{new Date(r.at).toLocaleString("ru-RU")}</TableCell>
                    <TableCell className="font-mono text-xs">{r.actorUsername}</TableCell>
                    <TableCell>{ACTION_LABELS[r.action] ?? r.action}</TableCell>
                    <TableCell>{r.targetType ? `${r.targetType} #${r.targetId}` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      )}
    </Card>
  );
};
```
Check the query-key convention: the default `queryFn` fetches `queryKey[0]` as URL, so `"/api/audit?limit=50"` works.

- [ ] **Step 7: `Users.tsx`** — keep only the table: imports from `./users/shared`, `./users/CreateDialog` etc.; add state `editUser` and an «Изменить» button per row before «Пароль»; the inline `RoleSelect`/`Switch` in the row stay (quick edits) and use `apiJson("PATCH", …)`; render `<EditDialog user={editUser} onClose={() => setEditUser(null)} />` and `<AuditLog />` below the users card. Remove the local `send`, `invalidate`, `RoleSelect`, `SafeUser`.

- [ ] **Step 8: `vitest.config.ts`** — `include: ["client/src/**/*.test.{ts,tsx}", "shared/**/*.test.{ts,tsx}", "server/**/*.test.ts"]`.

- [ ] **Step 9: Verify** — `npm run check` ≤ 49 (new files must be clean); `npx vitest run` green; browser panel as `admin` on `/admin/users`: create with empty email → inline error, no request; «Изменить» on `t_designer` → change organization, save → row updates; «Журнал действий» → shows `user.update` on top; a 409 (demote yourself) shows the server message in the toast, not `409: {...}`.

- [ ] **Step 10: Commit**

```bash
git add client/src/lib/queryClient.ts client/src/pages/admin/Users.tsx client/src/pages/admin/users vitest.config.ts
git commit -m "feat(admin): edit dialog, create validation, audit log block; split /admin/users into per-dialog files

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Login form — own validation, accessible error

**Files:**
- Modify: `client/src/pages/auth-page.tsx:20-24, 52-58`

- [ ] **Step 1: Edit** — add `const [formError, setFormError] = useState<string | null>(null);`; `submit`:

```tsx
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) { setFormError("Введите логин и пароль"); return; }
    setFormError(null);
    loginMutation.mutate({ username: username.trim(), password });
  };
```
Remove `required` from both inputs; replace the error line with:
```tsx
            {(formError || loginMutation.isError) && (
              <p role="alert" className="text-sm text-red-400">{formError ?? loginMutation.error?.message}</p>
            )}
```

- [ ] **Step 2: Verify** — browser panel `/auth`: empty submit → «Введите логин и пароль», no network call; wrong password → server message; `ADMIN` + correct password → logs in (case-insensitive, Task 2).

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/auth-page.tsx
git commit -m "fix(auth-page): localized required-field check and role=alert on the error

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Safety test, storage comments, docs

**Files:**
- Modify: `shared/permissions.test.ts`
- Modify: `server/storage/sensors.ts:56`, `server/storage/calculations.ts:18`, `server/storage/stations.ts:59,65`
- Modify: `README.md:141`, `CLAUDE.md` («Известные проблемы», architecture map, commands)

- [ ] **Step 1: Failing test** — append to `shared/permissions.test.ts`:

```ts
describe('unscoped detail getters stay safe', () => {
  // server/storage getSensor / getSeismicCalculation / getStation take no ObjectScope;
  // that is only safe while the one scoped role (staff) has no access to these modules.
  it('staff has none on sensors, stations and calculation modules', () => {
    for (const m of ['sensors', 'stations', 'spectral', 'mtsm', 'calibration'] as const) {
      expect(`staff.${m}=${PERMISSIONS.staff[m]}`).toBe(`staff.${m}=none`);
    }
  });
});
```
Run `npx vitest run shared/permissions.test.ts` — PASS immediately (guard test); keep it.

- [ ] **Step 2: Comments** — above each of the three getters add:

```ts
  // Unscoped on purpose: the only scoped role (staff) has `none` on this module
  // (shared/permissions.test.ts guards that). Add a `scope` parameter before
  // granting staff any access here.
```

- [ ] **Step 3: README** — replace the `migrate:roles` sentence with:

```
Для БД, созданных до миграции 0006 (роли): `npm run migrate:roles` один раз конвертирует старые роли
в шесть новых и перехэширует пароли, хранившиеся открытым текстом. Повторный запуск безопасен.
Кнопка «Войти как dev» на `/auth` и `POST /api/dev-login` существуют только при `NODE_ENV=development`.
```

- [ ] **Step 4: CLAUDE.md** — «Известные проблемы»: replace the «Безопасность» bullet with
`- Безопасность: лимитер попыток входа (server/auth.ts) — в памяти процесса; осознанно, пока один инстанс. Аудит-лог пишет только users API и успешные логины.`
Architecture map: add `server/storage/audit.ts` to the storage line, `audit` to the routes list, `client/src/pages/admin/users/` under pages; `npm test` line → `vitest: lib/numeric, shared/permissions, server/auth|ws|storage`. «Роли» convention line: add `/ws принимает только запросы с валидной сессией (server/ws.ts authorizeUpgrade)`.

- [ ] **Step 5: Verify** — `npx vitest run` green (count reported); `npm run check` ≤ 49.

- [ ] **Step 6: Commit**

```bash
git add shared/permissions.test.ts server/storage/sensors.ts server/storage/calculations.ts server/storage/stations.ts README.md CLAUDE.md
git commit -m "docs: roles polish — guard test for unscoped getters, README/CLAUDE.md updates

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Final verification (controller, after Task 8)

- `npx vitest run` — all green; `npm run check` — ≤ 49; `npm run build` — passes.
- Browser panel (tunnel + dev server): anonymous `/ws` → 401; `admin` home page WS live; `t_staff` (re-activate, bind one object) sees only its stations in `STATION_STATUS`; second-tab logout on password reset; `/admin/users` edit + audit; `ADMIN` login works.
- Deploy note for `docs/DEPLOY.md`: after this release every user logs in again (session payload format changed); no `DELETE FROM session` needed; no migration to run.
