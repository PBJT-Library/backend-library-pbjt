// =====================================================
// BOOK CATALOG - Metadata only (title, author, etc)
// =====================================================
export interface BookCatalog {
  id: string;
  title: string;
  category_code: string;
  category_name?: string;
  author: string;
  publisher: string;
  year: number;
  total_copies?: number;
  available_copies?: number;
  loaned_copies?: number;
}

export interface CreateBookCatalogDTO {
  title: string;
  category_code: string;
  author: string;
  publisher: string;
  year: number;
  stock: number;
}

// =====================================================
// BOOK INVENTORY - Physical books
// =====================================================
export interface BookInventory {
  id: string;
  catalog_id: string;
  status: 'available' | 'loaned' | 'maintenance' | 'damaged' | 'lost';
  condition: 'good' | 'fair' | 'poor' | 'damaged';
  created_at?: string;
}

export interface CreateBookInventoryDTO {
  id: string;
  catalog_id: string;
  status?: 'available' | 'loaned' | 'maintenance' | 'damaged' | 'lost';
  condition?: 'good' | 'fair' | 'poor' | 'damaged';
}

// =====================================================
// LEGACY - For backward compatibility (will be deprecated)
// =====================================================
export interface Book {
  id: string;
  title: string;
  category: string;
  author: string;
  publisher: string;
  year: number;
  stock: number;
}

export interface CreateBookDTO {
  id: string;
  title: string;
  category: string;
  author: string;
  publisher: string;
  year: number;
  stock: number;
}
