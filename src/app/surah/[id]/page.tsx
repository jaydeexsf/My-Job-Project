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

    // Ayah-based repeat range (defaults handled in logic if unset)
    const [repeatFrom, setRepeatFrom] = useState<number | null>(null);
    const [repeatTo, setRepeatTo] = useState<number | null>(null);

    // DOM <audio> element used for playback, seeking, and time reads
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [segments, setSegments] = useState<{ ayah: number; start: number; end: number }[]>([]);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isAnalyzingAudio, setIsAnalyzingAudio] = useState<boolean>(false);
    const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
    const verseRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const hasScrolledOnce = useRef<boolean>(false);
    const lastLoggedSecondRef = useRef<number>(-1);
    const lastAnnouncedAyahRef = useRef<number | null>(null);
    const segmentByAyah = useMemo(() => {
        const map: Record<number, { start: number; end: number }> = {};
        for (const s of segments) map[s.ayah] = { start: s.start, end: s.end };
        return map;
    }, [segments]);
    const firstSegmentStart = useMemo(() => segments.length > 0 ? segments[0].start : 0, [segments]);

    // Heuristic per-verse timing estimation based on Arabic text length (used before real analysis is available)
    const estimatedSegments = useMemo(() => {
        if (segments.length > 0 || verses.length === 0) return [] as { ayah: number; start: number; end: number }[];
        const initialSilence = 0.82; // seconds to allow intro gap
        const baseSecondsPerVerse = 0.6; // base time for any verse
        const secondsPerChar = 0.06; // time per Arabic character
        const secondsPerWord = 0.12; // time per word (pauses)
        let cursor = initialSilence;
        const est: { ayah: number; start: number; end: number }[] = [];
        for (const v of verses) {
            const text = (v.arabic || '').trim();
            const charCount = text.length;
            const wordCount = text.split(/\s+/).filter(Boolean).length;
            const dur = baseSecondsPerVerse + (charCount * secondsPerChar) + (wordCount * secondsPerWord);
            const start = cursor;
            const end = start + dur;
            est.push({ ayah: v.ayah, start, end });
            cursor = end + 0.3; // brief pause between verses
        }
        try {
            console.log('[Estimated Segments From Text] using heuristics', { initialSilence, baseSecondsPerVerse, secondsPerChar, secondsPerWord });
            est.forEach(s => {
                const dur = (s.end - s.start).toFixed(2);
                console.log(`[Est Verse ${s.ayah}] ${formatTime(s.start)} → ${formatTime(s.end)} (${dur}s)`);
            });
        } catch {}
        return est;
    }, [segments, verses]);

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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const audioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // Get audio data
            const channelData = audioBuffer.getChannelData(0);
            const sampleRate = audioBuffer.sampleRate;
            const duration = audioBuffer.duration;

            // Detect silence periods (tuned to avoid early cuts)
            const silenceThreshold = 0.015; // require quieter audio to consider it silent
            const minSilenceDuration = 0.5; // require at least 500ms of silence between verses
            const windowSize = Math.floor(sampleRate * 0.12); // 120ms window

            const silencePeriods: { start: number; end: number }[] = [];
            let silenceStart: number | null = null;

            // Scan through audio in windows
            for (let i = 0; i < channelData.length; i += windowSize) {
                const window = channelData.slice(i, i + windowSize);
                const rms = Math.sqrt(window.reduce((sum: number, val: number) => sum + val * val, 0) / window.length);
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
            console.log('[Audio Analysis] ═══════════════════════════════════════');
            
            // Log each silence period with timestamps
            silencePeriods.forEach((period, index) => {
                const startMin = Math.floor(period.start / 60);
                const startSec = Math.floor(period.start % 60);
                const startMs = Math.floor((period.start % 1) * 1000);
                const endMin = Math.floor(period.end / 60);
                const endSec = Math.floor(period.end % 60);
                const endMs = Math.floor((period.end % 1) * 1000);
                const durationMs = Math.floor((period.end - period.start) * 1000);
                
                console.log(`[Silence ${index + 1}] ${startMin}:${startSec.toString().padStart(2, '0')}.${startMs.toString().padStart(3, '0')} → ${endMin}:${endSec.toString().padStart(2, '0')}.${endMs.toString().padStart(3, '0')} (${durationMs}ms)`);
            });

            console.log('[Audio Analysis] ═══════════════════════════════════════');

            // Generate segments from silence periods
            // Each verse includes its pause, next verse starts after the pause
            const generatedSegments: { ayah: number; start: number; end: number }[] = [];
            let currentStart = 0;

            const postPausePadding = 0.12; // keep highlight a bit into the pause
            for (let i = 0; i < Math.min(silencePeriods.length, verseCount - 1); i++) {
                // Use the END of silence as the verse boundary (not the middle)
                // This way the verse stays highlighted during the pause
                const silenceEnd = silencePeriods[i].end;
                const boundary = Math.min(duration, silenceEnd + postPausePadding);
                generatedSegments.push({
                    ayah: i + 1,
                    start: currentStart,
                    end: boundary
                });
                currentStart = boundary;
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
            console.log('[Audio Analysis] ═══════════════════════════════════════');
            
            // Log each generated segment with timestamps
            generatedSegments.forEach((segment) => {
                const startMin = Math.floor(segment.start / 60);
                const startSec = Math.floor(segment.start % 60);
                const startMs = Math.floor((segment.start % 1) * 1000);
                const endMin = Math.floor(segment.end / 60);
                const endSec = Math.floor(segment.end % 60);
                const endMs = Math.floor((segment.end % 1) * 1000);
                const durationSec = (segment.end - segment.start).toFixed(2);
                
                console.log(`[Verse ${segment.ayah}] ${startMin}:${startSec.toString().padStart(2, '0')}.${startMs.toString().padStart(3, '0')} → ${endMin}:${endSec.toString().padStart(2, '0')}.${endMs.toString().padStart(3, '0')} (${durationSec}s)`);
            });
            
            console.log('[Audio Analysis] ═══════════════════════════════════════');
            
            // Print full raw analysis object (inputs, params, and results)
            try {
                console.log('[Audio Analysis Raw]', {
                    params: {
                        silenceThreshold,
                        minSilenceDuration,
                        windowSize,
                    },
                    audio: {
                        sampleRate,
                        duration,
                    },
                    silencePeriods,
                    generatedSegments,
                });
            } catch {}
            
            // Save to localStorage for future use with version to force re-analysis when algorithm improves
            const cacheVersion = 'v2'; // bump when silence detection changes
            localStorage.setItem(`audio-segments-${surahId}`, JSON.stringify({
                version: cacheVersion,
                segments: generatedSegments
            }));
            
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
                
                const tRes = await fetch(`/api/timings?surah=${surahId}&reciter=1`);
                const tData = await tRes.json();
                // Print full raw timings response (provider/silence data)
                try { console.log('[Timings API Raw]', tData); } catch {}
                let audioUrlToUse = tData?.audioUrl;
                
                // Check if we have segments from API
                const normalizeSegments = (arr: { ayah: number; start: number; end: number }[]) => {
                    if (!Array.isArray(arr)) return [] as { ayah: number; start: number; end: number }[];
                    const normalized: { ayah: number; start: number; end: number }[] = [];
                    let lastEnd = 0;
                    for (const s of arr) {
                        const start = Math.max(0, Math.max(s.start ?? 0, lastEnd));
                        const end = Math.max(start + 0.05, s.end ?? start + 0.05); // enforce minimal 50ms window
                        normalized.push({ ayah: s.ayah, start, end });
                        lastEnd = end;
                    }
                    return normalized;
                };

                if (tData?.segments && tData.segments.length > 0) {
                    const norm = normalizeSegments(tData.segments);
                    setSegments(norm);
                    console.log('[SurahPage] Using API segments:', tData.segments.length);
                    // Detailed segments summary
                    try {
                        console.log('[Segments Summary] Total segments:', norm.length);
                        norm.forEach((s: { ayah: number; start: number; end: number }) => {
                            const dur = (s.end - s.start).toFixed(2);
                            console.log(`[Verse ${s.ayah}] ${formatTime(s.start)} → ${formatTime(s.end)} (${dur}s)`);
                        });
                    } catch {}
                } else {
                    // Try to load cached segments from localStorage (check version)
                    const cachedSegments = localStorage.getItem(`audio-segments-${surahId}`);
                    if (cachedSegments) {
                        try {
                            const parsed = JSON.parse(cachedSegments);
                            const currentVersion = 'v2'; // same as above
                            if (parsed.version === currentVersion && Array.isArray(parsed.segments)) {
                                const norm = normalizeSegments(parsed.segments);
                                setSegments(norm);
                                console.log('[SurahPage] Using cached segments:', norm.length);
                                // Detailed segments summary
                                try {
                                    console.log('[Segments Summary] Total segments:', norm.length);
                                    norm.forEach((s: { ayah: number; start: number; end: number }) => {
                                        const dur = (s.end - s.start).toFixed(2);
                                        console.log(`[Verse ${s.ayah}] ${formatTime(s.start)} → ${formatTime(s.end)} (${dur}s)`);
                                    });
                                } catch {}
                            } else {
                                console.log('[SurahPage] Cached segments outdated, will re-analyze');
                            }
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
        
        if (useTimeRange && timeStartSec != null) {
            const seekTo = Math.max(0, timeStartSec) + 0.01;
            console.log(`[Play] Starting time-based repeat from ${formatTime(seekTo)}`);
            audio.currentTime = seekTo;
            audio.play().then(() => { setIsPlaying(true); }).catch((err) => console.error('Play failed:', err));
            repeatCounterRef.current = 0;
            loopsDoneRef.current = 0;
            lastLoopAtMsRef.current = 0;
        } else {
            // Default behavior: start from beginning
            console.log(`[Play] Starting from beginning`);
            audio.currentTime = 0;
            audio.play().then(() => { setIsPlaying(true); }).catch((err) => console.error('Play failed:', err));
            repeatCounterRef.current = 0;
            loopsDoneRef.current = 0;
            lastLoopAtMsRef.current = 0;
        }
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

    const seekBySeconds = (delta: number) => {
        const audio = audioRef.current;
        if (!audio) return;
        const total = Number.isFinite(durationSec) && durationSec > 0 ? durationSec : (audio.duration || 0);
        const target = Math.max(0, Math.min(total, (audio.currentTime || 0) + delta));
        audio.currentTime = target;
        console.log(`[Seek] ${delta > 0 ? '+' : ''}${delta}s → ${formatTime(target)} / ${formatTime(total)}`);
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

            // Handle initial window before first segment: lock to verse 1 once so auto-scroll doesn't skip it
            const firstStart = segments.length > 0 ? segments[0].start : 0;
            if (t < (firstStart + 0.15) && lastAnnouncedAyahRef.current == null) {
                if (activeAyah !== 1) {
                    setActiveAyah(1);
                }
                lastAnnouncedAyahRef.current = 1;
            }
            
            // find segment containing t (prefer real segments; fall back to estimates)
            const allSegs = segments.length > 0 ? segments : estimatedSegments;
            if (allSegs.length > 0) {
                const seg = allSegs.find(s => t >= s.start && t <= s.end);
                if (seg && seg.ayah !== activeAyah && seg.ayah !== lastAnnouncedAyahRef.current) {
                    const verseText = verses.find(v => v.ayah === seg.ayah)?.arabic || '';
                    const segDur = (seg.end - seg.start).toFixed(2);
                    console.log(`[Verse Change] ${formatTime(t)} → Verse ${seg.ayah} (was ${activeAyah}) | ${formatTime(seg.start)} → ${formatTime(seg.end)} (${segDur}s)`);
                    if (verseText) {
                        console.log(`[Verse ${seg.ayah} Text]`, verseText);
                    }
                    setActiveAyah(seg.ayah);
                    lastAnnouncedAyahRef.current = seg.ayah;
                }
            }

            // Per-second diagnostic logs for the first 15s, skipping initial silence
            if (allSegs.length > 0) {
                const currentSecond = Math.floor(t);
                const initialSilenceBoundary = Math.max(0, firstSegmentStart) + 0.05;
                if (t >= initialSilenceBoundary && currentSecond !== lastLoggedSecondRef.current && currentSecond <= 15) {
                    lastLoggedSecondRef.current = currentSecond;
                    const seg = allSegs.find(s => t >= s.start && t <= s.end);
                    if (seg) {
                        const verseText = verses.find(v => v.ayah === seg.ayah)?.arabic || '';
                        const segDur = (seg.end - seg.start).toFixed(2);
                        console.log(`[Diagnostics @ ${formatTime(t)}] Verse ${seg.ayah} | Window ${formatTime(seg.start)} → ${formatTime(seg.end)} (${segDur}s)`);
                        if (verseText) {
                            console.log(`[Diagnostics Text]`, verseText);
                        }
                        console.log(`[Diagnostics Meta] realSegments=${segments.length}, estimated=${estimatedSegments.length}, playbackRate=${playbackSpeed}x`);
                    } else {
                        // Between segments or trailing audio
                        console.log(`[Diagnostics @ ${formatTime(t)}] Between segments | realSegments=${segments.length}, estimated=${estimatedSegments.length}`);
                    }
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
                // Fallbacks: repeat current ayah if no explicit range is set
                const selectedStartAyah = (repeatFrom ?? activeAyah ?? 1);
                const selectedEndAyah = (repeatTo ?? selectedStartAyah);
                const endSeg = segmentByAyah[selectedEndAyah];
                const startSeg = segmentByAyah[selectedStartAyah];
                if (startSeg && endSeg) {
                    if (t > endSeg.end - 0.05) {
                        const now = Date.now();
                        if (loopsDoneRef.current < repeatCount && now - lastLoopAtMsRef.current > 700) {
                            loopsDoneRef.current += 1;
                            lastLoopAtMsRef.current = now;
                            const seek = startSeg.start + 0.01;
                            audio.currentTime = seek;
                            setActiveAyah(selectedStartAyah);
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
    }, [audioUrl, segments, repeatCount, segmentByAyah, useTimeRange, timeStartSec, timeEndSec, playbackSpeed]);

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

    // Auto-scroll the active ayah into view smoothly (toggleable)
    useEffect(() => {
        if (activeAyah == null) return;
        if (!autoScrollEnabled) return;
        
        // Always allow initial scroll (including verse 1)
        
        // Use setTimeout to ensure DOM is ready and avoid rapid scroll conflicts
        const scrollTimeout = setTimeout(() => {
            const el = verseRefs.current[activeAyah];
            if (el) {
                try {
                    console.log('[Auto-scroll] Scrolling to verse', activeAyah);
                    el.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center',
                        inline: 'nearest'
                    });
                    hasScrolledOnce.current = true;
                } catch (error) {
                    console.error('[Auto-scroll] Error:', error);
                }
            } else {
                console.warn('[Auto-scroll] Element not found for verse', activeAyah);
            }
        }, 100);

        return () => clearTimeout(scrollTimeout);
    }, [activeAyah, autoScrollEnabled]);

    // Next/Previous verse navigation
    const goToNextVerse = () => {
        if (activeAyah && activeAyah < verses.length) {
            setActiveAyah(activeAyah + 1);
        }
    };

    const goToPrevVerse = () => {
        if (activeAyah && activeAyah > 1) {
            setActiveAyah(activeAyah - 1);
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
                <div className="mb-6 rounded-xl shadow-lg border p-4 bg-white/5 dark:bg-white/5 border-white/10 dark:border-white/10 backdrop-blur">
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
                            className="px-3 py-2 sm:px-4 sm:py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                        >
                            <span className="inline-flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/></svg>
                                <span>Download</span>
                            </span>
                        </a>
                    </div>
                </div>
            )}

            {/* Auto-scroll Toggle (sticky) */}
            <div className="fixed bottom-4 right-4 z-20">
                <button
                    onClick={() => setAutoScrollEnabled(v => !v)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium shadow-md border transition-colors ${
                        autoScrollEnabled
                            ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                    title="Toggle auto-scroll"
                >
                    {autoScrollEnabled ? 'Auto-scroll: ON' : 'Auto-scroll: OFF'}
                </button>
            </div>
            
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
                    <span className="inline-flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v13H6.5A2.5 2.5 0 004 19.5V4z"/></svg>
                        <span>Memorize</span>
                    </span>
                </button>
                <button 
                    onClick={() => setTab('flashcard')} 
                    className={`px-4 py-2.5 rounded-lg font-medium transition-all ${
                        tab === 'flashcard' 
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                    <span className="inline-flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h13a2 2 0 012 2v9a2 2 0 01-2 2H3V7zm18-3H8a2 2 0 00-2 2v1h12a2 2 0 012 2v10h1a2 2 0 002-2V6a2 2 0 00-2-2z"/></svg>
                        <span>Flashcards</span>
                    </span>
                </button>
                <button 
                    onClick={() => setTab('quiz')} 
                    className={`px-4 py-2.5 rounded-lg font-medium transition-all ${
                        tab === 'quiz' 
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                    <span className="inline-flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-8 8h10a2 2 0 002-2V6a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        <span>Quiz</span>
                    </span>
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
                            <div className="rounded-lg p-4 border bg-white/5 dark:bg-white/5 border-white/10 dark:border-white/10 backdrop-blur">
                                <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-3 text-sm">Simple Controls</h4>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={togglePlayPause}
                                        className="px-3 py-2 sm:px-5 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-md transition-all hover:scale-105 text-sm sm:text-base"
                                    >
                                        <span className="inline-flex items-center gap-2">
                                            {isPlaying ? (
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                            )}
                                            <span>{isPlaying ? 'Pause' : 'Play'}</span>
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => { 
                                            setRepeatCount(3);
                                            setUseTimeRange(true);
                                            setTimeStart("0:00");
                                            setTimeEnd("");
                                            setTimeout(() => playFromRange(), 50);
                                        }}
                                        className="px-3 py-2 sm:px-5 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md transition-all hover:scale-105 text-sm sm:text-base inline-flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 7v6a4 4 0 004 4h8m4-6V5a4 4 0 00-4-4H8m0 0l3 3M8 1L5 4"/></svg>
                                        <span>Repeat 3x</span>
                                    </button>
                                    <button
                                        onClick={() => seekBySeconds(-5)}
                                        disabled={!audioUrl}
                                        className="px-3 py-2 sm:px-5 sm:py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium shadow-md transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base inline-flex items-center gap-2"
                                        title="Rewind 5 seconds"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l-7-7 7-7"/></svg>
                                        <span>-5s</span>
                                    </button>
                                    <button
                                        onClick={() => seekBySeconds(5)}
                                        disabled={!audioUrl}
                                        className="px-3 py-2 sm:px-5 sm:py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium shadow-md transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base inline-flex items-center gap-2"
                                        title="Forward 5 seconds"
                                    >
                                        <span>+5s</span>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5l7 7-7 7"/></svg>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Advanced Controls */}
                        {!beginnerMode && (
                            <div className="space-y-4">
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Time-based Repeat</h3>
                                        <label className="flex items-center gap-2">
                                            <input 
                                                type="checkbox" 
                                                checked={useTimeRange} 
                                                onChange={e => setUseTimeRange(e.target.checked)}
                                                className="w-4 h-4 text-emerald-600 rounded"
                                            />
                                            <span className="text-xs text-gray-600 dark:text-gray-400">Enable</span>
                                        </label>
                                    </div>
                                    
                                    {useTimeRange && (
                                        <div className="space-y-3">
                                            {/* Current Time Display */}
                                            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Time:</span>
                                                <span className="text-lg font-mono text-emerald-600 dark:text-emerald-400">
                                                    {Math.floor(currentTimeSec / 60)}:{(currentTimeSec % 60).toFixed(1).padStart(4, '0')}
                                                </span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                                                    <input 
                                                        value={timeStart} 
                                                        onChange={e => setTimeStart(e.target.value)} 
                                                        placeholder="0:00" 
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
                                                    <input 
                                                        value={timeEnd} 
                                                        onChange={e => setTimeEnd(e.target.value)} 
                                                        placeholder="0:30" 
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        const currentMin = Math.floor(currentTimeSec / 60);
                                                        const currentSec = (currentTimeSec % 60).toFixed(1);
                                                        setTimeStart(`${currentMin}:${currentSec.padStart(4, '0')}`);
                                                    }}
                                                    className="flex-1 px-3 py-2 text-xs bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                                                >
                                                    Set Current
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const durationMin = Math.floor(durationSec / 60);
                                                        const durationSecFormatted = (durationSec % 60).toFixed(1);
                                                        setTimeEnd(`${durationMin}:${durationSecFormatted.padStart(4, '0')}`);
                                                    }}
                                                    className="flex-1 px-3 py-2 text-xs bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                                                >
                                                    Set End
                                                </button>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Repeat Count</label>
                                                <input 
                                                    type="number" 
                                                    min={1} 
                                                    max={10}
                                                    value={repeatCount} 
                                                    onChange={e => setRepeatCount(Number(e.target.value))} 
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                                                />
                                            </div>
                                            
                                            <button
                                                onClick={playFromRange}
                                                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                                            >
                                                Start Time-based Repeat
                                            </button>
                                        </div>
                                    )}
                                </div>
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
                                                {status === 'learning' && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6l-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h4l2-2h6a2 2 0 002-2V6a2 2 0 00-2-2h-6z"/></svg>
                                                        <span>Learning</span>
                                                    </span>
                                                )}
                                                {status === 'reviewing' && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0014-7 9 9 0 00-9-9H8"/></svg>
                                                        <span>Reviewing</span>
                                                    </span>
                                                )}
                                                {status === 'memorized' && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                                        <span>Memorized</span>
                                                    </span>
                                                )}
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
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6l-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h4l2-2h6a2 2 0 002-2V6a2 2 0 00-2-2h-6z"/></svg>
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
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0014-7 9 9 0 00-9-9H8"/></svg>
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
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Verse Content */}
                                        {showArabic && (
                                            <div className="text-2xl sm:text-4xl leading-loose mb-4 font-arabic" dir="rtl">
                                                {v.arabic}
                                            </div>
                                        )}
                                        {showTransliteration && (
                                            <div className="text-base sm:text-xl text-gray-800 dark:text-gray-200 mb-3 font-medium">
                                                {v.transliteration}
                                            </div>
                                        )}
                                        {showTranslation && (
                                            <div className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
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


