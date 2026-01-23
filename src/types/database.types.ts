/**
 * Manual TypeScript type definitions for database tables
 * These replace Prisma-generated types after Prisma removal
 */

export interface Admin {
    id: string; // UUID
    username: string;
    password: string;
    token_version: number;
    created_at: Date;
    updated_at: Date;
}

export interface Category {
    code: string; // Primary key (e.g. "FIK", "INF")
    name: string;
    description: string | null;
}

export interface BookCatalog {
    id: string; // Primary key (e.g. "FIK001")
    title: string;
    category_code: string; // Foreign key to categories.code
    category_name?: string; // Joined from categories table
    author: string;
    publisher: string;
    year: number;
    total_copies?: number; // Calculated from book_inventory
    available_copies?: number; // Calculated from book_inventory
    loaned_copies?: number; // Calculated from book_inventory
}

export interface BookInventory {
    id: string; // Primary key (e.g. "FIK001-1")
    catalog_id: string; // Foreign key to book_catalog.id
    status: 'available' | 'loaned' | 'lost' | 'damaged';
    condition: 'good' | 'fair' | 'poor';
}

export interface Loan {
    uuid: string; // UUID - Primary key
    id: string; // Human-readable ID (e.g. "LN001")
    inventory_id: string; // Foreign key to book_inventory.id
    member_uuid: string; // Foreign key to members.uuid
    loan_date: Date;
    due_date: Date;
    return_date: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface Member {
    uuid: string; // UUID - Primary key
    id: string; // Human-readable ID (e.g. "23190001")
    name: string;
    study_program: string;
    semester: number; // 1-14
}

// DTOs for creating/updating entities

export interface CreateCategoryDTO {
    code: string;
    name: string;
    description?: string;
}

export interface CreateBookCatalogDTO {
    category_code: string;
    title: string;
    author: string;
    publisher: string;
    year: number;
    stock: number; // Number of copies to create in inventory
}

export interface CreateBookInventoryDTO {
    id: string;
    catalog_id: string;
    status?: 'available' | 'loaned' | 'lost' | 'damaged';
    condition?: 'good' | 'fair' | 'poor';
}

export interface CreateLoanDTO {
    inventory_id: string;
    member_uuid: string;
    due_date: Date;
}

export interface CreateMemberDTO {
    id: string;
    name: string;
    study_program: string;
    semester: number;
}

export interface UpdateMemberDTO {
    name?: string;
    study_program?: string;
    semester?: number;
}
