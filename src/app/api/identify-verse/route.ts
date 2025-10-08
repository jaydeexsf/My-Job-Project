import { NextRequest, NextResponse } from 'next/server';
import { smartQuranSearch, QuranSearchResult } from '@/lib/quranSearchApi';

// Real audio transcription and Quran search
async function identifyVerseFromAudio(audioData: string, mimeType: string): Promise<any> {
  console.log('🎤 Starting REAL audio analysis...');
  console.log('📊 Audio data size:', (audioData.length / 1024).toFixed(2), 'KB');
  console.log('🎧 MIME type:', mimeType);
  
  try {
    // Step 1: Convert base64 to blob for speech-to-text
    const base64Data = audioData.split(',')[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const audioBlob = new Blob([bytes], { type: mimeType });
    
    console.log('🔄 Converting audio for speech-to-text...');
    
    // Step 2: Send to speech-to-text API
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    
    const speechResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/speech-to-text`, {
      method: 'POST',
      body: formData,
    });
    
    if (!speechResponse.ok) {
      throw new Error('Speech-to-text failed');
    }
    
    const speechData = await speechResponse.json();
    console.log('🎯 Speech-to-text results:');
    console.log('📝 Transcription:', speechData.transcription);
    console.log('🔍 Confidence:', speechData.confidence);
    console.log('🌍 Language:', speechData.language);
    
    if (!speechData.transcription) {
      throw new Error('No speech detected in audio');
    }
    
    // Step 3: Search Quran using the transcribed text
    console.log('🔍 Searching Quran with transcribed text...');
    const searchResults = await smartQuranSearch(speechData.transcription);
    
    console.log('📊 Quran search results:');
    console.log('📝 Total matches:', searchResults.total_matches);
    console.log('🎯 Search query:', searchResults.query);
    console.log('🔍 Search field:', searchResults.search_field);
    
    if (searchResults.total_matches === 0) {
      console.log('❌ No Quran matches found for transcription');
      return {
        surah: 0,
        ayah: 0,
        text: speechData.transcription,
        translation: 'No matching verse found',
        confidence: speechData.confidence * 0.5, // Lower confidence for no match
        surahName: 'Not Found',
        transcription: speechData.transcription,
        searchResults: []
      };
    }
    
    // Step 4: Return the best match
    const bestMatch = searchResults.results[0];
    console.log('🏆 Best match found:');
    console.log('📖 Surah:', bestMatch.surah_name, '(Surah', bestMatch.surah_number + ')');
    console.log('📝 Ayah:', bestMatch.verse_number);
    console.log('🔤 Arabic text:', bestMatch.arabic_text);
    console.log('🌍 Translation:', bestMatch.translation);
    console.log('📊 Relevance score:', bestMatch.relevance_score);
    
    return {
      surah: bestMatch.surah_number,
      ayah: bestMatch.verse_number,
      text: bestMatch.arabic_text,
      translation: bestMatch.translation,
      transliteration: bestMatch.transliteration,
      confidence: Math.min(0.95, speechData.confidence * 0.9), // Combine speech and search confidence
      surahName: bestMatch.surah_name,
      surahNameArabic: bestMatch.surah_name_arabic,
      transcription: speechData.transcription,
      searchResults: searchResults.results,
      totalMatches: searchResults.total_matches,
      relevanceScore: bestMatch.relevance_score
    };
    
  } catch (error) {
    console.error('❌ Real audio analysis failed:', error);
    // No dummy fallback — propagate error to caller
    throw error;
  }
}

// Enhanced verse identification with actual Quran API integration
async function enhanceVerseDetails(verse: any) {
  try {
    console.log('🔍 Enhancing verse details for Surah', verse.surah);
    
    // Get additional details from Quran API
    const { getSurah } = await import('@/lib/quranSearchApi');
    const surahDetails = await getSurah(verse.surah);
    
    console.log('📊 Surah details retrieved:', {
      totalVerses: surahDetails.length,
      firstVerse: surahDetails[0]?.arabic_text?.substring(0, 50) + '...'
    });
    
    return {
      ...verse,
      totalAyahs: surahDetails.length,
      revelationType: 'Unknown', // Will be enhanced later
      enhanced: true
    };
  } catch (error) {
    console.error('❌ Error enhancing verse details:', error);
    return {
      ...verse,
      enhanced: false,
      enhancementError: error.message
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { audioData, mimeType } = await request.json();
    
    if (!audioData) {
      return NextResponse.json(
        { error: 'No audio data provided' },
        { status: 400 }
      );
    }

    // Basic validation of audio data
    if (!audioData.startsWith('data:audio/')) {
      return NextResponse.json(
        { error: 'Invalid audio data format' },
        { status: 400 }
      );
    }

    console.log('🎵 Processing audio for REAL verse identification...');
    console.log('📊 Audio size:', (audioData.length / 1024).toFixed(2), 'KB');
    console.log('🎧 MIME type:', mimeType);
    console.log('🔍 Audio data preview:', audioData.substring(0, 100) + '...');

    // Identify the verse from audio using REAL speech-to-text and Quran search
    const identifiedVerse = await identifyVerseFromAudio(audioData, mimeType);
    
    console.log('🎯 Raw identification result:', identifiedVerse);
    console.log('📝 Transcription:', identifiedVerse.transcription);
    console.log('🔍 Confidence:', identifiedVerse.confidence);
    console.log('📖 Surah:', identifiedVerse.surahName, 'Ayah:', identifiedVerse.ayah);
    
    // Enhance with additional details from Quran API
    const enhancedVerse = await enhanceVerseDetails(identifiedVerse);

    console.log('✅ Final enhanced verse:', enhancedVerse);
    console.log('📊 Data structure returned:');
    console.log('  - surah:', enhancedVerse.surah);
    console.log('  - ayah:', enhancedVerse.ayah);
    console.log('  - text:', enhancedVerse.text);
    console.log('  - translation:', enhancedVerse.translation);
    console.log('  - confidence:', enhancedVerse.confidence);
    console.log('  - transcription:', enhancedVerse.transcription);
    console.log('  - totalMatches:', enhancedVerse.totalMatches);
    console.log('  - searchResults:', enhancedVerse.searchResults?.length || 0, 'results');
    
    return NextResponse.json(enhancedVerse);

  } catch (error) {
    console.error('❌ Error in verse identification:', error);
    return NextResponse.json(
      { error: 'Failed to process audio', details: error.message },
      { status: 500 }
    );
  }
}

// Optional: Handle audio file uploads via multipart/form-data
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = `data:${audioFile.type};base64,${buffer.toString('base64')}`;

    // Process the audio
    const identifiedVerse = await identifyVerseFromAudio(base64Audio);
    const enhancedVerse = await enhanceVerseDetails(identifiedVerse);

    console.log('Identify Verse API Response - PUT:', enhancedVerse);
    return NextResponse.json(enhancedVerse);

  } catch (error) {
    console.error('Error processing uploaded audio:', error);
    return NextResponse.json(
      { error: 'Failed to process uploaded audio' },
      { status: 500 }
    );
  }
}
