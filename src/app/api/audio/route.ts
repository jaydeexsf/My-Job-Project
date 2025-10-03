import { NextRequest, NextResponse } from 'next/server';
import { getAudioForAyah, getSurah } from '@/lib/quranApi';

// Popular reciters with their IDs
const POPULAR_RECITERS = {
  'abdul-basit': { name: 'Abdul Basit Abd us-Samad', id: 'abdul-basit' },
  'mishary': { name: 'Mishary Rashid Alafasy', id: 'mishary' },
  'sudais': { name: 'Abdul Rahman Al-Sudais', id: 'sudais' },
  'husary': { name: 'Mahmoud Khalil Al-Husary', id: 'husary' },
  'minshawi': { name: 'Mohamed Siddiq El-Minshawi', id: 'minshawi' },
  'ajmi': { name: 'Ahmad bin Ali Al-Ajmi', id: 'ajmi' }
};

// Get audio for specific ayah or list reciters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const surah = searchParams.get('surah');
    const ayah = searchParams.get('ayah');
    const reciter = searchParams.get('reciter');
    const action = searchParams.get('action');

    // Return list of available reciters
    if (action === 'reciters') {
      return NextResponse.json({
        reciters: Object.values(POPULAR_RECITERS)
      });
    }

    // Get audio for specific ayah
    if (surah && ayah) {
      const surahNum = parseInt(surah);
      const ayahNum = parseInt(ayah);
      
      if (isNaN(surahNum) || isNaN(ayahNum)) {
        return NextResponse.json(
          { error: 'Invalid surah or ayah number' },
          { status: 400 }
        );
      }

      try {
        const [audioData, surahData] = await Promise.all([
          getAudioForAyah(surahNum, ayahNum, reciter || 'abdul-basit'),
          getSurah(surahNum)
        ]);

        return NextResponse.json({
          audio: audioData,
          surah: surahData,
          ayah: ayahNum,
          reciter: reciter || 'abdul-basit',
          reciterName: POPULAR_RECITERS[reciter as keyof typeof POPULAR_RECITERS]?.name || 'Abdul Basit Abd us-Samad'
        });
      } catch (error) {
        console.error('Error fetching audio:', error);
        // Return fallback audio URL
        return NextResponse.json({
          audio: {
            audioUrl: `/audio/fallback-${surahNum}-${ayahNum}.mp3`,
            reciter: reciter || 'abdul-basit'
          },
          surah: { name: `Surah ${surahNum}`, englishName: `Surah ${surahNum}` },
          ayah: ayahNum,
          reciter: reciter || 'abdul-basit',
          reciterName: POPULAR_RECITERS[reciter as keyof typeof POPULAR_RECITERS]?.name || 'Abdul Basit Abd us-Samad',
          fallback: true
        });
      }
    }

    return NextResponse.json(
      { error: 'Missing required parameters: surah and ayah' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in audio API:', error);
    return NextResponse.json(
      { error: 'Failed to process audio request' },
      { status: 500 }
    );
  }
}

// Get multiple audio files or playlist
export async function POST(request: NextRequest) {
  try {
    const { action, verses, reciter, surah } = await request.json();

    switch (action) {
      case 'playlist':
        if (!verses || !Array.isArray(verses)) {
          return NextResponse.json(
            { error: 'Verses array required for playlist' },
            { status: 400 }
          );
        }
        
        const playlist = await createPlaylist(verses, reciter);
        return NextResponse.json(playlist);

      case 'surahAudio':
        if (!surah) {
          return NextResponse.json(
            { error: 'Surah number required' },
            { status: 400 }
          );
        }
        
        const surahAudio = await getSurahAudio(parseInt(surah), reciter);
        return NextResponse.json(surahAudio);

      case 'popularRecitations':
        const popularRecitations = await getPopularRecitations();
        return NextResponse.json(popularRecitations);

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error processing audio request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// Helper functions
async function createPlaylist(verses: Array<{surah: number, ayah: number}>, reciter = 'abdul-basit') {
  const playlist = [];
  
  for (const verse of verses.slice(0, 10)) { // Limit to 10 verses
    try {
      const [audioData, surahData] = await Promise.all([
        getAudioForAyah(verse.surah, verse.ayah, reciter),
        getSurah(verse.surah)
      ]);
      
      playlist.push({
        surah: verse.surah,
        ayah: verse.ayah,
        surahName: surahData.name || `Surah ${verse.surah}`,
        audio: audioData,
        reciter: reciter,
        reciterName: POPULAR_RECITERS[reciter as keyof typeof POPULAR_RECITERS]?.name || 'Abdul Basit Abd us-Samad'
      });
    } catch (error) {
      console.warn(`Failed to get audio for ${verse.surah}:${verse.ayah}:`, error);
      // Add fallback entry
      playlist.push({
        surah: verse.surah,
        ayah: verse.ayah,
        surahName: `Surah ${verse.surah}`,
        audio: { audioUrl: `/audio/fallback-${verse.surah}-${verse.ayah}.mp3` },
        reciter: reciter,
        reciterName: POPULAR_RECITERS[reciter as keyof typeof POPULAR_RECITERS]?.name || 'Abdul Basit Abd us-Samad',
        fallback: true
      });
    }
  }
  
  return {
    playlist,
    reciter: reciter,
    reciterName: POPULAR_RECITERS[reciter as keyof typeof POPULAR_RECITERS]?.name || 'Abdul Basit Abd us-Samad',
    totalTracks: playlist.length
  };
}

async function getSurahAudio(surahNum: number, reciter = 'abdul-basit') {
  try {
    const surahData = await getSurah(surahNum);
    const numberOfAyahs = surahData.numberOfAyahs || 7; // Default to 7 if not available
    
    // For demo, we'll just return the first few ayahs
    const ayahs = [];
    const maxAyahs = Math.min(numberOfAyahs, 5); // Limit to first 5 ayahs for demo
    
    for (let i = 1; i <= maxAyahs; i++) {
      try {
        const audioData = await getAudioForAyah(surahNum, i, reciter);
        ayahs.push({
          ayah: i,
          audio: audioData
        });
      } catch (error) {
        console.warn(`Failed to get audio for ${surahNum}:${i}:`, error);
        ayahs.push({
          ayah: i,
          audio: { audioUrl: `/audio/fallback-${surahNum}-${i}.mp3` },
          fallback: true
        });
      }
    }
    
    return {
      surah: surahData,
      surahNumber: surahNum,
      ayahs: ayahs,
      reciter: reciter,
      reciterName: POPULAR_RECITERS[reciter as keyof typeof POPULAR_RECITERS]?.name || 'Abdul Basit Abd us-Samad',
      totalAyahs: numberOfAyahs
    };
  } catch (error) {
    console.error(`Error getting surah ${surahNum} audio:`, error);
    throw error;
  }
}

async function getPopularRecitations() {
  const popularVerses = [
    { surah: 1, ayah: 1, name: "Al-Fatiha Opening" },
    { surah: 2, ayah: 255, name: "Ayat al-Kursi" },
    { surah: 112, ayah: 1, name: "Al-Ikhlas" },
    { surah: 36, ayah: 1, name: "Ya-Sin Opening" },
    { surah: 67, ayah: 1, name: "Al-Mulk Opening" }
  ];
  
  const recitations = [];
  
  for (const verse of popularVerses) {
    try {
      const [audioData, surahData] = await Promise.all([
        getAudioForAyah(verse.surah, verse.ayah, 'abdul-basit'),
        getSurah(verse.surah)
      ]);
      
      recitations.push({
        ...verse,
        surahName: surahData.name || `Surah ${verse.surah}`,
        audio: audioData,
        reciter: 'abdul-basit',
        reciterName: 'Abdul Basit Abd us-Samad'
      });
    } catch (error) {
      console.warn(`Failed to get popular recitation ${verse.surah}:${verse.ayah}:`, error);
      recitations.push({
        ...verse,
        surahName: `Surah ${verse.surah}`,
        audio: { audioUrl: `/audio/fallback-${verse.surah}-${verse.ayah}.mp3` },
        reciter: 'abdul-basit',
        reciterName: 'Abdul Basit Abd us-Samad',
        fallback: true
      });
    }
  }
  
  return recitations;
}
