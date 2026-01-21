import prisma from "../../database/client";
import type { Category } from "../../generated/client";
import { CreateCategoryDTO, UpdateCategoryDTO } from "./category.model";

export const CategoryRepository = {
  /**
   * Get all categories
   */
  async findAll(): Promise<Category[]> {
    return await prisma.category.findMany({
      orderBy: { code: "asc" },
    });
  },

  /**
   * Get a single category by code
   */
  async findByCode(code: string): Promise<Category | null> {
    return await prisma.category.findUnique({
      where: { code },
    });
  },

  /**
   * Create a new category
   */
  async create(category: CreateCategoryDTO): Promise<void> {
    await prisma.category.create({
      data: {
        code: category.code.toUpperCase(),
        name: category.name,
        description: category.description ?? null,
      },
    });
  },

  /**
   * Update an existing category
   */
  async update(code: string, category: UpdateCategoryDTO): Promise<void> {
    await prisma.category.update({
      where: { code },
      data: {
        ...(category.name && { name: category.name }),
        ...(category.description !== undefined && {
          description: category.description,
        }),
      },
    });
  },

  /**
   * Delete a category
   * Only allowed if no books are using this category
   */
  async delete(code: string): Promise<void> {
    // Check if any books use this category
    const bookCount = await prisma.bookCatalog.count({
      where: { category_code: code },
    });

    if (bookCount > 0) {
      throw new Error(
        "Tidak dapat menghapus kategori yang masih digunakan oleh buku",
      );
    }

    await prisma.category.delete({
      where: { code },
    });
  },

  /**
   * Get number of books per category
   */
  async getBookCount(code: string): Promise<number> {
    return await prisma.bookCatalog.count({
      where: { category_code: code },
    });
  },

  /**
   * Get categories with book counts
   */
  async findAllWithBookCount(): Promise<(Category & { book_count: number })[]> {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { books: true },
        },
      },
      orderBy: { code: "asc" },
    });

    return categories.map((cat) => ({
      code: cat.code,
      name: cat.name,
      description: cat.description,
      created_at: cat.created_at,
      updated_at: cat.updated_at,
      book_count: cat._count.books,
    }));
  },
};
