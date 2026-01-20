-- CreateEnum
CREATE TYPE "status_enum" AS ENUM ('available', 'loaned', 'maintenance', 'damaged', 'lost');

-- CreateTable (All tables already exist - this is a baseline migration)
-- This migration file documents the existing database schema at the time of Prisma adoption

-- Note: All CREATE TABLE statements are no-ops as tables already exist
-- This migration serves as a baseline for future migrations

-- Existing tables documented:
-- - admins
-- - categories  
-- - book_catalog
-- - book_inventory
-- - members
-- - loans

-- AlterTable statements for indexes and constraints that already exist:
-- (These are also no-ops but document the schema for Prisma migration tracking)

-- This is a baseline migration created during Prisma ORM adoption
-- Database already has this schema from manual SQL setup
