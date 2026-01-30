import { redis, redisHelper } from "../config/redis";
import { db } from "../config/db";

/**
 * Health Check Utilities
 * Monitor backend, Redis, and database status
 */

export interface HealthCheckResponse {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  uptime: string;
  services: {
    redis: RedisHealth;
    database: DatabaseHealth;
  };
}

interface RedisHealth {
  status: "healthy" | "unhealthy";
  connected: boolean;
  uptime?: string;
  memory?: string;
  error?: string;
}

interface DatabaseHealth {
  status: "healthy" | "unhealthy";
  connected: boolean;
  error?: string;
}

/**
 * Check Redis health status
 */
async function checkRedisHealth(): Promise<RedisHealth> {
  try {
    // SPRINT 0: Handle redis null (if disabled)
    if (!redis) {
      return {
        status: "unhealthy",
        connected: false,
        error: "Redis client not initialized",
      };
    }

    const isHealthy = await redisHelper.healthCheck();

    if (!isHealthy) {
      return {
        status: "unhealthy",
        connected: false,
        error: "Redis not responding to PING",
      };
    }

    const info = await redis.info("server");
    const memory = await redis.info("memory");

    return {
      status: "healthy",
      connected: redis.status === "ready",
      uptime: info.match(/uptime_in_seconds:(\d+)/)?.[1] + "s" || "unknown",
      memory: memory.match(/used_memory_human:([\d.]+[KMG])/)?.[1] || "unknown",
    };
  } catch (error) {
    return {
      status: "unhealthy",
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check database health status
 */
async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  try {
    // Simple query to check connection
    await db`SELECT 1 as health_check`;

    return {
      status: "healthy",
      connected: true,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get backend uptime in human-readable format
 */
function getUptime(): string {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Main health check function
 */
export async function healthCheck(): Promise<HealthCheckResponse> {
  const [redisHealth, dbHealth] = await Promise.all([
    checkRedisHealth(),
    checkDatabaseHealth(),
  ]);

  const allHealthy =
    redisHealth.status === "healthy" && dbHealth.status === "healthy";
  const anyHealthy =
    redisHealth.status === "healthy" || dbHealth.status === "healthy";

  return {
    status: allHealthy ? "healthy" : anyHealthy ? "degraded" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptime: getUptime(),
    services: {
      redis: redisHealth,
      database: dbHealth,
    },
  };
}
