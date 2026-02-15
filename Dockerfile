# CHECKION – Docker image for Coolify/self-hosted deployment.
# (No syntax directive to avoid Docker Hub TLS timeouts in restricted networks.)
# Build: docker build -t checkion .
# Run:   docker run -p 3333:3333 -e DATABASE_URL=... -e AUTH_SECRET=... checkion

ARG NODE_IMAGE=node:22-bookworm-slim

# ---- Base ----
FROM ${NODE_IMAGE} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ---- Design system (needed for file:../msqdx-design-system) ----
FROM base AS deps
# Clone and build msqdx-design-system so file:../msqdx-design-system resolves from /app
ARG DESIGN_SYSTEM_REPO=https://github.com/chbrdk/msqdx-design-system.git
RUN git clone --depth 1 ${DESIGN_SYSTEM_REPO} /msqdx-design-system \
    && cd /msqdx-design-system && npm install && npm run build

# Install app deps (design system is at /msqdx-design-system); need devDeps for build
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    (test -f package-lock.json && npm ci --ignore-scripts) || npm install --ignore-scripts

# ---- Builder ----
FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /msqdx-design-system /msqdx-design-system
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./
COPY . .

# Optional: use design system path for Next (turbopack alias in dev; build uses node_modules)
ENV DS_BASE=../msqdx-design-system

RUN npm run build

# ---- Runner ----
FROM ${NODE_IMAGE} AS runner
WORKDIR /app

# System Chromium + deps for Puppeteer (scanner runs in-process; no bundled Chrome in image)
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3333
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
EXPOSE 3333

# Copy built app and deps
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# For drizzle-kit push at startup (schema create/update)
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
RUN chmod +x ./scripts/docker-entrypoint.sh

CMD ["./scripts/docker-entrypoint.sh"]
