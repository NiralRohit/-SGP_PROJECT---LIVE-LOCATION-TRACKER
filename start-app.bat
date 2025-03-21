@echo off
echo Starting Live Location Tracking App...
echo.
echo First, let's check if MongoDB is running...
echo If you see an error, please make sure MongoDB is installed and running.
echo.

:: Attempt to ping MongoDB to see if it's running
mongosh --eval "db.version()" --quiet
if %errorlevel% neq 0 (
  echo WARNING: MongoDB may not be running. Please start MongoDB before continuing.
  echo You can start MongoDB by running 'mongod' in another terminal.
  echo.
  pause
)

echo.
echo Starting the Node.js backend server...
echo.

:: Start the server in a new window
start cmd /k "cd /d %~dp0 && echo Starting backend server... && npm start"

:: Wait a moment for the server to start
ping 127.0.0.1 -n 4 > nul

echo.
echo Backend server is running. The port will be displayed in the server window.
echo.
echo.
echo You can now access the application at:
echo http://localhost:7890 (or the port shown in the server window)
echo.
echo Press any key to exit this window. The server will continue running.
echo.
pause 