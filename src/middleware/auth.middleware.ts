import { AppError } from "../handler/error";
import { AdminService } from "../modules/admin/admin.service";
import { isTokenBlacklisted } from "../utils/token.utils";

export const authMiddleware = async ({ headers, jwt }: any) => {
  const authorization = headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    throw new AppError("Token tidak ditemukan", 401);
  }

  const token = authorization.split(" ")[1];
  const payload = await jwt.verify(token);

  if (!payload) {
    throw new AppError("Token tidak valid atau kadaluarsa", 401);
  }

  // Check if token is blacklisted (immediate revocation via Redis)
  if (payload.jti && await isTokenBlacklisted(payload.jti)) {
    throw new AppError("Token telah dicabut", 401);
  }

  // Get admin from database - PRIMARY SOURCE OF TRUTH
  const admin = await AdminService.getAdminById(payload.sub);

  if (!admin) {
    throw new AppError("Admin tidak ditemukan", 404);
  }

  // Check token version (revoke all tokens on logout/password change)
  if (payload.version !== undefined && admin.token_version !== payload.version) {
    throw new AppError("Token kadaluarsa, silakan login kembali", 401);
  }

  // SECURITY: Check role from DATABASE, not JWT payload
  // Never trust JWT claims for authorization - always verify against DB
  if (admin.role && admin.role !== "admin") {
    throw new AppError("Akses ditolak", 403);
  }

  return {
    admin,
  };
};
