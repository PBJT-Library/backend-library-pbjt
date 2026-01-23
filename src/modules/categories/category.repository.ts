import { db } from "../../config/db";
import type { Category, CreateCategoryDTO } from "../../types/database.types";

export const CategoryRepository = {
  /**
   * Get all categories
   */
  async findAll(): Promise<Category[]> {
    const result = await db`
      SELECT code, name, description
      FROM categories
      ORDER BY code ASC
    `;
    return result as unknown as Category[];
  },

  /**
   * Get a single category by code
   */
  async findByCode(code: string): Promise<Category | null> {
    const result = await db`
      SELECT code, name, description
      FROM categories
      WHERE code = ${code}
    `;
    return (result[0] as Category) || null;
  },

  /**
   * Create a new category
   */
  async create(category: CreateCategoryDTO): Promise<void> {
    await db`
      INSERT INTO categories (code, name, description)
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
  async update(code: string, category: Partial<CreateCategoryDTO>): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];

    if (category.name) {
      updates.push(`name = $${updates.length + 1}`);
      values.push(category.name);
    }

    if (category.description !== undefined) {
      updates.push(`description = $${updates.length + 1}`);
      values.push(category.description);
    }

    if (updates.length === 0) return;

    await db`
      UPDATE categories
      SET ${db(Object.fromEntries(
      Object.entries(category).filter(([key]) => key !== 'code')
    ))}
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
      FROM book_catalog
      WHERE category_code = ${code}
    `;

    const bookCount = parseInt(countResult[0].count);

    if (bookCount > 0) {
      throw new Error(
        "Tidak dapat menghapus kategori yang masih digunakan oleh buku",
      );
    }

    await db`
      DELETE FROM categories
      WHERE code = ${code}
    `;
  },

  /**
   * Get number of books per category
   */
  async getBookCount(code: string): Promise<number> {
    const result = await db`
      SELECT COUNT(*) as count
      FROM book_catalog
      WHERE category_code = ${code}
    `;
    return parseInt(result[0].count);
  },

  /**
   * Get categories with book counts
   */
  async findAllWithBookCount(): Promise<(Category & { book_count: number })[]> {
    const result = await db`
      SELECT 
        c.code,
        c.name,
        c.description,
        COUNT(bc.id) as book_count
      FROM categories c
      LEFT JOIN book_catalog bc ON c.code = bc.category_code
      GROUP BY c.code, c.name, c.description
      ORDER BY c.code ASC
    `;

    return result.map((row: any) => ({
      code: row.code,
      name: row.name,
      description: row.description,
      book_count: parseInt(row.book_count),
    }));
  },
};
