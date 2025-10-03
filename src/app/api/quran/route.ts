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
        audio === 'true' ? getAudioForAyah(surahNum, ayahNum, reciter || undefined) : null
      ]);

      return NextResponse.json({
        surah: surahData,
        ayah: ayahData,
        audio: audioData
      });
    }

    // If specific surah requested
    if (surah) {
      const surahNum = parseInt(surah);
      const surahData = await getSurah(surahNum);
      return NextResponse.json(surahData);
    }

    // Return list of all surahs with basic info
    const surahs = await getAllSurahs();
    return NextResponse.json({ surahs });

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
      case 'search':
        if (!query) {
          return NextResponse.json(
            { error: 'Query parameter required for search' },
            { status: 400 }
          );
        }
        const searchResults = await searchQuran(query);
        return NextResponse.json(searchResults);

      case 'getAudio':
        if (!surah || !ayah) {
          return NextResponse.json(
            { error: 'Surah and ayah parameters required for audio' },
            { status: 400 }
          );
        }
        const audioData = await getAudioForAyah(parseInt(surah), parseInt(ayah), reciter);
        return NextResponse.json(audioData);

      case 'getRandomVerse':
        const randomVerse = await getRandomVerse();
        return NextResponse.json(randomVerse);

      case 'getPopularVerses':
        const popularVerses = await getPopularVerses();
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
        number: chapter.id,
        name: chapter.name_simple || chapter.name_arabic,
        englishName: chapter.translated_name?.name || chapter.name_simple,
        numberOfAyahs: chapter.verses_count,
        revelationType: chapter.revelation_place || 'Unknown'
      }));
    }
  } catch (error) {
    console.warn('Failed to fetch all chapters:', error);
  }

  // Fallback to popular surahs if API fails
  const surahs = [];
  const popularSurahs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 18, 36, 55, 67, 112, 113, 114];
  
  for (const surahNum of popularSurahs) {
    try {
      const surahData = await getSurah(surahNum);
      surahs.push({
        number: surahNum,
        name: surahData.name || `Surah ${surahNum}`,
        englishName: surahData.englishName || `Surah ${surahNum}`,
        numberOfAyahs: surahData.numberOfAyahs || 0,
        revelationType: surahData.revelationType || 'Unknown'
      });
    } catch (error) {
      console.warn(`Failed to fetch surah ${surahNum}:`, error);
      // Add fallback data
      surahs.push({
        number: surahNum,
        name: `Surah ${surahNum}`,
        englishName: `Surah ${surahNum}`,
        numberOfAyahs: 0,
        revelationType: 'Unknown'
      });
    }
  }
  
  return surahs;
}

async function searchQuran(query: string) {
  try {
    return await quranApiFetch<any>({ 
      path: "/v1/search", 
      query: { q: query, limit: 20 } 
    });
  } catch (error) {
    console.warn('Search failed, returning fallback results:', error);
    return {
      results: [
        {
          surah: 1,
          ayah: 1,
          text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
          translation: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
          surahName: "Al-Fatiha"
        },
        {
          surah: 2,
          ayah: 255,
          text: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ",
          translation: "Allah - there is no deity except Him, the Ever-Living, the Sustainer of existence.",
          surahName: "Al-Baqarah"
        }
      ]
    };
  }
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
    return {
      surah: { name: "Al-Fatiha", englishName: "The Opening" },
      ayah: { 
        text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", 
        translation: "In the name of Allah, the Entirely Merciful, the Especially Merciful." 
      },
      surahNumber: 1,
      ayahNumber: 1
    };
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
