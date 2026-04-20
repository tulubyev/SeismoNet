import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db, schema } from "./db";
import { sql } from "drizzle-orm";
import { NOTE_HISTORY_LIMIT } from "./storage";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes that are polled frequently — suppress 304 (Not Modified) noise
const SILENT_POLL_ROUTES = [
  '/api/earthquakes', '/api/networks', '/api/alerts',
  '/api/seismograms', '/api/stations', '/api/infrastructure-objects',
  '/api/user'
];

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Suppress 304 Not-Modified responses for high-frequency polling routes
      if (res.statusCode === 304 && SILENT_POLL_ROUTES.some(r => path.startsWith(r))) {
        return;
      }
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

async function trimNoteHistoryOnStartup() {
  try {
    // Find all calculationIds that have more than the allowed number of history entries
    const overLimit = await db.execute(sql`
      SELECT calculation_id
      FROM calculation_note_history
      GROUP BY calculation_id
      HAVING COUNT(*) > ${NOTE_HISTORY_LIMIT}
    `);

    if (overLimit.rows.length === 0) {
      log("note history cleanup: all calculations within limit, nothing to trim");
      return;
    }

    let trimmed = 0;
    for (const row of overLimit.rows) {
      const calcId = (row as { calculation_id: number }).calculation_id;

      // Fetch the IDs to keep (most recent 50 entries)
      const toKeep = await db.query.calculationNoteHistory.findMany({
        where: (t, { eq }) => eq(t.calculationId, calcId),
        orderBy: (t, { desc }) => [desc(t.editedAt), desc(t.id)],
        columns: { id: true },
        limit: NOTE_HISTORY_LIMIT,
      });

      const keepIds = toKeep.map(e => e.id);

      // Delete everything for this calculation that isn't in keepIds
      await db.delete(schema.calculationNoteHistory)
        .where(
          sql`${schema.calculationNoteHistory.calculationId} = ${calcId}
              AND ${schema.calculationNoteHistory.id} NOT IN ${sql`(${sql.join(keepIds.map(id => sql`${id}`), sql`, `)})`}`
        );

      trimmed++;
    }

    log(`note history cleanup: trimmed ${trimmed} calculation(s) to ${NOTE_HISTORY_LIMIT} entries`);
  } catch (err) {
    log(`note history cleanup error: ${err}`);
  }
}

(async () => {
  const server = await registerRoutes(app);

  await trimNoteHistoryOnStartup();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
