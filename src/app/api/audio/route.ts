import { NextRequest, NextResponse } from 'next/server';
import { getAudioForAyah, getSurah } from '@/lib/quranApi';

// Popular reciters with their IDs from Quran.com API
const POPULAR_RECITERS = {
  '1': { name: 'Abdul Basit Murattal', id: 'Abdul_Basit_Murattal' },
  '2': { name: 'Mishary Rashid Alafasy', id: 'Mishary_Rashid_Alafasy' },
  '3': { name: 'Abdul Rahman Al-Sudais', id: 'Abdul_Rahman_Al_Sudais' },
  '4': { name: 'Mahmoud Khalil Al-Husary', id: 'Mahmoud_Khalil_Al_Husary' },
  '5': { name: 'Mohamed Siddiq El-Minshawi', id: 'Mohamed_Siddiq_El_Minshawi' },
  '6': { name: 'Ahmad bin Ali Al-Ajmi', id: 'Ahmad_bin_Ali_Al_Ajmi' }
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
      const response = {
        reciters: Object.values(POPULAR_RECITERS)
      };
      console.log('Audio API Response - Reciters:', response);
      return NextResponse.json(response);
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
        const audioReciterId = POPULAR_RECITERS[reciter as keyof typeof POPULAR_RECITERS]?.id || 'Abdul_Basit_Murattal';
        const [audioData, surahData] = await Promise.all([
          getAudioForAyah(surahNum, ayahNum, audioReciterId),
          getSurah(surahNum)
        ]);

        const response = {
          audio: audioData,
          surah: surahData,
          ayah: ayahNum,
          reciter: reciter || '1',
          reciterName: POPULAR_RECITERS[reciter as keyof typeof POPULAR_RECITERS]?.name || 'Abdul Basit Murattal'
        };
        console.log('Audio API Response - Audio for Ayah:', response);
        return NextResponse.json(response);
      } catch (error) {
        console.error('Error fetching audio:', error);
        return NextResponse.json(
          { error: 'Failed to fetch audio from Quran.com API' },
          { status: 500 }
        );
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
        
        const playlistReciterId = POPULAR_RECITERS[reciter as keyof typeof POPULAR_RECITERS]?.id || 'Abdul_Basit_Murattal';
        const playlist = await createPlaylist(verses, playlistReciterId);
        console.log('Audio API Response - Playlist:', playlist);
        return NextResponse.json(playlist);

      case 'surahAudio':
        if (!surah) {
          return NextResponse.json(
            { error: 'Surah number required' },
            { status: 400 }
          );
        }
        
        const surahReciterId = POPULAR_RECITERS[reciter as keyof typeof POPULAR_RECITERS]?.id || 'Abdul_Basit_Murattal';
        const surahAudio = await getSurahAudio(parseInt(surah), surahReciterId);
        console.log('Audio API Response - Surah Audio:', surahAudio);
        return NextResponse.json(surahAudio);

      case 'popularRecitations':
        const popularRecitations = await getPopularRecitations();
        console.log('Audio API Response - Popular Recitations:', popularRecitations);
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
async function createPlaylist(verses: Array<{surah: number, ayah: number}>, reciter = 'Abdul_Basit_Murattal') {
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
        surahName: surahData.name_simple || `Surah ${verse.surah}`,
        audio: audioData,
        reciter: reciter,
        reciterName: 'Abdul Basit Murattal'
      });
    } catch (error) {
      console.warn(`Failed to get audio for ${verse.surah}:${verse.ayah}:`, error);
    }
  }
  
  return {
    playlist,
    reciter: reciter,
    reciterName: 'Abdul Basit Murattal',
    totalTracks: playlist.length
  };
}

async function getSurahAudio(surahNum: number, reciter = 'Abdul_Basit_Murattal') {
  try {
    const surahData = await getSurah(surahNum);
    const numberOfAyahs = surahData.verses_count || 7; // Default to 7 if not available
    
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
      }
    }
    
    return {
      surah: surahData,
      surahNumber: surahNum,
      ayahs: ayahs,
      reciter: reciter,
      reciterName: 'Abdul Basit Murattal',
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
        getAudioForAyah(verse.surah, verse.ayah, 'Abdul_Basit_Murattal'),
        getSurah(verse.surah)
      ]);
      
      recitations.push({
        ...verse,
        surahName: surahData.name_simple || `Surah ${verse.surah}`,
        audio: audioData,
        reciter: 'Abdul_Basit_Murattal',
        reciterName: 'Abdul Basit Murattal'
      });
    } catch (error) {
      console.warn(`Failed to get popular recitation ${verse.surah}:${verse.ayah}:`, error);
    }
  }
  
  return recitations;
}
