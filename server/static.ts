import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Production: serve the Vite build from dist/public (next to dist/index.js).
export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Vite puts a content hash in every /assets file name, so they can be cached
  // forever; index.html must always be revalidated so a new deploy is picked up.
  app.use(
    "/assets",
    express.static(path.join(distPath, "assets"), { maxAge: "1y", immutable: true, index: false }),
  );
  app.use(express.static(distPath, { index: false, maxAge: "1h" }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.set("Cache-Control", "no-cache");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
