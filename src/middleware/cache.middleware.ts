import { redis, redisHelper } from "../config/redis";

/**
 * Redis Middleware for Caching
 *
 * Usage:
 * .get("/books", cacheMiddleware("books:all", 300), handler)
 *
 * @param cacheKey - Unique key for this cache
 * @param ttl - Time to live in seconds (default: 300 = 5 minutes)
 */
export const cacheMiddleware = (cacheKey: string, ttl: number = 300) => {
  return async ({ request, set }: any) => {
    try {
      // Try to get from cache
      const cached = await redisHelper.getCache(cacheKey);

      if (cached) {
        console.log(`[Cache HIT] ${cacheKey}`);
        set.headers["X-Cache"] = "HIT";
        return cached;
      }

      console.log(`[Cache MISS] ${cacheKey}`);
      set.headers["X-Cache"] = "MISS";

      // If not in cache, proceed to handler
      // Handler will be responsible for caching the response
    } catch (error) {
      console.error("Cache middleware error:", error);
      // On error, just proceed without cache
    }
  };
};

/**
 * Invalidate cache by pattern
 * Useful after POST, PUT, DELETE operations
 *
 * Usage:
 * await invalidateCache("books:*")
 */
export const invalidateCache = async (pattern: string) => {
  try {
    const deleted = await redisHelper.deleteCacheByPattern(pattern);
    console.log(`Invalidated ${deleted} cache keys with pattern: ${pattern}`);
    return deleted;
  } catch (error) {
    console.error("Cache invalidation error:", error);
    return 0;
  }
};

/**
 * Cache Response Helper
 * Use this in your handlers to cache the response
 *
 * Usage:
 * const result = await db.query();
 * await cacheResponse("books:all", result, 300);
 * return result;
 */
export const cacheResponse = async (
  key: string,
  data: any,
  ttl: number = 300,
) => {
  try {
    await redisHelper.setCache(key, data, ttl);
    console.log(`Cached response: ${key} (TTL: ${ttl}s)`);
  } catch (error) {
    console.error("Cache response error:", error);
  }
};

/**
 * Dynamic Cache Key Generator
 * Useful for caching with parameters
 *
 * Usage:
 * const key = generateCacheKey("books", { category: "science", limit: 10 })
 * // Result: "books:category=science:limit=10"
 */
export const generateCacheKey = (
  prefix: string,
  params: Record<string, any> = {},
) => {
  const paramString = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${value}`)
    .join(":");

  return paramString ? `${prefix}:${paramString}` : prefix;
};

/**
 * Redis Health Check Middleware
 * Add this to your health check endpoint
 */
export const redisHealthCheck = async () => {
  try {
    // SPRINT 0: Handle redis null (if disabled)
    if (!redis) {
      return {
        status: "unhealthy" as const,
        connected: false,
        error: "Redis client not initialized",
      };
    }

    const isHealthy = await redisHelper.healthCheck();
    const info = await redis.info("server");
    const memory = await redis.info("memory");

    return {
      status: isHealthy ? ("healthy" as const) : ("unhealthy" as const),
      connected: redis.status === "ready",
      uptime: info.match(/uptime_in_seconds:(\d+)/)?.[1] || "unknown",
      memory: memory.match(/used_memory_human:([\d.]+[KMG])/)?.[1] || "unknown",
    };
  } catch (error) {
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
