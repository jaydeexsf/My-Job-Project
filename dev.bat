@echo off
setlocal

echo ========================================
echo Starting Quran App Development Server
echo ========================================
echo.

:: Set the path to the local Node.js installation
set NODE_PATH=%~dp0nodejs\node-v20.11.0-win-x64
set PATH=%NODE_PATH%;%PATH%

echo Node.js path configured
echo.
echo The app will be available at: http://localhost:3000
echo.
echo Features available:
echo - Voice Search (/)
echo - Audio Verse Identifier (/identify)
echo - Bookmarks (/bookmarks)
echo - Recitation Practice (/recite)
echo - Search (/search)
echo.
echo Press Ctrl+C to stop the server
echo.

:: Run next dev directly with node
node node_modules\next\dist\bin\next dev --turbopack

pause
