import { Elysia, t } from "elysia";
import jwt from "@elysiajs/jwt";
import { AdminService } from "./admin.service";
import {
  AdminJwtPayload,
  LoginAdminDTO,
  CreateAdminDTO,
  ChangePasswordDTO,
} from "./admin.model";
import { env } from "../../config/env";
import { authMiddleware } from "../../middleware/auth.middleware";

export const adminRoute = new Elysia({ prefix: "/admin" })
  .use(
    jwt({
      name: "jwt",
      secret: env.jwt.secret as string,
      exp: env.jwt.exp,
    }),
  )

  // POST admin register
  .post(
    "/register",
    async ({ body }) => {
      const admin = await AdminService.register(body as CreateAdminDTO);

      return { message: "Registresi berhasil", admin };
    },
    {
      body: t.Object({
        username: t.String({
          minLength: 3,
          error: "Username minimal 3 karakter",
        }),
        password: t.String({
          minLength: 6,
          error: "Password minimal 6 karakter",
        }),
      }),
      detail: {
        tags: ["Admin"],
        summary: "Register Admin",
        description: "Registrasi admin untuk mendapatkan JWT token",
      },
    },
  )

  // POST admin login
  .post(
    "/login",
    async ({ body, jwt }) => {
      const admin = await AdminService.login(body as LoginAdminDTO);

      const token = await jwt.sign({
        sub: admin.id,
        username: admin.username,
        role: "admin" as const,
      } satisfies AdminJwtPayload);

      return { message: "Login berhasil", token, admin };
    },
    {
      body: t.Object({
        username: t.String({
          minLength: 3,
          error: "Username minimal 3 karakter",
        }),
        password: t.String({
          minLength: 6,
          error: "Password minimal 6 karakter",
        }),
      }),
      detail: {
        tags: ["Admin"],
        summary: "Login Admin",
        description: "Autentikasi admin dan mengembalikan JWT token",
      },
    },
  )

  .derive(authMiddleware)

  // GET /admin/me - Ambil data admin yang sedang login (protected)
  .get(
    "/me",
    async ({ admin }) => {
      return {
        message: "Data admin berhasil diambil",
        admin,
      };
    },
    {
      detail: {
        tags: ["Admin"],
        summary: "Profil Admin",
        description:
          "Mengambil data admin yang sedang login menggunakan JWT token",
        security: [{ Bearer: [] }],
      },
    },
  )

  // PUT /admin/me - Update data admin yang sedang login
  .put(
    "/me",
    async ({ admin, body }) => {
      const updateAdmin = await AdminService.updateAdmin(
        admin.id,
        body as { username?: string },
      );

      return {
        message: "Profil admin berhasil di perbarui",
        admin: updateAdmin,
      };
    },
    {
      body: t.Object({
        username: t.String({
          minLength: 3,
          error: "Username minimal 3 karakter",
        }),
      }),
      detail: {
        tags: ["Admin"],
        summary: "Update Profile Admin",
        description: "Memperbarui username admin yang sedang login",
        security: [{ Bearer: [] }],
      },
    },
  )

  // PUT /admin/me/pass - Ubah password admin yang sedang login
  .put(
    "/me/pass",
    async ({ admin, body }) => {
      return await AdminService.changePassword(
        admin.id,
        body as ChangePasswordDTO,
      );
    },
    {
      body: t.Object({
        currentPassword: t.String({
          minLength: 6,
        }),
        newPassword: t.String({
          minLength: 6,
        }),
      }),
      detail: {
        tags: ["Admin"],
        summary: "Change Admin Password",
        description: "Mengubah password admin yang sedang login",
        security: [{ Bearer: [] }],
      },
    },
  );
