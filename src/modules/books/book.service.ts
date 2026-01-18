import { BookRepository } from "./book.repository";
import { CreateBookCatalogDTO } from "./book.model";
import { AppError } from "../../handler/error";
import { withCache, trySetCache, tryInvalidateCache, invalidateMultiple, tryDeleteCache } from "../../utils/cache.utils";


export const BookService = {
  async getAllBooks() {
    return await withCache(
      "books:all",
      300, // 5 minutes
      () => BookRepository.findAll()
    );
  },

  async getBookById(id: string) {
    return await withCache(
      `books:${id}`,
      600, // 10 minutes
      async () => {
        const book = await BookRepository.findById(id);
        if (!book) {
          throw new AppError("Buku tidak ditemukan", 404);
        }
        return book;
      }
    );
  },

  async addBook(data: CreateBookCatalogDTO) {
    if (data.stock < 0) {
      throw new AppError("Stock tidak boleh minus", 400);
    }

    const book_id = await BookRepository.create(data);

    // Invalidate all books cache
    await tryInvalidateCache("books:*");

    return {
      message: "Buku berhasil ditambahkan",
      book_id,
    };
  },

  async updateBook(id: string, data: Partial<CreateBookCatalogDTO>) {
    const book = await BookRepository.findById(id);
    if (!book) {
      throw new AppError("Buku tidak ditemukan", 404);
    }

    if (data.stock !== undefined && data.stock < 0) {
      throw new AppError("Stock tidak boleh minus", 400);
    }

    await BookRepository.update(id, data);

    // Invalidate specific book cache and list cache
    await tryDeleteCache(`books:${id}`);
    await tryDeleteCache("books:all");

    return {
      message: "Buku berhasil diperbarui",
    };
  },

  async deleteBook(id: string) {
    const book = await BookRepository.findById(id);
    if (!book) {
      throw new AppError("Buku tidak ditemukan", 404);
    }

    await BookRepository.delete(id);

    // Invalidate all books cache
    await tryInvalidateCache("books:*");

    return { message: "Buku berhasil dihapus" };
  },
};
