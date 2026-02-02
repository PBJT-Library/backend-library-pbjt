import { Elysia, t } from 'elysia';
import { CategoryService } from './category.service';
import { authMiddleware } from '../../middleware/auth.middleware';

export const categoryRoute = new Elysia({ prefix: '/categories' })
  // Get all categories with book counts
  .get(
    '/',
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
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      detail: {
        tags: ['Categories'],
        summary: 'Get all categories',
        description: 'Retrieve all book categories with book counts',
      },
    }
  )

  // Get category by code
  .get(
    '/:code',
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
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      params: t.Object({
        code: t.String(),
      }),
      detail: {
        tags: ['Categories'],
        summary: 'Get category by code',
        description: 'Retrieve a specific category by its code',
      },
    }
  )

  // Create new category - Public (for development)
  .post(
    '/',
    async ({ body, set }) => {
      try {
        console.log('[DEBUG] POST /categories called with:', body);
        await CategoryService.createCategory(body);
        set.status = 201;
        console.log('[DEBUG] Category created successfully');
        return {
          success: true,
          message: 'Kategori berhasil dibuat',
        };
      } catch (error) {
        set.status = 400;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
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
        tags: ['Categories'],
        summary: 'Create new category',
        description: 'Create a new book category',
      },
    }
  )

  // Update category - Public (for development)
  .put(
    '/:code',
    async ({ params: { code }, body, set }) => {
      try {
        console.log('[DEBUG] PUT /categories/:code called with:', {
          code,
          body,
        });
        await CategoryService.updateCategory(code, body);
        console.log('[DEBUG] Category updated successfully');
        return {
          success: true,
          message: 'Kategori berhasil diperbarui',
        };
      } catch (error) {
        set.status =
          error instanceof Error && error.message.includes('tidak ditemukan') ? 404 : 400;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
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
        tags: ['Categories'],
        summary: 'Update category',
        description: 'Update an existing category',
      },
    }
  )

  // Delete category - Public (for development)
  .delete(
    '/:code',
    async ({ params: { code }, set }) => {
      try {
        console.log('[DEBUG] DELETE /categories/:code called for:', code);
        await CategoryService.deleteCategory(code);
        console.log('[DEBUG] Category deleted successfully');
        return {
          success: true,
          message: 'Kategori berhasil dihapus',
        };
      } catch (error) {
        set.status =
          error instanceof Error && error.message.includes('tidak ditemukan') ? 404 : 400;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      params: t.Object({
        code: t.String(),
      }),
      detail: {
        tags: ['Categories'],
        summary: 'Delete category',
        description: 'Delete a category (only if no books use it)',
      },
    }
  )

  // Apply auth middleware for protected routes (future use)
  .derive(authMiddleware);
