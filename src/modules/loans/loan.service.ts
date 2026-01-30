import type {
  CreateLoanDTO,
  UpdateLoanDTO,
  ReturnLoanDTO,
} from "../../types/database.types";
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
        console.log("[Cache HIT] loans:all");
        return cached;
      }
      console.log("[Cache MISS] loans:all - Querying database...");
    } catch (error) {
      console.error("Cache read error:", error);
    }

    const loans = await LoanRepository.findAll();

    try {
      await redisHelper.setCache(cacheKey, loans, 180); // 3 minutes
      console.log("Cached loans:all for 3 minutes");
    } catch (error) {
      console.error("Cache write error:", error);
    }

    return loans;
  },

  async getLoanByLoanId(loan_id: string) {
    const cacheKey = `loans:${loan_id}`;

    try {
      const cached = await redisHelper.getCache(cacheKey);
      if (cached) {
        console.log(`[Cache HIT] loans:${loan_id}`);
        return cached;
      }
      console.log(`[Cache MISS] loans:${loan_id} - Querying database...`);
    } catch (error) {
      console.error("Cache read error:", error);
    }

    const loan = await LoanRepository.findByLoanId(loan_id);
    if (!loan) {
      throw new AppError("Data pinjaman tidak ditemukan", 404);
    }

    try {
      await redisHelper.setCache(cacheKey, loan, 300); // 5 minutes
      console.log(`Cached loans:${loan_id} for 5 minutes`);
    } catch (error) {
      console.error("Cache write error:", error);
    }

    return loan;
  },

  async borrowBook(data: CreateLoanDTO) {
    console.log(
      "[DEBUG] borrowBook called with data:",
      JSON.stringify(data, null, 2),
    );

    // Max 3 validation & book availability checked in repository
    const loan_id = await LoanRepository.create(data);

    // Invalidate cache
    try {
      await invalidateCache("loans:*");
      await invalidateCache("books:*"); // Book status changed
      console.log("Invalidated loans and books cache after borrow");
    } catch (error) {
      console.error("Cache invalidation error:", error);
    }

    return {
      message: "Peminjaman buku berhasil",
      loan_id,
    };
  },

  async returnBook(loan_id: string, returnData?: ReturnLoanDTO) {
    await LoanRepository.returnLoan(loan_id, returnData);

    // Invalidate cache
    try {
      await invalidateCache("loans:*");
      await invalidateCache("books:*"); // Book status changed to available
      console.log("Invalidated loans and books cache after return");
    } catch (error) {
      console.error("Cache invalidation error:", error);
    }

    return {
      message: "Buku berhasil dikembalikan",
    };
  },

  async bulkReturnBooks(loanIds: string[]) {
    if (!loanIds || loanIds.length === 0) {
      throw new AppError("No loans selected for return", 400);
    }

    let successCount = 0;
    const errors: string[] = [];

    for (const loanId of loanIds) {
      try {
        await LoanRepository.returnLoan(loanId);
        successCount++;
      } catch (error) {
        errors.push(
          `Failed to return loan ${loanId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    // Invalidate cache
    try {
      await invalidateCache("loans:*");
      await invalidateCache("books:*");
      console.log("Invalidated loans and books cache after bulk return");
    } catch (error) {
      console.error("Cache invalidation error:", error);
    }

    return {
      message: `Successfully returned ${successCount} out of ${loanIds.length} books`,
      successCount,
      totalRequested: loanIds.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  },

  async updateLoan(loan_id: string, data: UpdateLoanDTO) {
    const loan = await LoanRepository.findByLoanId(loan_id);
    if (!loan) {
      throw new AppError("Data pinjaman tidak ditemukan", 404);
    }

    await LoanRepository.update(loan_id, data);

    // Invalidate cache
    try {
      await redisHelper.deleteCache(`loans:${loan_id}`);
      await redisHelper.deleteCache("loans:all");
      // If book was changed, invalidate books cache too
      if (data.book_id !== undefined) {
        await invalidateCache("books:*");
      }
      console.log("Invalidated cache after loan update");
    } catch (error) {
      console.error("Cache invalidation error:", error);
    }

    return {
      message: "Data pinjaman berhasil diperbarui",
    };
  },

  async deleteLoan(loan_id: string) {
    const loan = await LoanRepository.findByLoanId(loan_id);
    if (!loan) {
      throw new AppError("Data pinjaman tidak ditemukan", 404);
    }

    await LoanRepository.delete(loan_id);

    // Invalidate cache
    try {
      await invalidateCache("loans:*");
      if (loan.status === "active") {
        await invalidateCache("books:*"); // Book will be restored to available
      }
      console.log("Invalidated cache after loan delete");
    } catch (error) {
      console.error("Cache invalidation error:", error);
    }

    return {
      message: "Data pinjaman berhasil dihapus",
    };
  },
};
