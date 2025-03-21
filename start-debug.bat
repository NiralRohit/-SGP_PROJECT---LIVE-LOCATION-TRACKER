@echo off
echo ===== LIVE LOCATION TRACKER - DEBUG MODE =====
echo.
echo This script will help diagnose and fix common issues.
echo.

echo 1. Checking if MongoDB is running...
mongosh --eval "db.version()" --quiet
if %errorlevel% neq 0 (
  echo [ERROR] MongoDB is not running! Please start MongoDB first.
  echo.
  echo If MongoDB is installed, start it by running 'mongod' in another terminal.
  echo.
  echo If MongoDB is not installed, please install it from https://www.mongodb.com/try/download/community
  echo.
  pause
  exit /b
) else (
  echo [OK] MongoDB is running properly.
)

echo.
echo 2. Checking .env file...
if not exist ".env" (
  echo [WARNING] .env file not found. Creating default .env file...
  echo PORT=7890 > .env
  echo JWT_SECRET=your_jwt_secret_key_change_this_in_production >> .env
  echo MONGODB_URI=mongodb://localhost:27017/location-tracker >> .env
  echo [OK] Created default .env file.
) else (
  echo [OK] .env file exists.
)

echo.
echo 3. Checking if port 7890 is available...
netstat -ano | findstr :7890 > nul
if %errorlevel% equ 0 (
  echo [WARNING] Port 7890 is already in use. We'll try a different port automatically.
) else (
  echo [OK] Port 7890 is available.
)

echo.
echo 4. Starting the server in debug mode...
echo.
echo Press Ctrl+C to stop the server.
echo.
echo When the server starts, open your browser to:
echo http://localhost:7890
echo.
echo You should see a landing page that redirects to login.
echo.
echo Logs will appear below:
echo ===============================================
echo.

npm start 