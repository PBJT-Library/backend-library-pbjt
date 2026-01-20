import prisma from "../../database/client";
import type { Admin } from "../../generated/client";
import { AdminResponse, CreateAdminDTO } from "./admin.model";

export const AdminRepository = {
  async findByUsername(username: string): Promise<Admin | null> {
    return await prisma.admin.findUnique({
      where: { username },
    });
  },

  async findById(id: string): Promise<Admin | null> {
    return await prisma.admin.findUnique({
      where: { id },
    });
  },

  async create(admin: CreateAdminDTO): Promise<AdminResponse> {
    const created = await prisma.admin.create({
      data: {
        username: admin.username,
        password: admin.password,
      },
      select: {
        id: true,
        username: true,
        created_at: true,
        token_version: true,
      },
    });

    return created;
  },

  async incrementTokenVersion(id: string): Promise<void> {
    await prisma.admin.update({
      where: { id },
      data: {
        token_version: {
          increment: 1,
        },
      },
    });
  },
};
