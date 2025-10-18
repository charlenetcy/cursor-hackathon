# syntax=docker/dockerfile:1

# ---- Base builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install build tooling
RUN apk add --no-cache python3 make g++

# Copy server manifests
COPY package*.json ./

# Install deps (dev deps included for build)
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy server source
COPY . .

# Build server
RUN npm run build

# ---- Runtime ----
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Copy runtime artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production deps
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Expose Heroku dyno port
ENV PORT=3001
EXPOSE 3001

CMD ["node", "dist/index.js"]


