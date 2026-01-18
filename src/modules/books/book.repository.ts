import { db } from "../../config/db";
import { BookCatalog, CreateBookCatalogDTO, CreateBookInventoryDTO, BookInventory } from "./book.model";

export const BookRepository = {
  // =====================================================
  // CATALOG OPERATIONS
  // =====================================================

  /**
   * Get all book catalogs with availability information
   */
  async findAll(): Promise<BookCatalog[]> {
    const books = await db<BookCatalog[]>`
      SELECT 
        c.id,
        c.title,
        c.category_code,
        cat.name as category_name,
        c.author,
        c.publisher,
        c.year,
        COUNT(i.id) as total_copies,
        COUNT(i.id) FILTER (WHERE i.status = 'available') as available_copies,
        COUNT(i.id) FILTER (WHERE i.status = 'loaned') as loaned_copies
      FROM book_catalog c
      LEFT JOIN categories cat ON c.category_code = cat.code
      LEFT JOIN book_inventory i ON i.catalog_id = c.id
      GROUP BY c.id, c.title, c.category_code, cat.name, c.author, c.publisher, c.year
      ORDER BY c.id
    `;
    return books;
  },

  /**
   * Get a single book catalog by ID with availability info
   */
  async findById(id: string): Promise<BookCatalog | null> {
    const books = await db<BookCatalog[]>`
      SELECT 
        c.id,
        c.title,
        c.category_code,
        cat.name as category_name,
        c.author,
        c.publisher,
        c.year,
        COUNT(i.id) as total_copies,
        COUNT(i.id) FILTER (WHERE i.status = 'available') as available_copies,
        COUNT(i.id) FILTER (WHERE i.status = 'loaned') as loaned_copies
      FROM book_catalog c
      LEFT JOIN categories cat ON c.category_code = cat.code
      LEFT JOIN book_inventory i ON i.catalog_id = c.id
      WHERE c.id = ${id}
      GROUP BY c.id, c.title, c.category_code, cat.name, c.author, c.publisher, c.year
    `;
    return books[0] ?? null;
  },

  /**
   * Create a new book catalog entry
   */
  async createCatalog(catalog: CreateBookCatalogDTO, bookId: string): Promise<void> {
    await db`
      INSERT INTO book_catalog (
        id, title, category_code, author, publisher, year
      ) VALUES (
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
      INSERT INTO book_inventory (
        id, catalog_id, status, condition
      ) VALUES (
        ${inventory.id},
        ${inventory.catalog_id},
        ${inventory.status || 'available'},
        ${inventory.condition || 'good'}
      )
    `;
  },

  /**
   * Create book with both catalog and inventory
   * Auto-generates book ID based on category
   */
  async create(data: CreateBookCatalogDTO): Promise<string> {
    // Validate category exists
    const categoryCheck = await db`
      SELECT code FROM categories WHERE code = ${data.category_code}
    `;

    if (categoryCheck.length === 0) {
      throw new Error("Kategori tidak ditemukan");
    }

    // Get next book ID for this category
    const bookIdResult = await db`
      SELECT get_next_book_id(${data.category_code}) as book_id
    `;

    const bookId = bookIdResult[0].book_id;

    // Create catalog
    await this.createCatalog(data, bookId);

    // Add inventory items based on stock
    // Generate IDs like INF001-1, INF001-2, etc.
    for (let i = 1; i <= data.stock; i++) {
      await this.addInventory({
        id: `${bookId}-${i}`,
        catalog_id: bookId,
        status: 'available',
        condition: 'good'
      });
    }

    return bookId;
  },

  /**
   * Update catalog information
   */
  async update(id: string, data: Partial<CreateBookCatalogDTO>): Promise<void> {
    await db`
      UPDATE book_catalog SET
        title = COALESCE(${data.title ?? null}, title),
        category_code = COALESCE(${data.category_code ?? null}, category_code),
        author = COALESCE(${data.author ?? null}, author),
        publisher = COALESCE(${data.publisher ?? null}, publisher),
        year = COALESCE(${data.year ?? null}, year),
        updated_at = CURRENT_TIMESTAMP
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
      FROM book_inventory i
      WHERE i.catalog_id = ${id}
      AND i.status = 'loaned'
    `;

    if (loanedBooks[0].count > 0) {
      throw new Error("Tidak dapat menghapus buku yang sedang dipinjam");
    }

    // Delete inventory first (foreign key constraint)
    await db`
      DELETE FROM book_inventory
      WHERE catalog_id = ${id}
    `;

    // Then delete catalog
    await db`
      DELETE FROM book_catalog
      WHERE id = ${id}
    `;
  },

  // =====================================================
  // INVENTORY OPERATIONS
  // =====================================================

  /**
   * Get all inventory items for a catalog
   */
  async getInventoryByCatalog(catalogId: string): Promise<BookInventory[]> {
    const inventory = await db<BookInventory[]>`
      SELECT 
        i.id,
        i.catalog_id,
        i.status,
        i.condition,
        i.created_at::text
      FROM book_inventory i
      WHERE i.catalog_id = ${catalogId}
      ORDER BY i.id
    `;
    return inventory;
  },

  /**
   * Get available inventory items for a catalog
   */
  async getAvailableInventory(catalogId: string, limit: number = 1): Promise<BookInventory[]> {
    const inventory = await db<BookInventory[]>`
      SELECT 
        i.id,
        i.catalog_id,
        i.status,
        i.condition
      FROM book_inventory i
      WHERE i.catalog_id = ${catalogId}
      AND i.status = 'available'
      ORDER BY i.id
      LIMIT ${limit}
    `;
    return inventory;
  },

  /**
   * Update inventory item status
   */
  async updateInventoryStatus(
    inventoryId: string,
    status: 'available' | 'loaned' | 'maintenance' | 'damaged' | 'lost'
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
    const stats = await db`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'available') as available,
        COUNT(*) FILTER (WHERE status = 'loaned') as loaned,
        COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance,
        COUNT(*) FILTER (WHERE status = 'damaged') as damaged,
        COUNT(*) FILTER (WHERE status = 'lost') as lost
      FROM book_inventory
      WHERE catalog_id = ${catalogId}
    `;
    return stats[0];
  }
};
