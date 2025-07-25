@echo off
echo ========================================
echo Manual Mosquitto MQTT Broker Startup
echo ========================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

REM Check if Mosquitto is installed
if not exist "C:\Program Files\mosquitto\mosquitto.exe" (
    echo ERROR: Mosquitto not found at C:\Program Files\mosquitto\
    echo Please run setup-windows.bat first to install Mosquitto
    pause
    exit /b 1
)

REM Check if configuration exists
if not exist "C:\Program Files\mosquitto\config\mosquitto.conf" (
    echo ERROR: Mosquitto configuration not found
    echo Please run setup-windows.bat first to create configuration
    pause
    exit /b 1
)

REM Check if already running
tasklist /fi "imagename eq mosquitto.exe" | find "mosquitto.exe" >nul
if %errorLevel% equ 0 (
    echo Mosquitto is already running!
    echo.
    echo To stop it, press Ctrl+C in the Mosquitto window or run:
    echo   taskkill /f /im mosquitto.exe
    echo.
    pause
    exit /b 0
)

echo Starting Mosquitto MQTT Broker manually...
echo.
echo Configuration: C:\Program Files\mosquitto\config\mosquitto.conf
echo Log file: C:\Program Files\mosquitto\logs\mosquitto.log
echo.
echo The broker will run in this window. Keep this window open.
echo To stop the broker, press Ctrl+C
echo.
echo Starting in 3 seconds...
timeout /t 3 >nul

cd /d "C:\Program Files\mosquitto"
mosquitto.exe -c "C:\Program Files\mosquitto\config\mosquitto.conf" -v

echo.
echo Mosquitto has stopped.
pause
