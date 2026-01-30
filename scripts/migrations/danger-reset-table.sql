-- ============================================
-- DROP AND RECREATE library_db DATABASE
-- ============================================
-- WARNING: This will delete ALL data in library_db!
-- ============================================

-- Terminate all connections to library_db
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'library_db'
  AND pid <> pg_backend_pid();

-- Drop the database
DROP DATABASE IF EXISTS library_db;

-- Create fresh database
CREATE DATABASE library_db
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'English_Indonesia.1252'
    LC_CTYPE = 'English_Indonesia.1252'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

SELECT 'Database library_db dropped and recreated successfully!' as status;
