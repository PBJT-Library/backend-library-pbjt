# Dockerfile untuk Backend Library
# Multi-stage build untuk efisiensi maksimal

# Stage 1: Dependencies
FROM oven/bun:1-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies only
RUN bun install --frozen-lockfile --production

# Stage 2: Builder (optional, untuk future build steps)
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Copy dependencies dari stage deps
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Stage 3: Runner (Production)
FROM oven/bun:1-alpine AS runner
WORKDIR /app

# Install dumb-init untuk proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user untuk security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S bunuser -u 1001

# Copy dependencies dan source code
COPY --from=deps --chown=bunuser:nodejs /app/node_modules ./node_modules
COPY --chown=bunuser:nodejs . .

# Set environment
ENV NODE_ENV=production \
    APP_PORT=3000

# Expose port
EXPOSE 3000

# Switch to non-root user
USER bunuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD bun run -e "fetch('http://localhost:3000/pbjt-library-api').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Use dumb-init untuk proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["bun", "run", "src/app.ts"]
