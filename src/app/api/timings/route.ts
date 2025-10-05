import { NextRequest, NextResponse } from 'next/server';

const API_BASE = "https://api.quran.com/api/v4";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const surahStr = searchParams.get('surah');
        const recitationId = searchParams.get('reciter') || '1'; // default reciter id

        if (!surahStr) return NextResponse.json({ error: 'Missing surah' }, { status: 400 });
        const surah = parseInt(surahStr, 10);
        if (Number.isNaN(surah) || surah < 1 || surah > 114) {
            return NextResponse.json({ error: 'Invalid surah' }, { status: 400 });
        }

        // Quran.com v4: recitations/:id/by_chapter/:chapter_id?segments=true
        const url = `${API_BASE}/recitations/${recitationId}/by_chapter/${surah}?segments=true`;
        console.log('[timings] Fetching:', url);
        const res = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store'
        });
        if (!res.ok) {
            const text = await res.text();
            console.error('[timings] Upstream error:', res.status, text);
            return NextResponse.json({ error: `Failed to fetch timings: ${res.status} ${text}` }, { status: 502 });
        }
        const data = await res.json();

        // Expected shape: { audio_files: [{ segments: [[startMs, endMs, verseKey], ...], audio_url: string }] }
        const file = data?.audio_files?.[0] || data?.audio_file;
        const segments: any[] = file?.segments || [];
        let audioUrl: string | undefined = file?.audio_url;

        // Fallback: fetch chapter audio URL if missing
        if (!audioUrl) {
            const fallbackUrl = `${API_BASE}/chapter_recitations/${recitationId}/${surah}`;
            console.log('[timings] Fallback fetching chapter audio:', fallbackUrl);
            const fRes = await fetch(fallbackUrl, { headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });
            if (fRes.ok) {
                const fData = await fRes.json();
                audioUrl = fData?.audio_file?.audio_url;
                console.log('[timings] Fallback audioUrl:', audioUrl);
            } else {
                const fText = await fRes.text();
                console.warn('[timings] Fallback audio fetch failed:', fRes.status, fText);
            }
        }

        const items = segments.map((seg: any) => {
            // seg can be [startMs, endMs, verseKey] or object {start, end, verse_key}
            if (Array.isArray(seg)) {
                const [startMs, endMs, verseKey] = seg;
                const ayah = Number(String(verseKey).split(":")[1]);
                return { ayah, start: (startMs || 0) / 1000, end: (endMs || 0) / 1000 };
            }
            const verseKey = seg.verse_key;
            const ayah = Number(String(verseKey).split(":")[1]);
            return { ayah, start: (seg.start || 0) / 1000, end: (seg.end || 0) / 1000 };
        }).filter((x: any) => Number.isFinite(x.ayah));

        return NextResponse.json({ surah, reciter: recitationId, audioUrl, segments: items });
    } catch (e) {
        console.error('timings error', e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}


