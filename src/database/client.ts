import { PrismaClient } from "../generated/client";

// ✅ SPRINT 0.3: Auto-compose DATABASE_URL from env vars if not set
// This prevents "Environment variable not found: DATABASE_URL" errors
const getDatabaseUrl = (): string => {
  // Use DATABASE_URL if provided
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Fallback: compose from individual DB_* vars
  const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env;

  if (!DB_USER || !DB_PASSWORD || !DB_HOST || !DB_PORT || !DB_NAME) {
    throw new Error(
      "Database configuration error: Either DATABASE_URL or all DB_* vars (DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME) must be set",
    );
  }

  return `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
};

// Singleton pattern for Prisma Client
let prisma: PrismaClient;

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const databaseUrl = getDatabaseUrl();

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: ["error", "warn"],
  });
} else {
  // In development, use global to prevent multiple instances
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
      log: ["query", "error", "warn"],
    });
  }
  prisma = global.prisma;
}

export default prisma;

// Graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
