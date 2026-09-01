@echo off
echo ============================================
echo Setting up Windows Firewall for Port 5000
echo ============================================
echo.
echo This script requires Administrator privileges
echo Right-click and select "Run as Administrator"
echo.

REM Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator
    echo Right-click the file and select "Run as Administrator"
    pause
    exit /b 1
)

echo Removing old firewall rules (if any)...
netsh advfirewall firewall delete rule name="Node.js Server Port 3000" >nul 2>&1

echo Creating new firewall rule...
netsh advfirewall firewall add rule name="Node.js Server Port 3000" dir=in action=allow protocol=TCP localport=3000

echo.
echo ============================================
echo Firewall configuration completed!
echo Port 5000 is now open for incoming connections
echo ============================================
echo.
pause
