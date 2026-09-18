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
