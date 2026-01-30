import "dotenv/config";
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { bookRoute } from "./modules/books/book.route";
import { memberRoute } from "./modules/members/member.route";
import { loanRoute } from "./modules/loans/loan.route";
import { adminRoute } from "./modules/admin/admin.route";
import { categoryRoute } from "./modules/categories/category.route";
import { env } from "./config/env";
import swagger from "@elysiajs/swagger";
import {
  rateLimiter,
  throttle,
  securityHeaders,
} from "./middleware/security.middleware";
import { productionErrorHandler } from "./middleware/production.middleware";
import { swaggerAuth } from "./middleware/swagger-auth.middleware";
import { healthCheck } from "./utils/health.utils";

export const app = new Elysia()
  // Global Error Handler
  .onError(({ error, set }) => {
    console.error("[Error]", error);
    const errorResponse = productionErrorHandler(
      error as Error,
      env.app.env || "development",
    );
    set.status = (error as any).status || 500;
    return errorResponse;
  })
  // Swagger Basic Authentication
  .use(
    env.swagger.enabled
      ? swaggerAuth({
          username: env.swagger.username || "admin",
          password: env.swagger.password || "admin",
        })
      : new Elysia(),
  )
  // Swagger Documentation (Protected with Basic Auth)
  .use(
    env.swagger.enabled
      ? swagger({
          path: "/pbjt-library-api",
          documentation: {
            info: {
              title: "PBJT Library API",
              version: "1.0.0",
              description:
                "REST API untuk sistem perpustakaan Politeknik Baja Tegal. Digunakan untuk mengelola data buku, member, admin, serta transaksi peminjaman dan pengembalian buku.",
            },
          },
        })
      : new Elysia(),
  )
  // Security Headers
  .use(securityHeaders())
  // Global Rate Limiting
  .use(
    rateLimiter({
      duration: env.security.rateLimitDuration,
      max: env.security.rateLimitMax,
    }),
  )
  // Request Throttling
  .use(throttle())
  // CORS Configuration
  .use(
    cors({
      origin: (request) => {
        const origin = request.headers.get("origin");

        // In development, allow configured origins
        if (env.app.env !== "production") {
          // Allow requests without origin (like from Tauri)
          if (!origin) return true;
          // Check whitelist
          return env.security.allowedOrigins.some((allowed) =>
            origin.startsWith(allowed),
          );
        }

        // Production: stricter checks
        // Reject requests without origin header
        if (!origin) return false;

        // Check whitelist
        return env.security.allowedOrigins.some((allowed) =>
          origin.startsWith(allowed),
        );
      },
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      maxAge: 86400, // Cache preflight for 24 hours
    }),
  )
  // Root Route - API Information (Environment-aware)
  .get("/", () => {
    const baseResponse = {
      service: "PBJT Library API",
      version: "1.0.0",
      status: "operational",
    };

    //  SECURITY: Only show endpoints in development
    if (env.app.env !== "production") {
      return {
        ...baseResponse,
        endpoints: {
          health: "/health",
          documentation: "/pbjt-library-api",
          api: "/api/*",
        },
      };
    }

    // Production: minimal info only
    return baseResponse;
  })
  // Health Check Endpoint
  .get("/health", async () => {
    return await healthCheck();
  })
  // Admin routes with stricter rate limiting
  .use(
    rateLimiter({
      duration: env.security.rateLimitDuration,
      max: env.security.rateLimitAuthMax,
    }),
  )
  .use(adminRoute)
  // Regular routes
  .use(bookRoute)
  .use(memberRoute)
  .use(loanRoute)
  .use(categoryRoute)

  .listen(env.app.port, () => {
    console.log(`Server: http://localhost:${process.env.APP_PORT}`);
    console.log(
      `Swagger Docs: http://localhost:${process.env.APP_PORT}/pbjt-library-api`,
    );
    console.log(
      `Health Check: http://localhost:${process.env.APP_PORT}/health`,
    );
    console.log(
      `Security: Rate ${env.security.rateLimitMax}/${env.security.rateLimitDuration}ms | Auth ${env.security.rateLimitAuthMax}/${env.security.rateLimitDuration}ms | Throttle ${env.security.enableThrottle ? "ON" : "OFF"}`,
    );
  });
