/**
 * TypeScript type definitions for database tables
 * Updated to match fresh schema with UUID support
 */

// ============================================
// CORE ENTITIES
// ============================================

export interface Admin {
  id: number; // SERIAL
  uuid: string; // UUID
  username: string;
  password: string;
  token_version: number;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: number; // SERIAL
  uuid: string; // UUID
  code: string; // Unique code (e.g., "MAT", "INF", "FIS")
  name: string;
  description: string | null;
  created_at: Date;
}

export interface Book {
  id: number; // SERIAL
  uuid: string; // UUID
  book_id: string; // Unique display ID (e.g., "MAT000001")
  title: string;
  author: string | null;
  publisher: string | null;
  publication_year: number | null;
  category_id: number; // Foreign key to categories.id
  category_name?: string; // Joined from categories table
  category_code?: string; // Joined from categories table
  status: 'available' | 'loaned' | 'reserved';
  cover_url: string | null;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Member {
  id: number; // SERIAL
  uuid: string; // UUID
  member_id: string; // Unique display ID (e.g., "23190001")
  name: string;
  study_program: string | null;
  semester: number;
  join_date: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Loan {
  id: number; // SERIAL
  uuid: string; // UUID
  loan_id: string; // Unique display ID (e.g., "LN001")
  member_uuid: string; // Foreign key to members.uuid
  member_name?: string; // Joined from members table
  member_id?: string; // Joined from members table
  loan_date: Date;
  due_date: Date;
  status: 'active' | 'completed' | 'overdue';
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface LoanItem {
  id: number; // SERIAL
  uuid: string; // UUID
  loan_id: number; // Foreign key to loans.id
  book_id: number; // Foreign key to books.id
  book_title?: string; // Joined from books table
  book_display_id?: string; // Joined from books.book_id
  returned_at: Date | null;
  return_condition: string | null;
  notes: string | null;
  created_at: Date;
}

// ============================================
// DTOs (Data Transfer Objects)
// ============================================

export interface CreateCategoryDTO {
  code: string; // 3-10 characters, uppercase recommended
  name: string;
  description?: string;
}

export interface UpdateCategoryDTO {
  name?: string;
  description?: string;
}

export interface CreateBookDTO {
  title: string;
  author?: string;
  publisher?: string;
  publication_year?: number;
  category_id: number; // ID of category, not code
  quantity: number; // How many copies to create (each gets unique book_id)
  status?: 'available' | 'loaned' | 'reserved';
  cover_url?: string;
  description?: string;
}

export interface UpdateBookDTO {
  title?: string;
  author?: string;
  publisher?: string;
  publication_year?: number;
  category_id?: number;
  status?: 'available' | 'loaned' | 'reserved';
  cover_url?: string;
  description?: string;
}

export interface CreateMemberDTO {
  member_id: string; // Custom ID like "23190001"
  name: string;
  study_program?: string;
  semester: number; // 1-14
}

export interface UpdateMemberDTO {
  member_id?: string; // Allow updating NIM
  name?: string;
  study_program?: string;
  semester?: number; // 1-14
  is_active?: boolean;
}

export interface CreateLoanDTO {
  member_uuid: string; // UUID of member
  book_id: number; // ID of book to loan (must be available)
  due_date: Date;
  notes?: string;
}

export interface UpdateLoanDTO {
  due_date?: Date;
  status?: 'active' | 'completed' | 'overdue';
  notes?: string;
  book_id?: number; // Optional: allows changing book during edit
}

export interface ReturnLoanDTO {
  return_condition?: string;
  notes?: string;
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface LoanWithDetails extends Loan {
  book_title: string;
  book_id: string;
  book_display_id: string;
  member_name: string;
  returned_at?: Date | null;
}

export interface BookWithCategory extends Book {
  category_name: string;
  category_code: string;
}

export interface CategoryWithBookCount extends Category {
  book_count: number;
}

export interface MemberWithActiveLoans extends Member {
  active_loans_count: number;
}
