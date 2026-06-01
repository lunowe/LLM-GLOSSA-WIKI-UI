# syntax=docker/dockerfile:1

# ── Build stage ──────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Install deps from the lockfile (cached unless package*.json change).
COPY package.json package-lock.json ./
RUN npm ci

# Build the Nuxt app → self-contained .output (Nitro bundles its own deps).
COPY . .
RUN npm run build

# ── Runtime stage ────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Listen on all interfaces; Railway injects PORT, which Nitro honours.
ENV HOST=0.0.0.0
ENV PORT=3000

# Only the build output is needed at runtime — no node_modules, no source.
COPY --from=build /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
