import { redis } from "../config/redis";

/**
 * JWT Token Blacklist & Revocation Utilities
 * Combines Redis blacklist with token versioning for robust revocation
 */

/**
 * Add token to blacklist (for immediate revocation)
 * Use when admin is deleted or emergency revocation needed
 */
export async function blacklistToken(tokenId: string, expiresInSeconds: number = 604800) {
    try {
        // ✅ SPRINT 0: Skip blacklist if Redis not available
        if (!redis) {
            console.warn(`[Token Blacklist] Redis not available, skipping blacklist for ${tokenId}`);
            return;
        }

        await redis.set(`blacklist:${tokenId}`, "1", "EX", expiresInSeconds);
        console.log(`[Token Blacklist] Token ${tokenId} blacklisted for ${expiresInSeconds}s`);
    } catch (error) {
        console.error("[Token Blacklist] Error blacklisting token:", error);
        // Don't throw - blacklist is secondary defense
    }
}

/**
 * Check if token is blacklisted
 */
export async function isTokenBlacklisted(tokenId: string): Promise<boolean> {
    try {
        // ✅ SPRINT 0: Fail open if Redis not available
        if (!redis) {
            return false;
        }

        const result = await redis.get(`blacklist:${tokenId}`);
        return result !== null;
    } catch (error) {
        console.error("[Token Blacklist] Error checking blacklist:", error);
        // Fail open - don't block on Redis errors
        return false;
    }
}

/**
 * Revoke all tokens for an admin (increment version)
 * Use on logout, password change, or admin update
 */
export async function revokeAllAdminTokens(adminId: string, db: any) {
    try {
        await db`
      UPDATE admins 
      SET token_version = token_version + 1 
      WHERE id = ${adminId}
    `;
        console.log(`[Token Revocation] All tokens revoked for admin ${adminId}`);
    } catch (error) {
        console.error("[Token Revocation] Error revoking tokens:", error);
        throw error;
    }
}

/**
 * Remove token from blacklist (cleanup, rarely needed)
 */
export async function removeFromBlacklist(tokenId: string) {
    try {
        // ✅ SPRINT 0: Skip if Redis not available
        if (!redis) {
            return;
        }

        await redis.del(`blacklist:${tokenId}`);
    } catch (error) {
        console.error("[Token Blacklist] Error removing from blacklist:", error);
    }
}
