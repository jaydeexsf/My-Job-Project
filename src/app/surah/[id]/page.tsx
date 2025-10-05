"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";

type VerseItem = {
    surah: number;
    ayah: number;
    arabic: string;
    transliteration: string;
    translation?: string;
};

export default function SurahPage() {
    const params = useParams();
    const surahId = Number(params?.id);

    const [verses, setVerses] = useState<VerseItem[]>([]);
    const [chapterName, setChapterName] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [activeAyah, setActiveAyah] = useState<number | null>(null);
    const [tab, setTab] = useState<'memorize' | 'tafsir'>('memorize');
    const [repeatFrom, setRepeatFrom] = useState<number>(1);
    const [repeatTo, setRepeatTo] = useState<number>(1);
    const [repeatCount, setRepeatCount] = useState<number>(1);
    const repeatCounterRef = useRef<number>(0);
    const loopsDoneRef = useRef<number>(0);
    const lastLoopAtMsRef = useRef<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [useTimeRange, setUseTimeRange] = useState<boolean>(false);
    const [timeStart, setTimeStart] = useState<string>("0:00");
    const [timeEnd, setTimeEnd] = useState<string>("");
    const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
    const [durationSec, setDurationSec] = useState<number>(0);

    // DOM <audio> element used for playback, seeking, and time reads
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [segments, setSegments] = useState<{ ayah: number; start: number; end: number }[]>([]);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const verseRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const segmentByAyah = useMemo(() => {
        const map: Record<number, { start: number; end: number }> = {};
        for (const s of segments) map[s.ayah] = { start: s.start, end: s.end };
        return map;
    }, [segments]);

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

    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            try {
                setLoading(true);
                // Load chapter meta
                const chRes = await fetch(`/api/quran?surah=${surahId}`);
                console.log('[SurahPage] Fetch chapter meta status:', chRes.status);
                const chData = await chRes.json();
                const name = chData?.name_simple || chData?.chapter?.name_simple || "";
                setChapterName(name);

                const res = await fetch(`/api/transliteration?surah=${surahId}`);
                console.log('[SurahPage] Fetch transliteration status:', res.status);
                const data = await res.json();
                console.log('[SurahPage] Transliteration items:', data?.items?.length);
                setVerses(data.items || []);
                setActiveAyah((data.items?.[0]?.ayah) ?? null);
                setRepeatFrom(1);
                setRepeatTo((data.items?.length ?? 1));
                // timings for highlighting
                const tRes = await fetch(`/api/timings?surah=${surahId}&reciter=1`);
                console.log('[SurahPage] Fetch timings status:', tRes.status);
                const tData = await tRes.json();
                console.log('[SurahPage] Timings audioUrl:', tData?.audioUrl, 'segments:', tData?.segments?.length);
                if (tData?.segments) setSegments(tData.segments);
                if (tData?.audioUrl) setAudioUrl(tData.audioUrl);

                // Fallback to your Quran.com-backed audio endpoint if needed
                if (!tData?.audioUrl) {
                    const aRes = await fetch(`/api/audio?surah=${surahId}&ayah=1&reciter=1`);
                    console.log('[SurahPage] Fetch /api/audio status:', aRes.status);
                    if (aRes.ok) {
                        const aData = await aRes.json();
                        const url = aData?.audio?.audioUrl;
                        console.log('[SurahPage] /api/audio url:', url);
                        if (url) setAudioUrl(url);
                    }
                }
            } catch (e) {
                console.error('[SurahPage] Load error:', e);
            } finally {
                setLoading(false);
            }
        }
        if (!Number.isNaN(surahId) && surahId > 0) load();
        return () => {
            controller.abort();
        };
    }, [surahId]);

    const handleSelectAyah = (n: number) => {
        setActiveAyah(n);
        // In a future iteration, sync audio time to ayah here when time-coded data available
    };

    const visibleVerses = verses; // could paginate later

    const currentArabic = useMemo(() => {
        return visibleVerses.find(v => v.ayah === activeAyah)?.arabic ?? '';
    }, [visibleVerses, activeAyah]);

    const currentTranslit = useMemo(() => {
        return visibleVerses.find(v => v.ayah === activeAyah)?.transliteration ?? '';
    }, [visibleVerses, activeAyah]);

    const startRepeat = () => {
        if (!visibleVerses.length) return;
        // Simple verse-by-verse repeat cycling; no audio time slicing yet
        repeatCounterRef.current = 0;
        setActiveAyah(repeatFrom);
    };

    const playFromRange = () => {
        console.log('[SurahPage] PlayFromRange clicked', { audioUrl, useTimeRange, timeStartSec, timeEndSec, repeatFrom, repeatTo, repeatCount });
        if (!audioUrl) {
            console.warn('[SurahPage] No audioUrl available.');
            return;
        }
        const audio = audioRef.current;
        if (!audio) { console.warn('[SurahPage] No audio element in DOM'); return; }
        const segFrom = segmentByAyah[repeatFrom];
        const shouldUseTime = (useTimeRange || (timeStartSec != null && timeEndSec != null && timeEndSec > timeStartSec));
        const seekTo = shouldUseTime && timeStartSec != null
            ? Math.max(0, timeStartSec) + 0.01
            : (segFrom ? segFrom.start + 0.01 : 0);
        console.log('[SurahPage] Seeking to', seekTo, 'for ayah', repeatFrom);
        audio.currentTime = seekTo;
        repeatCounterRef.current = 0;
        loopsDoneRef.current = 0;
        lastLoopAtMsRef.current = 0;
        audio.play().then(() => { console.log('[SurahPage] audio play() resolved'); setIsPlaying(true); }).catch((err) => console.error('[SurahPage] play() failed', err));
        if (segments.length) setActiveAyah(repeatFrom);
    };

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) {
            console.log('[SurahPage] togglePlayPause: no audio instance, calling PlayFromRange');
            playFromRange();
            return;
        }
        if (audio.paused) {
            const shouldUseTime = (useTimeRange || (timeStartSec != null && timeEndSec != null && timeEndSec > timeStartSec));
            if (shouldUseTime && timeStartSec != null && audio.currentTime < (timeStartSec - 0.05)) {
                const seekTo = Math.max(0, timeStartSec) + 0.01;
                console.log('[SurahPage] togglePlayPause seek to start of range', seekTo);
                audio.currentTime = seekTo;
            }
            audio.play().then(() => { setIsPlaying(true); console.log('[SurahPage] toggled → Play at', audio.currentTime); }).catch(err => console.error('[SurahPage] resume failed', err));
        } else {
            console.log('[SurahPage] toggled → Pause at', audio.currentTime);
            audio.pause();
            setIsPlaying(false);
        }
    };

    const pausePlayback = () => {
        const audio = audioRef.current;
        if (!audio) return;
        console.log('[SurahPage] Pause pressed at', audio.currentTime);
        audio.pause();
        setIsPlaying(false);
    };

    const stopPlayback = () => {
        const audio = audioRef.current;
        if (!audio) return;
        console.log('[SurahPage] Stop pressed at', audio.currentTime);
        audio.pause();
        audio.currentTime = 0;
        setIsPlaying(false);
        setActiveAyah(repeatFrom || activeAyah);
    };

    // Sync highlight to audio time using segments and handle repeat range
    useEffect(() => {
        if (!audioUrl || !segments.length) return;
        const audio = audioRef.current;
        if (!audio) return;
        const onTime = () => {
            const t = audio.currentTime;
            setCurrentTimeSec(t);
            // find segment containing t
            const seg = segments.find(s => t >= s.start && t <= s.end);
            if (seg && seg.ayah !== activeAyah) setActiveAyah(seg.ayah);

            // Repeat logic: time range first if enabled, else ayah range
            if (useTimeRange && timeStartSec != null && timeEndSec != null && timeEndSec > timeStartSec) {
                if (t > timeEndSec - 0.05) {
                    const now = Date.now();
                    if (loopsDoneRef.current < repeatCount - 1 && now - lastLoopAtMsRef.current > 700) {
                        loopsDoneRef.current += 1;
                        lastLoopAtMsRef.current = now;
                        const seek = Math.max(0, timeStartSec) + 0.01;
                        console.log('[SurahPage] Loop (time range)', loopsDoneRef.current, 'seeking', seek);
                        audio.currentTime = seek;
                    }
                } else if (t < timeStartSec) {
                    audio.currentTime = Math.max(0, timeStartSec) + 0.01;
                }
            } else {
                const endSeg = segmentByAyah[repeatTo];
                const startSeg = segmentByAyah[repeatFrom];
                if (startSeg && endSeg) {
                    if (t > endSeg.end - 0.05) {
                        const now = Date.now();
                        if (loopsDoneRef.current < repeatCount - 1 && now - lastLoopAtMsRef.current > 700) {
                            loopsDoneRef.current += 1;
                            lastLoopAtMsRef.current = now;
                            const seek = startSeg.start + 0.01;
                            console.log('[SurahPage] Loop', loopsDoneRef.current, 'of', repeatCount - 1, 'seeking', seek);
                            audio.currentTime = seek;
                            setActiveAyah(repeatFrom);
                        }
                    } else if (t < startSeg.start) {
                        // guard: if user scrubs earlier, snap to start
                        audio.currentTime = startSeg.start + 0.01;
                    }
                }
            }
        };
        const onLoaded = () => { const d = audio.duration || 0; setDurationSec(d); console.log('[SurahPage] metadata loaded duration', d); };
        audio.addEventListener('timeupdate', onTime);
        audio.addEventListener('loadedmetadata', onLoaded);
    // no autoplay here; user must press Restart
        return () => {
            audio.removeEventListener('timeupdate', onTime);
            audio.removeEventListener('loadedmetadata', onLoaded);
            try { audio.pause(); } catch {}
        };
    }, [audioUrl, segments, repeatFrom, repeatTo, repeatCount, segmentByAyah]);

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
            } catch (_) {
                // ignore
            }
        }
    }, [activeAyah]);

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-4">{chapterName || 'Surah'} (Surah {surahId})</h1>

            {/* Audio & Tabs */}
            {audioUrl && (
                <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="flex-1">
                        <audio ref={audioRef} src={audioUrl} controls className="w-full" />
                        <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">Current: {formatTime(currentTimeSec)} / {formatTime(durationSec)}</div>
                    </div>
                    <a href={audioUrl} download className="px-3 py-2 border rounded text-sm">Download</a>
                </div>
            )}
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
                <button onClick={() => setTab('memorize')} className={`px-3 py-2 rounded ${tab==='memorize' ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Memorize</button>
                <button onClick={() => setTab('tafsir')} className={`px-3 py-2 rounded ${tab==='tafsir' ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Tafsir</button>
            </div>

            {tab === 'memorize' && (
                <div className="mb-4 p-3 rounded bg-yellow-50 text-yellow-800 border border-yellow-200">
                    Transliteration is a learning aid. It’s better to learn Arabic script for accuracy.
                </div>
            )}

            {/* Controls */}
            <div className="flex flex-wrap items-end gap-3 mb-6">
                <div>
                    <label className="block text-sm mb-1">Repeat from ayah</label>
                    <input type="number" min={1} value={repeatFrom} onChange={e => setRepeatFrom(Number(e.target.value))} className="border rounded px-2 py-1 w-28" />
                </div>
                <div>
                    <label className="block text-sm mb-1">Repeat to ayah</label>
                    <input type="number" min={1} value={repeatTo} onChange={e => setRepeatTo(Number(e.target.value))} className="border rounded px-2 py-1 w-28" />
                </div>
                <div>
                    <label className="block text-sm mb-1">Repeat count</label>
                    <input type="number" min={1} value={repeatCount} onChange={e => setRepeatCount(Number(e.target.value))} className="border rounded px-2 py-1 w-28" />
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={togglePlayPause} className="px-4 py-2 bg-emerald-600 text-white rounded cursor-pointer hover:opacity-90 flex items-center gap-2">
                        {isPlaying ? (
                            <>
                                <span className="inline-block w-2 h-4 bg-white"></span>
                                <span className="inline-block w-2 h-4 bg-white"></span>
                                <span>Pause</span>
                            </>
                        ) : (
                            <>
                                <span className="inline-block">▶</span>
                                <span>Play</span>
                            </>
                        )}
                    </button>
                    <button onClick={playFromRange} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded cursor-pointer hover:opacity-90">Restart</button>
                    <button onClick={stopPlayback} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded cursor-pointer hover:opacity-90">Stop</button>
                </div>
            </div>

            {/* Optional time-based range */}
            <div className="flex items-end gap-3 mb-8">
                <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={useTimeRange} onChange={e => setUseTimeRange(e.target.checked)} />
                    <span className="text-sm">Use time range (mm:ss)</span>
                </label>
                <div>
                    <label className="block text-sm mb-1">From</label>
                    <input value={timeStart} onChange={e => setTimeStart(e.target.value)} placeholder="0:00" className="border rounded px-2 py-1 w-28" />
                    <div className="flex gap-1 mt-1">
                        <button onClick={() => { const v = formatTime(Math.max(0, (timeStartSec ?? 0) - 5)); console.log('[SurahPage] From -5s →', v); setUseTimeRange(true); setTimeStart(v); if ((timeEndSec ?? 0) <= (parseTimeToSeconds(v) ?? 0)) setTimeEnd(formatTime((parseTimeToSeconds(v) ?? 0) + 5)); }} className="px-2 py-1 text-xs border rounded cursor-pointer">-5s</button>
                        <button onClick={() => { const v = formatTime((timeStartSec ?? 0) + 5); console.log('[SurahPage] From +5s →', v); setUseTimeRange(true); setTimeStart(v); }} className="px-2 py-1 text-xs border rounded cursor-pointer">+5s</button>
                        <button onClick={() => { const v = formatTime(currentTimeSec); console.log('[SurahPage] Set From = Current', currentTimeSec, '→', v); setUseTimeRange(true); setTimeStart(v); if ((timeEndSec ?? 0) <= (currentTimeSec)) setTimeEnd(formatTime(currentTimeSec + 5)); }} className="px-2 py-1 text-xs border rounded cursor-pointer">Set = Current</button>
                    </div>
                </div>
                <div>
                    <label className="block text-sm mb-1">To</label>
                    <input value={timeEnd} onChange={e => setTimeEnd(e.target.value)} placeholder="0:30" className="border rounded px-2 py-1 w-28" />
                    <div className="flex gap-1 mt-1">
                        <button onClick={() => { const v = formatTime(Math.max(0, (timeEndSec ?? 0) - 5)); console.log('[SurahPage] To -5s →', v); setUseTimeRange(true); setTimeEnd(v); }} className="px-2 py-1 text-xs border rounded cursor-pointer">-5s</button>
                        <button onClick={() => { const v = formatTime((timeEndSec ?? 0) + 5); console.log('[SurahPage] To +5s →', v); setUseTimeRange(true); setTimeEnd(v); }} className="px-2 py-1 text-xs border rounded cursor-pointer">+5s</button>
                        <button onClick={() => { const v = formatTime(currentTimeSec); console.log('[SurahPage] Set To = Current', currentTimeSec, '→', v); setUseTimeRange(true); setTimeEnd(v); }} className="px-2 py-1 text-xs border rounded cursor-pointer">Set = Current</button>
                    </div>
                </div>
            </div>

            {/* Verse list */}
            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="space-y-4">
                    {visibleVerses.map(v => (
                        <div key={v.ayah} ref={(node) => { verseRefs.current[v.ayah] = node; }} className={`p-4 rounded border ${activeAyah === v.ayah ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-400' : 'border-gray-200 dark:border-gray-700'}`}
                             onClick={() => handleSelectAyah(v.ayah)}>
                            <div className="text-sm text-gray-500 mb-2">Ayah {v.ayah}</div>
                            {tab === 'memorize' && (
                                <>
                                    <div className="text-2xl leading-loose mb-3" dir="rtl">{v.arabic}</div>
                                    <div className="text-lg text-gray-800 dark:text-gray-200 mb-2">{v.transliteration}</div>
                                    <div className="text-base text-gray-600 dark:text-gray-300">{v.translation || '—'}</div>
                                </>
                            )}
                            {tab === 'tafsir' && (
                                <div className="text-lg text-gray-500">Tafsir coming soon</div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}


