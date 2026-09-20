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
