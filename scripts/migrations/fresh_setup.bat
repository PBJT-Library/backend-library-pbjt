@echo off
REM ============================================
REM Fresh Database Setup Script
REM ============================================
REM This script will:
REM 1. Drop the existing library_db database
REM 2. Create a fresh library_db database
REM 3. Apply the new schema.sql
REM ============================================

echo ============================================
echo Fresh Database Setup
echo ============================================
echo.
echo WARNING: This will DELETE ALL DATA in library_db!
echo.
set /p confirm="Are you sure you want to continue? (yes/no): "

if /i not "%confirm%"=="yes" (
    echo.
    echo Operation cancelled.
    pause
    exit /b
)

echo.
echo Step 1: Dropping and recreating database...
psql -U postgres -f drop_and_recreate_db.sql

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to drop/recreate database!
    pause
    exit /b 1
)

echo.
echo Step 2: Applying fresh schema...
psql -U postgres -d library_db -f schema.sql

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to apply schema!
    pause
    exit /b 1
)

echo.
echo ============================================
echo SUCCESS! Fresh database created.
echo ============================================
echo.
echo Installed tables:
psql -U postgres -d library_db -c "\dt"

echo.
echo Installed extensions:
psql -U postgres -d library_db -c "\dx"

echo.
pause
