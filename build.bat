@echo off
setlocal

echo ========================================
echo Building Quran App for Production
echo ========================================
echo.

:: Set the path to the local Node.js installation
set NODE_PATH=%~dp0nodejs\node-v20.11.0-win-x64
set PATH=%NODE_PATH%;%PATH%

echo Node.js path configured
echo Building...
echo.

:: Run next build directly with node
node node_modules\next\dist\bin\next build --turbopack

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo Build completed successfully!
    echo ========================================
    echo.
) else (
    echo.
    echo ========================================
    echo Build failed!
    echo ========================================
    echo.
)

pause
