@echo off
echo Setting up Node.js path...
set PATH=%PATH%;%USERPROFILE%\Documents\node-v22.20.0-win-x64

echo Starting Quran App Development Server...
echo.
echo The app will be available at: http://localhost:3000
echo.
echo Features available:
echo - Voice Search (/)
echo - Audio Verse Identifier (/identify) - NEW SHAZAM-LIKE FEATURE!
echo - Bookmarks (/bookmarks)  
echo - Recitation Practice (/recite)
echo - Search (/search)
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev

pause
