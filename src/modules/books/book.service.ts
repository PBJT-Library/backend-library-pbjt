import { BookRepository } from "./book.repository";
import { CreateBookDTO } from "./book.model";
import { AppError } from "../../handler/error";

export const BookService = {
  async getAllBooks() {
    return await BookRepository.findAll();
  },

  async getBookById(id: string) {
    const book = await BookRepository.findById(id);
    if (!book) {
      throw new AppError("Buku tidak ditemukan", 404);
    }
    return book;
  },

  async addBook(data: CreateBookDTO) {
    if (data.stock < 0) {
      throw new AppError("Stock tidak boleh minus", 400);
    }

    await BookRepository.create(data);

    return {
      message: "Buku berhasil ditambahkan",
    };
  },

  async updateBook(id: string, data: Partial<CreateBookDTO>) {
    const book = await BookRepository.findById(id);
    if (!book) {
      throw new AppError("Buku tidak ditemukan", 404);
    }

    if (data.stock !== undefined && data.stock < 0) {
      throw new AppError("Stock tidak boleh minus", 400);
    }

    await BookRepository.update(id, data);
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
    return { message: "Buku berhasil dihapus" };
  },
};
