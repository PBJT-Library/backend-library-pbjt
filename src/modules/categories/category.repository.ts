import { db } from "../../config/db";
import type {
  Category,
  CreateCategoryDTO,
  CategoryWithBookCount,
} from "../../types/database.types";

export const CategoryRepository = {
  /**
   * Get all categories with UUID
   */
  async findAll(): Promise<Category[]> {
    const result = await db`
      SELECT id, uuid, code, name, description, created_at
      FROM public.categories
      ORDER BY code ASC
    `;
    return result as unknown as Category[];
  },

  /**
   * Get a single category by code
   */
  async findByCode(code: string): Promise<Category | null> {
    const result = await db`
      SELECT id, uuid, code, name, description, created_at
      FROM public.categories
      WHERE code = ${code}
    `;
    return (result[0] as Category) || null;
  },

  /**
   * Get a single category by ID
   */
  async findById(id: number): Promise<Category | null> {
    const result = await db`
      SELECT id, uuid, code, name, description, created_at
      FROM public.categories
      WHERE id = ${id}
    `;
    return (result[0] as Category) || null;
  },

  /**
   * Create a new category
   */
  async create(category: CreateCategoryDTO): Promise<void> {
    await db`
      INSERT INTO public.categories (code, name, description)
      VALUES (
        ${category.code.toUpperCase()},
        ${category.name},
        ${category.description ?? null}
      )
    `;
  },

  /**
   * Update an existing category
   */
  async update(
    code: string,
    category: Partial<CreateCategoryDTO>,
  ): Promise<void> {
    const updates: any = {};

    if (category.name !== undefined) updates.name = category.name;
    if (category.description !== undefined)
      updates.description = category.description;

    if (Object.keys(updates).length === 0) return;

    await db`
      UPDATE public.categories
      SET ${db(updates)}
      WHERE code = ${code}
    `;
  },

  /**
   * Delete a category
   * Only allowed if no books are using this category
   */
  async delete(code: string): Promise<void> {
    // Check if any books use this category
    const countResult = await db`
      SELECT COUNT(*) as count
      FROM public.books b
      JOIN public.categories c ON b.category_id = c.id
      WHERE c.code = ${code}
    `;

    const bookCount = parseInt(countResult[0].count);

    if (bookCount > 0) {
      throw new Error(
        "Tidak dapat menghapus kategori yang masih digunakan oleh buku",
      );
    }

    await db`
      DELETE FROM public.categories
      WHERE code = ${code}
    `;
  },

  /**
   * Get number of books per category by code
   */
  async getBookCount(code: string): Promise<number> {
    const result = await db`
      SELECT COUNT(*) as count
      FROM public.books b
      JOIN public.categories c ON b.category_id = c.id
      WHERE c.code = ${code}
    `;
    return parseInt(result[0].count);
  },

  /**
   * Get categories with book counts
   */
  async findAllWithBookCount(): Promise<CategoryWithBookCount[]> {
    const result = await db`
      SELECT 
        c.id,
        c.uuid,
        c.code,
        c.name,
        c.description,
        c.created_at,
        COUNT(b.id) as book_count
      FROM public.categories c
      LEFT JOIN public.books b ON c.id = b.category_id
      GROUP BY c.id, c.uuid, c.code, c.name, c.description, c.created_at
      ORDER BY c.code ASC
    `;

    return result.map((row: any) => ({
      id: row.id,
      uuid: row.uuid,
      code: row.code,
      name: row.name,
      description: row.description,
      created_at: row.created_at,
      book_count: parseInt(row.book_count),
    }));
  },
};
