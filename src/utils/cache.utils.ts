import { redisHelper } from "../config/redis";

/**
 * Cache Utilities with Built-in Error Handling
 * Use these helpers to avoid repetitive try-catch blocks in service files
 */

/**
 * Try to get data from cache with automatic error handling
 * Returns cached data or null if cache miss/error
 */
export async function tryGetCache<T>(cacheKey: string): Promise<T | null> {
  try {
    const cached = await redisHelper.getCache(cacheKey);
    if (cached) {
      console.log(`[Cache HIT] ${cacheKey}`);
      return cached as T;
    }
    console.log(`[Cache MISS] ${cacheKey} - Querying database...`);
    return null;
  } catch (error) {
    console.error(`Cache read error for ${cacheKey}:`, error);
    return null;
  }
}

/**
 * Try to set cache with automatic error handling
 * Silently fails if cache operation fails (non-blocking)
 */
export async function trySetCache<T>(
  cacheKey: string,
  data: T,
  ttl: number,
): Promise<void> {
  try {
    await redisHelper.setCache(cacheKey, data, ttl);
    console.log(`Cached ${cacheKey} for ${ttl / 60} minutes`);
  } catch (error) {
    console.error(`Cache write error for ${cacheKey}:`, error);
    // Non-blocking: continue even if cache fails
  }
}

/**
 * Try to delete specific cache key with error handling
 */
export async function tryDeleteCache(cacheKey: string): Promise<void> {
  try {
    await redisHelper.deleteCache(cacheKey);
    console.log(`Deleted cache: ${cacheKey}`);
  } catch (error) {
    console.error(`Cache delete error for ${cacheKey}:`, error);
  }
}

/**
 * Try to invalidate cache by pattern with error handling
 * Returns number of keys deleted (0 if error)
 */
export async function tryInvalidateCache(pattern: string): Promise<number> {
  try {
    const deleted = await redisHelper.deleteCacheByPattern(pattern);
    console.log(`Invalidated ${deleted} cache keys with pattern: ${pattern}`);
    return deleted;
  } catch (error) {
    console.error(`Cache invalidation error for ${pattern}:`, error);
    return 0;
  }
}

/**
 * Generic cache-aside pattern helper
 * Automatically handles cache get, DB query, and cache set
 *
 * Usage:
 * const books = await withCache("books:all", 300, () => BookRepository.findAll());
 */
export async function withCache<T>(
  cacheKey: string,
  ttl: number,
  fetchFn: () => Promise<T>,
): Promise<T> {
  // Try cache first
  const cached = await tryGetCache<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch from source
  const data = await fetchFn();

  // Save to cache (non-blocking)
  await trySetCache(cacheKey, data, ttl);

  return data;
}

/**
 * Batch cache invalidation helper
 * Invalidates multiple cache patterns at once
 *
 * Usage:
 * await invalidateMultiple("books:*", "loans:*");
 */
export async function invalidateMultiple(...patterns: string[]): Promise<void> {
  const promises = patterns.map((pattern) => tryInvalidateCache(pattern));
  await Promise.all(promises);
}
