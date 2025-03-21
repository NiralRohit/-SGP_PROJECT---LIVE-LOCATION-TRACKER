@echo off
echo Starting Live Location Tracking Application...
echo.
echo Step 1: Checking if MongoDB is running...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo MongoDB is already running.
) else (
    echo MongoDB is not running. Attempting to start MongoDB...
    start mongod
    timeout /t 5
)

echo.
echo Step 2: Starting the application server...
echo.
cd /d %~dp0
npm start

echo.
echo If the server started successfully, you can access the application at:
echo http://localhost:7890
echo.
echo Press any key to stop the server...
pause > nul 