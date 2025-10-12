@echo off
echo Setting up Node.js environment...
set PATH=C:\Users\202219525\Desktop\My-Job-Project\nodejs\node-v20.11.0-win-x64;%PATH%

echo Node.js version:
node --version

echo npm version:
npm --version

echo Installing dependencies...
npm install

echo Dependencies installed successfully!
pause
