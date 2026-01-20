import prisma from "../../database/client";
import bcrypt from "bcrypt";
import { LoginAdminDTO, AdminResponse, ChangePasswordDTO } from "./admin.model";
import { AppError } from "../../handler/error";

export const AdminService = {
  async getAdminById(id: string): Promise<AdminResponse> {
    const admin = await prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        token_version: true,
        created_at: true,
      },
    });

    if (!admin) {
      throw new AppError("Admin tidak ditemukan", 404);
    }

    return admin;
  },

  async login(data: LoginAdminDTO): Promise<AdminResponse> {
    const admin = await prisma.admin.findUnique({
      where: { username: data.username },
    });

    if (!admin) {
      throw new AppError("Username atau password salah", 401);
    }

    const isValid = await bcrypt.compare(data.password, admin.password);
    if (!isValid) {
      throw new AppError("Username atau password salah", 401);
    }

    return {
      id: admin.id,
      username: admin.username,
      token_version: admin.token_version,
      created_at: admin.created_at,
    };
  },

  async register(data: {
    username: string;
    password: string;
  }): Promise<AdminResponse> {
    // Check if username exists
    const exists = await prisma.admin.findUnique({
      where: { username: data.username },
      select: { id: true },
    });

    if (exists) {
      throw new AppError("Username sudah digunakan", 409);
    }

    const hashedPassword = await this.hashPassword(data.password);

    const admin = await prisma.admin.create({
      data: {
        username: data.username,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        token_version: true,
        created_at: true,
      },
    });

    return admin;
  },

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  },

  async updateAdmin(
    id: string,
    data: Partial<{ username: string }>,
  ): Promise<AdminResponse> {
    // Check if admin exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        created_at: true,
        token_version: true,
      },
    });

    if (!existingAdmin) {
      throw new AppError("Admin tidak ditemukan", 404);
    }

    // If no username update, return current data
    if (!data.username) {
      return existingAdmin;
    }

    // Check if new username is already taken
    if (data.username !== existingAdmin.username) {
      const usernameTaken = await prisma.admin.findFirst({
        where: {
          username: data.username,
          id: { not: id },
        },
        select: { id: true },
      });

      if (usernameTaken) {
        throw new AppError("Username sudah digunakan", 409);
      }
    }

    // Update username
    const updated = await prisma.admin.update({
      where: { id },
      data: { username: data.username },
      select: {
        id: true,
        username: true,
        token_version: true,
        created_at: true,
      },
    });

    return updated;
  },

  async changePassword(
    id: string,
    data: ChangePasswordDTO,
  ): Promise<{ message: string }> {
    // Get current admin with password
    const admin = await prisma.admin.findUnique({
      where: { id },
      select: { password: true },
    });

    if (!admin) {
      throw new AppError("Admin tidak ditemukan", 404);
    }

    // Verify current password
    const isValid = await bcrypt.compare(data.currentPassword, admin.password);
    if (!isValid) {
      throw new AppError("Password lama salah", 401);
    }

    // Check if new password is same as old
    const isSamePassword = await bcrypt.compare(
      data.newPassword,
      admin.password,
    );
    if (isSamePassword) {
      throw new AppError("Password tidak boleh sama dengan yang lama", 400);
    }

    const hashedNewPassword = await this.hashPassword(data.newPassword);

    // Update password AND increment token version to revoke all existing tokens
    await prisma.admin.update({
      where: { id },
      data: {
        password: hashedNewPassword,
        token_version: {
          increment: 1,
        },
      },
    });

    return {
      message: "Password berhasil diubah, semua sesi telah dicabut",
    };
  },
};
