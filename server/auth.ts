import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Set a secure SESSION_SECRET from environment or use a default for development
  const sessionSecret = process.env.SESSION_SECRET || "seismic-network-dev-secret";
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Login attempt for user: ${username}`);
        
        const user = await storage.getUserByUsername(username);
        if (!user) {
          console.log(`User not found: ${username}`);
          return done(null, false, { message: "Incorrect username or password" });
        }
        
        console.log(`Found user: ${username}, active: ${user.active}, password: "${user.password}", entered password: "${password}"`);
        
        if (!user.active) {
          console.log(`User inactive: ${username}`);
          return done(null, false, { message: "Account is inactive" });
        }
        
        // For the first-time setup with plaintext passwords in the seed data
        // If the password doesn't contain a dot (indicating salt), compare directly
        const plainTextMatch = password === user.password;
        const hashMatch = user.password.includes(".") && await comparePasswords(password, user.password);
        const isValidPassword = plainTextMatch || hashMatch;
        
        console.log(`Password validation: plainText match: ${plainTextMatch}, hash match: ${hashMatch}, stored password: "${user.password}", entered password: "${password}"`);
        
        if (!isValidPassword) {
          console.log(`Invalid password for user: ${username}`);
          return done(null, false, { message: "Incorrect username or password" });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }

      // Hash the password before storing
      const hashedPassword = await hashPassword(req.body.password);
      
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        
        // Don't send the password back to the client
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: unknown, user: SelectUser | false, info: { message?: string }) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ error: info?.message || "Authentication failed" });
      
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Development auto-login: when not in production and no session exists,
  // return a superadmin dev user so login screen is skipped.
  const isDev = process.env.NODE_ENV !== "production";
  const DEV_USER = {
    id: 1, username: "dev_superadmin", fullName: "Dev SuperAdmin",
    email: "dev@seismonet.local", role: "administrator", active: true,
    organization: "ИЗК СО РАН", lastLogin: null as Date | null, createdAt: new Date(),
    updatedAt: new Date(), profileImage: null as string | null,
    phone: null as string | null, preferences: null as unknown
  };

  app.get("/api/user", (req, res) => {
    if (isDev && !req.isAuthenticated()) return res.json(DEV_USER);
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.json(userWithoutPassword);
  });
  
  // Role-based endpoint protection middleware
  app.get("/api/admin", requireRole("administrator"), (req, res) => {
    res.json({ message: "Admin access granted", user: req.user });
  });
  
  app.get("/api/user-info", requireRole(["administrator", "user"]), (req, res) => {
    res.json({ message: "User access granted", user: req.user });
  });
  
  
  // Update user role (admin only)
  app.patch("/api/users/:id/role", requireRole("administrator"), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { role } = req.body;
      
      if (!role || !['administrator', 'user', 'viewer'].includes(role)) {
        return res.status(400).json({ message: 'Valid role is required (administrator, user, or viewer)' });
      }
      
      console.log(`Updating user ID ${userId} to role: ${role}`);
      const updatedUser = await storage.updateUserRole(userId, role as 'administrator' | 'user' | 'viewer');
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ message: "User role updated successfully", user: updatedUser });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: 'Error updating user role' });
    }
  });
}

// Middleware to require a specific role or array of roles
export function requireRole(role: string | string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV !== 'production') return next();

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = req.user as SelectUser;
    const roles = Array.isArray(role) ? role : [role];
    
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    
    next();
  };
}