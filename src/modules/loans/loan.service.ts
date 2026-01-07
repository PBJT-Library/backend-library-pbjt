import { db } from "../../config/db";
import { CreateLoanDTO } from "./loan.model";
import { LoanRepository } from "./loan.repository";

export const LoanService = {
  async getAllLoans() {
    return await LoanRepository.findAll();
  },

  async getLoanById(id: string) {
    const loan = await LoanRepository.findById(id);
    if (!loan) throw new Error("Data pinjaman tidak ditemukan");
    return loan;
  },

  async borrowBook(data: CreateLoanDTO) {
    if (data.quantity <= 0) {
      throw new Error("Jumlah pinjaman tidak valid");
    }

    let loan_id = "";

    await db.begin(async (trx) => {
      loan_id = await LoanRepository.create(trx, data);
    });

    return {
      message: "Peminjaman buku berhasil",
      loan_id,
    };
  },

  async returnBook(loan_id: string) {
    await db.begin(async (trx) => {
      await LoanRepository.returnLoan(trx, loan_id);
    });

    return {
      message: "Buku berhasil dikembalikan dan stok diperbarui",
    };
  },

  async updateLoanBody(
    loan_id: string,
    body: {
      book_id?: string;
      member_id?: string;
      quantity?: number;
      loan_date?: string;
    },
  ) {
    const loan = await LoanRepository.findById(loan_id);
    if (!loan) throw new Error("Data pinjaman tidak ditemukan");
    if (loan.return_date) throw new Error("Pinjaman sudah dikembalikan");

    let safeBody = { ...body };
    if (body.loan_date) {
      safeBody.loan_date = body.loan_date.split("T")[0];
    }

    await db.begin(async (trx) => {
      await LoanRepository.updatePartial(trx, loan_id, safeBody);
    });

    return {
      message: "Data pinjaman berhasil diperbarui",
    };
  },

  async deleteLoan(loan_id: string) {
    const loan = await LoanRepository.findById(loan_id);
    if (!loan) throw new Error("Data pinjaman tidak ditemukan");

    await db.begin(async (trx) => {
      if (!loan.return_date) {
        await trx`
          UPDATE books
          SET stock = stock + ${loan.quantity}
          WHERE uuid = (
            SELECT book_uuid FROM loans WHERE id = ${loan_id}
          )
        `;
      }

      await LoanRepository.delete(loan_id);
    });

    return {
      message: "Data pinjaman berhasil dihapus",
    };
  },
};
