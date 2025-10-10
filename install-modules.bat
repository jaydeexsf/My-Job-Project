@echo off
echo ========================================
echo Installing Node Modules
echo ========================================
echo.

:: Set the path to the local Node.js installation
set NODE_PATH=%~dp0nodejs\node-v20.11.0-win-x64
set PATH=%NODE_PATH%;%PATH%

:: Verify Node.js is accessible
echo Checking Node.js installation...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    pause
    exit /b 1
)

echo Node.js found successfully!
echo.

:: Run npm install
echo Installing dependencies...
echo This may take a few minutes...
echo.
npm install

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo Installation completed successfully!
    echo ========================================
    echo.
    echo You can now run: run-dev.bat
    echo.
) else (
    echo.
    echo ========================================
    echo Installation failed!
    echo ========================================
    echo.
)

pause
