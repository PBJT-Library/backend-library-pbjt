import prisma from "../../database/client";
import type { BookCatalog as PrismaBookCatalog, BookInventory as PrismaBookInventory } from "../../generated/client";
import { BookCatalog, CreateBookCatalogDTO, CreateBookInventoryDTO, BookInventory } from "./book.model";

export const BookRepository = {
  // =====================================================
  // CATALOG OPERATIONS
  // =====================================================

  /**
   * Get all book catalogs with availability information
   */
  async findAll(): Promise<BookCatalog[]> {
    const books = await prisma.bookCatalog.findMany({
      include: {
        category: {
          select: { name: true },
        },
        inventory: {
          select: { status: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    return books.map(book => ({
      id: book.id,
      title: book.title,
      category_code: book.category_code,
      category_name: book.category.name,
      author: book.author,
      publisher: book.publisher,
      year: book.year,
      total_copies: book.inventory.length,
      available_copies: book.inventory.filter(i => i.status === 'available').length,
      loaned_copies: book.inventory.filter(i => i.status === 'loaned').length,
    }));
  },

  /**
   * Get a single book catalog by ID with availability info
   */
  async findById(id: string): Promise<BookCatalog | null> {
    const book = await prisma.bookCatalog.findUnique({
      where: { id },
      include: {
        category: {
          select: { name: true },
        },
        inventory: {
          select: { status: true },
        },
      },
    });

    if (!book) return null;

    return {
      id: book.id,
      title: book.title,
      category_code: book.category_code,
      category_name: book.category.name,
      author: book.author,
      publisher: book.publisher,
      year: book.year,
      total_copies: book.inventory.length,
      available_copies: book.inventory.filter(i => i.status === 'available').length,
      loaned_copies: book.inventory.filter(i => i.status === 'loaned').length,
    };
  },

  /**
   * Create a new book catalog entry
   */
  async createCatalog(catalog: CreateBookCatalogDTO, bookId: string): Promise<void> {
    await prisma.bookCatalog.create({
      data: {
        id: bookId,
        title: catalog.title,
        category_code: catalog.category_code,
        author: catalog.author,
        publisher: catalog.publisher,
        year: catalog.year,
        isbn: `${catalog.category_code}-${bookId}`, // Generate ISBN
      },
    });
  },

  /**
   * Add physical book copies to inventory
   */
  async addInventory(inventory: CreateBookInventoryDTO): Promise<void> {
    await prisma.bookInventory.create({
      data: {
        id: inventory.id,
        book_id: inventory.catalog_id,
        inventory_code: inventory.id,
        status: inventory.status || 'available',
        condition: inventory.condition || 'good',
      },
    });
  },

  /**
   * Create book with both catalog and inventory
   * Auto-generates book ID based on category
   */
  async create(data: CreateBookCatalogDTO): Promise<string> {
    // Validate category exists
    const category = await prisma.category.findUnique({
      where: { code: data.category_code },
    });

    if (!category) {
      throw new Error("Kategori tidak ditemukan");
    }

    // Get next book ID for this category (simplified - use raw query or counter)
    const existingBooks = await prisma.bookCatalog.count({
      where: { category_code: data.category_code },
    });

    const bookId = `${data.category_code}${String(existingBooks + 1).padStart(3, '0')}`;

    // Create catalog
    await this.createCatalog(data, bookId);

    // Add inventory items based on stock
    // Generate IDs like INF001-1, INF001-2, etc.
    for (let i = 1; i <= data.stock; i++) {
      await this.addInventory({
        id: `${bookId}-${i}`,
        catalog_id: bookId,
        status: 'available',
        condition: 'good',
      });
    }

    return bookId;
  },

  /**
   * Update catalog information
   */
  async update(id: string, data: Partial<CreateBookCatalogDTO>): Promise<void> {
    await prisma.bookCatalog.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.category_code && { category_code: data.category_code }),
        ...(data.author && { author: data.author }),
        ...(data.publisher && { publisher: data.publisher }),
        ...(data.year && { year: data.year }),
      },
    });
  },

  /**
   * Delete catalog and all associated inventory
   * Restricted if any inventory is currently loaned
   */
  async delete(id: string): Promise<void> {
    // Check if any books are currently loaned
    const loanedBooks = await prisma.bookInventory.count({
      where: {
        book_id: id,
        status: 'loaned',
      },
    });

    if (loanedBooks > 0) {
      throw new Error("Tidak dapat menghapus buku yang sedang dipinjam");
    }

    // Prisma will cascade delete inventory automatically
    await prisma.bookCatalog.delete({
      where: { id },
    });
  },

  // =====================================================
  // INVENTORY OPERATIONS
  // =====================================================

  /**
   * Get all inventory items for a catalog
   */
  async getInventoryByCatalog(catalogId: string): Promise<BookInventory[]> {
    const inventory = await prisma.bookInventory.findMany({
      where: { book_id: catalogId },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        book_id: true,
        status: true,
        condition: true,
        created_at: true,
      },
    });

    return inventory.map(item => ({
      id: item.id,
      catalog_id: item.book_id,
      status: item.status as 'available' | 'loaned' | 'maintenance' | 'damaged' | 'lost',
      condition: item.condition as 'good' | 'fair' | 'poor' | 'damaged',
      created_at: item.created_at?.toISOString(),
    }));
  },

  /**
   * Get available inventory items for a catalog
   */
  async getAvailableInventory(catalogId: string, limit: number = 1): Promise<BookInventory[]> {
    const inventory = await prisma.bookInventory.findMany({
      where: {
        book_id: catalogId,
        status: 'available',
      },
      orderBy: { id: 'asc' },
      take: limit,
      select: {
        id: true,
        book_id: true,
        status: true,
        condition: true,
      },
    });

    return inventory.map(item => ({
      id: item.id,
      catalog_id: item.book_id,
      status: item.status as 'available' | 'loaned' | 'maintenance' | 'damaged' | 'lost',
      condition: item.condition as 'good' | 'fair' | 'poor' | 'damaged',
    }));
  },

  /**
   * Update inventory item status
   */
  async updateInventoryStatus(
    inventoryId: string,
    status: 'available' | 'loaned' | 'maintenance' | 'damaged' | 'lost'
  ): Promise<void> {
    await prisma.bookInventory.update({
      where: { id: inventoryId },
      data: { status },
    });
  },

  /**
   * Get availability statistics for a catalog
   */
  async getAvailability(catalogId: string) {
    const inventory = await prisma.bookInventory.findMany({
      where: { book_id: catalogId },
      select: { status: true },
    });

    return {
      total: inventory.length,
      available: inventory.filter(i => i.status === 'available').length,
      loaned: inventory.filter(i => i.status === 'loaned').length,
      maintenance: inventory.filter(i => i.status === 'maintenance').length,
      damaged: inventory.filter(i => i.status === 'damaged').length,
      lost: inventory.filter(i => i.status === 'lost').length,
    };
  }
};
