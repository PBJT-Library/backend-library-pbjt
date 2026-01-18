export interface Loan {
  id: string; // UUID internal (untuk URL & relasi)
  uuid: string; // "LN000001" — yang ditampilkan ke user
  inventory_id: string; // ID dari book_inventory (bukan catalog)
  book_title?: string;
  member_id: string;
  member_name?: string;
  loan_date: string;
  return_date?: string | null;
  condition_on_return?: string | null;
  notes?: string | null;
}

export interface CreateLoanDTO {
  id: string; // Member ID (e.g., "23190001")
  catalog_id: string; // Catalog ID to find available books
  loan_date?: string;
}

export interface UpdateLoanDTO {
  loan_date?: string;
  return_date?: string;
  condition_on_return?: string;
  notes?: string;
}
