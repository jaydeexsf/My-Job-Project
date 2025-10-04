import { NextRequest, NextResponse } from 'next/server';
import { quranApiFetch, getSurah, getAyah, getAudioForAyah, getAllChapters } from '@/lib/quranApi';

// Get all surahs list
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const surah = searchParams.get('surah');
    const ayah = searchParams.get('ayah');
    const audio = searchParams.get('audio');
    const reciter = searchParams.get('reciter');

    // If specific surah and ayah requested
    if (surah && ayah) {
      const surahNum = parseInt(surah);
      const ayahNum = parseInt(ayah);
      
      const [surahData, ayahData, audioData] = await Promise.all([
        getSurah(surahNum),
        getAyah(surahNum, ayahNum),
        audio === 'true' ? getAudioForAyah(surahNum, ayahNum, reciter || '1') : null
      ]);

      const response = {
        surah: surahData,
        ayah: ayahData,
        audio: audioData
      };
      console.log('Quran API Response - Specific Surah/Ayah:', response);
      return NextResponse.json(response);
    }

    // If specific surah requested
    if (surah) {
      const surahNum = parseInt(surah);
      const surahData = await getSurah(surahNum);
      console.log('Quran API Response - Specific Surah:', surahData);
      return NextResponse.json(surahData);
    }

    // Return list of all surahs with basic info
    const surahs = await getAllSurahs();
    const response = { surahs };
    console.log('Quran API Response - All Surahs:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching Quran data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Quran data' },
      { status: 500 }
    );
  }
}

// Get comprehensive Quran data
export async function POST(request: NextRequest) {
  try {
    const { action, surah, ayah, query, reciter } = await request.json();

    switch (action) {

      case 'getAudio':
        if (!surah || !ayah) {
          return NextResponse.json(
            { error: 'Surah and ayah parameters required for audio' },
            { status: 400 }
          );
        }
        const audioData = await getAudioForAyah(parseInt(surah), parseInt(ayah), reciter);
        console.log('Quran API Response - Audio Data:', audioData);
        return NextResponse.json(audioData);

      case 'getRandomVerse':
        const randomVerse = await getRandomVerse();
        console.log('Quran API Response - Random Verse:', randomVerse);
        return NextResponse.json(randomVerse);

      case 'getPopularVerses':
        const popularVerses = await getPopularVerses();
        console.log('Quran API Response - Popular Verses:', popularVerses);
        return NextResponse.json(popularVerses);

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error processing Quran request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// Helper functions
async function getAllSurahs() {
  try {
    // Use the new getAllChapters API
    const response = await getAllChapters();
    if (response.chapters) {
      return response.chapters.map((chapter: any) => ({
        id: chapter.id,
        name_simple: chapter.name_simple,
        name_arabic: chapter.name_arabic,
        verses_count: chapter.verses_count,
        translated_name: chapter.translated_name
      }));
    }
  } catch (error) {
    console.warn('Failed to fetch all chapters:', error);
  }

  // Return empty array if API fails
  return [];
}


async function getRandomVerse() {
  const popularVerses = [
    { surah: 1, ayah: 1 },
    { surah: 2, ayah: 255 },
    { surah: 112, ayah: 1 },
    { surah: 36, ayah: 1 },
    { surah: 55, ayah: 13 },
    { surah: 67, ayah: 1 },
    { surah: 113, ayah: 1 },
    { surah: 114, ayah: 1 }
  ];
  
  const randomIndex = Math.floor(Math.random() * popularVerses.length);
  const { surah, ayah } = popularVerses[randomIndex];
  
  try {
    const [surahData, ayahData] = await Promise.all([
      getSurah(surah),
      getAyah(surah, ayah)
    ]);
    
    return {
      surah: surahData,
      ayah: ayahData,
      surahNumber: surah,
      ayahNumber: ayah
    };
  } catch (error) {
    console.warn('Failed to get random verse:', error);
    return null;
  }
}

async function getPopularVerses() {
  const popularVerses = [
    { surah: 1, ayah: 1, name: "Bismillah" },
    { surah: 2, ayah: 255, name: "Ayat al-Kursi" },
    { surah: 112, ayah: 1, name: "Al-Ikhlas" },
    { surah: 113, ayah: 1, name: "Al-Falaq" },
    { surah: 114, ayah: 1, name: "An-Nas" }
  ];
  
  const results = [];
  
  for (const verse of popularVerses) {
    try {
      const [surahData, ayahData] = await Promise.all([
        getSurah(verse.surah),
        getAyah(verse.surah, verse.ayah)
      ]);
      
      results.push({
        ...verse,
        surahData,
        ayahData
      });
    } catch (error) {
      console.warn(`Failed to get popular verse ${verse.surah}:${verse.ayah}:`, error);
    }
  }
  
  return results;
}
