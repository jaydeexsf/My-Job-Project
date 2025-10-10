"use client";

import { useEffect, useRef, useState } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { smartQuranSearch } from "@/lib/quranSearchApi";
import clsx from "clsx";
import { 
  MicrophoneIcon, 
  StopIcon, 
  ArrowUpTrayIcon, 
  MagnifyingGlassIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BookOpenIcon,
  BookmarkIcon,
  SpeakerWaveIcon,
  MusicalNoteIcon
} from "@heroicons/react/24/outline";

interface IdentificationResult {
  surah: number;
  ayah: number;
  text: string;
  translation: string;
  confidence: number;
  surahName: string;
  transcription?: string;
  totalMatches?: number;
}

export default function AudioIdentifier() {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [results, setResults] = useState<IdentificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Browser speech recognition (react-speech-recognition)
  const {
    transcript,
    listening: srListening,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
    resetTranscript
  } = useSpeechRecognition();

  const startRecording = async () => {
    console.log('Button clicked: Start recording');
    try {
      setError(null);
      setResults(null);
      audioChunksRef.current = [];
      // Start browser STT if supported
      if (browserSupportsSpeechRecognition && isMicrophoneAvailable) {
        console.log('🧪 SpeechRecognition supported:', browserSupportsSpeechRecognition, '| Mic available:', isMicrophoneAvailable);
        resetTranscript();
        SpeechRecognition.startListening({ language: 'ar-SA', continuous: false, interimResults: true });
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 44100,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      // Set up audio visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        // Auto-run analysis if we captured a browser transcript
        setTimeout(() => {
          try {
            if (!isAnalyzing && transcript && transcript.trim().length > 0) {
              analyzeAudio();
            }
          } catch {}
        }, 0);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Start visualization
      drawWaveform();
      
    } catch (err) {
      setError("Could not access microphone. Please allow microphone access.");
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    console.log('Button clicked: Stop recording');
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    try { SpeechRecognition.stopListening(); } catch {}
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    
    if (!canvas || !analyser) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Clear canvas with fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Calculate average volume for overall intensity
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      const intensity = average / 255;
      
      console.log('🎵 Audio Level:', Math.round(intensity * 100) + '%', '| Frequency data:', dataArray.slice(0, 10));
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;
      
      // Create gradient for visual appeal
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#8B5CF6'); // Purple
      gradient.addColorStop(0.5, '#3B82F6'); // Blue
      gradient.addColorStop(1, '#10B981'); // Emerald
      
      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * 0.9;
        
        // Make bars more responsive to audio
        const normalizedHeight = Math.max(2, barHeight);
        
        // Color based on frequency and intensity
        const frequencyRatio = i / bufferLength;
        const volumeRatio = dataArray[i] / 255;
        
        if (volumeRatio > 0.1) {
          // High volume - bright colors
          const hue = 200 + (frequencyRatio * 160); // Blue to green
          const saturation = 70 + (volumeRatio * 30);
          const lightness = 40 + (volumeRatio * 40);
          ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        } else {
          // Low volume - dim colors
          ctx.fillStyle = `rgba(139, 92, 246, ${volumeRatio * 0.3})`;
        }
        
        // Add glow effect for high frequencies
        if (volumeRatio > 0.5) {
          ctx.shadowColor = `hsl(${200 + frequencyRatio * 160}, 70%, 50%)`;
          ctx.shadowBlur = 5;
        } else {
          ctx.shadowBlur = 0;
        }
        
        // Draw bar with rounded corners
        const barX = x;
        const barY = canvas.height - normalizedHeight;
        const barW = barWidth;
        const barH = normalizedHeight;
        
        ctx.fillRect(barX, barY, barW, barH);
        
        x += barWidth + 1;
      }
      
      // Reset shadow
      ctx.shadowBlur = 0;
      
      // Add center line for visual reference
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      
      animationRef.current = requestAnimationFrame(draw);
    };
    
    draw();
  };

  const analyzeAudio = async () => {
    console.log('🎤 Button clicked: Analyze audio');
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Prefer client transcript from Web Speech API (no server creds required)
      if (transcript && transcript.trim().length > 0) {
        const spoken = transcript.trim();
        console.log('🗣️ Transcription (from audio):', spoken);
        console.log('🔎 Searching Quran using client transcription...');
        const searchResults = await smartQuranSearch(spoken);
        console.log('📦 Full Quran search response:', searchResults);

        if (searchResults.total_matches > 0) {
          const best = searchResults.results[0];
          const built: IdentificationResult = {
            surah: best.surah_number,
            ayah: best.verse_number,
            text: best.arabic_text,
            translation: best.translation,
            confidence: 0.9,
            surahName: best.surah_name,
            transcription: spoken,
            totalMatches: searchResults.total_matches
          };
          console.log('🎯 Best match (client):', built);
          setResults(built);
          return;
        } else {
          setError('No matching verse found for the spoken text.');
          return;
        }
      } else {
        console.warn('⚠️ No browser transcript captured yet. Skipping server STT to avoid 500.');
        setError('No speech captured. Please record again and wait until the “You said” text appears, then press Identify.');
        setIsAnalyzing(false);
        return;
      }

      if (!audioBlob) {
        setError('No audio or transcription available. Please record again.');
        setIsAnalyzing(false);
        return;
      }

      // Convert audio to base64 for sending to API
      const reader = new FileReader();
      const blob = audioBlob; // Store in local variable for TypeScript
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        
        console.log('📊 Audio Analysis Details:');
        console.log('  - Audio size:', (blob!.size / 1024).toFixed(2), 'KB');
        console.log('  - Audio type:', blob!.type);
        console.log('  - Base64 length:', base64Audio.length);
        console.log('  - Recording duration:', formatTime(recordingTime));
        
        // Send to our API endpoint for processing
        const response = await fetch('/api/identify-verse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audioData: base64Audio,
            mimeType: blob!.type
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to analyze audio');
        }
        
        const result = await response.json();
        console.log('🎯 Audio identification API response:', result);
        console.log('🗣️ Transcription (from audio):', result.transcription);
        console.log('📝 Identified Text:', result.text);
        console.log('🔍 Confidence Score:', result.confidence);
        console.log('📖 Surah:', result.surahName, '- Ayah:', result.ayah);
        console.log('🌍 Translation:', result.translation);
        setResults(result);
      };
      
      reader.readAsDataURL(blob!);
      
    } catch (err) {
      setError("Failed to analyze audio. Please try again.");
      console.error("❌ Analysis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Button clicked: File upload');
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioBlob(file);
      setResults(null);
      setError(null);
      console.log('Audio file uploaded:', file.name, file.type);
    } else {
      setError("Please select a valid audio file.");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className={clsx(
        "rounded-3xl p-8 w-full text-center",
        "backdrop-blur-xl border border-white/30",
        "bg-gradient-to-br from-purple-500/15 via-blue-500/10 to-teal-500/5",
        "shadow-[0_20px_50px_rgba(139,_69,_219,_0.3)]",
        "dark:shadow-[0_20px_50px_rgba(139,_69,_219,_0.2)]"
      )}>
        <div className="mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl">
              <MusicalNoteIcon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Quran Verse Identifier
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            Record or upload Quran recitation to identify the verse
          </p>
        </div>

        {/* Recording Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isAnalyzing}
              className={clsx(
                "flex items-center justify-center gap-3 px-6 py-3 rounded-lg font-medium text-white",
                "transition-all duration-200 shadow-lg",
                isRecording 
                  ? "bg-red-600 hover:bg-red-700 animate-pulse" 
                  : "bg-purple-600 hover:bg-purple-700",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                {isRecording ? <StopIcon className="w-6 h-6" /> : <MicrophoneIcon className="w-6 h-6" />}
              </div>
              <span>
                {isRecording ? `Recording... ${formatTime(recordingTime)}` : "Start Recording"}
              </span>
            </button>

            <div className="text-sm text-gray-500 dark:text-gray-400">or</div>

            <label className="flex items-center justify-center gap-3 px-6 py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 cursor-pointer transition-colors duration-200 shadow-lg">
              <ArrowUpTrayIcon className="w-5 h-5" />
              <span>Upload Audio</span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isRecording || isAnalyzing}
              />
            </label>
          </div>

          {/* Audio Visualization */}
          {isRecording && (
            <canvas
              ref={canvasRef}
              width={400}
              height={100}
              className="w-full max-w-md h-24 mx-auto bg-black/20 rounded-lg"
            />
          )}
        </div>

        {/* Audio Playback */}
        {audioBlob && !isRecording && (
          <div className="mb-6">
            <audio
              controls
              src={URL.createObjectURL(audioBlob)}
              className="w-full max-w-md mx-auto"
            />
            <button
              onClick={analyzeAudio}
              disabled={isAnalyzing}
              className={clsx(
                "mt-4 flex items-center justify-center gap-3 px-8 py-3 rounded-lg font-medium text-white mx-auto",
                "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700",
                "transition-all duration-200 shadow-lg",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isAnalyzing && "animate-pulse"
              )}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                {isAnalyzing ? <MagnifyingGlassIcon className="w-6 h-6 animate-spin" /> : <MusicalNoteIcon className="w-6 h-6" />}
              </div>
              <span>
                {isAnalyzing ? "Identifying Verse..." : "Identify Verse"}
              </span>
            </button>
          </div>
        )}
        {/* Live transcript preview */}
        {transcript && transcript.trim().length > 0 && (
          <div className="mt-4 p-3 bg-white/10 dark:bg-gray-800/30 rounded-lg">
            <p className="text-sm opacity-80">
              <strong>You said:</strong> &ldquo;{transcript}&rdquo;
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Results Display */}
        {results && (
          <div className="bg-white/10 dark:bg-gray-800/30 rounded-xl p-6 text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                  Verse Identified!
                </h3>
              </div>
              <div className="text-sm bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full">
                {Math.round(results.confidence * 100)}% confidence
              </div>
            </div>
            
            {/* Transcription Display */}
            {results.transcription && (
              <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    What you said:
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 italic">
                  &ldquo;{results.transcription}&rdquo;
                </p>
              </div>
            )}
            
            {/* Search Results Summary */}
            {results.totalMatches && (
              <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                    Search Results:
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300">
                  Found {results.totalMatches} matches in the Quran
                </p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  {results.surahName} - Surah {results.surah}, Ayah {results.ayah}
                </div>
                <div className="text-right text-xl mb-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg" dir="rtl">
                  {results.text}
                </div>
                <div className="text-gray-700 dark:text-gray-300 italic">
                  &ldquo;{results.translation}&rdquo;
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <button 
                  onClick={() => console.log('Button clicked: Read Full Surah', results?.surah)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  <BookOpenIcon className="w-4 h-4" />
                  <span>Read Full Surah</span>
                </button>
                <button 
                  onClick={() => console.log('Button clicked: Bookmark verse', results?.surah, results?.ayah)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
                >
                  <BookmarkIcon className="w-4 h-4" />
                  <span>Bookmark</span>
                </button>
                <button 
                  onClick={() => console.log('Button clicked: Listen to verse', results?.surah, results?.ayah)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors"
                >
                  <SpeakerWaveIcon className="w-4 h-4" />
                  <span>Listen</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Full-screen analyzing overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white/90 dark:bg-gray-800/90 border border-white/30 dark:border-gray-700/50 shadow-xl">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-sm text-gray-700 dark:text-gray-200">Identifying verse...</div>
          </div>
        </div>
      )}
    </div>
  );
}
