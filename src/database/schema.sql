-- ============================================
-- FRESH DATABASE SCHEMA: Library Management System
-- Database: library_db
-- With UUID Support using pgcrypto
-- ============================================

-- ============================================
-- POSTGRESQL CONFIGURATION
-- ============================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';

SET default_tablespace = '';
SET default_table_access_method = heap;

-- ============================================
-- CONNECT TO DATABASE
-- ============================================

\c library_db

BEGIN;

-- ============================================
-- 1. ENUMS / TYPES
-- ============================================

CREATE TYPE book_status AS ENUM ('available', 'loaned', 'reserved', 'maintenance', 'lost');
CREATE TYPE loan_status AS ENUM ('active', 'completed', 'overdue');

-- ============================================
-- 2. ADMINS TABLE
-- ============================================

CREATE TABLE public.admins (
    id SERIAL PRIMARY KEY,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    token_version INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.admins ADD CONSTRAINT admins_uuid_unique UNIQUE (uuid);

CREATE INDEX idx_admins_uuid ON public.admins(uuid);
CREATE INDEX idx_admins_username ON public.admins(username);

-- Default admin (password: 'admin' - hashed with bcrypt)
-- Remember to change this password in production!
INSERT INTO public.admins (username, password) VALUES
('admin', '$2b$10$rKYjxFHxV7k3L5y9YG5nZe3UHxZ8KgYp4YvJ5Xz9fYQL5Qq7gH6S2');

-- ============================================
-- 3. CATEGORIES TABLE
-- ============================================

CREATE TABLE public.categories (
    id SERIAL PRIMARY KEY,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.categories ADD CONSTRAINT categories_uuid_unique UNIQUE (uuid);

CREATE INDEX idx_categories_uuid ON public.categories(uuid);
CREATE INDEX idx_categories_code ON public.categories(code);

INSERT INTO public.categories (code, name, description) VALUES
('MAT', 'Matematika', 'Buku-buku matematika'),
('FIS', 'Fisika', 'Buku-buku fisika'),
('KIM', 'Kimia', 'Buku-buku kimia'),
('BIO', 'Biologi', 'Buku-buku biologi'),
('EKO', 'Ekonomi', 'Buku-buku ekonomi'),
('BHS', 'Bahasa', 'Buku-buku bahasa dan sastra'),
('INF', 'Teknologi', 'Buku-buku teknologi dan komputer'),
('UMM', 'Umum', 'Buku-buku umum lainnya');

-- ============================================
-- 4. MEMBERS TABLE
-- ============================================

CREATE TABLE public.members (
    id SERIAL PRIMARY KEY,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    member_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    study_program VARCHAR(100),
    semester INTEGER NOT NULL DEFAULT 1,
    join_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT members_semester_check CHECK (semester >= 1 AND semester <= 14)
);

ALTER TABLE public.members ADD CONSTRAINT members_uuid_unique UNIQUE (uuid);

CREATE INDEX idx_members_uuid ON public.members(uuid);
CREATE INDEX idx_members_member_id ON public.members(member_id);

-- Sample Members
INSERT INTO public.members (member_id, name, study_program, semester) VALUES
('23190001', 'Firani Nur Anjani', 'Teknik Informatika', 5),
('23190002', 'Ahmad Fauzi', 'Sistem Informasi', 3),
('23190003', 'Siti Rahma', 'Teknik Komputer', 7);

-- ============================================
-- 5. BOOKS TABLE (Individual Book Inventory)
-- ============================================

CREATE TABLE public.books (
    id SERIAL PRIMARY KEY,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    book_id VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    publisher VARCHAR(255),
    isbn VARCHAR(20),
    publication_year INTEGER,
    category_id INTEGER REFERENCES public.categories(id) ON DELETE SET NULL,
    status book_status NOT NULL DEFAULT 'available',
    cover_url TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT check_book_id_format CHECK (book_id ~ '^[A-Z]{3}[0-9]{6}$')
);

ALTER TABLE public.books ADD CONSTRAINT books_uuid_unique UNIQUE (uuid);

CREATE INDEX idx_books_uuid ON public.books(uuid);
CREATE INDEX idx_books_book_id ON public.books(book_id);
CREATE INDEX idx_books_status ON public.books(status);
CREATE INDEX idx_books_title ON public.books(title);

-- Sample Books (Individual inventory - same title = multiple records with different IDs)
-- Format: [CATEGORY_CODE][6-digit sequence number]
INSERT INTO public.books (book_id, title, author, publisher, isbn, publication_year, category_id, status) VALUES
('MAT000001', 'Matematika Diskrit', 'Rinaldi Munir', 'Informatika', '978-979-001', 2023, 1, 'available'),
('MAT000002', 'Matematika Diskrit', 'Rinaldi Munir', 'Informatika', '978-979-001', 2023, 1, 'available'),
('MAT000003', 'Matematika Diskrit', 'Rinaldi Munir', 'Informatika', '978-979-001', 2023, 1, 'available'),
('FIS000001', 'Fisika Dasar', 'Halliday', 'Erlangga', '978-123-456', 2022, 2, 'available'),
('FIS000002', 'Fisika Dasar', 'Halliday', 'Erlangga', '978-123-456', 2022, 2, 'available'),
('INF000001', 'Algoritma Pemrograman', 'Suarga', 'Andi', '978-456-789', 2024, 7, 'available'),
('INF000002', 'Basis Data', 'Ramez Elmasri', 'Pearson', '978-789-012', 2023, 7, 'available'),
('INF000003', 'Jaringan Komputer', 'Tanenbaum', 'Prentice Hall', '978-321-654', 2024, 7, 'available');

-- ============================================
-- 6. LOANS TABLE
-- ============================================

CREATE TABLE public.loans (
    id SERIAL PRIMARY KEY,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    loan_id VARCHAR(20) UNIQUE NOT NULL,
    member_uuid uuid NOT NULL REFERENCES public.members(uuid) ON DELETE CASCADE,
    loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status loan_status NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.loans ADD CONSTRAINT loans_uuid_unique UNIQUE (uuid);

CREATE INDEX idx_loans_uuid ON public.loans(uuid);
CREATE INDEX idx_loans_loan_id ON public.loans(loan_id);
CREATE INDEX idx_loans_member ON public.loans(member_uuid);
CREATE INDEX idx_loans_status ON public.loans(status);

-- ============================================
-- 7. LOAN_ITEMS TABLE (1 loan = 1 book)
-- ============================================

CREATE TABLE public.loan_items (
    id SERIAL PRIMARY KEY,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    loan_id INTEGER NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    book_id INTEGER NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    returned_at TIMESTAMP,
    return_condition VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(loan_id)
);

ALTER TABLE public.loan_items ADD CONSTRAINT loan_items_uuid_unique UNIQUE (uuid);

CREATE INDEX idx_loan_items_uuid ON public.loan_items(uuid);
CREATE INDEX idx_loan_items_loan ON public.loan_items(loan_id);
CREATE INDEX idx_loan_items_book ON public.loan_items(book_id);

-- ============================================
-- 8. TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON public.admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON public.members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON public.books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'Schema created successfully!' as status;

SELECT 
    (SELECT COUNT(*) FROM public.admins) as admins,
    (SELECT COUNT(*) FROM public.categories) as categories,
    (SELECT COUNT(*) FROM public.members) as members,
    (SELECT COUNT(*) FROM public.books) as books;

-- Show sample data with UUIDs
SELECT id, uuid, username FROM public.admins LIMIT 1;
SELECT id, uuid, code, name FROM public.categories LIMIT 3;
SELECT id, uuid, member_id, name FROM public.members LIMIT 3;
SELECT id, uuid, book_id, title FROM public.books LIMIT 5;

-- List all tables
\dt
