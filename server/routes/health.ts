import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { describeError } from "../lib/errors";

const router = Router();


// Startup DB tasks are deferred to after server.listen() — see server/index.ts

// Liveness/readiness probe for Docker/Traefik: checks the DB round-trip.
router.get("/api/health", async (_req, res) => {
  try {
    await db.execute(sql`select 1`);
    res.json({ status: "ok", db: "up", uptime: Math.round(process.uptime()) });
  } catch (err) {
    res.status(503).json({ status: "degraded", db: "down", error: describeError(err) });
  }
});

export default router;
