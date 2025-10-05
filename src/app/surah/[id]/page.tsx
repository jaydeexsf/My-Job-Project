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

    // Basic audio element for chapter playback (placeholder to sync highlighting)
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [segments, setSegments] = useState<{ ayah: number; start: number; end: number }[]>([]);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const verseRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const segmentByAyah = useMemo(() => {
        const map: Record<number, { start: number; end: number }> = {};
        for (const s of segments) map[s.ayah] = { start: s.start, end: s.end };
        return map;
    }, [segments]);

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
        return () => controller.abort();
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

    const startPlayback = () => {
        console.log('[SurahPage] Start clicked. audioUrl:', audioUrl);
        if (!audioUrl) {
            console.warn('[SurahPage] No audioUrl available.');
            return;
        }
        if (!audioRef.current) {
            audioRef.current = new Audio(audioUrl);
            audioRef.current.addEventListener('play', () => console.log('[SurahPage] audio play'));
            audioRef.current.addEventListener('pause', () => console.log('[SurahPage] audio pause'));
            audioRef.current.addEventListener('error', (e) => console.error('[SurahPage] audio error', e));
            audioRef.current.addEventListener('canplay', () => console.log('[SurahPage] audio canplay'));
        }
        const audio = audioRef.current;
        // Seek to start of repeatFrom if segments known, else 0
        const segFrom = segmentByAyah[repeatFrom];
        const seekTo = segFrom ? segFrom.start + 0.01 : 0;
        console.log('[SurahPage] Seeking to', seekTo, 'for ayah', repeatFrom);
        audio.currentTime = seekTo;
        audio.play().then(() => console.log('[SurahPage] audio play() resolved')).catch((err) => console.error('[SurahPage] play() failed', err));
        if (segments.length) setActiveAyah(repeatFrom);
    };

    // Sync highlight to audio time using segments and handle repeat range
    useEffect(() => {
        if (!audioUrl || !segments.length) return;
        if (!audioRef.current) {
            audioRef.current = new Audio(audioUrl);
        }
        const audio = audioRef.current;
        const onTime = () => {
            const t = audio.currentTime;
            // find segment containing t
            const seg = segments.find(s => t >= s.start && t <= s.end);
            if (seg && seg.ayah !== activeAyah) setActiveAyah(seg.ayah);

            // Repeat logic: if beyond end of repeatTo, loop back to repeatFrom until count exhausted
            const endSeg = segmentByAyah[repeatTo];
            const startSeg = segmentByAyah[repeatFrom];
            if (startSeg && endSeg) {
                if (t > endSeg.end - 0.05) {
                    // advance repeat counter or loop
                    if (repeatCounterRef.current < repeatCount - 1) {
                        repeatCounterRef.current += 1;
                        const seek = startSeg.start + 0.01;
                        console.log('[SurahPage] Looping repeat', repeatCounterRef.current+1, 'seeking', seek);
                        audio.currentTime = seek;
                        setActiveAyah(repeatFrom);
                    }
                } else if (t < startSeg.start) {
                    // guard: if user scrubs earlier, snap to start
                    audio.currentTime = startSeg.start + 0.01;
                }
            }
        };
        audio.addEventListener('timeupdate', onTime);
        // autoplay for convenience
        audio.play().catch(() => {});
        return () => {
            audio.removeEventListener('timeupdate', onTime);
            audio.pause();
        };
    }, [audioUrl, segments, repeatFrom, repeatTo, repeatCount, segmentByAyah]);

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
                <button onClick={startPlayback} className="px-4 py-2 bg-emerald-600 text-white rounded cursor-pointer hover:opacity-90">Restart</button>
                {audioUrl && (
                    <button onClick={() => audioRef.current?.pause()} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded cursor-pointer hover:opacity-90 flex items-center gap-2">
                        <span className="inline-block w-2 h-4 bg-gray-900 dark:bg-white"></span>
                        <span className="inline-block w-2 h-4 bg-gray-900 dark:bg-white"></span>
                        <span>Pause</span>
                    </button>
                )}
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


