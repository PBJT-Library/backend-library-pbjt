import { Elysia } from "elysia";
import { env } from "../config/env";

// Rate limiter storage
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const throttleStore = new Map<string, number>();

// Clean up old entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

/**
 * Rate Limiter Middleware
 * Blocks requests after exceeding the limit
 */
export const rateLimiter = (
  options: {
    duration?: number;
    max?: number;
    keyGenerator?: (request: Request) => string;
  } = {},
) => {
  const duration = options.duration || env.security.rateLimitDuration;
  const max = options.max || env.security.rateLimitMax;
  const keyGenerator =
    options.keyGenerator ||
    ((req: Request) => {
      const forwarded = req.headers.get("x-forwarded-for");
      const ip = forwarded?.split(",")[0]?.trim() || "unknown";
      return ip;
    });

  return new Elysia()
    .derive({ as: "local" }, ({ request }) => {
      return { request };
    })
    .onBeforeHandle({ as: "local" }, ({ request, set }) => {
      const key = keyGenerator(request);
      const now = Date.now();

      let entry = rateLimitStore.get(key);

      if (!entry || entry.resetTime < now) {
        entry = {
          count: 1,
          resetTime: now + duration,
        };
        rateLimitStore.set(key, entry);
        return;
      }

      entry.count++;

      if (entry.count > max) {
        set.status = 429;
        return {
          error: "Too Many Requests",
          message: `Rate limit exceeded. Try again in ${Math.ceil((entry.resetTime - now) / 1000)} seconds.`,
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        };
      }
    });
};

/**
 * Throttle Middleware
 * Adds progressive delay for high-frequency requests
 */
export const throttle = (
  options: {
    threshold?: number;
    delay?: number;
  } = {},
) => {
  const threshold = options.threshold || 10;
  const baseDelay = options.delay || 1000;

  return new Elysia()
    .derive({ as: "local" }, ({ request }) => {
      return { request };
    })
    .onBeforeHandle({ as: "local" }, async ({ request }) => {
      if (!env.security.enableThrottle) return;

      const forwarded = request.headers.get("x-forwarded-for");
      const ip = forwarded?.split(",")[0]?.trim() || "unknown";
      const now = Date.now();

      const lastRequest = throttleStore.get(ip) || 0;
      const timeSinceLastRequest = now - lastRequest;

      throttleStore.set(ip, now);

      // Progressive delay based on request frequency
      if (timeSinceLastRequest < 1000) {
        const requestCount = Math.floor(1000 / (timeSinceLastRequest + 1));
        if (requestCount > threshold) {
          const delay = Math.min(baseDelay * (requestCount - threshold), 5000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    });
};

/**
 * Security Headers Middleware
 * Adds basic security headers manually (since elysia-helmet might not work)
 */
export const securityHeaders = () => {
  return new Elysia().onAfterHandle({ as: "global" }, ({ set }) => {
    // Security headers
    if (!set.headers) set.headers = {};

    (set.headers as Record<string, string>)["X-Content-Type-Options"] =
      "nosniff";
    (set.headers as Record<string, string>)["X-Frame-Options"] = "DENY";
    (set.headers as Record<string, string>)["X-XSS-Protection"] =
      "1; mode=block";
    (set.headers as Record<string, string>)["Referrer-Policy"] =
      "strict-origin-when-cross-origin";

    // HSTS only in production
    if (env.app.env === "production") {
      (set.headers as Record<string, string>)["Strict-Transport-Security"] =
        "max-age=31536000; includeSubDomains";
    }
  });
};
