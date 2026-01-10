import { db } from "../../config/db";
import bcrypt from "bcrypt";
import { LoginAdminDTO, AdminResponse, ChangePasswordDTO } from "./admin.model";
import { AppError } from "../../handler/error";

export const AdminService = {
  async getAdminById(id: string): Promise<AdminResponse> {
    const result = await db<AdminResponse[]>`
       SELECT id, username, created_at
       FROM admins
       WHERE id = ${id}
      `;
    const admin = result[0];
    if (!admin) {
      throw new AppError("Admin tidak ditemukan", 404);
    }
    return admin;
  },

  async login(data: LoginAdminDTO): Promise<AdminResponse> {
    const result = await db<
      (Pick<AdminResponse, "id" | "username" | "created_at"> & {
        password: string;
      })[]
    >`
          SELECT id, username, password, created_at
          FROM admins
          WHERE username = ${data.username}
        `;

    const admin = result[0];
    if (!admin) {
      throw new AppError("Username atau password salah", 401);
    }

    const isValid = await bcrypt.compare(data.password, admin.password);
    if (!isValid) {
      throw new AppError("Username atau password salah", 401);
    }

    const { password: _, ...safeAdmin } = admin;
    return safeAdmin;
  },

  async register(data: {
    username: string;
    password: string;
  }): Promise<AdminResponse> {
    const exists = await db<{ id: string }[]>`
      SELECT id FROM admins WHERE username = ${data.username}
    `;

    if (exists.length > 0) {
      throw new AppError("Username sudah digunakan", 409);
    }

    const hashedPassword = await this.hashPassword(data.password);

    const result = await db<AdminResponse[]>`
          INSERT INTO admins (username, password)
          VALUES (
            ${data.username},
            ${hashedPassword}
          )
          RETURNING id, username, created_at
        `;
    return result[0];
  },

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  },

  async updateAdmin(
    id: string,
    data: Partial<{ username: string }>,
  ): Promise<AdminResponse> {
    const existingAdmin = await db<AdminResponse[]>`
      SELECT id, username, created_at
      FROM admins
      WHERE id = ${id}
    `;

    if (existingAdmin.length === 0) {
      throw new AppError("Admin tidak ditemukan", 404);
    }

    const currentAdmin = existingAdmin[0];

    if (data.username && data.username !== currentAdmin.username) {
      const usernameTaken = await db<{ id: string }[]>`
        SELECT id
        FROM admins
        WHERE username = ${data.username}
        AND id != ${id}
      `;

      if (usernameTaken.length > 0) {
        throw new AppError("Username sudah digunakan", 409);
      }
    }

    if (!data.username) {
      return currentAdmin;
    }

    if (data.username) {
      await db`
        UPDATE admins
        SET username = ${data.username}
        WHERE id = ${id}
      `;
    }
    return this.getAdminById(id);
  },

  async changePassword(
    id: string,
    data: ChangePasswordDTO,
  ): Promise<{ message: string }> {
    const changePasswordAdmin = await db<{ password: string }[]>`
      SELECT password
      FROM admins
      WHERE id = ${id}
    `;

    const admin = changePasswordAdmin[0];
    if (!admin) {
      throw new AppError("Admin tidak ditemukan", 404);
    }

    const isValid = await bcrypt.compare(data.currentPassword, admin.password);
    if (!isValid) {
      throw new AppError("Password lama salah", 401);
    }

    const isSamePassword = await bcrypt.compare(
      data.newPassword,
      admin.password,
    );
    if (isSamePassword) {
      throw new AppError("Password tidak boleh sama dengan yang lama", 400);
    }

    const hashedNewPassword = await this.hashPassword(data.newPassword);

    await db`
      UPDATE admins
      SET password = ${hashedNewPassword}
      WHERE id = ${id}
    `;

    return {
      message: "Password berhasil diubah",
    };
  },
};
