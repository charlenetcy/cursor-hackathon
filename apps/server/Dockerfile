# syntax=docker/dockerfile:1

# ---- Base builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install build tooling
RUN apk add --no-cache python3 make g++

# Copy monorepo manifests to leverage Docker cache
COPY package*.json ./
COPY shared/package.json ./shared/package.json
COPY apps/server/package.json ./apps/server/package.json

# Install root deps (for workspace hoisting) and server deps
RUN npm install

# Copy source
COPY shared ./shared
COPY apps/server ./apps/server

# Build shared then server
RUN npm run --workspace shared build && npm run --workspace @cursor-hackathon/server build

# ---- Runtime ----
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Copy only runtime artifacts
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/node_modules ./node_modules
COPY --from=builder /app/shared/package.json ./shared/package.json
COPY --from=builder /app/shared/dist ./shared/dist

# Expose Heroku dyno port
ENV PORT=3001
EXPOSE 3001

CMD ["node", "dist/index.js"]


