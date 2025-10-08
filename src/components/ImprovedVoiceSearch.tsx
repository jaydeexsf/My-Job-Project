"use client";

import { useEffect, useState } from "react";
import { useSpeechRecognition } from "react-speech-recognition";
import clsx from "clsx";
import { 
  MicrophoneIcon, 
  StopIcon,
  MagnifyingGlassIcon,
  BookmarkIcon,
  SpeakerWaveIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

interface SearchResult {
  verse_key: string;
  text: string;
  translations?: Array<{
    text: string;
    language_name: string;
  }>;
  words?: any[];
}

export default function ImprovedVoiceSearch() {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable
  } = useSpeechRecognition();

  // Auto-search when transcript changes
  useEffect(() => {
    if (transcript.trim() && !listening) {
      performSearch(transcript);
    }
  }, [transcript, listening]);

  const performSearch = async (query: string) => {
    setIsSearching(true);
    setError(null);
    
    try {
      console.log('Searching for:', query);
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&per_page=5`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      console.log('Search results:', data);
      
      if (data.search?.results) {
        setSearchResults(data.search.results);
      } else {
        setSearchResults([]);
        setError('No results found. Try different keywords.');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const startListening = () => {
    setError(null);
    setSearchResults([]);
    resetTranscript();
  };

  const stopListening = () => {
    // Speech recognition will stop automatically
  };

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="p-8 bg-red-500/20 border border-red-500/30 rounded-lg">
        <div className="flex items-center gap-2 text-red-400">
          <ExclamationTriangleIcon className="w-5 h-5" />
          <p>Speech recognition is not supported in your browser. Please use Chrome or Edge.</p>
        </div>
      </div>
    );
  }

  if (!isMicrophoneAvailable) {
    return (
      <div className="p-8 bg-red-500/20 border border-red-500/30 rounded-lg">
        <div className="flex items-center gap-2 text-red-400">
          <ExclamationTriangleIcon className="w-5 h-5" />
          <p>Microphone access is required for voice search.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "rounded-3xl p-8 w-full max-w-2xl text-center",
        "backdrop-blur-xl border border-white/30",
        "bg-gradient-to-br from-white/15 via-white/10 to-white/5",
        "shadow-[0_20px_50px_rgba(8,_112,_184,_0.7)]",
        "dark:shadow-[0_20px_50px_rgba(59,_130,_246,_0.5)]"
      )}
    >
      <button
        className={clsx(
          "flex items-center justify-center gap-3 px-8 py-4 rounded-lg font-medium text-white",
          "bg-emerald-600 hover:bg-emerald-700",
          "transition-colors duration-200",
          "shadow-md hover:shadow-lg",
          "border border-emerald-700",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          listening && "bg-red-600 hover:bg-red-700 border-red-700 animate-pulse"
        )}
        onClick={listening ? stopListening : startListening}
        disabled={isSearching}
      >
        <div className={clsx(
          "w-6 h-6 flex items-center justify-center",
          listening && "animate-pulse"
        )}>
          {listening ? <StopIcon className="w-6 h-6" /> : <MicrophoneIcon className="w-6 h-6" />}
        </div>
        <span className="text-lg">
          {listening ? "Listening… Click to stop" : "Press and speak"}
        </span>
      </button>
      
      {transcript && (
        <div className="mt-4 p-3 bg-white/10 dark:bg-gray-800/30 rounded-lg">
          <p className="text-sm opacity-80">
            <strong>You said:</strong> &ldquo;{transcript}&rdquo;
          </p>
        </div>
      )}

      {isSearching && (
        <div className="mt-6 flex items-center justify-center gap-2 text-blue-500">
          <MagnifyingGlassIcon className="w-5 h-5 animate-spin" />
          <span>Searching...</span>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-red-400">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2 justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircleIcon className="w-5 h-5" />
            <h3 className="font-semibold">Found {searchResults.length} results</h3>
          </div>
          
          {searchResults.map((result, index) => {
            const [surah, ayah] = result.verse_key.split(':');
            return (
              <div 
                key={index}
                className="bg-white/10 dark:bg-gray-800/30 rounded-xl p-4 text-left"
              >
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Surah {surah}, Ayah {ayah}
                </div>
                <div className="text-right text-lg mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg" dir="rtl">
                  {result.text}
                </div>
                {result.translations && result.translations[0] && (
                  <div className="text-sm text-gray-700 dark:text-gray-300 italic">
                    &ldquo;{result.translations[0].text}&rdquo;
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={() => console.log('Bookmark verse', surah, ayah)}
                    className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs transition-colors"
                  >
                    <BookmarkIcon className="w-3 h-3" />
                    <span>Bookmark</span>
                  </button>
                  <button 
                    onClick={() => console.log('Listen to verse', surah, ayah)}
                    className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs transition-colors"
                  >
                    <SpeakerWaveIcon className="w-3 h-3" />
                    <span>Listen</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
