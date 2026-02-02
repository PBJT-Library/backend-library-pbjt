import { db } from '../../config/db';
import type { LoanItem } from '../../types/database.types';

export const LoanItemRepository = {
  /**
   * Create a new loan item (used internally by loan.repository)
   * Note: UNIQUE(loan_id) constraint ensures 1 loan = 1 book
   */
  async create(loan_id: number, book_id: number): Promise<number> {
    const result = await db`
      INSERT INTO public.loan_items (loan_id, book_id)
      VALUES (${loan_id}, ${book_id})
      RETURNING id
    `;
    return result[0].id;
  },

  /**
   * Find loan item by loan ID
   */
  async findByLoanId(loan_id: number): Promise<LoanItem | null> {
    const result = await db`
      SELECT 
        li.id,
        li.uuid,
        li.loan_id,
        li.book_id,
        b.book_id as book_display_id,
        b.title as book_title,
        li.returned_at,
        li.return_condition,
        li.notes,
        li.created_at
      FROM public.loan_items li
      JOIN public.books b ON li.book_id = b.id
      WHERE li.loan_id = ${loan_id}
    `;

    if (result.length === 0) return null;

    return result[0] as LoanItem;
  },

  /**
   * Update return information for a loan item
   */
  async markAsReturned(loan_id: number, return_condition?: string, notes?: string): Promise<void> {
    await db`
      UPDATE public.loan_items
      SET 
        returned_at = NOW(),
        return_condition = ${return_condition || null},
        notes = ${notes || null}
      WHERE loan_id = ${loan_id}
    `;
  },

  /**
   * Check if loan item is returned
   */
  async isReturned(loan_id: number): Promise<boolean> {
    const result = await db`
      SELECT returned_at
      FROM public.loan_items
      WHERE loan_id = ${loan_id}
    `;

    if (result.length === 0) return false;

    return result[0].returned_at !== null;
  },

  /**
   * Delete loan item (cascade deletion, rarely used directly)
   */
  async delete(loan_id: number): Promise<void> {
    await db`
      DELETE FROM public.loan_items
      WHERE loan_id = ${loan_id}
    `;
  },
};
