# Quran Recitation Competition Feature

## Overview
A community-driven competition system where users can record and submit their Quran recitations, compete for the best recitation, and vote using likes. Each chapter (Surah) maintains its own leaderboard based on community engagement.

## Features

### 1. **Audio Recording**
- Browser-based audio recording using MediaRecorder API
- Records in WebM format (widely supported)
- Real-time recording status with visual feedback
- Preview audio before submission

### 2. **Submission System**
- Select any Surah (Chapter) from 1-114
- Optional: Select specific Ayah (Verse)
- Submit full chapter or individual verse recitations
- Audio files stored locally in `/public/uploads/recitations/`

### 3. **Like & Ranking System**
- Users can like/unlike recitations
- Each user identified by unique machine ID (browser fingerprint)
- Rankings sorted by like count (descending)
- Visual ranking badges:
  - 🥇 **1st Place**: Gold highlight
  - 🥈 **2nd Place**: Silver highlight  
  - 🥉 **3rd Place**: Bronze highlight

### 4. **Leaderboards**
- Global leaderboard (all recitations)
- Filter by specific Surah
- Real-time ranking updates
- Displays submission date

## Technical Implementation

### Database Schema (MongoDB)
```typescript
CompetitionRecitation {
  userId: String (machine ID)
  surah: Number (1-114)
  ayah: Number (optional)
  audioPath: String (file path)
  likes: [String] (array of user IDs)
  likeCount: Number
  createdAt: Date
  updatedAt: Date
}
```

### API Endpoints

#### 1. Submit Recitation
```
POST /api/competition/submit
Content-Type: multipart/form-data

Body:
- audio: File (audio blob)
- userId: String
- surah: Number
- ayah: Number (optional)

Response:
{
  success: true,
  data: CompetitionRecitation
}
```

#### 2. Like/Unlike Recitation
```
POST /api/competition/like
Content-Type: application/json

Body:
{
  recitationId: String,
  userId: String
}

Response:
{
  success: true,
  action: "liked" | "unliked"
}
```

#### 3. Get Rankings
```
GET /api/competition/rankings?surah=1

Query Parameters:
- surah: Number (optional, filters by surah)
- ayah: Number (optional, filters by ayah)

Response:
{
  success: true,
  data: [
    {
      ...CompetitionRecitation,
      rank: Number
    }
  ]
}
```

### User Identification
Users are identified using a **machine ID** (browser fingerprint):
- Canvas fingerprinting
- Screen resolution
- Timezone
- Language/Platform
- User agent
- Stored in localStorage for persistence

**Location**: `/src/lib/machineId.ts`

### Audio Storage
- **Platform**: Cloudinary ☁️
- **Folder**: `quran-recitations/`
- **Format**: MP3 (converted automatically from WebM)
- **Filename**: `{userId}_{surah}_{ayah}_{timestamp}`
- **URL**: Secure HTTPS URLs from Cloudinary CDN
- **Storage**: Free tier includes 25GB storage + 25GB monthly bandwidth

#### Benefits:
- ✅ Automatic format conversion (WebM → MP3)
- ✅ CDN delivery for fast global access
- ✅ No local storage needed
- ✅ Easy file management through Cloudinary dashboard
- ✅ Reliable cloud storage

## File Structure
```
src/
├── app/
│   ├── recite/
│   │   └── page.tsx          # Main competition UI
│   └── api/
│       └── competition/
│           ├── submit/
│           │   └── route.ts  # Submit recitation
│           ├── like/
│           │   └── route.ts  # Like/unlike
│           └── rankings/
│               └── route.ts  # Get rankings
├── lib/
│   ├── models.ts             # MongoDB schemas
│   ├── machineId.ts          # User identification
│   ├── surahNames.ts         # Surah names lookup
│   └── cloudinary.ts         # Cloudinary upload utilities
```

## Usage

### As a Competitor
1. Navigate to `/recite`
2. Click "Submit Recitation" tab
3. Select a Surah (and optionally an Ayah)
4. Click "Start Recording"
5. Recite your portion
6. Click to stop recording
7. Preview your audio
8. Click "Submit" to enter the competition

### As a Voter
1. Navigate to `/recite`
2. Click "Rankings" tab
3. Filter by Surah (optional)
4. Listen to recitations
5. Click the ❤️ button to like
6. Watch rankings update in real-time

## Future Enhancements

### Authentication (Post-Prototype)
- Replace machine ID with proper user authentication
- User profiles with stats
- Achievement badges

### Advanced Features
- Audio quality indicators
- Tajweed accuracy scoring (AI-powered)
- Download recitations
- Share on social media
- Comments and reviews
- Weekly/monthly competitions
- Prize/reward system

### Performance
- Audio compression
- Pagination for large datasets
- CDN integration
- Caching strategies

## Browser Compatibility
- **Audio Recording**: Chrome 49+, Firefox 25+, Safari 14.1+, Edge 79+
- **Audio Playback**: All modern browsers
- **Storage**: Requires localStorage support

## Security Considerations
- File upload validation (file type, size limits)
- Rate limiting on submissions
- CSRF protection
- Content moderation for inappropriate content
- Audio file sanitization

## Testing
```bash
# Run the dev server
npm run dev

# Navigate to http://localhost:3000/recite

# Test recording
1. Click "Start Recording"
2. Speak/recite
3. Stop recording
4. Verify audio playback
5. Submit and check database

# Test rankings
1. Submit multiple recitations
2. Like different recitations
3. Verify ranking order
4. Test filters
```

## Troubleshooting

### Microphone Permission Denied
- Browser blocks microphone by default
- User must grant permission
- Check browser settings
- Use HTTPS in production (required for media access)

### Audio Not Playing
- Check file path is correct
- Verify file was saved successfully
- Check browser audio format support
- Inspect network tab for 404 errors

### Rankings Not Updating
- Check MongoDB connection
- Verify API endpoints are working
- Check browser console for errors
- Refresh the page manually

## Environment Variables
```env
# MongoDB
MONGODB_URI=mongodb+srv://...

# Cloudinary (for audio storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

## Dependencies
- `mongoose`: MongoDB ODM
- `cloudinary`: Cloud storage for audio files
- `lucide-react`: Icons
- `next`: Framework
- Browser APIs: MediaRecorder, localStorage

---

**Created**: 2025-10-04  
**Status**: ✅ Prototype Complete  
**Next Steps**: User testing and feedback collection
