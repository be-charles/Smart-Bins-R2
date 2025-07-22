@echo off
echo MQTT Connection Test for Smart Bins R2
echo =====================================
echo.

cd /d "%~dp0"

if not exist ".env" (
    echo ERROR: .env file not found!
    echo Please make sure you're running this from the edge-processor directory.
    pause
    exit /b 1
)

echo Running MQTT connection test...
echo.

node mqtt-test.js

echo.
echo Test completed. Press any key to exit...
pause >nul
