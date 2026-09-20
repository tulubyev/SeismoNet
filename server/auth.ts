import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction, RequestHandler } from "express";
import type { IncomingMessage } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { z } from "zod";
import { pool } from "./db";
import { storage, type Scope } from "./storage";
import { comparePasswords, dummyHash } from "./lib/password";
import { can, type Level, type Module } from "@shared/permissions";
import { User as SelectUser, SessionUser } from "@shared/schema";

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

const isProd = process.env.NODE_ENV === "production";
const isDev = process.env.NODE_ENV === "development";

// ─── Login rate limit: 5 failures per key per minute (in-memory, single process) ──
const LIMIT = 5, WINDOW_MS = 60_000, MAX_ENTRIES = 10_000;
const attempts = new Map<string, { count: number; since: number }>();

/** Drop every entry whose window has expired, so a flood of one-shot keys can't grow the map forever. */
function sweep(): void {
  const now = Date.now();
  attempts.forEach((a, k) => {
    if (now - a.since > WINDOW_MS) attempts.delete(k);
  });
}

export const loginLimiter = {
  check(key: string): boolean {
    const a = attempts.get(key);
    if (!a || Date.now() - a.since > WINDOW_MS) return true;
    return a.count < LIMIT;
  },
  fail(key: string): void {
    // Prune expired entries on every failure so a flood of one-shot keys
    // (e.g. nonexistent usernames, which skip scrypt and are cheap to mint)
    // can't grow the map without bound. MAX_ENTRIES is a hard backstop: if
    // failures somehow keep arriving faster than the window expires them,
    // drop the oldest tracking rather than grow forever.
    sweep();
    if (attempts.size >= MAX_ENTRIES) {
      const oldestKey = attempts.keys().next().value;
      if (oldestKey !== undefined) attempts.delete(oldestKey);
    }
    const a = attempts.get(key);
    if (!a || Date.now() - a.since > WINDOW_MS) attempts.set(key, { count: 1, since: Date.now() });
    else a.count++;
  },
  reset(key: string): void { attempts.delete(key); },
  _clear(): void { attempts.clear(); },
  /** Number of tracked keys — exposed for tests to verify the sweep actually removes stale entries. */
  _size(): number { return attempts.size; },
};

/**
 * Rate-limit key for a login attempt. Usernames are looked up case-insensitively
 * (`storage.getUserByUsername`), so the key must normalize the same way — otherwise
 * rotating the casing of one username (`admin`/`Admin`/`ADMIN`) mints a fresh bucket
 * per request and defeats the brute-force guard.
 */
export function limiterKey(ip: string | undefined, username: unknown): string {
  return `${ip}|${String(username ?? "").trim().toLowerCase()}`;
}

/** A deactivated account must not resurrect a session on the next request. */
export const activeOrFalse = (u?: SelectUser): SelectUser | false => (u && u.active ? u : false);

/**
 * A non-superadmin user's customer must exist and be active, or they are treated as
 * inactive: superadmin (global by design) and a user with no customer bypass the
 * check; anyone else is locked out the moment their customer is deactivated or
 * deleted, even mid-session (deserializeUser calls this on every request).
 */
export async function customerActiveOrFalse(user: SelectUser): Promise<SelectUser | false> {
  if (user.role === "superadmin" || user.customerId == null) return user;
  const c = await storage.getCustomer(user.customerId);
  return c && c.active ? user : false;
}

export type SessionPayload = { id: number; epoch: number };

/** Session payload → user, or false when the user is gone, inactive, or the epoch moved on. */
export function sessionUserFrom(payload: unknown, user: SelectUser | undefined): SelectUser | false {
  if (!payload || typeof payload !== "object") return false;
  const { id, epoch } = payload as Partial<SessionPayload>;
  if (typeof id !== "number" || typeof epoch !== "number") return false;
  const u = activeOrFalse(user);
  return u && u.id === id && u.sessionEpoch === epoch ? u : false;
}

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

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && isProd) {
    throw new Error("SESSION_SECRET must be set in production");
  }

  const PgStore = connectPgSimple(session);
  const store = isProd ? new PgStore({ pool, tableName: "session", createTableIfMissing: true }) : undefined;

  app.set("trust proxy", 1);
  sessionMiddleware = session({
    secret: sessionSecret ?? "seismonet-dev-only-secret",
    store,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", secure: isProd, maxAge: 24 * 60 * 60 * 1000 },
  });
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());
  app.use("/api", attachScope);

  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      const candidate = user && user.active ? await customerActiveOrFalse(user) : false;
      const ok = candidate
        ? await comparePasswords(password, candidate.password)
        : (await comparePasswords(password, await dummyHash), false);
      if (!ok || !candidate) return done(null, false, { message: "Неверный логин или пароль" });
      await storage.setLastLogin(candidate.id);
      return done(null, candidate);
    } catch (error) {
      return done(error);
    }
  }));

  passport.serializeUser<SessionPayload>((user, done) => done(null, { id: user.id, epoch: user.sessionEpoch }));
  passport.deserializeUser<SessionPayload>(async (payload: unknown, done) => {
    try {
      const id = (payload as Partial<SessionPayload>)?.id;
      const u = sessionUserFrom(payload, typeof id === "number" ? await storage.getUser(id) : undefined);
      done(null, u ? await customerActiveOrFalse(u) : false);
    } catch (error) { done(error, null); }
  });

  app.post("/api/login", (req, res, next) => {
    const key = limiterKey(req.ip, req.body?.username);
    if (!loginLimiter.check(key)) {
      return res.status(429).json({ error: "Слишком много попыток входа, подождите минуту" });
    }
    passport.authenticate("local", (err: unknown, user: SelectUser | false, info: { message?: string }) => {
      if (err) return next(err);
      if (!user) { loginLimiter.fail(key); return res.status(401).json({ error: info?.message || "Ошибка входа" }); }
      // New session id on every successful login — an attacker-fixated pre-login
      // session must not survive into the authenticated one.
      req.session.regenerate((regenErr) => {
        if (regenErr) return next(regenErr);
        req.login(user, async (loginErr) => {
          if (loginErr) return next(loginErr);
          loginLimiter.reset(key);
          req.session.customerId = undefined; // fresh choice per login
          void storage.logAudit({ actorId: user.id, actorUsername: user.username, ip: req.ip ?? null, action: "auth.login" });
          try {
            res.status(200).json(await sessionUserPayload(user, req.session));
          } catch (e) { next(e); }
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => { if (err) return next(err); res.sendStatus(200); });
  });

  app.get("/api/user", async (req, res, next) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    try {
      res.json(await sessionUserPayload(req.user as SelectUser, req.session));
    } catch (e) { next(e); }
  });

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

  // Development only: one-click login as a real DB user (default `admin`).
  if (isDev) {
    app.post("/api/dev-login", async (req, res, next) => {
      try {
        const username = process.env.DEV_LOGIN_USERNAME ?? "admin";
        const user = await storage.getUserByUsername(username);
        if (!user) return res.status(404).json({ error: `dev user '${username}' not found` });
        req.session.regenerate((regenErr) => {
          if (regenErr) return next(regenErr);
          req.login(user, (err) => {
            if (err) return next(err);
            req.session.customerId = undefined; // fresh choice per login
            sessionUserPayload(user, req.session).then(payload => res.json(payload), next);
          });
        });
      } catch (err) {
        next(err);
      }
    });
  }
}

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

/** Creating a tenant row needs a concrete customer; superadmin in "all" mode must pick one. */
export function requireCustomer(req: Request, res: Response): number | undefined {
  const id = scopeOf(req).customerId;
  if (id === null) { res.status(400).json({ error: "select_customer" }); return undefined; }
  return id;
}

/** /api/user payload: user (no password) + effective customer. */
export async function sessionUserPayload(user: SelectUser, session: { customerId?: number | null }): Promise<SessionUser> {
  const { password: _pw, ...safe } = user;
  const effectiveId = user.role === "superadmin" ? (session.customerId ?? null) : user.customerId;
  const c = effectiveId == null ? undefined : await storage.getCustomer(effectiveId);
  const customer = c ? { id: c.id, code: c.code, name: c.name, regionId: c.regionId } : null;
  return { ...safe, customer, customerScope: user.role === "superadmin" && effectiveId == null ? "all" : "one" };
}

/** 401 if anonymous, 403 if the role's access to `module` is below `level`. */
export function requirePermission(module: Module, level: Level): RequestHandler {
  return (req, res, next) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    const role = (req.user as SelectUser).role;
    if (!can(role, module, level)) return res.status(403).json({ error: "forbidden", module, level });
    next();
  };
}
