import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requirePermission } from "../auth";
import { hashPassword } from "../lib/password";
import { describeError } from "../lib/errors";
import { insertUserSchema, type User } from "@shared/schema";
import { ROLES } from "@shared/permissions";

const router = Router();
const guard = (level: "read" | "write") => requirePermission("users", level);
const safe = ({ password: _pw, ...u }: User) => u;
const idOf = (raw: string) => { const n = Number(raw); return Number.isInteger(n) && n > 0 ? n : null; };

const PASSWORD = z.string().min(8).max(128);

const createSchema = insertUserSchema
  .pick({ organization: true, jobTitle: true, contactPhone: true })
  .extend({
    username: z.string().min(3).max(64),
    fullName: z.string().min(1),
    email: z.string().email(),
    password: PASSWORD,
    role: z.enum(ROLES),
  });

const patchSchema = z.object({
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
  organization: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
});

router.get("/api/users", guard("read"), async (_req, res) => {
  try {
    res.json((await storage.getUsers()).map(safe));
  } catch (error) {
    console.error(`users route error: ${describeError(error)}`);
    res.status(500).json({ error: "internal error" });
  }
});

router.post("/api/users", guard("write"), async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "validation", issues: parsed.error.issues });
    const { password, ...rest } = parsed.data;
    if (await storage.getUserByUsername(rest.username)) return res.status(409).json({ error: "Логин уже занят" });
    if (await storage.getUserByEmail(rest.email)) return res.status(409).json({ error: "Email уже используется" });
    const user = await storage.createUser({ ...rest, password: await hashPassword(password), active: true });
    res.status(201).json(safe(user));
  } catch (error) {
    console.error(`users route error: ${describeError(error)}`);
    res.status(500).json({ error: "internal error" });
  }
});

router.patch("/api/users/:id", guard("write"), async (req, res) => {
  try {
    const id = idOf(req.params.id);
    if (!id) return res.status(400).json({ error: "bad id" });
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "validation", issues: parsed.error.issues });
    const me = req.user as User;
    const target = await storage.getUser(id);
    if (!target) return res.status(404).json({ error: "not found" });

    // A superadmin may not lock themselves out, and the last superadmin stays one.
    const demoting = parsed.data.role !== undefined && parsed.data.role !== "superadmin" && target.role === "superadmin";
    const deactivating = parsed.data.active === false && target.role === "superadmin";
    if ((demoting || deactivating) && (id === me.id || (await storage.getUsers()).filter(u => u.role === "superadmin" && u.active).length <= 1)) {
      return res.status(409).json({ error: "Нельзя убрать последнего активного суперадмина" });
    }
    if (parsed.data.email && parsed.data.email !== target.email && (await storage.getUserByEmail(parsed.data.email))) {
      return res.status(409).json({ error: "Email уже используется" });
    }
    const updated = await storage.updateUser(id, parsed.data);
    if (!updated) return res.status(404).json({ error: "not found" });
    res.json(safe(updated));
  } catch (error) {
    console.error(`users route error: ${describeError(error)}`);
    res.status(500).json({ error: "internal error" });
  }
});

router.post("/api/users/:id/password", guard("write"), async (req, res) => {
  try {
    const id = idOf(req.params.id);
    const parsed = z.object({ password: PASSWORD }).safeParse(req.body);
    if (!id || !parsed.success) return res.status(400).json({ error: "validation" });
    if (!(await storage.getUser(id))) return res.status(404).json({ error: "not found" });
    await storage.updateUser(id, { password: await hashPassword(parsed.data.password) });
    res.sendStatus(204);
  } catch (error) {
    console.error(`users route error: ${describeError(error)}`);
    res.status(500).json({ error: "internal error" });
  }
});

router.get("/api/users/:id/objects", guard("read"), async (req, res) => {
  try {
    const id = idOf(req.params.id);
    if (!id) return res.status(400).json({ error: "bad id" });
    res.json(await storage.getUserObjectIds(id));
  } catch (error) {
    console.error(`users route error: ${describeError(error)}`);
    res.status(500).json({ error: "internal error" });
  }
});

router.put("/api/users/:id/objects", guard("write"), async (req, res) => {
  try {
    const id = idOf(req.params.id);
    const parsed = z.object({ objectIds: z.array(z.number().int().positive()) }).safeParse(req.body);
    if (!id || !parsed.success) return res.status(400).json({ error: "validation" });
    if (!(await storage.getUser(id))) return res.status(404).json({ error: "not found" });
    // De-duplicate and validate up front: an unknown id would otherwise surface
    // as an FK violation, i.e. a 500 for what is a client mistake.
    const objectIds = Array.from(new Set(parsed.data.objectIds));
    const known = new Set((await storage.getInfrastructureObjects()).map(o => o.id));
    if (objectIds.some(oid => !known.has(oid))) return res.status(400).json({ error: "unknown object id" });
    await storage.setUserObjects(id, objectIds);
    res.json(await storage.getUserObjectIds(id));
  } catch (error) {
    console.error(`users route error: ${describeError(error)}`);
    res.status(500).json({ error: "internal error" });
  }
});

export default router;
