import { db } from "../../config/db";
import { CreateLoanDTO, Loan } from "./loan.model";

export const LoanRepository = {
  /**
   * Get all loans with book and member details
   */
  async findAll(): Promise<Loan[]> {
    const loans = await db<Loan[]>`
      SELECT 
        l.uuid AS id,
        l.id AS uuid,
        l.inventory_id,
        c.title AS book_title,
        m.id AS member_id,
        m.name AS member_name,
        l.loan_date::text AS loan_date,
        l.return_date::text AS return_date,
        l.condition_on_return,
        l.notes
      FROM loans l
      JOIN book_inventory i ON l.inventory_id = i.id
      JOIN book_catalog c ON i.catalog_id = c.id
      JOIN members m ON l.member_uuid = m.uuid
      ORDER BY l.loan_date DESC
    `;
    return loans.map((row) => ({
      id: row.id,
      uuid: row.uuid,
      inventory_id: row.inventory_id,
      book_title: row.book_title,
      member_id: row.member_id,
      member_name: row.member_name,
      loan_date: row.loan_date,
      return_date: row.return_date ?? null,
      condition_on_return: row.condition_on_return ?? null,
      notes: row.notes ?? null,
    }));
  },

  /**
   * Get a single loan by ID
   */
  async findById(id: string): Promise<Loan | null> {
    const result = await db`
      SELECT
        l.uuid AS id,
        l.id AS uuid,
        l.inventory_id,
        c.title AS book_title,
        m.id AS member_id,
        m.name AS member_name,
        l.loan_date::text AS loan_date,
        l.return_date::text AS return_date,
        l.condition_on_return,
        l.notes
      FROM loans l
      JOIN book_inventory i ON l.inventory_id = i.id
      JOIN book_catalog c ON i.catalog_id = c.id
      JOIN members m ON l.member_uuid = m.uuid
      WHERE l.uuid = ${id}
    `;
    if (result.length === 0) return null;

    const row = result[0];
    return {
      id: row.id,
      uuid: row.uuid,
      inventory_id: row.inventory_id,
      book_title: row.book_title,
      member_id: row.member_id,
      member_name: row.member_name,
      loan_date: row.loan_date,
      return_date: row.return_date ?? null,
      condition_on_return: row.condition_on_return ?? null,
      notes: row.notes ?? null,
    };
  },

  /**
   * Create a new loan
   * IMPORTANT: No stock manipulation here!
   * We only update inventory status from 'available' to 'loaned'
   */
  async create(trx: any, loan: CreateLoanDTO): Promise<string> {
    // Validate member exists
    const memberResult = await trx`
      SELECT uuid FROM members WHERE id = ${loan.id}
    `;

    if (memberResult.length === 0) {
      throw new Error("Member tidak ditemukan");
    }

    const memberUuid = memberResult[0].uuid;

    // Find available book from the catalog
    const availableBooks = await trx`
      SELECT i.id, i.status
      FROM book_inventory i
      WHERE i.catalog_id = ${loan.catalog_id}
      AND i.status = 'available'
      LIMIT 1
    `;

    if (availableBooks.length === 0) {
      throw new Error("Tidak ada buku yang tersedia untuk dipinjam");
    }

    const inventoryId = availableBooks[0].id;

    // Create loan record
    let insertQuery = trx`
      INSERT INTO loans (inventory_id, member_uuid, loan_date)
      VALUES (${inventoryId}, ${memberUuid}, ${loan.loan_date || 'CURRENT_DATE'})
      RETURNING id
    `;

    const result = await insertQuery;

    // ✅ CRITICAL: Only update inventory status, NOT stock!
    // Stock remains constant as total books owned
    await trx`
      UPDATE book_inventory
      SET status = 'loaned'
      WHERE id = ${inventoryId}
    `;

    return result[0].id; // return UUID loan baru
  },

  /**
   * Return a loaned book
   * IMPORTANT: No stock manipulation here!
   * We only update inventory status from 'loaned' back to 'available'
   */
  async returnLoan(
    trx: any,
    loanId: string,
    conditionOnReturn?: string
  ): Promise<void> {
    const result = await trx`
      UPDATE loans 
      SET return_date = CURRENT_DATE,
          condition_on_return = ${conditionOnReturn || null}
      WHERE id = ${loanId} AND return_date IS NULL
      RETURNING inventory_id
    `;

    if (result.length === 0) {
      throw new Error("Pinjaman tidak ditemukan atau sudah dikembalikan");
    }

    const { inventory_id } = result[0];

    // ✅ CRITICAL: Only update inventory status, NOT stock!
    // Determine new status based on condition
    let newStatus = 'available';
    if (conditionOnReturn === 'damaged' || conditionOnReturn === 'poor') {
      newStatus = 'damaged';
    }

    await trx`
      UPDATE book_inventory
      SET status = ${newStatus}
      WHERE id = ${inventory_id}
    `;
  },

  /**
   * Update loan details (not for returning books)
   */
  async updatePartial(
    trx: any,
    loanId: string,
    data: {
      loan_date?: string;
      notes?: string;
    }
  ): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [];

    if (data.loan_date !== undefined) {
      sets.push(`loan_date = $${values.length + 1}`);
      values.push(data.loan_date);
    }

    if (data.notes !== undefined) {
      sets.push(`notes = $${values.length + 1}`);
      values.push(data.notes);
    }

    if (sets.length === 0) return;

    await trx.unsafe(
      `
      UPDATE loans
      SET ${sets.join(", ")}
      WHERE id = $${values.length + 1}
        AND return_date IS NULL
      `,
      [...values, loanId]
    );
  },

  /**
   * Delete a loan (use with caution)
   * Should restore inventory status if loan wasn't returned
   */
  async delete(id: string): Promise<void> {
    // Get loan details first
    const loan = await db`
      SELECT inventory_id, return_date
      FROM loans
      WHERE id = ${id}
    `;

    if (loan.length === 0) {
      throw new Error("Loan tidak ditemukan");
    }

    // If loan wasn't returned, restore inventory status
    if (!loan[0].return_date) {
      await db`
        UPDATE book_inventory
        SET status = 'available'
        WHERE id = ${loan[0].inventory_id}
      `;
    }

    // Delete the loan
    await db`
      DELETE FROM loans
      WHERE id = ${id}
    `;
  },
};
