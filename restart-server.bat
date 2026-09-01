@echo off
echo ============================================
echo Restarting Backend Server
echo ============================================
echo.

echo Killing existing Node.js processes on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Stopping process %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo Starting backend server...
echo Server will be available at:
echo   - Local: http://localhost:3000
echo   - Network: http://192.168.0.104:3000
echo.
echo Press Ctrl+C to stop the server
echo.

node server.js
