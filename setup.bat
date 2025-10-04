@echo off
REM Quran Project Setup Script for Windows
echo 🚀 Setting up Quran Project...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Create .env.local if it doesn't exist
if not exist .env.local (
    echo 📝 Creating .env.local file...
    (
        echo # MongoDB Configuration
        echo MONGODB_URI=mongodb://localhost:27017/quranproject
        echo.
        echo # Quran API Configuration ^(Optional - will use fallback data if not provided^)
        echo QURAN_API_BASE=https://prelive-oauth2.quran.foundation
        echo QURAN_API_CLIENT_ID=your_client_id_here
        echo QURAN_API_CLIENT_SECRET=your_client_secret_here
        echo.
        echo # Next.js Configuration
        echo NEXTAUTH_URL=http://localhost:3000
        echo NEXTAUTH_SECRET=your_secret_key_here
        echo.
        echo # Development Configuration
        echo NODE_ENV=development
    ) > .env.local
    echo ✅ Created .env.local file
) else (
    echo ✅ .env.local already exists
)

REM Check if MongoDB is running
echo 🔍 Checking MongoDB connection...
mongod --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ MongoDB is installed
    echo 🌱 Attempting to populate database with sample data...
    node scripts/populate-db.js
    if %errorlevel% equ 0 (
        echo ✅ Database populated successfully
    ) else (
        echo ⚠️  MongoDB is not running. Please start MongoDB first:
        echo    - Run: net start MongoDB
        echo    - Or install MongoDB from https://www.mongodb.com/try/download/community
        echo.
        echo 🔄 The app will work with fallback data until MongoDB is running
    )
) else (
    echo ⚠️  MongoDB is not installed. Please install MongoDB first:
    echo    - Download from https://www.mongodb.com/try/download/community
    echo.
    echo 🔄 The app will work with fallback data until MongoDB is installed
)

REM Run tests
echo 🧪 Running tests...
npm test

REM Start development server
echo 🚀 Starting development server...
echo 📱 Open http://localhost:3000 in your browser
npm run dev

pause

