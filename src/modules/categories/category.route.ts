import { Elysia, t } from "elysia";
import { CategoryService } from "./category.service";
import { authMiddleware } from "../../middleware/auth.middleware";

export const categoryRoute = new Elysia({ prefix: "/categories" })
  // Get all categories with book counts
  .get(
    "/",
    async () => {
      try {
        const categories = await CategoryService.getAllCategories();
        return {
          success: true,
          data: categories,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    {
      detail: {
        tags: ["Categories"],
        summary: "Get all categories",
        description: "Retrieve all book categories with book counts",
      },
    },
  )

  // Get category by code
  .get(
    "/:code",
    async ({ params: { code }, set }) => {
      try {
        const category = await CategoryService.getCategoryByCode(code);
        return {
          success: true,
          data: category,
        };
      } catch (error) {
        set.status = 404;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    {
      params: t.Object({
        code: t.String(),
      }),
      detail: {
        tags: ["Categories"],
        summary: "Get category by code",
        description: "Retrieve a specific category by its code",
      },
    },
  )

  // Apply auth middleware for protected routes
  .derive(authMiddleware)

  // Create new category (admin only)
  .post(
    "/",
    async ({ body, set }) => {
      try {
        await CategoryService.createCategory(body);
        set.status = 201;
        return {
          success: true,
          message: "Kategori berhasil dibuat",
        };
      } catch (error) {
        set.status = 400;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    {
      body: t.Object({
        code: t.String({ minLength: 2, maxLength: 10 }),
        name: t.String({ minLength: 1, maxLength: 100 }),
        description: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Categories"],
        summary: "Create new category",
        description: "Create a new book category (Admin only)",
        security: [{ bearerAuth: [] }],
      },
    },
  )

  // Update category (admin only)
  .put(
    "/:code",
    async ({ params: { code }, body, set }) => {
      try {
        await CategoryService.updateCategory(code, body);
        return {
          success: true,
          message: "Kategori berhasil diperbarui",
        };
      } catch (error) {
        set.status =
          error instanceof Error && error.message.includes("tidak ditemukan")
            ? 404
            : 400;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    {
      params: t.Object({
        code: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
        description: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Categories"],
        summary: "Update category",
        description: "Update an existing category (Admin only)",
        security: [{ bearerAuth: [] }],
      },
    },
  )

  // Delete category (admin only)
  .delete(
    "/:code",
    async ({ params: { code }, set }) => {
      try {
        await CategoryService.deleteCategory(code);
        return {
          success: true,
          message: "Kategori berhasil dihapus",
        };
      } catch (error) {
        set.status =
          error instanceof Error && error.message.includes("tidak ditemukan")
            ? 404
            : 400;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    {
      params: t.Object({
        code: t.String(),
      }),
      detail: {
        tags: ["Categories"],
        summary: "Delete category",
        description: "Delete a category (Admin only, only if no books use it)",
        security: [{ bearerAuth: [] }],
      },
    },
  );
