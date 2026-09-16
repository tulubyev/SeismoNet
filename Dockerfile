# ── build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ── runtime stage ───────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=5000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
# server bundle (dist/index.js) + client static (dist/public)
COPY --from=build /app/dist ./dist
# migrations are applied by drizzle at startup only for ad-hoc columns; keep the
# SQL files so `drizzle-kit` can be run inside the container if ever needed
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/shared ./shared
COPY --from=build /app/drizzle.config.ts ./
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health >/dev/null || exit 1
CMD ["node", "dist/index.js"]
