# PowerShell Migration Script
# Run migration without interactive password prompt

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "PBJT Library Database Migration v1 to v2" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Database credentials from .env
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "library_db"
$DB_USER = "postgres"
$DB_PASSWORD = "admin"  # Change this to your password

Write-Host "Database: $DB_NAME" -ForegroundColor Yellow
Write-Host "Host: ${DB_HOST}:${DB_PORT}" -ForegroundColor Yellow
Write-Host "User: $DB_USER" -ForegroundColor Yellow
Write-Host ""

# Set PGPASSWORD environment variable
$env:PGPASSWORD = $DB_PASSWORD

try {
    Write-Host "Step 1: Running migration..." -ForegroundColor Green
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "src/database/migration_v1_to_v2.sql"
    
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "Migration Summary" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT (SELECT COUNT(*) FROM book_catalog) as catalog_count, (SELECT COUNT(*) FROM book_inventory) as inventory_count, (SELECT COUNT(*) FROM books) as original_books, (SELECT COUNT(*) FROM loans WHERE inventory_id IS NOT NULL) as loans_migrated;"
    
    Write-Host ""
    Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
}
catch {
    Write-Host "❌ Migration failed: $_" -ForegroundColor Red
    exit 1
}
finally {
    # Clear password from environment
    Remove-Item Env:\PGPASSWORD
}
