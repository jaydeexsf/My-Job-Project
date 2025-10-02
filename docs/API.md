# QuranVoice API Documentation

## Overview

The QuranVoice API provides endpoints for managing bookmarks, recitation history, and integrating with external Quran data sources. All endpoints support both MongoDB and dummy data modes for development.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Currently, the API uses simple user identification via query parameters. In production, this would be replaced with proper JWT authentication.

## Endpoints

### Bookmarks

#### GET /api/bookmarks

Retrieve user bookmarks.

**Query Parameters:**
- `userId` (optional): Filter bookmarks by user ID

**Response:**
```json
{
  "data": [
    {
      "_id": "bookmark1",
      "userId": "user1",
      "surah": 1,
      "ayah": 1,
      "note": "Al-Fatiha - The Opening",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### POST /api/bookmarks

Create or update a bookmark.

**Request Body:**
```json
{
  "userId": "user1",
  "surah": 1,
  "ayah": 1,
  "note": "Personal note about this verse"
}
```

**Response:**
```json
{
  "data": {
    "_id": "bookmark1",
    "userId": "user1",
    "surah": 1,
    "ayah": 1,
    "note": "Personal note about this verse",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

#### DELETE /api/bookmarks

Delete a bookmark.

**Query Parameters:**
- `userId`: User ID
- `surah`: Surah number
- `ayah`: Ayah number

**Response:**
```json
{
  "ok": true
}
```

### Recitation History

#### GET /api/recitations

Retrieve recitation history.

**Query Parameters:**
- `userId` (optional): Filter by user ID

**Response:**
```json
{
  "data": [
    {
      "_id": "recitation1",
      "userId": "user1",
      "surah": 1,
      "ayah": 1,
      "accuracy": 95,
      "transcript": "Bismillahir rahmanir raheem",
      "audioUrl": "/audio/recitation1.mp3",
      "createdAt": "2024-01-20T08:00:00Z",
      "updatedAt": "2024-01-20T08:00:00Z"
    }
  ]
}
```

#### POST /api/recitations

Create a new recitation record.

**Request Body:**
```json
{
  "userId": "user1",
  "surah": 1,
  "ayah": 1,
  "accuracy": 95,
  "transcript": "Bismillahir rahmanir raheem",
  "audioUrl": "/audio/recitation1.mp3"
}
```

**Response:**
```json
{
  "data": {
    "_id": "recitation1",
    "userId": "user1",
    "surah": 1,
    "ayah": 1,
    "accuracy": 95,
    "transcript": "Bismillahir rahmanir raheem",
    "audioUrl": "/audio/recitation1.mp3",
    "createdAt": "2024-01-20T08:00:00Z",
    "updatedAt": "2024-01-20T08:00:00Z"
  }
}
```

## External API Integration

### Quran Foundation API

The application integrates with the Quran Foundation API for verse data:

- **Base URL**: `https://api.quran.foundation`
- **Caching**: 1-hour cache for API responses
- **Fallback**: Local dummy data when API is unavailable

### Supported Operations

1. **Search Verses**: `searchAyat(query: string)`
2. **Get Surah**: `getSurah(surahNumber: number)`
3. **Get Ayah**: `getAyah(surah: number, ayah: number)`
4. **Get Audio**: `getAudioForAyah(surah: number, ayah: number, reciter?: string)`

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200`: Success
- `400`: Bad Request
- `404`: Not Found
- `500`: Internal Server Error

Error responses include descriptive messages:

```json
{
  "error": "Invalid surah number",
  "code": "INVALID_SURAH"
}
```

## Rate Limiting

In production, implement rate limiting:
- 100 requests per minute per IP
- 1000 requests per hour per authenticated user

## Data Models

### Bookmark Schema

```typescript
interface Bookmark {
  _id: string;
  userId?: string;
  surah: number;
  ayah: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Recitation History Schema

```typescript
interface RecitationHistory {
  _id: string;
  userId?: string;
  surah: number;
  ayah: number;
  accuracy?: number;
  transcript?: string;
  audioUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Development Mode

When `MONGODB_URI` is not set, the API automatically switches to dummy data mode:

- Uses in-memory storage
- Provides sample data for testing
- Maintains full API compatibility
- Perfect for development and demos

## Performance Optimizations

1. **Caching**: Server-side caching with Next.js `unstable_cache`
2. **Database Indexing**: Optimized indexes for common queries
3. **Response Compression**: Automatic gzip compression
4. **CDN Integration**: Static assets served via CDN

## Security Considerations

For production deployment:

1. Implement proper authentication (JWT)
2. Add input validation and sanitization
3. Enable CORS with specific origins
4. Add request logging and monitoring
5. Implement rate limiting
6. Use HTTPS only
7. Sanitize user inputs to prevent XSS

## Monitoring and Analytics

Recommended monitoring setup:

- **Performance**: Response times, error rates
- **Usage**: API endpoint usage, user behavior
- **Errors**: Error tracking and alerting
- **Infrastructure**: Database performance, server metrics
