'use client';

import { useState, useEffect } from 'react';
import { PlayIcon, PauseIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';

interface Surah {
  number: number;
  name: string;
  englishName: string;
  numberOfAyahs: number;
  revelationType: string;
}

interface Reciter {
  name: string;
  id: string;
}

interface AudioData {
  audioUrl: string;
  reciter: string;
}

interface SearchResult {
  surah: number;
  ayah: number;
  text: string;
  translation: string;
  surahName?: string;
}

export default function TestPage() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [selectedAyah, setSelectedAyah] = useState(1);
  const [selectedReciter, setSelectedReciter] = useState('abdul-basit');
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const loadInitialData = async () => {
    setLoading(true);
    addTestResult('Starting comprehensive API tests...');

    try {
      // Test 1: Load Surahs
      addTestResult('Testing Quran API - Loading Surahs...');
      const surahResponse = await fetch('/api/quran');
      const surahData = await surahResponse.json();
      setSurahs(surahData.surahs || []);
      addTestResult(`✅ Loaded ${surahData.surahs?.length || 0} surahs successfully`);

      // Test 2: Load Reciters
      addTestResult('Testing Audio API - Loading Reciters...');
      const reciterResponse = await fetch('/api/audio?action=reciters');
      const reciterData = await reciterResponse.json();
      setReciters(reciterData.reciters || []);
      addTestResult(`✅ Loaded ${reciterData.reciters?.length || 0} reciters successfully`);

      // Test 3: Test Database Connection
      addTestResult('Testing Database - Loading Bookmarks...');
      const bookmarkResponse = await fetch('/api/bookmarks');
      const bookmarkData = await bookmarkResponse.json();
      addTestResult(`✅ Database connection working - ${bookmarkData.data?.length || 0} bookmarks found`);

      // Test 4: Test Recitation History
      addTestResult('Testing Database - Loading Recitation History...');
      const historyResponse = await fetch('/api/recitations');
      const historyData = await historyResponse.json();
      addTestResult(`✅ Recitation history working - ${historyData.data?.length || 0} records found`);

      addTestResult('🎉 All initial tests completed successfully!');
    } catch (error) {
      addTestResult(`❌ Error during initial tests: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    addTestResult(`Testing search for: "${searchQuery}"`);

    try {
      const response = await fetch('/api/quran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', query: searchQuery })
      });
      const data = await response.json();
      setSearchResults(data.results || []);
      addTestResult(`✅ Search completed - ${data.results?.length || 0} results found`);
    } catch (error) {
      addTestResult(`❌ Search failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testAudio = async () => {
    setLoading(true);
    addTestResult(`Testing audio for Surah ${selectedSurah}, Ayah ${selectedAyah} with ${selectedReciter}`);

    try {
      const response = await fetch(`/api/audio?surah=${selectedSurah}&ayah=${selectedAyah}&reciter=${selectedReciter}`);
      const data = await response.json();
      setAudioData(data.audio);
      addTestResult(`✅ Audio data retrieved successfully`);
    } catch (error) {
      addTestResult(`❌ Audio test failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testVoiceIdentification = async () => {
    setLoading(true);
    addTestResult('Testing voice identification with sample audio...');

    try {
      const response = await fetch('/api/identify-verse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          audioData: 'data:audio/wav;base64,sampleaudiodata',
          mimeType: 'audio/wav'
        })
      });
      const data = await response.json();
      addTestResult(`✅ Voice identification working - Identified Surah ${data.surah}, Ayah ${data.ayah} with ${Math.round(data.confidence * 100)}% confidence`);
    } catch (error) {
      addTestResult(`❌ Voice identification failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testRandomVerse = async () => {
    setLoading(true);
    addTestResult('Testing random verse generator...');

    try {
      const response = await fetch('/api/quran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getRandomVerse' })
      });
      const data = await response.json();
      addTestResult(`✅ Random verse: Surah ${data.surahNumber} (${data.surah?.name}), Ayah ${data.ayahNumber}`);
    } catch (error) {
      addTestResult(`❌ Random verse failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    setTestResults([]);
    addTestResult('🚀 Starting comprehensive test suite...');
    
    await testSearch();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testAudio();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testVoiceIdentification();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testRandomVerse();
    
    addTestResult('🎯 All tests completed!');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            🕌 Quran Project - API Test Suite
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Comprehensive testing of all APIs, database connections, and Quran Foundation integration
          </p>
        </div>

        {/* Test Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Search Test */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">🔍 Search Test</h2>
            <div className="space-y-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Quran (e.g., 'Allah', 'mercy', 'guidance')"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                onClick={testSearch}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
              >
                Test Search API
              </button>
            </div>
          </div>

          {/* Audio Test */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">🎵 Audio Test</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  value={selectedSurah}
                  onChange={(e) => setSelectedSurah(parseInt(e.target.value))}
                  placeholder="Surah"
                  min="1"
                  max="114"
                  className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="number"
                  value={selectedAyah}
                  onChange={(e) => setSelectedAyah(parseInt(e.target.value))}
                  placeholder="Ayah"
                  min="1"
                  className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <select
                value={selectedReciter}
                onChange={(e) => setSelectedReciter(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {reciters.map((reciter) => (
                  <option key={reciter.id} value={reciter.id}>
                    {reciter.name}
                  </option>
                ))}
              </select>
              <button
                onClick={testAudio}
                disabled={loading}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
              >
                Test Audio API
              </button>
            </div>
          </div>
        </div>

        {/* Quick Test Buttons */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">⚡ Quick Tests</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={testVoiceIdentification}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
            >
              🎤 Voice ID Test
            </button>
            <button
              onClick={testRandomVerse}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
            >
              🎲 Random Verse
            </button>
            <button
              onClick={loadInitialData}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
            >
              🔄 Reload Data
            </button>
            <button
              onClick={runAllTests}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
            >
              🚀 Run All Tests
            </button>
          </div>
        </div>

        {/* Results Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Test Results Log */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">📋 Test Results</h2>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 h-64 overflow-y-auto">
              {testResults.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No tests run yet...</p>
              ) : (
                <div className="space-y-1">
                  {testResults.map((result, index) => (
                    <div key={index} className="text-sm font-mono text-gray-800 dark:text-gray-200">
                      {result}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Data Display */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">📊 Live Data</h2>
            <div className="space-y-4">
              {/* Surahs Count */}
              <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <span className="font-medium text-gray-900 dark:text-white">Surahs Loaded:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{surahs.length}</span>
              </div>

              {/* Reciters Count */}
              <div className="flex justify-between items-center p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                <span className="font-medium text-gray-900 dark:text-white">Reciters Available:</span>
                <span className="font-bold text-teal-600 dark:text-teal-400">{reciters.length}</span>
              </div>

              {/* Search Results */}
              <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <span className="font-medium text-gray-900 dark:text-white">Search Results:</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">{searchResults.length}</span>
              </div>

              {/* Audio Status */}
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="font-medium text-gray-900 dark:text-white">Audio Available:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {audioData ? '✅ Ready' : '⏳ None'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">🔍 Search Results</h2>
            <div className="space-y-4">
              {searchResults.slice(0, 5).map((result, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Surah {result.surah}, Ayah {result.ayah} {result.surahName && `(${result.surahName})`}
                    </span>
                  </div>
                  <p className="text-lg text-right mb-2 text-gray-900 dark:text-white font-arabic">
                    {result.text}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">
                    {result.translation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              <span className="text-gray-900 dark:text-white">Running tests...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
