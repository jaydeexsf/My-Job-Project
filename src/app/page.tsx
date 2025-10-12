"use client";

import AudioPlayer from "@/components/AudioPlayer";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { 
  BookOpenIcon, 
  PlayIcon,
  PauseIcon
} from "@heroicons/react/24/outline";

interface Chapter {
  id: number;
  name_simple: string;
  name_arabic: string;
  verses_count: number;
  translated_name: {
    name: string;
  };
}

export default function Home() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [externalLoading, setExternalLoading] = useState<boolean>(false);
  const [externalQuery, setExternalQuery] = useState<string>("");
  const [externalResults, setExternalResults] = useState<any[]>([]);
  const [externalTotal, setExternalTotal] = useState<number>(0);
  const [externalPage, setExternalPage] = useState<number>(1);
  const [externalHasMore, setExternalHasMore] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [playingChapter, setPlayingChapter] = useState<number | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchChapters();
  }, []);

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    };
  }, [currentAudio]);

  const fetchChapters = async () => {
    console.log('Button clicked: Fetching chapters from API');
    try {
      const response = await fetch('/api/quran');
      const data = await response.json();
      console.log('API Response received for chapters:', data);
      if (data.surahs) {
        // Cache all chapters and show first 10
        setAllChapters(data.surahs);
        setChapters(data.surahs.slice(0, 10));
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreChapters = async () => {
    console.log('Button clicked: Loading more chapters');
    try {
      const response = await fetch('/api/quran');
      const data = await response.json();
      console.log('API Response received for more chapters:', data);
      if (data.surahs) {
        // Load next 10 chapters
        setChapters(prev => [...prev, ...data.surahs.slice(prev.length, prev.length + 10)]);
      }
    } catch (error) {
      console.error('Error loading more chapters:', error);
    }
  };

  // Removed inline play logic from the home cards; navigation to detail page instead

  // --- Advanced fuzzy search helpers ---
  const normalizeLatin = (s: string) => s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s]/g, ' ') // keep basic letters and digits
    .replace(/\s+/g, ' ') // collapse spaces
    .trim();

  const editDistance = (a: string, b: string) => {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = new Array(n + 1).fill(0);
    for (let j = 0; j <= n; j++) dp[j] = j;
    for (let i = 1; i <= m; i++) {
      let prev = dp[0];
      dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const tmp = dp[j];
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[j] = Math.min(
          dp[j] + 1,      // deletion
          dp[j - 1] + 1,  // insertion
          prev + cost     // substitution
        );
        prev = tmp;
      }
    }
    return dp[n];
  };

  const bestTokenDistance = (query: string, target: string) => {
    const nq = normalizeLatin(query);
    const nt = normalizeLatin(target);
    if (!nq || !nt) return Infinity;
    // Exact/substring boosts
    if (nt.includes(nq)) return 0;
    const tokens = nt.split(' ');
    let best = Infinity;
    for (const t of tokens) {
      if (!t) continue;
      const d = editDistance(nq, t);
      if (d < best) best = d;
    }
    return best;
  };

  // Simple highlighter: wraps matched substrings of query (normalized) in a <mark>-like span
  function highlightText(text: string, query: string) {
    const nq = normalizeLatin(query);
    if (!nq) return text;
    const reSafe = nq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${reSafe})`, 'ig');
    const parts = text.split(re);
    return (
      <>
        {parts.map((p, i) =>
          re.test(p) ? (
            <span key={i} className="bg-yellow-200 dark:bg-yellow-900/40 px-0.5 rounded">
              {p}
            </span>
          ) : (
            <span key={i}>{p}</span>
          )
        )}
      </>
    );
  }

  const scoreChapter = (q: string, c: Chapter) => {
    const qn = normalizeLatin(q);
    const fields = [
      String(c.id),
      c.name_simple || '',
      c.translated_name?.name || ''
    ];
    // Lower is better (distance). Combine minimal distances across fields.
    let best = Infinity;
    for (const f of fields) {
      const d = bestTokenDistance(qn, f);
      if (d < best) best = d;
    }
    // Heuristic threshold: allow a few typos proportional to query length
    const maxAllowed = Math.max(1, Math.floor(qn.length * 0.4));
    const passed = best <= maxAllowed;
    return { passed, dist: best };
  };

  const handleSearch = (q: string) => {
    const query = q.trim();
    if (!query) {
      if (allChapters.length) setChapters(allChapters.slice(0, 10));
      setExternalResults([]);
      setExternalTotal(0);
      setExternalLoading(false);
      setExternalPage(1);
      setExternalHasMore(false);
      return;
    }
    // Try fuzzy match across chapter id, english name, translation name
    const scored = allChapters.map((c) => ({ c, s: scoreChapter(query, c) }))
      .filter(x => x.s.passed)
      .sort((a, b) => a.s.dist - b.s.dist)
      .map(x => x.c);

    // Fallback to substring filter if nothing passed
    const fallback = allChapters.filter((c) => {
      const nq = normalizeLatin(query);
      return (
        String(c.id) === nq ||
        normalizeLatin(c.name_simple || '').includes(nq) ||
        normalizeLatin(c.translated_name?.name || '').includes(nq) ||
        (c.name_arabic || '').includes(query)
      );
    });

    const finalLocal = scored.length ? scored : fallback;
    setChapters(finalLocal);

    // Always fetch external verse results via server proxy on search
    setExternalLoading(true);
    setExternalQuery(query);
    setExternalResults([]);
    setExternalTotal(0);
    setExternalPage(1);
    setExternalHasMore(false);
    fetch(`/api/furqan-search?q=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(j => {
        if (j && Array.isArray(j.results)) {
          const pageSize = 10; // Show 10 verses per page
          const totalResults = j.results;
          const paginatedResults = totalResults.slice(0, pageSize);
          
          setExternalResults(paginatedResults);
          setExternalTotal(Number(j.total_matches) || totalResults.length);
          setExternalHasMore(totalResults.length > pageSize);
        } else {
          setExternalResults([]);
          setExternalTotal(0);
          setExternalHasMore(false);
        }
      })
      .catch(() => {
        setExternalResults([]);
        setExternalTotal(0);
        setExternalHasMore(false);
      })
      .finally(() => setExternalLoading(false));
  };

  const loadMoreVerses = () => {
    if (!externalQuery || externalLoading) return;
    
    setExternalLoading(true);
    const nextPage = externalPage + 1;
    const pageSize = 10;
    
    fetch(`/api/furqan-search?q=${encodeURIComponent(externalQuery)}`)
      .then(r => r.json())
      .then(j => {
        if (j && Array.isArray(j.results)) {
          const startIndex = 0; // Get all results and slice client-side
          const endIndex = nextPage * pageSize;
          const newResults = j.results.slice(startIndex, endIndex);
          
          setExternalResults(newResults);
          setExternalPage(nextPage);
          setExternalHasMore(j.results.length > endIndex);
        }
      })
      .catch(() => {
        // Keep existing results on error
      })
      .finally(() => setExternalLoading(false));
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-7xl font-bold mb-3 sm:mb-4 lg:mb-6">
              <span className="text-emerald-600 dark:text-emerald-400">
                Interactive
              </span>
              <br />
              <span className="text-gray-900 dark:text-white">Quran Learning</span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed px-4">
              Experience modern Quranic study with intelligent search, 
              personalized bookmarks, and beautiful recitations.
            </p>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-gray-900 dark:text-white">Search the Quran</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Type a chapter, verse, or topic to find what you're looking for</p>
          </div>
          <div className="flex items-stretch gap-2">
            <input
              id="home-search-input"
              placeholder="e.g. Al-Fatiha 1:1 or mercy"
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const q = (e.currentTarget as HTMLInputElement).value.trim();
                  handleSearch(q);
                }
              }}
            />
            <button
              className="px-3 sm:px-4 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm sm:text-base"
              onClick={() => handleSearch(searchQuery)}
            >
              Search
            </button>
          </div>

          {/* External verse search fallback */}
          {externalLoading && (
            <div className="mt-6 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="w-5 h-5 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
              <span>Searching verses for "{externalQuery}"...</span>
            </div>
          )}

          {!externalLoading && externalResults.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                No chapter names matched "{externalQuery}". Showing verse matches instead ({externalTotal}).
              </div>
              <div className="space-y-3">
                {externalResults.map((r: any, idx: number) => (
                  <Link key={idx} href={`/surah/${r.surah_number}`} className="block p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                        {r.surah_name} <span className="text-gray-500 dark:text-gray-400">({r.surah_number}:{r.verse_number})</span>
                      </div>
                      <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">Verse match</span>
                    </div>
                    <div className="text-right text-lg leading-loose mb-1" dir="rtl">{r.arabic_text}</div>
                    <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                      {highlightText(String(r.translation || ''), externalQuery)}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Chapters Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-gray-900 dark:text-white">
              Chapters
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Browse chapters or use the search above
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-4 sm:p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 animate-pulse">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                  <div className="h-5 w-2/3 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                  <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                  <div className="h-3 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {chapters.map((chapter) => (
                <Link key={chapter.id} href={`/surah/${chapter.id}`} className="group block p-4 sm:p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300" onClick={(e) => {
                  try {
                    const slug = (chapter.name_simple || '').toLowerCase().replace(/\s+/g, '-');
                    console.log('[Chapter Click]', { id: chapter.id, name: chapter.name_simple, slug });
                    // Fire-and-forget: make two requests in parallel and log both responses
                    Promise.all([
                      fetch(`/api/transliteration?surah=${chapter.id}`).then((r) => r.json()).catch((err) => ({ error: String(err) })),
                      fetch(`/api/furqan-transliteration?surah=${chapter.id}`).then((r) => r.json()).catch((err) => ({ error: String(err) }))
                    ])
                      .then(([bySurah, furqan]) => {
                        console.log('[Transliteration By Surah]', bySurah);
                        console.log('[Furqan Transliteration]', furqan);
                      })
                      .catch((err) => console.error('[Transliteration Parallel Error]', err));
                  } catch (err) {
                    console.error('[Chapter Click Error]', err);
                  }
                }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">
                      {chapter.id}
                    </div>
                    <span className="text-emerald-600 group-hover:text-emerald-700 font-medium">Open →</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-1.5 sm:mb-2 text-gray-900 dark:text-white">
                    {chapter.name_simple}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-1.5 sm:mb-2">
                    {chapter.translated_name.name}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    {chapter.verses_count} verses
                  </p>
                  <div className="mt-3 sm:mt-4 text-right text-lg" dir="rtl">
                    {chapter.name_arabic}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {chapters.length > 0 && chapters.length < Math.min(114, allChapters.length || 114) && searchQuery.trim().length === 0 && (
            <div className="text-center mt-12">
              <button
                onClick={loadMoreChapters}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
              >
                Load More Chapters ({chapters.length}/114)
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Verses Section (when external results exist) */}
      {(externalLoading || externalResults.length > 0) && (
        <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-gray-900 dark:text-white">Verses</h2>
              {!externalLoading && externalResults.length > 0 && (
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Showing matches for “{externalQuery}” ({externalTotal})</p>
              )}
            </div>

             {externalLoading && externalResults.length === 0 ? (
               <div className="space-y-3">
                 {Array.from({ length: 4 }).map((_, i) => (
                   <div key={i} className="p-4 sm:p-5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 animate-pulse">
                     <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
                     <div className="h-6 w-full bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                     <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded" />
                   </div>
                 ))}
               </div>
             ) : (
               <div>
                 <div className="space-y-3">
                   {externalResults.map((r: any, idx: number) => (
                     <Link key={idx} href={`/surah/${r.surah_number}`} className="block p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                       <div className="flex items-center justify-between mb-1.5">
                         <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                           {r.surah_name} <span className="text-gray-500 dark:text-gray-400">({r.surah_number}:{r.verse_number})</span>
                         </div>
                         <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">Verse match</span>
                       </div>
                       <div className="text-right text-lg leading-loose mb-1" dir="rtl">{r.arabic_text}</div>
                       <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                         {highlightText(String(r.translation || ''), externalQuery)}
                       </div>
                     </Link>
                   ))}
                 </div>
                 
                 {externalHasMore && (
                   <div className="mt-6 text-center">
                     <button
                       onClick={loadMoreVerses}
                       disabled={externalLoading}
                       className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg font-medium text-sm sm:text-base transition-colors"
                     >
                       {externalLoading ? 'Loading more...' : 'Load More Verses'}
                     </button>
                   </div>
                 )}
               </div>
             )}
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-gray-900 dark:text-white">
              Comprehensive Quran Learning Platform
            </h2>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-4">
              Advanced tools and features designed to enhance your Quranic study experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Intelligent Search Feature */}
            <div className="group p-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Intelligent Search</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Advanced search across chapters and verses with fuzzy matching and instant results.
              </p>
              <Link 
                href="/" 
                onClick={() => console.log('Button clicked: Try Search')}
                className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
              >
                Try Search →
              </Link>
            </div>

            {/* Bookmarks Feature */}
            <div className="group p-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BookOpenIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Smart Bookmarks</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Save your favorite verses with personal notes and organize them by themes or study sessions.
              </p>
              <Link 
                href="/bookmarks" 
                onClick={() => console.log('Button clicked: View Bookmarks')}
                className="text-teal-600 dark:text-teal-400 font-medium hover:underline"
              >
                View Bookmarks →
              </Link>
            </div>

            {/* Recitation Practice */}
            <div className="group p-6 sm:p-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BookOpenIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900 dark:text-white">Recitation Practice</h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4">
                Practice your recitation with audio guidance and get real-time feedback on pronunciation.
              </p>
              <Link 
                href="/recite" 
                onClick={() => console.log('Button clicked: Start Reciting')}
                className="text-blue-600 dark:text-blue-400 font-medium hover:underline text-sm sm:text-base"
              >
                Start Reciting →
              </Link>
            </div>

            {/* Verse Identifier */}
            <div className="group p-6 sm:p-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2M9 12h6m-6 4h6" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900 dark:text-white">Verse Identifier</h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4">
                Like Shazam for Quran! Record any recitation and instantly identify the verse.
              </p>
              <Link 
                href="/identify" 
                onClick={() => console.log('Button clicked: Identify Verse')}
                className="text-purple-600 dark:text-purple-400 font-medium hover:underline text-sm sm:text-base"
              >
                Identify Verse →
              </Link>
            </div>

            {/* Study History */}
            <div className="group p-6 sm:p-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900 dark:text-white">Study History</h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4">
                Track your learning progress and revisit previously studied verses and chapters.
              </p>
              <Link 
                href="/history" 
                onClick={() => console.log('Button clicked: View History')}
                className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline text-sm sm:text-base"
              >
                View History →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Audio Player Section removed per request */}
    </div>
  );
}
