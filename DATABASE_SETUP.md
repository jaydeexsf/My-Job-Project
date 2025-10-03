# 🗄️ Quran Project - Database Setup Guide

## ✅ What's Been Completed

### 🚫 Dummy Data System Removed
- **Completely eliminated** dummy data fallback system
- All APIs now work **exclusively with MongoDB**
- No more `isDummyMode()` checks or fallback data

### 🌍 Global Community Database
- **Anyone can access ALL data** from all users
- **Anyone can delete ANY data** (bookmarks, recitations, etc.)
- **Complete transparency** and community sharing
- **No user restrictions** on data access or modification

### 🔧 API Endpoints Updated

#### `/api/bookmarks`
- **GET**: Returns ALL bookmarks from all users globally
- **POST**: Anyone can create bookmarks
- **DELETE**: Anyone can delete any bookmark by ID or surah/ayah

#### `/api/recitations`  
- **GET**: Returns ALL recitation history from all users globally
- **POST**: Anyone can create recitation records
- **DELETE**: Anyone can delete any recitation by ID, userId, or surah/ayah

#### `/api/admin` (NEW)
- **GET**: Database statistics (counts, etc.)
- **POST**: Admin operations:
  - `populate`: Clear and populate with sample data
  - `clear`: Clear all data
  - `stats`: Detailed statistics
  - `clear-bookmarks`: Clear only bookmarks
  - `clear-recitations`: Clear only recitations

## 🚀 Getting Started

### 1. Fix MongoDB Connection
The current issue is **IP whitelist restrictions** on MongoDB Atlas. To fix:

1. **Go to MongoDB Atlas Dashboard**
2. **Navigate to Network Access**
3. **Add your current IP address** to the whitelist
4. **Or add `0.0.0.0/0`** for global access (less secure)

### 2. Populate Database
Once MongoDB is accessible, populate with sample data:

```bash
# Using the admin API
curl -X POST http://localhost:3000/api/admin \
  -H "Content-Type: application/json" \
  -d '{"action": "populate"}'

# Or using the standalone script
node scripts/populate-db.js
```

### 3. Verify Setup
```bash
# Check database stats
curl http://localhost:3000/api/admin

# Get all bookmarks
curl http://localhost:3000/api/bookmarks

# Get all recitations
curl http://localhost:3000/api/recitations
```

## 📊 Sample Data Included

### 👥 Community Users
- **Ahmad**: Al-Fatiha bookmark
- **Fatima**: Ayat al-Kursi bookmark  
- **Omar**: Al-Ikhlas bookmark
- **Aisha**: Ya-Sin bookmark
- **Hassan**: Ar-Rahman bookmark
- **Khadija**: Al-Mulk bookmark
- **Ali**: Al-Kahf bookmark
- **Zaynab**: Al-Imran bookmark

### 🎤 Recitation Records
- **8 sample recitations** with accuracy scores
- **Multiple verses** from different surahs
- **Audio URLs** and transcripts included

## 🛠️ Database Operations

### Clear All Data
```bash
curl -X POST http://localhost:3000/api/admin \
  -H "Content-Type: application/json" \
  -d '{"action": "clear"}'
```

### Clear Only Bookmarks
```bash
curl -X POST http://localhost:3000/api/admin \
  -H "Content-Type: application/json" \
  -d '{"action": "clear-bookmarks"}'
```

### Get Statistics
```bash
curl -X POST http://localhost:3000/api/admin \
  -H "Content-Type: application/json" \
  -d '{"action": "stats"}'
```

## 🗑️ Global Delete Examples

### Delete Specific Bookmark
```bash
curl -X DELETE "http://localhost:3000/api/bookmarks?id=BOOKMARK_ID"
```

### Delete All Bookmarks for a Verse
```bash
curl -X DELETE "http://localhost:3000/api/bookmarks?surah=1&ayah=1"
```

### Delete Specific Recitation
```bash
curl -X DELETE "http://localhost:3000/api/recitations?id=RECITATION_ID"
```

### Delete All Recitations by User
```bash
curl -X DELETE "http://localhost:3000/api/recitations?userId=Ahmad"
```

### Delete All Recitations for a Verse
```bash
curl -X DELETE "http://localhost:3000/api/recitations?surah=1&ayah=1"
```

## 🔒 Security Note

⚠️ **Important**: This setup allows **ANYONE** to delete **ANY** data. This is intentional for a community-driven platform, but consider implementing authentication if needed for production use.

## 🎯 Next Steps

1. **Fix MongoDB IP whitelist** in Atlas dashboard
2. **Run populate script** to add sample data
3. **Test all endpoints** to verify functionality
4. **Use the test page** at `/test` for comprehensive testing

## 📁 Files Modified

- `src/app/api/bookmarks/route.ts` - Removed dummy data, added global delete
- `src/app/api/recitations/route.ts` - Removed dummy data, added global delete  
- `src/app/api/admin/route.ts` - New admin management API
- `src/lib/db.ts` - Removed `isDummyMode()` function
- `scripts/populate-db.js` - Standalone population script

Your Quran Project is now a **true community database** where all data is shared globally! 🕌✨
