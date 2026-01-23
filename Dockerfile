# Production Dockerfile for PBJT Library Backend
# ✅ CRITICAL FIX: Use Debian instead of Alpine for Prisma OpenSSL 1.1 compatibility
# Alpine 3.22+ removed openssl1.1-compat package, Debian stable still includes it
FROM oven/bun:1-debian AS base

WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Copy Prisma schema first for efficient layer caching
COPY prisma ./prisma

# ✅ PRISMA: Generate Prisma Client
RUN bunx prisma generate

# Copy source code
COPY . .

# ✅ SPRINT 3: Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# ✅ Run as non-root user
USER appuser

# Start application
CMD ["bun", "run", "src/app.ts"]
