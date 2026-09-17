import type { Express } from "express";
import { createServer, type Server } from "http";
import { scheduleEarthquakeSyncJob } from "./services/earthquakeApi";
import { scheduleJMAEarthquakeSyncJob } from "./services/jmaEarthquakeApi";
import { setupAuth } from "./auth";
import { attachWebSocket } from "./ws";
import healthRouter from "./routes/health";
import usersRouter from "./routes/users";
import stationsRouter from "./routes/stations";
import monitoringRouter from "./routes/monitoring";
import notificationsRouter from "./routes/notifications";
import earthquakesRouter from "./routes/earthquakes";
import infrastructureRouter from "./routes/infrastructure";
import developersRouter from "./routes/developers";
import calculationsRouter from "./routes/calculations";
import soilRouter from "./routes/soil";
import sensorsRouter from "./routes/sensors";
import normsRouter from "./routes/norms";
import seismogramsRouter from "./routes/seismograms";
import calibrationRouter from "./routes/calibration";
import analyticsRouter from "./routes/analytics";

export { runStartupMigrations, initializeResearchNetworks } from "./startup";
export { broadcastMessage } from "./ws";

// Routers keep their full "/api/..." paths and are mounted in the original
// registration order, so matching behaviour is unchanged.
export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.use(healthRouter);
  app.use(usersRouter);
  app.use(stationsRouter);
  app.use(monitoringRouter);
  app.use(notificationsRouter);
  app.use(earthquakesRouter);
  app.use(infrastructureRouter);
  app.use(developersRouter);
  app.use(calculationsRouter);
  app.use(soilRouter);
  app.use(sensorsRouter);
  app.use(normsRouter);
  app.use(seismogramsRouter);
  app.use(calibrationRouter);
  app.use(analyticsRouter);

  const httpServer = createServer(app);
  attachWebSocket(httpServer);

  // Periodic external-catalogue sync (every 30 minutes, first run immediately)
  scheduleEarthquakeSyncJob(30);
  scheduleJMAEarthquakeSyncJob(30);

  return httpServer;
}
