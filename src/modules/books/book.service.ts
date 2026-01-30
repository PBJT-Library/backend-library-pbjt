import { BookRepository } from "./book.repository";
import type { CreateBookDTO, UpdateBookDTO } from "../../types/database.types";
import { AppError } from "../../handler/error";
import { withCache, tryDeleteCache } from "../../utils/cache.utils";

export const BookService = {
  async getAllBooks() {
    return await withCache(
      "books:all",
      300, // 5 minutes
      () => BookRepository.findAll(),
    );
  },

  async getBookByBookId(book_id: string) {
    return await withCache(
      `books:${book_id}`,
      600, // 10 minutes
      async () => {
        const book = await BookRepository.findByBookId(book_id);
        if (!book) {
          throw new AppError("Buku tidak ditemukan", 404);
        }
        return book;
      },
    );
  },

  async addBook(data: CreateBookDTO) {
    if (data.quantity < 1) {
      throw new AppError("Quantity harus minimal 1", 400);
    }

    // Create book(s) - returns array of created book_ids
    const book_ids = await BookRepository.create(data);

    // Invalidate cache
    await tryDeleteCache("books:all");
    await tryDeleteCache("categories:*"); // Invalidate categories because book_count changed

    return {
      message: `Berhasil menambahkan ${book_ids.length} buku`,
      book_ids,
      count: book_ids.length,
    };
  },

  async updateBook(book_id: string, data: UpdateBookDTO) {
    const book = await BookRepository.findByBookId(book_id);
    if (!book) {
      throw new AppError("Buku tidak ditemukan", 404);
    }

    await BookRepository.update(book_id, data);

    // Invalidate caches
    await tryDeleteCache(`books:${book_id}`);
    await tryDeleteCache("books:all");
    await tryDeleteCache("categories:*"); // Invalidate categories in case category_id changed

    return {
      message: "Buku berhasil diperbarui",
    };
  },

  async deleteBook(book_id: string) {
    const book = await BookRepository.findByBookId(book_id);
    if (!book) {
      throw new AppError("Buku tidak ditemukan", 404);
    }

    await BookRepository.delete(book_id);

    // Invalidate caches
    await tryDeleteCache(`books:${book_id}`);
    await tryDeleteCache("books:all");
    await tryDeleteCache("categories:*"); // Invalidate categories because book_count changed

    return { message: "Buku berhasil dihapus" };
  },

  /**
   * Search books
   */
  async searchBooks(query: string) {
    return await BookRepository.search(query);
  },
};
