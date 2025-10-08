"use client";

import { useState, useRef, useEffect } from 'react';
import { useSpeechRecognition } from 'react-speech-recognition';
import clsx from 'clsx';
import { 
  MicrophoneIcon, 
  StopIcon,
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";

interface SpeechToTextProps {
  onTranscription: (text: string) => void;
  language?: string;
  continuous?: boolean;
  className?: string;
}

export default function SpeechToText({ 
  onTranscription, 
  language = 'ar-SA',
  continuous = false,
  className 
}: SpeechToTextProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcription, setTranscription] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable
  } = useSpeechRecognition({
    continuous,
    language,
    interimResults: true,
  });

  // Handle transcript changes
  useEffect(() => {
    if (transcript && !listening) {
      setTranscription(transcript);
      onTranscription(transcript);
    }
  }, [transcript, listening, onTranscription]);

  const startBrowserRecording = () => {
    if (!browserSupportsSpeechRecognition) {
      setError('Speech recognition not supported in this browser');
      return;
    }
    
    if (!isMicrophoneAvailable) {
      setError('Microphone access required');
      return;
    }

    setError(null);
    resetTranscript();
    // Speech recognition will start automatically
  };

  const stopBrowserRecording = () => {
    // Speech recognition will stop automatically
  };

  const startMediaRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudioBlob(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError('Failed to access microphone');
      console.error('Microphone access error:', err);
    }
  };

  const stopMediaRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudioBlob = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Speech-to-text processing failed');
      }

      const data = await response.json();
      setTranscription(data.transcription);
      onTranscription(data.transcription);
    } catch (err) {
      setError('Failed to process audio');
      console.error('Speech-to-text error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStart = () => {
    if (browserSupportsSpeechRecognition) {
      startBrowserRecording();
    } else {
      startMediaRecording();
    }
  };

  const handleStop = () => {
    if (browserSupportsSpeechRecognition) {
      stopBrowserRecording();
    } else {
      stopMediaRecording();
    }
  };

  const isActive = listening || isRecording;

  return (
    <div className={clsx("space-y-4", className)}>
      {/* Recording Button */}
      <button
        className={clsx(
          "flex items-center justify-center gap-3 px-6 py-3 rounded-lg font-medium text-white",
          "transition-all duration-200 shadow-md hover:shadow-lg",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isActive 
            ? "bg-red-600 hover:bg-red-700 border-red-700 animate-pulse" 
            : "bg-emerald-600 hover:bg-emerald-700 border-emerald-700",
          "border"
        )}
        onClick={isActive ? handleStop : handleStart}
        disabled={isProcessing}
      >
        <div className={clsx("w-5 h-5 flex items-center justify-center", isActive && "animate-pulse")}>
          {isActive ? <StopIcon className="w-5 h-5" /> : <MicrophoneIcon className="w-5 h-5" />}
        </div>
        <span>
          {isProcessing 
            ? "Processing..." 
            : isActive 
              ? "Stop Recording" 
              : "Start Recording"
          }
        </span>
      </button>

      {/* Status Messages */}
      {isActive && (
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse"></div>
          <span className="text-sm">Listening...</span>
        </div>
      )}

      {isProcessing && (
        <div className="flex items-center gap-2 text-blue-500">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Processing audio...</span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
          <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      {/* Transcription Display */}
      {transcription && (
        <div className="p-4 bg-white/10 dark:bg-gray-800/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Transcription:
            </span>
          </div>
          <p className="text-gray-900 dark:text-white" dir="rtl">
            {transcription}
          </p>
        </div>
      )}

      {/* Browser Support Info */}
      {!browserSupportsSpeechRecognition && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Using fallback audio recording (requires server processing)
        </div>
      )}
    </div>
  );
}
