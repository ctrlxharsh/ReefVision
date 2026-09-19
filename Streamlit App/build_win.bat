@echo off
setlocal
cd /d "%~dp0"
echo =========================================================
echo   Andromeida Reef Vision Studio - Windows 1-Click Builder
echo =========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build_win.ps1" %*
if errorlevel 1 (
    echo.
    echo [ERROR] Build encountered an error (exit code %errorlevel%).
    pause
)
