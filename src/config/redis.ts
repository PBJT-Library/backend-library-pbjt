import Redis from 'ioredis';
import { env } from './env';

// DEV MODE: Set REDIS_ENABLED=false in .env to disable Redis for local development
// PRODUCTION: Redis is ENABLED by default (change from opt-in to opt-out for safety)
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false';

// Redis Configuration
const redisConfig = {
  host: env.redis?.host || 'localhost',
  port: env.redis?.port || 6379,
  password: env.redis?.password || undefined,
  db: env.redis?.db || 0,
  retryStrategy(times: number) {
    if (!REDIS_ENABLED) return null; // No retry if disabled
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
};

// Create Redis Client (or null if disabled)
export const redis = REDIS_ENABLED ? new Redis(redisConfig) : null;

// Redis Connection Events (only if enabled)
if (REDIS_ENABLED && redis) {
  redis.on('connect', () => {
    console.log('Redis: Connected');
  });

  redis.on('ready', () => {
    console.log('Redis: Ready to accept commands');
  });

  redis.on('error', (err) => {
    console.error('Redis Error:', err.message);
  });

  redis.on('close', () => {
    console.log('Redis: Connection closed');
  });

  redis.on('reconnecting', () => {
    console.log('Redis: Reconnecting...');
  });
} else {
  console.log('WARNING: Redis disabled for testing');
}

// Redis Helper Functions
export const redisHelper = {
  // Set cache with expiration (in seconds)
  async setCache(key: string, value: any, expireInSeconds: number = 3600) {
    if (!REDIS_ENABLED || !redis) return false;
    try {
      const serialized = JSON.stringify(value);
      await redis.setex(key, expireInSeconds, serialized);
      return true;
    } catch (error) {
      console.error('Redis setCache error:', error);
      return false;
    }
  },

  // Get cache
  async getCache(key: string) {
    if (!REDIS_ENABLED || !redis) return null;
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis getCache error:', error);
      return null;
    }
  },

  // Delete cache
  async deleteCache(key: string) {
    if (!REDIS_ENABLED || !redis) return false;
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Redis deleteCache error:', error);
      return false;
    }
  },

  // Delete cache by pattern (e.g., "books:*")
  async deleteCacheByPattern(pattern: string) {
    if (!REDIS_ENABLED || !redis) return 0;
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Redis deleteCacheByPattern error:', error);
      return 0;
    }
  },

  // Check if key exists
  async exists(key: string) {
    if (!REDIS_ENABLED || !redis) return false;
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  },

  // Get remaining TTL (Time To Live) in seconds
  async getTTL(key: string) {
    if (!REDIS_ENABLED || !redis) return -1;
    try {
      return await redis.ttl(key);
    } catch (error) {
      console.error('Redis getTTL error:', error);
      return -1;
    }
  },

  // Increment counter
  async increment(key: string, expireInSeconds?: number) {
    if (!REDIS_ENABLED || !redis) return 0;
    try {
      const value = await redis.incr(key);
      if (expireInSeconds && value === 1) {
        await redis.expire(key, expireInSeconds);
      }
      return value;
    } catch (error) {
      console.error('Redis increment error:', error);
      return 0;
    }
  },

  // Health check
  async healthCheck() {
    if (!REDIS_ENABLED || !redis) return false;
    try {
      const result = await redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis healthCheck error:', error);
      return false;
    }
  },
};

export default redis;
