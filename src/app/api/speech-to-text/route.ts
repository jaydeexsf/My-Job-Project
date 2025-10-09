import { NextRequest, NextResponse } from 'next/server';
import { SpeechClient } from '@google-cloud/speech';

// Initialize client lazily to avoid startup errors when creds are missing
let speechClient: SpeechClient | null = null;
function getSpeechClient(): SpeechClient {
  if (!speechClient) {
    speechClient = new SpeechClient();
  }
  return speechClient;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let base64Content: string | null = null;
    let mimeType: string | null = null;
    let debugSource = '';

    if (contentType.includes('application/json')) {
      const { audioData, mimeType: jsonMime } = await request.json();
      if (!audioData) {
        return NextResponse.json({ error: 'No audio data provided' }, { status: 400 });
      }
      // audioData may be a data URL (data:audio/...;base64,XXXX)
      const commaIdx = audioData.indexOf(',');
      base64Content = commaIdx >= 0 ? audioData.slice(commaIdx + 1) : audioData;
      mimeType = jsonMime || (audioData.match(/^data:(.*?);base64,/)?.[1] ?? null);
      debugSource = 'json-base64';
      console.log('🎤 Received JSON base64 audio for STT');
    } else {
      const formData = await request.formData();
      const audioFile = formData.get('audio') as File | null;
      if (!audioFile) {
        return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
      }
      const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
      base64Content = audioBuffer.toString('base64');
      mimeType = audioFile.type || 'audio/webm;codecs=opus';
      debugSource = 'multipart-file';
      console.log('🎤 Received multipart audio for STT:', { name: (audioFile as any).name, sizeKB: (audioFile.size/1024).toFixed(2), type: audioFile.type });
    }

    if (!base64Content) {
      return NextResponse.json({ error: 'Empty audio content' }, { status: 400 });
    }

    const hasGoogleCreds = !!(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT);
    const hasAssemblyAI = !!process.env.ASSEMBLYAI_API_KEY;

    // Prefer Google if creds present, else fallback to AssemblyAI
    if (!hasGoogleCreds && !hasAssemblyAI) {
      console.warn('⚠️ No STT credentials configured (Google/AssemblyAI).');
      return NextResponse.json({
        error: 'No STT credentials configured',
        hint: 'Set GOOGLE_APPLICATION_CREDENTIALS or ASSEMBLYAI_API_KEY',
      }, { status: 501 });
    }

    // Try Google first
    if (hasGoogleCreds) {
      try {
        console.log('🔍 Sending to Google Cloud Speech-to-Text...', { source: debugSource, mimeType });
        const client = getSpeechClient();
        const [response] = await client.recognize({
          audio: { content: base64Content },
          config: {
            encoding: (mimeType && mimeType.includes('webm')) ? 'WEBM_OPUS' : 'ENCODING_UNSPECIFIED',
            sampleRateHertz: 48000,
            languageCode: 'ar-SA',
            alternativeLanguageCodes: ['en-US'],
            enableAutomaticPunctuation: true,
            model: 'latest_long',
            enableWordTimeOffsets: true,
            enableWordConfidence: true,
          },
        } as any);

        const transcription = response.results?.map(r => r.alternatives?.[0]?.transcript || '').join(' ').trim() || '';
        const confidence = response.results?.[0]?.alternatives?.[0]?.confidence || 0;
        const words = response.results?.[0]?.alternatives?.[0]?.words || [];
        const language = (response as any).results?.[0]?.languageCode || 'ar-SA';

        console.log('✅ Google STT done:', { transcription, confidence, words: words?.length || 0, language });

        if (!transcription) {
          return NextResponse.json({ error: 'No speech detected in audio', confidence: 0 }, { status: 400 });
        }

        return NextResponse.json({
          transcription,
          confidence,
          language,
          wordCount: words.length || 0,
          words: (words || []).map((w: any) => ({
            word: w.word,
            confidence: w.confidence,
            startTime: w.startTime,
            endTime: w.endTime,
          })),
          provider: 'google',
        });
      } catch (err: any) {
        console.error('❌ Google STT failed:', err?.message || err);
        // fall through to Assembly if available
      }
    }

    // AssemblyAI fallback
    if (hasAssemblyAI) {
      try {
        console.log('🎤 Using AssemblyAI fallback for speech-to-text...');
        const uploadResp = await fetch('https://api.assemblyai.com/v2/upload', {
          method: 'POST',
          headers: { authorization: process.env.ASSEMBLYAI_API_KEY as string },
          body: Buffer.from(base64Content, 'base64'),
        });
        const uploadJson = await uploadResp.json();
        console.log('📤 AssemblyAI upload:', uploadJson);

        const transcribeResp = await fetch('https://api.assemblyai.com/v2/transcript', {
          method: 'POST',
          headers: { authorization: process.env.ASSEMBLYAI_API_KEY as string, 'content-type': 'application/json' },
          body: JSON.stringify({ audio_url: uploadJson.upload_url, language_code: 'ar', punctuate: true, format_text: true }),
        });
        const transcribeJson = await transcribeResp.json();
        console.log('🔄 AssemblyAI started:', transcribeJson);

        const id = transcribeJson.id;
        let transcript: string | null = null;
        let attempts = 0;
        while (attempts < 30 && !transcript) {
          await new Promise(r => setTimeout(r, 1000));
          attempts++;
          const statusResp = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
            headers: { authorization: process.env.ASSEMBLYAI_API_KEY as string },
          });
          const statusJson = await statusResp.json();
          if (statusJson.status === 'completed') {
            transcript = statusJson.text as string;
            console.log('✅ AssemblyAI completed');
            return NextResponse.json({ transcription: transcript, confidence: 0.95, language: 'ar', provider: 'assemblyai' });
          }
          if (statusJson.status === 'error') {
            throw new Error(statusJson.error || 'AssemblyAI transcription error');
          }
        }
        throw new Error('AssemblyAI timeout');
      } catch (err: any) {
        console.error('❌ AssemblyAI failed:', err?.message || err);
        return NextResponse.json({ error: 'Speech-to-text failed (AssemblyAI)', details: err?.message || String(err) }, { status: 502 });
      }
    }

    return NextResponse.json({ error: 'Speech-to-text failed' }, { status: 502 });
  } catch (error: any) {
    console.error('❌ Speech-to-text error:', error);
    return NextResponse.json(
      { error: 'Failed to process audio', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

// Fallback: AssemblyAI implementation
export async function POST_ASSEMBLYAI(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log('🎤 Using AssemblyAI for speech-to-text...');
    
    const audioBuffer = await audioFile.arrayBuffer();
    
    // Upload to AssemblyAI
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'authorization': process.env.ASSEMBLYAI_API_KEY || '',
      },
      body: audioBuffer,
    });

    const { upload_url } = await uploadResponse.json();
    console.log('📤 Audio uploaded to AssemblyAI:', upload_url);

    // Start transcription
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': process.env.ASSEMBLYAI_API_KEY || '',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: upload_url,
        language_code: 'ar', // Arabic
        punctuate: true,
        format_text: true,
        word_boost: ['quran', 'allah', 'muhammad', 'islam'], // Boost Quran-related words
      }),
    });

    const { id } = await transcriptResponse.json();
    console.log('🔄 Transcription started with ID:', id);

    // Poll for completion
    let transcript = null;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    while (transcript === null && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      attempts++;
      
      const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
        headers: {
          'authorization': process.env.ASSEMBLYAI_API_KEY || '',
        },
      });
      
      const statusData = await statusResponse.json();
      console.log(`🔄 Status check ${attempts}:`, statusData.status);
      
      if (statusData.status === 'completed') {
        transcript = statusData.text;
        console.log('✅ AssemblyAI transcription completed:', transcript);
        break;
      } else if (statusData.status === 'error') {
        throw new Error('Transcription failed: ' + statusData.error);
      }
    }

    if (!transcript) {
      throw new Error('Transcription timeout');
    }

    return NextResponse.json({
      transcription: transcript,
      confidence: 0.95, // AssemblyAI doesn't provide confidence scores
      language: 'ar',
      service: 'assemblyai'
    });

  } catch (error) {
    console.error('❌ AssemblyAI error:', error);
    return NextResponse.json(
      { error: 'Failed to process audio with AssemblyAI', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
