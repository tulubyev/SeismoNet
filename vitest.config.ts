import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  test: {
    root: import.meta.dirname,
    include: ["client/src/**/*.test.ts", "shared/**/*.test.ts", "server/**/*.test.ts"],
    environment: "node",
    // server/db.ts throws at import time without a connection string; pg.Pool
    // never connects until the first query, so any syntactically valid URL works.
    env: { DATABASE_URL: "postgres://test:test@127.0.0.1:1/test", NODE_ENV: "test" },
  },
});
