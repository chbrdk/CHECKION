# CHECKION MCP Server – Node 20, Streamable HTTP
# Build context MUST be mcp-server/ (so COPY sees package.json and src/).
# Coolify: Dockerfile path = mcp-server/Dockerfile, Build context = mcp-server (or ./mcp-server).
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 3100

CMD ["node", "dist/index.js"]
