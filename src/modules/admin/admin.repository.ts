import { db } from "../../config/db";
import type { Admin } from "../../types/database.types";

export interface CreateAdminDTO {
  username: string;
  password: string;
}

export const AdminRepository = {
  async findByUsername(username: string): Promise<Admin | null> {
    const result = await db`
      SELECT id, username, password, token_version, created_at, updated_at
      FROM admins
      WHERE username = ${username}
    `;
    return (result[0] as Admin) || null;
  },

  async findById(id: string): Promise<Admin | null> {
    const result = await db`
      SELECT id, username, password, token_version, created_at, updated_at
      FROM admins
      WHERE id = ${id}
    `;
    return (result[0] as Admin) || null;
  },

  async create(admin: CreateAdminDTO): Promise<Admin> {
    const result = await db`
      INSERT INTO admins (username, password)
      VALUES (${admin.username}, ${admin.password})
      RETURNING id, username, password, token_version, created_at, updated_at
    `;
    return result[0] as Admin;
  },

  async incrementTokenVersion(id: string): Promise<void> {
    await db`
      UPDATE admins
      SET token_version = token_version + 1
      WHERE id = ${id}
    `;
  },

  async updateUsername(id: string, username: string): Promise<Admin> {
    const result = await db`
      UPDATE admins
      SET username = ${username}
      WHERE id = ${id}
      RETURNING id, username, password, token_version, created_at, updated_at
    `;
    return result[0] as Admin;
  },

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await db`
      UPDATE admins
      SET password = ${hashedPassword},
          token_version = token_version + 1
      WHERE id = ${id}
    `;
  },
};
