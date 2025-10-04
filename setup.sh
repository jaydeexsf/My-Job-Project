#!/bin/bash

# Quran Project Setup Script
echo "🚀 Setting up Quran Project..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << EOF
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/quranproject

# Quran API Configuration (Optional - will use fallback data if not provided)
QURAN_API_BASE=https://prelive-oauth2.quran.foundation
QURAN_API_CLIENT_ID=your_client_id_here
QURAN_API_CLIENT_SECRET=your_client_secret_here

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_key_here

# Development Configuration
NODE_ENV=development
EOF
    echo "✅ Created .env.local file"
else
    echo "✅ .env.local already exists"
fi

# Check if MongoDB is running
echo "🔍 Checking MongoDB connection..."
if command -v mongod &> /dev/null; then
    echo "✅ MongoDB is installed"
    # Try to connect to MongoDB
    if node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb://localhost:27017/quranproject').then(() => { console.log('✅ MongoDB connection successful'); mongoose.disconnect(); }).catch(err => { console.log('❌ MongoDB connection failed:', err.message); process.exit(1); });" 2>/dev/null; then
        echo "✅ MongoDB is running and accessible"
        echo "🌱 Populating database with sample data..."
        node scripts/populate-db.js
    else
        echo "⚠️  MongoDB is not running. Please start MongoDB first:"
        echo "   - On macOS: brew services start mongodb-community"
        echo "   - On Ubuntu: sudo systemctl start mongod"
        echo "   - On Windows: net start MongoDB"
        echo ""
        echo "🔄 The app will work with fallback data until MongoDB is running"
    fi
else
    echo "⚠️  MongoDB is not installed. Please install MongoDB first:"
    echo "   - On macOS: brew install mongodb-community"
    echo "   - On Ubuntu: sudo apt-get install mongodb"
    echo "   - On Windows: Download from https://www.mongodb.com/try/download/community"
    echo ""
    echo "🔄 The app will work with fallback data until MongoDB is installed"
fi

# Run tests
echo "🧪 Running tests..."
npm test

# Start development server
echo "🚀 Starting development server..."
echo "📱 Open http://localhost:3000 in your browser"
npm run dev

