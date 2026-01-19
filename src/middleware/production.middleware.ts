import { env } from "../config/env";

/**
 * Production Error Handler
 * Hides sensitive error information in production
 */
export function productionErrorHandler(error: Error, environment: string) {
    if (environment === "production") {
        // Don't expose internals in production
        return {
            error: "Internal server error",
            message: error.message || "An unexpected error occurred",
            timestamp: new Date().toISOString(),
        };
    } else {
        // Development: show full error details
        return {
            error: error.name,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
        };
    }
}
