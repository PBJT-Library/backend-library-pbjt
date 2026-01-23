# Production Dockerfile for PBJT Library Backend
FROM oven/bun:1.1.38-alpine AS base

# ✅ Install OpenSSL 1.1 for compatibility
# Alpine 3.19 is the last version with openssl1.1-compat package
RUN apk add --no-cache openssl1.1-compat

WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# ✅ Create non-root user for security
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
