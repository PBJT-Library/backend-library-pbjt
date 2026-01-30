import { db } from "../../config/db";
import type {
  Book,
  CreateBookDTO,
  UpdateBookDTO,
  BookWithCategory,
} from "../../types/database.types";

export const BookRepository = {
  /**
   * Get all books with category information
   */
  async findAll(): Promise<BookWithCategory[]> {
    const result = await db`
      SELECT 
        b.id,
        b.uuid,
        b.book_id,
        b.title,
        b.author,
        b.publisher,
        b.publication_year,
        b.category_id,
        c.name as category_name,
        c.code as category_code,
        b.status,
        b.cover_url,
        b.description,
        b.created_at,
        b.updated_at
      FROM public.books b
      LEFT JOIN public.categories c ON b.category_id = c.id
      ORDER BY b.book_id ASC
    `;

    return result.map((row: any) => ({
      id: row.id,
      uuid: row.uuid,
      book_id: row.book_id,
      title: row.title,
      author: row.author,
      publisher: row.publisher,
      isbn: row.isbn,
      publication_year: row.publication_year,
      category_id: row.category_id,
      category_name: row.category_name,
      category_code: row.category_code,
      status: row.status,
      cover_url: row.cover_url,
      description: row.description,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  },

  /**
   * Get a single book by book_id (display ID like MAT000001)
   */
  async findByBookId(book_id: string): Promise<BookWithCategory | null> {
    const result = await db`
      SELECT 
        b.id,
        b.uuid,
        b.book_id,
        b.title,
        b.author,
        b.publisher,
        b.publication_year,
        b.category_id,
        c.name as category_name,
        c.code as category_code,
        b.status,
        b.cover_url,
        b.description,
        b.created_at,
        b.updated_at
      FROM public.books b
      LEFT JOIN public.categories c ON b.category_id = c.id
      WHERE b.book_id = ${book_id}
    `;

    if (result.length === 0) return null;

    const row = result[0];
    return {
      id: row.id,
      uuid: row.uuid,
      book_id: row.book_id,
      title: row.title,
      author: row.author,
      publisher: row.publisher,
      publication_year: row.publication_year,
      category_id: row.category_id,
      category_name: row.category_name,
      category_code: row.category_code,
      status: row.status,
      cover_url: row.cover_url,
      description: row.description,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  },

  /**
   * Get a single book by internal ID
   */
  async findById(id: number): Promise<BookWithCategory | null> {
    const result = await db`
      SELECT 
        b.id,
        b.uuid,
        b.book_id,
        b.title,
        b.author,
        b.publisher,
        b.publication_year,
        b.category_id,
        c.name as category_name,
        c.code as category_code,
        b.status,
        b.cover_url,
        b.description,
        b.created_at,
        b.updated_at
      FROM public.books b
      LEFT JOIN public.categories c ON b.category_id = c.id
      WHERE b.id = ${id}
    `;

    if (result.length === 0) return null;

    const row = result[0];
    return {
      id: row.id,
      uuid: row.uuid,
      book_id: row.book_id,
      title: row.title,
      author: row.author,
      publisher: row.publisher,
      publication_year: row.publication_year,
      category_id: row.category_id,
      category_name: row.category_name,
      category_code: row.category_code,
      status: row.status,
      cover_url: row.cover_url,
      description: row.description,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  },

  /**
   * Create new book(s) - creates multiple copies if quantity > 1
   * Auto-generates book_id based on category code
   */
  async create(data: CreateBookDTO): Promise<string[]> {
    // 1. Validate category exists and get its code
    const category = await db`
      SELECT id, code FROM public.categories WHERE id = ${data.category_id}
    `;

    if (category.length === 0) {
      throw new Error("Kategori tidak ditemukan");
    }

    const categoryCode = category[0].code;

    // 2. Get next sequence number for this category
    const existingBooks = await db`
      SELECT COUNT(*) as count
      FROM public.books
      WHERE category_id = ${data.category_id}
    `;

    const startCount = parseInt(existingBooks[0].count);
    const createdBookIds: string[] = [];

    // 3. Create multiple book records based on quantity
    for (let i = 0; i < data.quantity; i++) {
      const sequenceNumber = startCount + i + 1;
      const book_id = `${categoryCode}${String(sequenceNumber).padStart(6, "0")}`;

      await db`
        INSERT INTO public.books (
          book_id,
          title,
          author,
          publisher,
          publication_year,
          category_id,
          status,
          cover_url,
          description
        ) VALUES (
          ${book_id},
          ${data.title},
          ${data.author || null},
          ${data.publisher || null},
          ${data.publication_year || null},
          ${data.category_id},
          ${data.status || "available"},
          ${data.cover_url || null},
          ${data.description || null}
        )
      `;

      createdBookIds.push(book_id);
    }

    return createdBookIds;
  },

  /**
   * Update book information by book_id
   */
  async update(book_id: string, data: UpdateBookDTO): Promise<void> {
    const updates: any = {};

    if (data.title !== undefined) updates.title = data.title;
    if (data.author !== undefined) updates.author = data.author;
    if (data.publisher !== undefined) updates.publisher = data.publisher;
    if (data.publication_year !== undefined)
      updates.publication_year = data.publication_year;
    if (data.category_id !== undefined) updates.category_id = data.category_id;
    if (data.status !== undefined) updates.status = data.status;
    if (data.cover_url !== undefined) updates.cover_url = data.cover_url;
    if (data.description !== undefined) updates.description = data.description;

    if (Object.keys(updates).length === 0) return;

    await db`
      UPDATE public.books
      SET ${db(updates)}
      WHERE book_id = ${book_id}
    `;
  },

  /**
   * Update book status by ID
   */
  async updateStatus(
    id: number,
    status: "available" | "loaned" | "reserved",
  ): Promise<void> {
    await db`
      UPDATE public.books
      SET status = ${status}
      WHERE id = ${id}
    `;
  },

  /**
   * Delete a book by book_id
   * Only allowed if status is not 'loaned'
   */
  async delete(book_id: string): Promise<void> {
    // Check if book is currently loaned
    const book = await db`
      SELECT status FROM public.books WHERE book_id = ${book_id}
    `;

    if (book.length === 0) {
      throw new Error("Buku tidak ditemukan");
    }

    if (book[0].status === "loaned") {
      throw new Error("Tidak dapat menghapus buku yang sedang dipinjam");
    }

    await db`
      DELETE FROM public.books WHERE book_id = ${book_id}
    `;
  },

  /**
   * Get available books for a specific title
   */
  async getAvailableByTitle(title: string): Promise<Book[]> {
    const result = await db`
      SELECT 
        id, uuid, book_id, title, author, publisher,
        publication_year, category_id, status, cover_url,
        description, created_at, updated_at
      FROM public.books
      WHERE title = ${title} AND status = 'available'
      ORDER BY book_id ASC
    `;

    return result.map((row: any) => ({
      id: row.id,
      uuid: row.uuid,
      book_id: row.book_id,
      title: row.title,
      author: row.author,
      publisher: row.publisher,
      publication_year: row.publication_year,
      category_id: row.category_id,
      status: row.status,
      cover_url: row.cover_url,
      description: row.description,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  },

  /**
   * Get statistics for books by category
   */
  async getStatsByCategory(category_id: number) {
    const result = await db`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available,
        COUNT(CASE WHEN status = 'loaned' THEN 1 END) as loaned,
        COUNT(CASE WHEN status = 'reserved' THEN 1 END) as reserved
      FROM public.books
      WHERE category_id = ${category_id}
    `;

    const row = result[0];
    return {
      total: parseInt(row.total),
      available: parseInt(row.available),
      loaned: parseInt(row.loaned),
      reserved: parseInt(row.reserved),
    };
  },

  /**
   * Search books by title or author
   */
  async search(query: string): Promise<BookWithCategory[]> {
    const result = await db`
      SELECT 
        b.id,
        b.uuid,
        b.book_id,
        b.title,
        b.author,
        b.publisher,
        b.publication_year,
        b.category_id,
        c.name as category_name,
        c.code as category_code,
        b.status,
        b.cover_url,
        b.description,
        b.created_at,
        b.updated_at
      FROM public.books b
      LEFT JOIN public.categories c ON b.category_id = c.id
      WHERE 
        b.title ILIKE ${"%" + query + "%"} OR
        b.author ILIKE ${"%" + query + "%"} OR
        b.book_id ILIKE ${"%" + query + "%"}
      ORDER BY b.book_id ASC
    `;

    return result.map((row: any) => ({
      id: row.id,
      uuid: row.uuid,
      book_id: row.book_id,
      title: row.title,
      author: row.author,
      publisher: row.publisher,
      publication_year: row.publication_year,
      category_id: row.category_id,
      category_name: row.category_name,
      category_code: row.category_code,
      status: row.status,
      cover_url: row.cover_url,
      description: row.description,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  },
};
