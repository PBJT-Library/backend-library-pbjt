import { db } from "../../config/db";
import { CreateLoanDTO, Loan } from "./loan.model";

export const LoanRepository = {
  async findAll(): Promise<Loan[]> {
    const loans = await db<Loan[]>`
          SELECT 
            l.id,
            l.uuid,
            b.id AS book_id,
            b.title AS book_title,
            m.id AS member_id,
            m.name AS member_name,
            l.quantity,
            l.loan_date::text AS loan_date,
            l.return_date::text AS return_date
          FROM loans l
          JOIN books b ON l.book_uuid = b.uuid
          JOIN members m ON l.member_uuid = m.uuid
          ORDER BY l.loan_date DESC
        `;
    return loans.map((row) => ({
      id: row.id,
      uuid: row.uuid,
      book_id: row.book_id,
      book_title: row.book_title,
      member_id: row.member_id,
      member_name: row.member_name,
      quantity: row.quantity,
      loan_date: row.loan_date,
      return_date: row.return_date ?? null,
    }));
  },

  async findById(id: string): Promise<Loan | null> {
    const result = await db`
          SELECT
            l.id,
            l.uuid,
            b.id AS book_id,
            b.title AS book_title,
            m.id AS member_id,
            m.name AS member_name,
            l.quantity,
            l.loan_date::text AS loan_date,
            l.return_date::text AS return_date
          FROM loans l
          JOIN books b ON l.book_uuid = b.uuid
          JOIN members m ON l.member_uuid = m.uuid
          WHERE l.id = ${id}
        `;
    if (result.length === 0) return null;

    const row = result[0];
    return {
      id: row.id,
      uuid: row.uuid,
      book_id: row.book_id,
      book_title: row.book_title,
      member_id: row.member_id,
      member_name: row.member_name,
      quantity: row.quantity,
      loan_date: row.loan_date,
      return_date: row.return_date ?? null,
    };
  },

  async create(trx: any, loan: CreateLoanDTO): Promise<string> {
    // Cari uuid buku dan member berdasarkan id custom
    const [bookResult, memberResult] = await Promise.all([
      db`SELECT uuid, stock FROM books WHERE id = ${loan.book_id}`,
      db`SELECT uuid FROM members WHERE id = ${loan.member_id}`,
    ]);

    if (bookResult.length === 0) throw new Error("Buku tidak ditemukan");
    if (memberResult.length === 0) throw new Error("Member tidak ditemukan");

    const book = bookResult[0];
    const member = memberResult[0];

    if (book.stock < loan.quantity) {
      throw new Error("Stock buku tidak cukup");
    }

    let insertQuery = trx`
      INSERT INTO loans (book_uuid, member_uuid, quantity)
      VALUES (${book.uuid}, ${member.uuid}, ${loan.quantity})
      RETURNING id
    `;

    if (loan.loan_date) {
      insertQuery = trx`
        INSERT INTO loans (book_uuid, member_uuid, quantity, loan_date)
        VALUES (${book.uuid}, ${member.uuid}, ${loan.quantity}, ${loan.loan_date})
        RETURNING id
      `;
    }

    const result = await insertQuery;

    // Kurangi stock buku
    await trx`
          UPDATE books 
          SET stock = stock - ${loan.quantity}
          WHERE uuid = ${book.uuid}
        `;

    return result[0].id; // return UUID loan baru
  },

  async returnLoan(trx: any, loanId: string): Promise<void> {
    const result = await trx`
        UPDATE loans 
        SET return_date = CURRENT_DATE
        WHERE id = ${loanId} AND return_date IS NULL
        RETURNING book_uuid, quantity
      `;

    if (result.length === 0) {
      throw new Error("Pinjaman tidak ditemukan atau sudah dikembalikan");
    }

    const { book_uuid, quantity } = result[0];

    // Tambah stock kembali
    await trx`
        UPDATE books 
        SET stock = stock + ${quantity}
        WHERE uuid = ${book_uuid}
      `;
  },

  async updatePartial(
    trx: any,
    loanId: string,
    data: {
      book_id?: string;
      member_id?: string;
      quantity?: number;
      loan_date?: string;
    },
  ): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [];

    if (data.quantity !== undefined) {
      sets.push(`quantity = $${values.length + 1}`);
      values.push(data.quantity);
    }

    if (data.loan_date !== undefined) {
      sets.push(`loan_date = $${values.length + 1}`);
      values.push(data.loan_date);
    }

    if (data.book_id !== undefined) {
      sets.push(`
        book_uuid = (SELECT uuid FROM books WHERE id = $${values.length + 1})
      `);
      values.push(data.book_id);
    }

    if (data.member_id !== undefined) {
      sets.push(`
        member_uuid = (SELECT uuid FROM members WHERE id = $${values.length + 1})
      `);
      values.push(data.member_id);
    }

    if (sets.length === 0) return;

    await trx.unsafe(
      `
      UPDATE loans
      SET ${sets.join(", ")}
      WHERE id = $${values.length + 1}
        AND return_date IS NULL
      `,
      [...values, loanId],
    );
  },

  async delete(id: string): Promise<void> {
    await db`
        DELETE FROM loans
        WHERE id = ${id}
      `;
  },
};
