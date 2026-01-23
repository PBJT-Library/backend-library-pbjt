import { CreateLoanDTO } from "./loan.model";
import { LoanRepository } from "./loan.repository";
import { AppError } from "../../handler/error";
import { redisHelper } from "../../config/redis";
import { invalidateCache } from "../../middleware/cache.middleware";

export const LoanService = {
  async getAllLoans() {
    const cacheKey = "loans:all";

    try {
      const cached = await redisHelper.getCache(cacheKey);
      if (cached) {
        console.log("✅ [Cache HIT] loans:all");
        return cached;
      }
      console.log("❌ [Cache MISS] loans:all - Querying database...");
    } catch (error) {
      console.error("⚠️ Cache read error:", error);
    }

    const loans = await LoanRepository.findAll();

    try {
      await redisHelper.setCache(cacheKey, loans, 180); // 3 minutes (frequently changes)
      console.log("💾 Cached loans:all for 3 minutes");
    } catch (error) {
      console.error("⚠️ Cache write error:", error);
    }

    return loans;
  },

  async getLoanById(id: string) {
    const cacheKey = `loans:${id}`;

    try {
      const cached = await redisHelper.getCache(cacheKey);
      if (cached) {
        console.log(`✅ [Cache HIT] loans:${id}`);
        return cached;
      }
      console.log(`❌ [Cache MISS] loans:${id} - Querying database...`);
    } catch (error) {
      console.error("⚠️ Cache read error:", error);
    }

    const loan = await LoanRepository.findById(id);
    if (!loan) {
      throw new AppError("Data pinjaman tidak ditemukan", 404);
    }

    try {
      await redisHelper.setCache(cacheKey, loan, 300); // 5 minutes
      console.log(`💾 Cached loans:${id} for 5 minutes`);
    } catch (error) {
      console.error("⚠️ Cache write error:", error);
    }

    return loan;
  },

  async borrowBook(data: CreateLoanDTO) {
    // ✅ No quantity validation - CreateLoanDTO doesn't have quantity field
    // It uses catalog_id to find available books

    // Transaction handled internally by LoanRepository
    const loan_id = await LoanRepository.create(data);

    // Invalidate cache (loans and books - stock changed)
    try {
      await invalidateCache("loans:*");
      await invalidateCache("books:*"); // Cross-module: book stock affected
      console.log("🗑️ Invalidated loans and books cache after borrow");
    } catch (error) {
      console.error("⚠️ Cache invalidation error:", error);
    }

    return {
      message: "Peminjaman buku berhasil",
      loan_id,
    };
  },

  async returnBook(loan_id: string) {
    // Transaction handled internally by LoanRepository
    await LoanRepository.returnLoan(loan_id);

    // Invalidate cache (loans and books - stock changed)
    try {
      await invalidateCache("loans:*");
      await invalidateCache("books:*"); // Cross-module: book stock restored
      console.log("🗑️ Invalidated loans and books cache after return");
    } catch (error) {
      console.error("⚠️ Cache invalidation error:", error);
    }

    return {
      message: "Buku berhasil dikembalikan dan stok diperbarui",
    };
  },

  async updateLoanBody(
    loan_id: string,
    body: {
      book_id?: string;
      member_id?: string;
      loan_date?: string;
    },
  ) {
    const loan = await LoanRepository.findById(loan_id);
    if (!loan) {
      throw new AppError("Data pinjaman tidak ditemukan", 404);
    }
    if (loan.return_date) {
      throw new AppError("Pinjaman sudah dikembalikan", 400);
    }

    let safeBody = { ...body };
    if (body.loan_date) {
      safeBody.loan_date = body.loan_date.split("T")[0];
    }

    // Transaction handled internally by LoanRepository (if needed)
    await LoanRepository.updatePartial(loan_id, safeBody);

    // Invalidate cache
    try {
      await redisHelper.deleteCache(`loans:${loan_id}`);
      await redisHelper.deleteCache("loans:all");
      // If book changed, invalidate books too
      if (body.book_id) {
        await invalidateCache("books:*");
      }
      console.log("🗑️ Invalidated cache after loan update");
    } catch (error) {
      console.error("⚠️ Cache invalidation error:", error);
    }

    return {
      message: "Data pinjaman berhasil diperbarui",
    };
  },

  async deleteLoan(loan_id: string) {
    const loan = await LoanRepository.findById(loan_id);
    if (!loan) {
      throw new AppError("Data pinjaman tidak ditemukan", 404);
    }

    // ✅ Delete uses prisma directly (no transaction needed - already handles inventory restore)
    await LoanRepository.delete(loan_id);

    // Invalidate cache (loans and maybe books)
    try {
      await invalidateCache("loans:*");
      if (!loan.return_date) {
        await invalidateCache("books:*"); // Stock was restored
      }
      console.log("🗑️ Invalidated cache after loan delete");
    } catch (error) {
      console.error("⚠️ Cache invalidation error:", error);
    }

    return {
      message: "Data pinjaman berhasil dihapus",
    };
  },
};
