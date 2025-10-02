# Quran Project

This is a [Next.js](https://nextjs.org) project for Quranic voice search, bookmarks, and recitation tracking.

## Features

- 🎤 **Voice Search**: Search Quranic verses using voice recognition
- 📖 **Bookmarks**: Save and manage your favorite verses
- 📊 **Recitation History**: Track your recitation practice with accuracy scores
- 🎵 **Audio Player**: Listen to Quranic recitations
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Getting Started

### Quick Start (Dummy Data Mode)

The project is configured to work immediately without any database setup using dummy data:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Database Setup (Optional)

To use real data persistence, create a `.env.local` file with:

```env
MONGODB_URI=mongodb://localhost:27017/quranproject
```

### API Configuration (Optional)

For external Quran API integration, add to `.env.local`:

```env
QURAN_API_BASE=https://api.quran.foundation
QURAN_API_KEY=your_api_key_here
```

## Project Structure

- `src/app/` - Next.js app router pages and API routes
- `src/components/` - Reusable React components
- `src/lib/` - Utility functions, database models, and API clients
- `src/lib/dummyData.ts` - Sample data for development without database

## Development Features

- **Dummy Data Mode**: Automatically falls back to sample data when MongoDB is not configured
- **API Fallbacks**: Graceful handling when external APIs are unavailable
- **TypeScript**: Full type safety throughout the application
- **Tailwind CSS**: Modern styling with utility classes

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
