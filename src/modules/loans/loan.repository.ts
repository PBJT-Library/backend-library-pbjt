import { db } from "../../config/db";
import type {
  CreateLoanDTO,
  Loan,
  LoanWithDetails,
  ReturnLoanDTO,
  UpdateLoanDTO,
} from "../../types/database.types";
import { AppError } from "../../handler/error";

export const LoanRepository = {
  /**
   * Get all loans with member and book details
   */
  async findAll(): Promise<LoanWithDetails[]> {
    const result = await db`
      SELECT 
        l.id,
        l.uuid,
        l.loan_id,
        l.member_uuid,
        m.member_id,
        m.name as member_name,
        l.loan_date,
        l.due_date,
        l.status,
        l.notes,
        l.created_at,
        l.updated_at,
        li.book_id,
        b.book_id as book_display_id,
        b.title as book_title,
        li.returned_at
      FROM public.loans l
      JOIN public.members m ON l.member_uuid = m.uuid
      LEFT JOIN public.loan_items li ON l.id = li.loan_id
      LEFT JOIN public.books b ON li.book_id = b.id
      ORDER BY l.created_at DESC
    `;

    return result.map((row: any) => ({
      id: row.id,
      uuid: row.uuid,
      loan_id: row.loan_id,
      member_uuid: row.member_uuid,
      member_id: row.member_id,
      member_name: row.member_name,
      loan_date: row.loan_date,
      due_date: row.due_date,
      status: row.status,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      book_id: row.book_display_id,
      book_title: row.book_title,
      book_display_id: row.book_display_id,
      returned_at: row.returned_at,
    }));
  },

  /**
   * Get a single loan by loan_id (display ID like LN001)
   */
  async findByLoanId(loan_id: string): Promise<LoanWithDetails | null> {
    const result = await db`
      SELECT 
        l.id,
        l.uuid,
        l.loan_id,
        l.member_uuid,
        m.member_id,
        m.name as member_name,
        l.loan_date,
        l.due_date,
        l.status,
        l.notes,
        l.created_at,
        l.updated_at,
        li.book_id,
        b.book_id as book_display_id,
        b.title as book_title,
        li.returned_at
      FROM public.loans l
      JOIN public.members m ON l.member_uuid = m.uuid
      LEFT JOIN public.loan_items li ON l.id = li.loan_id
      LEFT JOIN public.books b ON li.book_id = b.id
      WHERE l.loan_id = ${loan_id}
    `;

    if (result.length === 0) return null;

    const row = result[0];
    return {
      id: row.id,
      uuid: row.uuid,
      loan_id: row.loan_id,
      member_uuid: row.member_uuid,
      member_id: row.member_id,
      member_name: row.member_name,
      loan_date: row.loan_date,
      due_date: row.due_date,
      status: row.status,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      book_id: row.book_display_id,
      book_title: row.book_title,
      book_display_id: row.book_display_id,
      returned_at: row.returned_at,
    };
  },

  /**
   * Find active loans for a member (for max 3 validation)
   */
  async findActiveLoansByMember(member_uuid: string): Promise<Loan[]> {
    const result = await db`
      SELECT 
        id, uuid, loan_id, member_uuid, loan_date, due_date,
        status, notes, created_at, updated_at
      FROM public.loans
      WHERE member_uuid = ${member_uuid} AND status = 'active'
      ORDER BY created_at DESC
    `;

    return result.map((row: any) => ({
      id: row.id,
      uuid: row.uuid,
      loan_id: row.loan_id,
      member_uuid: row.member_uuid,
      loan_date: row.loan_date,
      due_date: row.due_date,
      status: row.status,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  },

  /**
   * Count active loans for a member
   */
  async countActiveLoans(member_uuid: string): Promise<number> {
    const result = await db`
      SELECT COUNT(*) as count
      FROM public.loans
      WHERE member_uuid = ${member_uuid} AND status = 'active'
    `;

    return parseInt(result[0].count);
  },

  /**
   * Create a new loan with max 3 validation
   * Auto-generates loan_id like LN001, LN002, etc.
   */
  async create(loan: CreateLoanDTO): Promise<string> {
    // 1. Validate member exists
    const member = await db`
      SELECT uuid FROM public.members WHERE uuid = ${loan.member_uuid}
    `;

    if (member.length === 0) {
      throw new AppError("Member tidak ditemukan", 404);
    }

    // 2. Check max 3 active loans per member
    const activeCount = await this.countActiveLoans(loan.member_uuid);

    if (activeCount >= 3) {
      throw new AppError(
        "Maksimal 3 buku per member. Kembalikan salah satu terlebih dahulu.",
        400,
      );
    }

    // 3. Check if book exists and is available
    const book = await db`
      SELECT id, status FROM public.books WHERE id = ${loan.book_id}
    `;

    if (book.length === 0) {
      throw new AppError("Buku tidak ditemukan", 404);
    }

    if (book[0].status !== "available") {
      throw new AppError("Buku sedang tidak tersedia", 400);
    }

    // 4. Generate loan_id (LN001, LN002, etc.)
    const existingLoans = await db`
      SELECT COUNT(*) as count FROM public.loans
    `;
    const count = parseInt(existingLoans[0].count);
    const loan_id = `LN${String(count + 1).padStart(3, "0")}`;

    // 5. Calculate loan_date (today) and due_date
    const loan_date = new Date();
    const due_date = loan.due_date ? new Date(loan.due_date) : new Date();

    // If due_date not provided, default to 14 days from now
    if (!loan.due_date) {
      due_date.setDate(loan_date.getDate() + 14);
    }

    // 6. Create loan record
    const newLoan = await db`
      INSERT INTO public.loans (
        loan_id,
        member_uuid,
        loan_date,
        due_date,
        status,
        notes
      ) VALUES (
        ${loan_id},
        ${loan.member_uuid},
        ${loan_date.toISOString().split("T")[0]},
        ${due_date.toISOString().split("T")[0]},
        'active',
        ${loan.notes || null}
      )
      RETURNING id, loan_id
    `;

    const loanId = newLoan[0].id;

    // 7. Create loan item (1 loan = 1 book due to UNIQUE constraint)
    await db`
      INSERT INTO public.loan_items (loan_id, book_id)
      VALUES (${loanId}, ${loan.book_id})
    `;

    // 8. Update book status to 'loaned'
    await db`
      UPDATE public.books
      SET status = 'loaned'
      WHERE id = ${loan.book_id}
    `;

    return newLoan[0].loan_id;
  },

  /**
   * Return a loan (sets book as available, marks loan as completed)
   */
  async returnLoan(loan_id: string, returnData?: ReturnLoanDTO): Promise<void> {
    // 1. Get loan with book info
    const loan = await this.findByLoanId(loan_id);

    if (!loan) {
      throw new AppError("Loan tidak ditemukan", 404);
    }

    if (loan.status === "completed") {
      throw new AppError("Loan sudah dikembalikan", 400);
    }

    // 2. Get loan item
    const loanItem = await db`
      SELECT id, book_id
      FROM public.loan_items
      WHERE loan_id = ${loan.id}
    `;

    if (loanItem.length === 0) {
      throw new AppError("Loan item tidak ditemukan", 404);
    }

    // 3. Update loan item with return info
    await db`
      UPDATE public.loan_items
      SET 
        returned_at = NOW(),
        return_condition = ${returnData?.return_condition || null},
        notes = ${returnData?.notes || null}
      WHERE id = ${loanItem[0].id}
    `;

    // 4. Update book status to 'available'
    await db`
      UPDATE public.books
      SET status = 'available'
      WHERE id = ${loanItem[0].book_id}
    `;

    // 5. Update loan status to 'completed'
    await db`
      UPDATE public.loans
      SET status = 'completed'
      WHERE id = ${loan.id}
    `;
  },

  /**
   * Update loan (change due date, notes, or swap book)
   */
  async update(loan_id: string, data: UpdateLoanDTO): Promise<void> {
    // Handle book swap if book_id is provided
    if (data.book_id !== undefined) {
      // 1. Get current loan with book info
      const loan = await this.findByLoanId(loan_id);
      if (!loan) {
        throw new AppError("Loan tidak ditemukan", 404);
      }

      // 2. Get current loan item
      const currentLoanItem = await db`
        SELECT id, book_id FROM public.loan_items WHERE loan_id = ${loan.id}
      `;

      if (currentLoanItem.length === 0) {
        throw new AppError("Loan item tidak ditemukan", 404);
      }

      const oldBookId = currentLoanItem[0].book_id;

      // 3. Check if new book is different
      if (oldBookId !== data.book_id) {
        // 4. Check if new book is available
        const newBook = await db`
          SELECT id, status FROM public.books WHERE id = ${data.book_id}
        `;

        if (newBook.length === 0) {
          throw new AppError("Buku baru tidak ditemukan", 404);
        }

        if (newBook[0].status !== "available") {
          throw new AppError("Buku baru sedang tidak tersedia", 400);
        }

        // 5. Update loan_items with new book_id
        await db`
          UPDATE public.loan_items
          SET book_id = ${data.book_id}
          WHERE id = ${currentLoanItem[0].id}
        `;

        // 6. Change old book status to 'available'
        await db`
          UPDATE public.books
          SET status = 'available'
          WHERE id = ${oldBookId}
        `;

        // 7. Change new book status to 'loaned'
        await db`
          UPDATE public.books
          SET status = 'loaned'
          WHERE id = ${data.book_id}
        `;
      }
    }

    // Update loan record (due_date, status, notes)
    const updates: any = {};

    if (data.due_date !== undefined) updates.due_date = data.due_date;
    if (data.status !== undefined) updates.status = data.status;
    if (data.notes !== undefined) updates.notes = data.notes;

    if (Object.keys(updates).length === 0) return;

    await db`
      UPDATE public.loans
      SET ${db(updates)}
      WHERE loan_id = ${loan_id}
    `;
  },

  /**
   * Delete a loan (only if not active)
   * Restores book to available status
   */
  async delete(loan_id: string): Promise<void> {
    const loan = await this.findByLoanId(loan_id);

    if (!loan) {
      throw new AppError("Loan tidak ditemukan", 404);
    }

    if (loan.status === "active") {
      throw new AppError(
        "Tidak dapat menghapus loan yang masih aktif. Return terlebih dahulu.",
        400,
      );
    }

    // Get loan item to restore book
    const loanItem = await db`
      SELECT book_id FROM public.loan_items WHERE loan_id = ${loan.id}
    `;

    if (loanItem.length > 0) {
      // Restore book to available
      await db`
        UPDATE public.books
        SET status = 'available'
        WHERE id = ${loanItem[0].book_id}
      `;
    }

    // Delete loan (cascade will delete loan_items)
    await db`
      DELETE FROM public.loans WHERE id = ${loan.id}
    `;
  },

  /**
   * Get total active loans count (across all members)
   */
  async countAllActiveLoans(): Promise<number> {
    const result = await db`
      SELECT COUNT(*) as count
      FROM public.loans
      WHERE status = 'active'
    `;
    return parseInt(result[0].count);
  },

  /**
   * Get total loans count
   */
  async count(): Promise<number> {
    const result = await db`
      SELECT COUNT(*) as count FROM public.loans
    `;
    return parseInt(result[0].count);
  },

  /**
   * Check for overdue loans and update status
   */
  async updateOverdueLoans(): Promise<number> {
    const result = await db`
      UPDATE public.loans
      SET status = 'overdue'
      WHERE status = 'active' 
        AND due_date < CURRENT_DATE
      RETURNING id
    `;

    return result.length;
  },

  /**
   * Get loans by status
   */
  async findByStatus(
    status: "active" | "completed" | "overdue",
  ): Promise<LoanWithDetails[]> {
    const result = await db`
      SELECT 
        l.id,
        l.uuid,
        l.loan_id,
        l.member_uuid,
        m.member_id,
        m.name as member_name,
        l.loan_date,
        l.due_date,
        l.status,
        l.notes,
        l.created_at,
        l.updated_at,
        li.book_id,
        b.book_id as book_display_id,
        b.title as book_title
      FROM public.loans l
      JOIN public.members m ON l.member_uuid = m.uuid
      LEFT JOIN public.loan_items li ON l.id = li.loan_id
      LEFT JOIN public.books b ON li.book_id = b.id
      WHERE l.status = ${status}
      ORDER BY l.created_at DESC
    `;

    return result.map((row: any) => ({
      id: row.id,
      uuid: row.uuid,
      loan_id: row.loan_id,
      member_uuid: row.member_uuid,
      member_id: row.member_id,
      member_name: row.member_name,
      loan_date: row.loan_date,
      due_date: row.due_date,
      status: row.status,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      book_id: row.book_display_id,
      book_title: row.book_title,
      book_display_id: row.book_display_id,
    }));
  },
};
