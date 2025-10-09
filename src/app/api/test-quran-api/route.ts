import { NextRequest, NextResponse } from 'next/server';
import { searchQuranAll, getQuranStats, getSurah } from '@/lib/quranSearchApi';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Quran API integration...');
    
    // Test 1: Get Quran statistics
    console.log('📊 Test 1: Getting Quran statistics...');
    const stats = await getQuranStats();
    console.log('✅ Stats retrieved:', stats);
    
    // Test 2: Search for a common verse
    console.log('🔍 Test 2: Searching for "bismillah"...');
    const searchResults = await searchQuranAll('bismillah');
    console.log('✅ Search results:', searchResults);
    
    // Test 3: Get a specific surah
    console.log('📖 Test 3: Getting Surah Al-Fatiha...');
    const surah = await getSurah(1);
    console.log('✅ Surah retrieved:', {
      totalVerses: surah.length,
      firstVerse: surah[0]?.arabic_text?.substring(0, 50) + '...'
    });
    
    return NextResponse.json({
      success: true,
      message: 'Quran API integration working!',
      tests: {
        stats: {
          success: true,
          data: stats
        },
        search: {
          success: true,
          query: 'bismillah',
          totalMatches: searchResults.total_matches,
          topResult: searchResults.results[0]
        },
        surah: {
          success: true,
          surahNumber: 1,
          totalVerses: surah.length,
          firstVerse: surah[0]
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Quran API test failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Quran API test failed', 
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
