import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const surahStr = searchParams.get('surah');

        if (!surahStr) {
            return NextResponse.json({ error: 'Missing surah parameter' }, { status: 400 });
        }

        const surah = parseInt(surahStr, 10);
        if (Number.isNaN(surah) || surah < 1 || surah > 114) {
            return NextResponse.json({ error: 'Invalid surah number' }, { status: 400 });
        }

        const url = `https://furqan-api.vercel.app/api/${surah}?fields=transliteration`;
        const resp = await fetch(url, { cache: 'no-store' });
        const contentType = resp.headers.get('content-type') || '';
        if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            return NextResponse.json({ error: `Furqan error ${resp.status}`, detail: text }, { status: 502 });
        }

        if (contentType.includes('application/json')) {
            const data = await resp.json();
            return NextResponse.json(data, { status: 200 });
        }

        // Fallback: try to parse as text, return as JSON wrapper
        const text = await resp.text();
        return NextResponse.json({ raw: text }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch Furqan transliteration' }, { status: 500 });
    }
}


