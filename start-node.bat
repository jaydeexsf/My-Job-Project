@echo off
setlocal

:: Set the path to the local Node.js installation
set NODE_PATH=%~dp0nodejs\node-v20.11.1-win-x64
set PATH=%NODE_PATH%;%NODE_PATH%\node_modules\npm\bin;%PATH%

:: Check if package.json exists
if not exist package.json (
    echo No package.json found in the current directory.
    echo Use 'npm init -y' to create a new Node.js project.
    cmd /k "cd /d %~dp0 && echo Node.js is ready to use!"
) else (
    echo Installing Node.js modules...
    call npm install
    cmd /k "cd /d %~dp0 && echo Node.js is ready to use!"
)
