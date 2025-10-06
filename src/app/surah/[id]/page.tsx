"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

type VerseItem = {
    surah: number;
    ayah: number;
    arabic: string;
    transliteration: string;
    translation?: string;
};

type MemorizationStatus = 'not-started' | 'learning' | 'reviewing' | 'memorized';

export default function SurahPage() {
    const params = useParams();
    const surahId = Number(params?.id);

    const [verses, setVerses] = useState<VerseItem[]>([]);
    const [chapterName, setChapterName] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [activeAyah, setActiveAyah] = useState<number | null>(null);
    const [tab, setTab] = useState<'memorize' | 'flashcard' | 'quiz'>('memorize');
    const [repeatFrom, setRepeatFrom] = useState<number>(1);
    const [repeatTo, setRepeatTo] = useState<number>(1);
    const [repeatCount, setRepeatCount] = useState<number>(3);
    const repeatCounterRef = useRef<number>(0);
    const loopsDoneRef = useRef<number>(0);
    const lastLoopAtMsRef = useRef<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
    const [durationSec, setDurationSec] = useState<number>(0);
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

    // Memorization features
    const [showArabic, setShowArabic] = useState<boolean>(true);
    const [showTransliteration, setShowTransliteration] = useState<boolean>(true);
    const [showTranslation, setShowTranslation] = useState<boolean>(true);
    const [beginnerMode, setBeginnerMode] = useState<boolean>(true);
    const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
    const [verseStatus, setVerseStatus] = useState<Record<number, MemorizationStatus>>({});
    const [dailyGoal] = useState<number>(1);
    const [versesMemorizedToday, setVersesMemorizedToday] = useState<number>(0);

    // Flashcard mode
    const [flashcardIndex, setFlashcardIndex] = useState<number>(0);
    const [flashcardRevealed, setFlashcardRevealed] = useState<boolean>(false);

    // Quiz mode
    const [quizMode, setQuizMode] = useState<'listen' | 'read'>('listen');
    const [quizAnswer, setQuizAnswer] = useState<string>("");
    const [quizResult, setQuizResult] = useState<'correct' | 'incorrect' | null>(null);

    // Advanced controls (hidden in beginner mode)
    const [useTimeRange, setUseTimeRange] = useState<boolean>(false);
    const [timeStart, setTimeStart] = useState<string>("0:00");
    const [timeEnd, setTimeEnd] = useState<string>("");

    // DOM <audio> element used for playback, seeking, and time reads
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [segments, setSegments] = useState<{ ayah: number; start: number; end: number }[]>([]);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isAnalyzingAudio, setIsAnalyzingAudio] = useState<boolean>(false);
    const verseRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const segmentByAyah = useMemo(() => {
        const map: Record<number, { start: number; end: number }> = {};
        for (const s of segments) map[s.ayah] = { start: s.start, end: s.end };
        return map;
    }, [segments]);

    // Load memorization progress from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(`memorization-${surahId}`);
        if (saved) {
            try {
                setVerseStatus(JSON.parse(saved));
            } catch {}
        }
        const today = new Date().toDateString();
        const lastDate = localStorage.getItem('lastMemorizationDate');
        if (lastDate === today) {
            const count = parseInt(localStorage.getItem('versesMemorizedToday') || '0');
            setVersesMemorizedToday(count);
        } else {
            localStorage.setItem('lastMemorizationDate', today);
            localStorage.setItem('versesMemorizedToday', '0');
            setVersesMemorizedToday(0);
        }
    }, [surahId]);

    // Save memorization progress
    const updateVerseStatus = (ayah: number, status: MemorizationStatus) => {
        const newStatus = { ...verseStatus, [ayah]: status };
        setVerseStatus(newStatus);
        localStorage.setItem(`memorization-${surahId}`, JSON.stringify(newStatus));
        
        if (status === 'memorized') {
            const newCount = versesMemorizedToday + 1;
            setVersesMemorizedToday(newCount);
            localStorage.setItem('versesMemorizedToday', String(newCount));
        }
    };

    const parseTimeToSeconds = (val: string): number | null => {
        if (!val) return null;
        const parts = val.split(":").map(p => p.trim());
        if (parts.length === 1) {
            const s = Number(parts[0]);
            return Number.isFinite(s) ? s : null;
        }
        if (parts.length === 2) {
            const m = Number(parts[0]);
            const s = Number(parts[1]);
            if (!Number.isFinite(m) || !Number.isFinite(s)) return null;
            return m * 60 + s;
        }
        if (parts.length === 3) {
            const h = Number(parts[0]);
            const m = Number(parts[1]);
            const s = Number(parts[2]);
            if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(s)) return null;
            return h * 3600 + m * 60 + s;
        }
        return null;
    };

    const timeStartSec = useMemo(() => parseTimeToSeconds(timeStart), [timeStart]);
    const timeEndSec = useMemo(() => parseTimeToSeconds(timeEnd), [timeEnd]);

    const formatTime = (s: number): string => {
        if (!Number.isFinite(s) || s < 0) return "0:00";
        const mm = Math.floor(s / 60);
        const ss = Math.floor(s % 60);
        return `${mm}:${ss.toString().padStart(2, '0')}`;
    };

    // Analyze audio to detect silence and auto-generate verse segments
    const analyzeAudioForSegments = async (audioUrl: string, verseCount: number) => {
        try {
            setIsAnalyzingAudio(true);
            console.log('[Audio Analysis] Starting silence detection for', verseCount, 'verses');

            // Fetch audio file
            const response = await fetch(audioUrl);
            const arrayBuffer = await response.arrayBuffer();

            // Create audio context
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // Get audio data
            const channelData = audioBuffer.getChannelData(0);
            const sampleRate = audioBuffer.sampleRate;
            const duration = audioBuffer.duration;

            // Detect silence periods
            const silenceThreshold = 0.02; // Amplitude threshold for silence
            const minSilenceDuration = 0.3; // Minimum 300ms silence between verses
            const windowSize = Math.floor(sampleRate * 0.1); // 100ms window

            const silencePeriods: { start: number; end: number }[] = [];
            let silenceStart: number | null = null;

            // Scan through audio in windows
            for (let i = 0; i < channelData.length; i += windowSize) {
                const window = channelData.slice(i, i + windowSize);
                const rms = Math.sqrt(window.reduce((sum, val) => sum + val * val, 0) / window.length);
                const time = i / sampleRate;

                if (rms < silenceThreshold) {
                    if (silenceStart === null) {
                        silenceStart = time;
                    }
                } else {
                    if (silenceStart !== null) {
                        const silenceDuration = time - silenceStart;
                        if (silenceDuration >= minSilenceDuration) {
                            silencePeriods.push({ start: silenceStart, end: time });
                        }
                        silenceStart = null;
                    }
                }
            }

            console.log('[Audio Analysis] Found', silencePeriods.length, 'silence periods');

            // Generate segments from silence periods
            const generatedSegments: { ayah: number; start: number; end: number }[] = [];
            let currentStart = 0;

            for (let i = 0; i < Math.min(silencePeriods.length, verseCount - 1); i++) {
                const silenceMiddle = (silencePeriods[i].start + silencePeriods[i].end) / 2;
                generatedSegments.push({
                    ayah: i + 1,
                    start: currentStart,
                    end: silenceMiddle
                });
                currentStart = silenceMiddle;
            }

            // Add last verse
            if (generatedSegments.length < verseCount) {
                generatedSegments.push({
                    ayah: verseCount,
                    start: currentStart,
                    end: duration
                });
            }

            console.log('[Audio Analysis] Generated', generatedSegments.length, 'segments');
            
            // Save to localStorage for future use
            localStorage.setItem(`audio-segments-${surahId}`, JSON.stringify(generatedSegments));
            
            setSegments(generatedSegments);
            setIsAnalyzingAudio(false);
            
            return generatedSegments;
        } catch (error) {
            console.error('[Audio Analysis] Error:', error);
            setIsAnalyzingAudio(false);
            return [];
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            try {
                setLoading(true);
                const chRes = await fetch(`/api/quran?surah=${surahId}`);
                const chData = await chRes.json();
                const name = chData?.name_simple || chData?.chapter?.name_simple || "";
                setChapterName(name);

                const res = await fetch(`/api/transliteration?surah=${surahId}`);
                const data = await res.json();
                const verseItems = data.items || [];
                setVerses(verseItems);
                setActiveAyah((verseItems?.[0]?.ayah) ?? null);
                setRepeatFrom(1);
                setRepeatTo((verseItems?.length ?? 1));
                
                const tRes = await fetch(`/api/timings?surah=${surahId}&reciter=1`);
                const tData = await tRes.json();
                let audioUrlToUse = tData?.audioUrl;
                
                // Check if we have segments from API
                if (tData?.segments && tData.segments.length > 0) {
                    setSegments(tData.segments);
                    console.log('[SurahPage] Using API segments:', tData.segments.length);
                } else {
                    // Try to load cached segments from localStorage
                    const cachedSegments = localStorage.getItem(`audio-segments-${surahId}`);
                    if (cachedSegments) {
                        try {
                            const parsed = JSON.parse(cachedSegments);
                            setSegments(parsed);
                            console.log('[SurahPage] Using cached segments:', parsed.length);
                        } catch {}
                    }
                }

                if (audioUrlToUse) {
                    setAudioUrl(audioUrlToUse);
                } else {
                    const aRes = await fetch(`/api/audio?surah=${surahId}&ayah=1&reciter=1`);
                    if (aRes.ok) {
                        const aData = await aRes.json();
                        const url = aData?.audio?.audioUrl;
                        if (url) {
                            audioUrlToUse = url;
                            setAudioUrl(url);
                        }
                    }
                }

                // If we have audio but no segments, analyze the audio
                if (audioUrlToUse && verseItems.length > 0) {
                    const hasSegments = tData?.segments && tData.segments.length > 0;
                    const hasCachedSegments = localStorage.getItem(`audio-segments-${surahId}`);
                    
                    if (!hasSegments && !hasCachedSegments) {
                        console.log('[SurahPage] No segments found, analyzing audio...');
                        // Analyze audio in background
                        setTimeout(() => {
                            analyzeAudioForSegments(audioUrlToUse!, verseItems.length);
                        }, 1000);
                    }
                }
            } catch (e) {
                console.error('[SurahPage] Error loading:', e);
            } finally {
                setLoading(false);
            }
        }
        if (!Number.isNaN(surahId) && surahId > 0) load();
        return () => {
            controller.abort();
        };
    }, [surahId]);

    // Apply playback speed when it changes or audio loads
    useEffect(() => {
        const audio = audioRef.current;
        if (audio && audioUrl) {
            audio.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed, audioUrl]);

    const handleSelectAyah = (n: number) => {
        setActiveAyah(n);
        // In a future iteration, sync audio time to ayah here when time-coded data available
    };

    const visibleVerses = verses; // could paginate later


    const playFromRange = () => {
        if (!audioUrl) return;
        const audio = audioRef.current;
        if (!audio) return;
        const segFrom = segmentByAyah[repeatFrom];
        const shouldUseTime = (useTimeRange || (timeStartSec != null && timeEndSec != null && timeEndSec > timeStartSec));
        const seekTo = shouldUseTime && timeStartSec != null
            ? Math.max(0, timeStartSec) + 0.01
            : (segFrom ? segFrom.start + 0.01 : 0);
        audio.currentTime = seekTo;
        repeatCounterRef.current = 0;
        loopsDoneRef.current = 0;
        lastLoopAtMsRef.current = 0;
        audio.play().then(() => { setIsPlaying(true); }).catch((err) => console.error('Play failed:', err));
        if (segments.length) setActiveAyah(repeatFrom);
    };

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) {
            playFromRange();
            return;
        }
        if (audio.paused) {
            const shouldUseTime = (useTimeRange || (timeStartSec != null && timeEndSec != null && timeEndSec > timeStartSec));
            if (shouldUseTime && timeStartSec != null && audio.currentTime < (timeStartSec - 0.05)) {
                const seekTo = Math.max(0, timeStartSec) + 0.01;
                audio.currentTime = seekTo;
            }
            audio.play().then(() => { setIsPlaying(true); }).catch(err => console.error('Resume failed:', err));
        } else {
            audio.pause();
            setIsPlaying(false);
        }
    };

    const pausePlayback = () => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.pause();
        setIsPlaying(false);
    };


    // Sync highlight to audio time using segments and handle repeat range
    useEffect(() => {
        if (!audioUrl) return;
        const audio = audioRef.current;
        if (!audio) return;

        const onTime = () => {
            const t = audio.currentTime;
            setCurrentTimeSec(t);
            
            // find segment containing t
            if (segments.length > 0) {
                const seg = segments.find(s => t >= s.start && t <= s.end);
                if (seg && seg.ayah !== activeAyah) {
                    setActiveAyah(seg.ayah);
                }
            }

            // Repeat logic: time range first if enabled, else ayah range
            if (useTimeRange && timeStartSec != null && timeEndSec != null && timeEndSec > timeStartSec) {
                if (t > timeEndSec - 0.05) {
                    const now = Date.now();
                    if (loopsDoneRef.current < repeatCount - 1 && now - lastLoopAtMsRef.current > 700) {
                        loopsDoneRef.current += 1;
                        lastLoopAtMsRef.current = now;
                        const seek = Math.max(0, timeStartSec) + 0.01;
                        audio.currentTime = seek;
                    }
                } else if (t < timeStartSec) {
                    audio.currentTime = Math.max(0, timeStartSec) + 0.01;
                }
            } else if (segments.length > 0) {
                const endSeg = segmentByAyah[repeatTo];
                const startSeg = segmentByAyah[repeatFrom];
                if (startSeg && endSeg) {
                    if (t > endSeg.end - 0.05) {
                        const now = Date.now();
                        if (loopsDoneRef.current < repeatCount && now - lastLoopAtMsRef.current > 700) {
                            loopsDoneRef.current += 1;
                            lastLoopAtMsRef.current = now;
                            const seek = startSeg.start + 0.01;
                            audio.currentTime = seek;
                            setActiveAyah(repeatFrom);
                        }
                    } else if (t < startSeg.start) {
                        audio.currentTime = startSeg.start + 0.01;
                    }
                }
            }
        };

        const onLoaded = () => { 
            const d = audio.duration || 0; 
            setDurationSec(d);
            // Apply playback speed when audio loads
            audio.playbackRate = playbackSpeed;
        };

        audio.addEventListener('timeupdate', onTime);
        audio.addEventListener('loadedmetadata', onLoaded);
        audio.addEventListener('durationchange', onLoaded);

        // Check if already loaded
        if (audio.duration) {
            setDurationSec(audio.duration);
            audio.playbackRate = playbackSpeed;
        }

        return () => {
            audio.removeEventListener('timeupdate', onTime);
            audio.removeEventListener('loadedmetadata', onLoaded);
            audio.removeEventListener('durationchange', onLoaded);
        };
    }, [audioUrl, segments, repeatFrom, repeatTo, repeatCount, segmentByAyah, useTimeRange, timeStartSec, timeEndSec, playbackSpeed]);

    // Pause when page loses visibility and cleanup on unmount
    useEffect(() => {
        const onHide = () => {
            if (document.hidden) {
                pausePlayback();
            }
        };
        document.addEventListener('visibilitychange', onHide);
        return () => {
            document.removeEventListener('visibilitychange', onHide);
            // full cleanup when leaving the page
            if (audioRef.current) {
                try { audioRef.current.pause(); } catch {}
            }
        };
    }, []);

    // Auto-scroll the active ayah into view smoothly
    useEffect(() => {
        if (activeAyah == null) return;
        const el = verseRefs.current[activeAyah];
        if (el) {
            try {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch {
                // ignore
            }
        }
    }, [activeAyah]);

    // Next/Previous verse navigation
    const goToNextVerse = () => {
        if (activeAyah && activeAyah < verses.length) {
            setActiveAyah(activeAyah + 1);
            setRepeatFrom(activeAyah + 1);
            setRepeatTo(activeAyah + 1);
        }
    };

    const goToPrevVerse = () => {
        if (activeAyah && activeAyah > 1) {
            setActiveAyah(activeAyah - 1);
            setRepeatFrom(activeAyah - 1);
            setRepeatTo(activeAyah - 1);
        }
    };

    const memorizedCount = Object.values(verseStatus).filter(s => s === 'memorized').length;
    const progressPercent = verses.length > 0 ? Math.round((memorizedCount / verses.length) * 100) : 0;

    return (
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
            {/* Header with Progress */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            {chapterName || 'Surah'} <span className="text-emerald-600">({surahId})</span>
                        </h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {verses.length} verses • {memorizedCount} memorized ({progressPercent}%)
                        </p>
                    </div>
                    
                    {/* Daily Goal Tracker */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
                        <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">TODAY&apos;S GOAL</div>
                        <div className="flex items-center gap-2">
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {versesMemorizedToday}/{dailyGoal}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">verses</div>
                        </div>
                        {versesMemorizedToday >= dailyGoal && (
                            <div className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-pulse">
                                🎉 Goal achieved!
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full hidden bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div 
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full transition-all duration-500 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Audio Player */}
            {audioUrl && (
                <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
                    <audio ref={audioRef} src={audioUrl} preload="metadata" style={{ display: 'none' }} />
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex-1 w-full">
                            <div className="flex items-center gap-3 mb-3">
                                <button 
                                    onClick={togglePlayPause}
                                    className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-105"
                                >
                                    {isPlaying ? (
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                                    ) : (
                                        <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                    )}
                                </button>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Verse {activeAyah || 1} of {verses.length}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {formatTime(currentTimeSec)} / {formatTime(durationSec)}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Audio Progress Bar */}
                            <div className="mb-3">
                                <div 
                                    className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 cursor-pointer overflow-hidden"
                                    onClick={(e) => {
                                        if (!audioRef.current || !durationSec) return;
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const x = e.clientX - rect.left;
                                        const percentage = x / rect.width;
                                        const newTime = percentage * durationSec;
                                        audioRef.current.currentTime = newTime;
                                    }}
                                >
                                    <div 
                                        className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full transition-all duration-100"
                                        style={{ width: `${durationSec > 0 ? (currentTimeSec / durationSec) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                            
                            {/* Playback Speed */}
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Speed:</span>
                                {[0.5, 0.75, 1, 1.25, 1.5].map(speed => (
                                    <button
                                        key={speed}
                                        onClick={() => {
                                            setPlaybackSpeed(speed);
                                            if (audioRef.current) {
                                                audioRef.current.playbackRate = speed;
                                            }
                                        }}
                                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                                            playbackSpeed === speed
                                                ? 'bg-emerald-600 text-white shadow-md'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                    >
                                        {speed}x
                                    </button>
                                ))}
                            </div>
                        </div>
                        <a 
                            href={audioUrl} 
                            download 
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                        >
                            Download
                        </a>
                    </div>
                </div>
            )}
            
            {!audioUrl && !loading && (
                <div className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                        </svg>
                        <div>
                            <h3 className="font-semibold text-red-800 dark:text-red-300 mb-1">Audio Not Available</h3>
                            <p className="text-sm text-red-700 dark:text-red-400">
                                Unable to load audio. Please refresh the page or try selecting a different reciter.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Audio Analysis Indicator */}
            {isAnalyzingAudio && (
                <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin flex-shrink-0 mt-0.5"></div>
                        <div>
                            <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Analyzing Audio...</h3>
                            <p className="text-sm text-blue-700 dark:text-blue-400">
                                Detecting verse boundaries using silence detection. This may take a moment.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Mode Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
                <button 
                    onClick={() => setTab('memorize')} 
                    className={`px-4 py-2.5 rounded-lg font-medium transition-all ${
                        tab === 'memorize' 
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                    📖 Memorize
                </button>
                <button 
                    onClick={() => setTab('flashcard')} 
                    className={`px-4 py-2.5 rounded-lg font-medium transition-all ${
                        tab === 'flashcard' 
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                    🎴 Flashcards
                </button>
                <button 
                    onClick={() => setTab('quiz')} 
                    className={`px-4 py-2.5 rounded-lg font-medium transition-all ${
                        tab === 'quiz' 
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                    ✅ Quiz
                </button>
            </div>

            {/* Memorize Tab */}
            {tab === 'memorize' && (
                <>
                    {/* Visibility Controls */}
                    <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-900 dark:text-white">Display Options</h3>
                            <button
                                onClick={() => setBeginnerMode(!beginnerMode)}
                                className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            >
                                {beginnerMode ? '👶 Beginner' : '🎓 Advanced'}
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                            <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={showArabic} 
                                    onChange={(e) => setShowArabic(e.target.checked)}
                                    className="w-5 h-5 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500"
                                />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show Arabic</span>
                            </label>
                            <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={showTransliteration} 
                                    onChange={(e) => setShowTransliteration(e.target.checked)}
                                    className="w-5 h-5 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500"
                                />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show Transliteration</span>
                            </label>
                            <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={showTranslation} 
                                    onChange={(e) => setShowTranslation(e.target.checked)}
                                    className="w-5 h-5 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500"
                                />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show Translation</span>
                            </label>
                        </div>

                        {/* Beginner Mode Controls */}
                        {beginnerMode && (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                                <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-3 text-sm">Simple Controls</h4>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={togglePlayPause}
                                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-md transition-all hover:scale-105"
                                    >
                                        {isPlaying ? '⏸ Pause' : '▶ Play'}
                                    </button>
                                    <button
                                        onClick={() => { 
                                            setRepeatCount(3);
                                            setRepeatFrom(activeAyah || 1);
                                            setRepeatTo(activeAyah || 1);
                                            setTimeout(() => playFromRange(), 50);
                                        }}
                                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md transition-all hover:scale-105"
                                    >
                                        🔁 Repeat 3x
                                    </button>
                                    <button
                                        onClick={goToPrevVerse}
                                        disabled={!activeAyah || activeAyah <= 1}
                                        className="px-5 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium shadow-md transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        ⬅ Previous
                                    </button>
                                    <button
                                        onClick={goToNextVerse}
                                        disabled={!activeAyah || activeAyah >= verses.length}
                                        className="px-5 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium shadow-md transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next ➡
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Advanced Controls */}
                        {!beginnerMode && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">From Verse</label>
                                        <input 
                                            type="number" 
                                            min={1} 
                                            max={verses.length}
                                            value={repeatFrom} 
                                            onChange={e => setRepeatFrom(Number(e.target.value))} 
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">To Verse</label>
                                        <input 
                                            type="number" 
                                            min={1} 
                                            max={verses.length}
                                            value={repeatTo} 
                                            onChange={e => setRepeatTo(Number(e.target.value))} 
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Repeat</label>
                                        <input 
                                            type="number" 
                                            min={1} 
                                            max={10}
                                            value={repeatCount} 
                                            onChange={e => setRepeatCount(Number(e.target.value))} 
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            onClick={playFromRange}
                                            className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                                        >
                                            Restart
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                                >
                                    {showAdvanced ? '▼ Hide' : '▶ Show'} Time-based Controls
                                </button>

                                {showAdvanced && (
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                                        <label className="flex items-center gap-2">
                                            <input 
                                                type="checkbox" 
                                                checked={useTimeRange} 
                                                onChange={e => setUseTimeRange(e.target.checked)}
                                                className="w-4 h-4 text-emerald-600 rounded"
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Use time range (mm:ss)</span>
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                                                <input 
                                                    value={timeStart} 
                                                    onChange={e => setTimeStart(e.target.value)} 
                                                    placeholder="0:00" 
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
                                                <input 
                                                    value={timeEnd} 
                                                    onChange={e => setTimeEnd(e.target.value)} 
                                                    placeholder="0:30" 
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Verse List */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-600 dark:text-gray-400 font-medium">Loading verses...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {visibleVerses.map(v => {
                                const status = verseStatus[v.ayah] || 'not-started';
                                const statusColors = {
                                    'not-started': 'border-gray-200 dark:border-gray-700',
                                    'learning': 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10',
                                    'reviewing': 'border-blue-400 bg-blue-50 dark:bg-blue-900/10',
                                    'memorized': 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10'
                                };
                                const isActive = activeAyah === v.ayah;
                                
                                return (
                                    <div 
                                        key={v.ayah} 
                                        ref={(node) => { verseRefs.current[v.ayah] = node; }} 
                                        className={`relative p-5 rounded-xl border-2 transition-all duration-300 cursor-pointer hover:shadow-lg ${
                                            isActive 
                                                ? 'border-emerald-600 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 ring-4 ring-emerald-200 dark:ring-emerald-800 shadow-xl' 
                                                : statusColors[status]
                                        }`}
                                        onClick={() => handleSelectAyah(v.ayah)}
                                    >
                                        {/* Verse Header */}
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                                    isActive 
                                                        ? 'bg-emerald-600 text-white' 
                                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                }`}>
                                                    {v.ayah}
                                                </div>
                                                {status !== 'not-started' && (
                                                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-white dark:bg-gray-800 border">
                                                        {status === 'learning' && '📚 Learning'}
                                                        {status === 'reviewing' && '🔄 Reviewing'}
                                                        {status === 'memorized' && '✅ Memorized'}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {/* Status Buttons */}
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); updateVerseStatus(v.ayah, 'learning'); }}
                                                    className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                                                        status === 'learning' 
                                                            ? 'bg-yellow-500 text-white' 
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-yellow-100'
                                                    }`}
                                                    title="Mark as Learning"
                                                >
                                                    📚
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); updateVerseStatus(v.ayah, 'reviewing'); }}
                                                    className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                                                        status === 'reviewing' 
                                                            ? 'bg-blue-500 text-white' 
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-100'
                                                    }`}
                                                    title="Mark as Reviewing"
                                                >
                                                    🔄
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); updateVerseStatus(v.ayah, 'memorized'); }}
                                                    className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                                                        status === 'memorized' 
                                                            ? 'bg-emerald-500 text-white' 
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-emerald-100'
                                                    }`}
                                                    title="Mark as Memorized"
                                                >
                                                    ✅
                                                </button>
                                            </div>
                                        </div>

                                        {/* Verse Content */}
                                        {showArabic && (
                                            <div className="text-3xl sm:text-4xl leading-loose mb-4 font-arabic" dir="rtl">
                                                {v.arabic}
                                            </div>
                                        )}
                                        {showTransliteration && (
                                            <div className="text-lg sm:text-xl text-gray-800 dark:text-gray-200 mb-3 font-medium">
                                                {v.transliteration}
                                            </div>
                                        )}
                                        {showTranslation && (
                                            <div className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                                                {v.translation || '—'}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Flashcard Tab */}
            {tab === 'flashcard' && verses.length > 0 && (
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-gray-200 dark:border-gray-700 p-8 min-h-[400px] flex flex-col">
                        <div className="text-center mb-6">
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                Flashcard {flashcardIndex + 1} of {verses.length}
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                    className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${((flashcardIndex + 1) / verses.length) * 100}%` }}
                                />
                            </div>
                        </div>

                        <div className="flex-1 flex items-center justify-center mb-6">
                            {!flashcardRevealed ? (
                                <div className="text-center">
                                    <div className="text-4xl sm:text-5xl font-arabic leading-loose mb-4" dir="rtl">
                                        {verses[flashcardIndex]?.arabic}
                                    </div>
                                    <button
                                        onClick={() => setFlashcardRevealed(true)}
                                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-lg transition-all hover:scale-105"
                                    >
                                        Reveal Translation
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center space-y-4">
                                    <div className="text-4xl sm:text-5xl font-arabic leading-loose" dir="rtl">
                                        {verses[flashcardIndex]?.arabic}
                                    </div>
                                    <div className="text-xl text-gray-800 dark:text-gray-200 font-medium">
                                        {verses[flashcardIndex]?.transliteration}
                                    </div>
                                    <div className="text-lg text-gray-600 dark:text-gray-400">
                                        {verses[flashcardIndex]?.translation}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between gap-3">
                            <button
                                onClick={() => {
                                    setFlashcardIndex(Math.max(0, flashcardIndex - 1));
                                    setFlashcardRevealed(false);
                                }}
                                disabled={flashcardIndex === 0}
                                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ← Previous
                            </button>
                            <button
                                onClick={() => {
                                    if (flashcardIndex < verses.length - 1) {
                                        setFlashcardIndex(flashcardIndex + 1);
                                        setFlashcardRevealed(false);
                                    }
                                }}
                                disabled={flashcardIndex === verses.length - 1}
                                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quiz Tab */}
            {tab === 'quiz' && verses.length > 0 && (
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-gray-200 dark:border-gray-700 p-8">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                            Test Your Memorization
                        </h2>
                        
                        <div className="mb-6">
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={() => setQuizMode('listen')}
                                    className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                                        quizMode === 'listen'
                                            ? 'bg-emerald-600 text-white shadow-lg'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    🎧 Listen & Identify
                                </button>
                                <button
                                    onClick={() => setQuizMode('read')}
                                    className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                                        quizMode === 'read'
                                            ? 'bg-emerald-600 text-white shadow-lg'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    📖 Read & Recall
                                </button>
                            </div>

                            {quizMode === 'listen' && (
                                <div className="text-center space-y-4">
                                    <p className="text-gray-600 dark:text-gray-400">
                                        Listen to the recitation and identify which verse it is.
                                    </p>
                                    <button
                                        onClick={togglePlayPause}
                                        className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-medium shadow-lg transition-all hover:scale-105"
                                    >
                                        {isPlaying ? '⏸ Pause Audio' : '▶ Play Audio'}
                                    </button>
                                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                        Verse {activeAyah}
                                    </div>
                                </div>
                            )}

                            {quizMode === 'read' && activeAyah && (
                                <div className="space-y-4">
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 text-center">
                                        <div className="text-4xl font-arabic leading-loose mb-4" dir="rtl">
                                            {verses.find(v => v.ayah === activeAyah)?.arabic}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Type the translation or transliteration:
                                        </label>
                                        <textarea
                                            value={quizAnswer}
                                            onChange={(e) => setQuizAnswer(e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                            rows={4}
                                            placeholder="Type your answer here..."
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            const correct = verses.find(v => v.ayah === activeAyah);
                                            const answer = quizAnswer.toLowerCase().trim();
                                            const isCorrect = 
                                                correct?.translation?.toLowerCase().includes(answer) ||
                                                correct?.transliteration?.toLowerCase().includes(answer);
                                            setQuizResult(isCorrect ? 'correct' : 'incorrect');
                                        }}
                                        className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-lg transition-all hover:scale-105"
                                    >
                                        Check Answer
                                    </button>

                                    {quizResult && (
                                        <div className={`p-4 rounded-xl ${
                                            quizResult === 'correct'
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-500'
                                                : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500'
                                        }`}>
                                            <div className="text-center">
                                                <div className="text-4xl mb-2">
                                                    {quizResult === 'correct' ? '🎉' : '❌'}
                                                </div>
                                                <div className={`font-bold text-lg mb-2 ${
                                                    quizResult === 'correct' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                                                }`}>
                                                    {quizResult === 'correct' ? 'Correct!' : 'Not quite right'}
                                                </div>
                                                {quizResult === 'incorrect' && (
                                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                                        <p className="mb-1"><strong>Correct answer:</strong></p>
                                                        <p>{verses.find(v => v.ayah === activeAyah)?.translation}</p>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setQuizResult(null);
                                                        setQuizAnswer('');
                                                        goToNextVerse();
                                                    }}
                                                    className="mt-4 px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                                                >
                                                    Next Verse →
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


