"use client";

import { useEffect, useRef, useState } from "react";
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

  const startRecording = async () => {
    console.log('Button clicked: Start recording');
    try {
      setError(null);
      setResults(null);
      audioChunksRef.current = [];
      
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
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
        
        const hue = (i / bufferLength) * 360;
        ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
      
      animationRef.current = requestAnimationFrame(draw);
    };
    
    draw();
  };

  const analyzeAudio = async () => {
    console.log('Button clicked: Analyze audio');
    if (!audioBlob) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Convert audio to base64 for sending to API
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        
        // Send to our API endpoint for processing
        const response = await fetch('/api/identify-verse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audioData: base64Audio,
            mimeType: audioBlob.type
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to analyze audio');
        }
        
        const result = await response.json();
        console.log('Audio identification API response:', result);
        setResults(result);
      };
      
      reader.readAsDataURL(audioBlob);
      
    } catch (err) {
      setError("Failed to analyze audio. Please try again.");
      console.error("Analysis error:", err);
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
    </div>
  );
}
