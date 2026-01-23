import { db } from "../../config/db";
import type {
  BookCatalog,
  BookInventory,
  CreateBookCatalogDTO,
  CreateBookInventoryDTO,
} from "../../types/database.types";

export const BookRepository = {
  // =====================================================
  // CATALOG OPERATIONS
  // =====================================================

  /**
   * Get all book catalogs with availability information
   */
  async findAll(): Promise<BookCatalog[]> {
    const result = await db`
      SELECT 
        bc.id,
        bc.title,
        bc.category_code,
        c.name as category_name,
        bc.author,
        bc.publisher,
        bc.year,
        COUNT(bi.id) as total_copies,
        COUNT(CASE WHEN bi.status = 'available' THEN 1 END) as available_copies,
        COUNT(CASE WHEN bi.status = 'loaned' THEN 1 END) as loaned_copies
      FROM book_catalog bc
      LEFT JOIN categories c ON bc.category_code  = c.code
      LEFT JOIN book_inventory bi ON bc.id = bi.catalog_id
      GROUP BY bc.id, bc.title, bc.category_code, c.name, bc.author, bc.publisher, bc.year
      ORDER BY bc.id ASC
    `;

    return result.map((row: any) => ({
      id: row.id,
      title: row.title,
      category_code: row.category_code,
      category_name: row.category_name,
      author: row.author,
      publisher: row.publisher,
      year: row.year,
      total_copies: parseInt(row.total_copies),
      available_copies: parseInt(row.available_copies),
      loaned_copies: parseInt(row.loaned_copies),
    }));
  },

  /**
   * Get a single book catalog by ID with availability info
   */
  async findById(id: string): Promise<BookCatalog | null> {
    const result = await db`
      SELECT 
        bc.id,
        bc.title,
        bc.category_code,
        c.name as category_name,
        bc.author,
        bc.publisher,
        bc.year,
        COUNT(bi.id) as total_copies,
        COUNT(CASE WHEN bi.status = 'available' THEN 1 END) as available_copies,
        COUNT(CASE WHEN bi.status = 'loaned' THEN 1 END) as loaned_copies
      FROM book_catalog bc
      LEFT JOIN categories c ON bc.category_code = c.code
      LEFT JOIN book_inventory bi ON bc.id = bi.catalog_id
      WHERE bc.id = ${id}
      GROUP BY bc.id, bc.title, bc.category_code, c.name, bc.author, bc.publisher, bc.year
    `;

    if (result.length === 0) return null;

    const row = result[0];
    return {
      id: row.id,
      title: row.title,
      category_code: row.category_code,
      category_name: row.category_name,
      author: row.author,
      publisher: row.publisher,
      year: row.year,
      total_copies: parseInt(row.total_copies),
      available_copies: parseInt(row.available_copies),
      loaned_copies: parseInt(row.loaned_copies),
    };
  },

  /**
   * Create a new book catalog entry
   */
  async createCatalog(
    catalog: CreateBookCatalogDTO,
    bookId: string,
  ): Promise<void> {
    await db`
      INSERT INTO book_catalog (id, title, category_code, author, publisher, year)
      VALUES (
        ${bookId},
        ${catalog.title},
        ${catalog.category_code},
        ${catalog.author},
        ${catalog.publisher},
        ${catalog.year}
      )
    `;
  },

  /**
   * Add physical book copies to inventory
   */
  async addInventory(inventory: CreateBookInventoryDTO): Promise<void> {
    await db`
      INSERT INTO book_inventory (id, catalog_id, status, condition)
      VALUES (
        ${inventory.id},
        ${inventory.catalog_id},
        ${inventory.status || "available"},
        ${inventory.condition || "good"}
      )
    `;
  },

  /**
   * Create book with both catalog and inventory
   * Auto-generates book ID based on category
   */
  async create(data: CreateBookCatalogDTO): Promise<string> {
    // Validate category exists
    const category = await db`
      SELECT code FROM categories WHERE code = ${data.category_code}
    `;

    if (category.length === 0) {
      throw new Error("Kategori tidak ditemukan");
    }

    // Get next book ID for this category
    const existingBooks = await db`
      SELECT COUNT(*) as count
      FROM book_catalog
      WHERE category_code = ${data.category_code}
    `;

    const count = parseInt(existingBooks[0].count);
    const bookId = `${data.category_code}${String(count + 1).padStart(3, "0")}`;

    // Create catalog
    await this.createCatalog(data, bookId);

    // Add inventory items based on stock
    // Generate IDs like INF001-1, INF001-2, etc.
    for (let i = 1; i <= data.stock; i++) {
      await this.addInventory({
        id: `${bookId}-${i}`,
        catalog_id: bookId,
        status: "available",
        condition: "good",
      });
    }

    return bookId;
  },

  /**
   * Update catalog information
   */
  async update(id: string, data: Partial<CreateBookCatalogDTO>): Promise<void> {
    await db`
      UPDATE book_catalog
      SET ${db(
        Object.fromEntries(
          Object.entries(data).filter(([key]) => key !== "stock"),
        ),
      )}
      WHERE id = ${id}
    `;
  },

  /**
   * Delete catalog and all associated inventory
   * Restricted if any inventory is currently loaned
   */
  async delete(id: string): Promise<void> {
    // Check if any books are currently loaned
    const loanedBooks = await db`
      SELECT COUNT(*) as count
      FROM book_inventory
      WHERE catalog_id = ${id} AND status = 'loaned'
    `;

    if (parseInt(loanedBooks[0].count) > 0) {
      throw new Error("Tidak dapat menghapus buku yang sedang dipinjam");
    }

    // Delete will cascade to inventory due to FK constraint
    await db`
      DELETE FROM book_catalog WHERE id = ${id}
    `;
  },

  // =====================================================
  // INVENTORY OPERATIONS
  // =====================================================

  /**
   * Get all inventory items for a catalog
   */
  async getInventoryByCatalog(catalogId: string): Promise<BookInventory[]> {
    const result = await db`
      SELECT id, catalog_id, status, condition
      FROM book_inventory
      WHERE catalog_id = ${catalogId}
      ORDER BY id ASC
    `;

    return result.map((row: any) => ({
      id: row.id,
      catalog_id: row.catalog_id,
      status: row.status,
      condition: row.condition,
    }));
  },

  /**
   * Get available inventory items for a catalog
   */
  async getAvailableInventory(
    catalogId: string,
    limit: number = 1,
  ): Promise<BookInventory[]> {
    const result = await db`
      SELECT id, catalog_id, status, condition
      FROM book_inventory
      WHERE catalog_id = ${catalogId} AND status = 'available'
      ORDER BY id ASC
      LIMIT ${limit}
    `;

    return result.map((row: any) => ({
      id: row.id,
      catalog_id: row.catalog_id,
      status: row.status,
      condition: row.condition,
    }));
  },

  /**
   * Update inventory item status
   */
  async updateInventoryStatus(
    inventoryId: string,
    status: "available" | "loaned" | "lost" | "damaged",
  ): Promise<void> {
    await db`
      UPDATE book_inventory
      SET status = ${status}
      WHERE id = ${inventoryId}
    `;
  },

  /**
   * Get availability statistics for a catalog
   */
  async getAvailability(catalogId: string) {
    const result = await db`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available,
        COUNT(CASE WHEN status = 'loaned' THEN 1 END) as loaned,
        COUNT(CASE WHEN status = 'damaged' THEN 1 END) as damaged,
        COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost
      FROM book_inventory
      WHERE catalog_id = ${catalogId}
    `;

    const row = result[0];
    return {
      total: parseInt(row.total),
      available: parseInt(row.available),
      loaned: parseInt(row.loaned),
      damaged: parseInt(row.damaged),
      lost: parseInt(row.lost),
    };
  },
};
