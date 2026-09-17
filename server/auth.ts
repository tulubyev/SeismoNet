import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction, RequestHandler } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { storage, type ObjectScope } from "./storage";
import { comparePasswords } from "./lib/password";
import { can, type Level, type Module } from "@shared/permissions";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
    interface Request { objectScope?: ObjectScope }
  }
}

const isProd = process.env.NODE_ENV === "production";
const isDev = process.env.NODE_ENV === "development";

// ─── Login rate limit: 5 failures per key per minute (in-memory, single process) ──
const LIMIT = 5, WINDOW_MS = 60_000;
const attempts = new Map<string, { count: number; since: number }>();
export const loginLimiter = {
  check(key: string): boolean {
    const a = attempts.get(key);
    if (!a || Date.now() - a.since > WINDOW_MS) return true;
    return a.count < LIMIT;
  },
  fail(key: string): void {
    const a = attempts.get(key);
    if (!a || Date.now() - a.since > WINDOW_MS) attempts.set(key, { count: 1, since: Date.now() });
    else a.count++;
  },
  reset(key: string): void { attempts.delete(key); },
  _clear(): void { attempts.clear(); },
};

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && isProd) {
    throw new Error("SESSION_SECRET must be set in production");
  }

  const PgStore = connectPgSimple(session);
  const store = isProd ? new PgStore({ pool, tableName: "session", createTableIfMissing: true }) : undefined;

  app.set("trust proxy", 1);
  app.use(session({
    secret: sessionSecret ?? "seismonet-dev-only-secret",
    store,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", secure: isProd, maxAge: 24 * 60 * 60 * 1000 },
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(attachObjectScope);

  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user || !user.active) return done(null, false, { message: "Неверный логин или пароль" });
      if (!(await comparePasswords(password, user.password))) return done(null, false, { message: "Неверный логин или пароль" });
      await storage.setLastLogin(user.id);
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try { done(null, await storage.getUser(id)); } catch (error) { done(error, null); }
  });

  app.post("/api/login", (req, res, next) => {
    const key = `${req.ip}|${String(req.body?.username ?? "")}`;
    if (!loginLimiter.check(key)) {
      return res.status(429).json({ error: "Слишком много попыток входа, подождите минуту" });
    }
    passport.authenticate("local", (err: unknown, user: SelectUser | false, info: { message?: string }) => {
      if (err) return next(err);
      if (!user) { loginLimiter.fail(key); return res.status(401).json({ error: info?.message || "Ошибка входа" }); }
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        loginLimiter.reset(key);
        const { password: _pw, ...safe } = user;
        return res.status(200).json(safe);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => { if (err) return next(err); res.sendStatus(200); });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    const { password: _pw, ...safe } = req.user as SelectUser;
    res.json(safe);
  });

  // Development only: one-click login as a real DB user (default `admin`).
  if (isDev) {
    app.post("/api/dev-login", async (req, res, next) => {
      const username = process.env.DEV_LOGIN_USERNAME ?? "admin";
      const user = await storage.getUserByUsername(username);
      if (!user) return res.status(404).json({ error: `dev user '${username}' not found` });
      req.login(user, (err) => {
        if (err) return next(err);
        const { password: _pw, ...safe } = user;
        res.json(safe);
      });
    });
  }
}

/** For `staff`, restrict object-related queries to the user's bound objects. */
export async function attachObjectScope(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = req.user as SelectUser | undefined;
    req.objectScope = user?.role === "staff" ? { objectIds: await storage.getUserObjectIds(user.id) } : undefined;
    next();
  } catch (e) { next(e); }
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
