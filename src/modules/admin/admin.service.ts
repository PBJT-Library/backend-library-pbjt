import bcrypt from "bcrypt";
import { LoginAdminDTO, AdminResponse, ChangePasswordDTO } from "./admin.model";
import { AppError } from "../../handler/error";
import { AdminRepository } from "./admin.repository";

export const AdminService = {
  async getAdminById(id: string): Promise<AdminResponse> {
    const admin = await AdminRepository.findById(id);

    if (!admin) {
      throw new AppError("Admin tidak ditemukan", 404);
    }

    return {
      id: admin.id,
      username: admin.username,
      token_version: admin.token_version,
      created_at: admin.created_at,
    };
  },

  async login(data: LoginAdminDTO): Promise<AdminResponse> {
    const admin = await AdminRepository.findByUsername(data.username);

    if (!admin) {
      throw new AppError("Akun tidak ditemukan", 404);
    }

    const isValid = await bcrypt.compare(data.password, admin.password);
    if (!isValid) {
      throw new AppError("Password salah", 401);
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
    const exists = await AdminRepository.findByUsername(data.username);

    if (exists) {
      throw new AppError("Username sudah digunakan", 409);
    }

    const hashedPassword = await this.hashPassword(data.password);

    const admin = await AdminRepository.create({
      username: data.username,
      password: hashedPassword,
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
    const existingAdmin = await AdminRepository.findById(id);

    if (!existingAdmin) {
      throw new AppError("Admin tidak ditemukan", 404);
    }

    // If no username update, return current data
    if (!data.username) {
      return {
        id: existingAdmin.id,
        username: existingAdmin.username,
        created_at: existingAdmin.created_at,
        token_version: existingAdmin.token_version,
      };
    }

    // Check if new username is already taken
    if (data.username !== existingAdmin.username) {
      const usernameTaken = await AdminRepository.findByUsername(data.username);

      if (usernameTaken) {
        throw new AppError("Username sudah digunakan", 409);
      }
    }

    // Update username
    const updated = await AdminRepository.updateUsername(id, data.username);
    return updated;
  },

  async changePassword(
    id: string,
    data: ChangePasswordDTO,
  ): Promise<{ message: string }> {
    // Get current admin with password
    const admin = await AdminRepository.findById(id);

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
    await AdminRepository.updatePassword(id, hashedNewPassword);

    return {
      message: "Password berhasil diubah, semua sesi telah dicabut",
    };
  },
};
