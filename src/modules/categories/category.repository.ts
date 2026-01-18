import { db } from "../../config/db";
import { Category, CreateCategoryDTO, UpdateCategoryDTO } from "./category.model";

export const CategoryRepository = {
    /**
     * Get all categories
     */
    async findAll(): Promise<Category[]> {
        const categories = await db<Category[]>`
      SELECT code, name, description, created_at::text, updated_at::text
      FROM categories
      ORDER BY code
    `;
        return categories;
    },

    /**
     * Get a single category by code
     */
    async findByCode(code: string): Promise<Category | null> {
        const categories = await db<Category[]>`
      SELECT code, name, description, created_at::text, updated_at::text
      FROM categories
      WHERE code = ${code}
    `;
        return categories[0] ?? null;
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
    async update(code: string, category: UpdateCategoryDTO): Promise<void> {
        await db`
      UPDATE categories
      SET 
        name = COALESCE(${category.name ?? null}, name),
        description = COALESCE(${category.description ?? null}, description),
        updated_at = CURRENT_TIMESTAMP
      WHERE code = ${code}
    `;
    },

    /**
     * Delete a category
     * Only allowed if no books are using this category
     */
    async delete(code: string): Promise<void> {
        // Check if any books use this category
        const bookCount = await db`
      SELECT COUNT(*) as count
      FROM book_catalog
      WHERE category_code = ${code}
    `;

        if (bookCount[0].count > 0) {
            throw new Error("Tidak dapat menghapus kategori yang masih digunakan oleh buku");
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
        const categories = await db<(Category & { book_count: number })[]>`
      SELECT 
        c.code,
        c.name,
        c.description,
        c.created_at::text,
        c.updated_at::text,
        COUNT(b.id) as book_count
      FROM categories c
      LEFT JOIN book_catalog b ON b.category_code = c.code
      GROUP BY c.code, c.name, c.description, c.created_at, c.updated_at
      ORDER BY c.code
    `;
        return categories;
    }
};
