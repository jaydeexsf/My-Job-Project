import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q') || '';
        if (!q.trim()) {
            return NextResponse.json({ error: 'Missing q parameter' }, { status: 400 });
        }
        const url = `https://furqan-api.vercel.app//api/search?q=${encodeURIComponent(q)}`;
        const resp = await fetch(url, { cache: 'no-store' });
        if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            return NextResponse.json({ error: `Furqan search error ${resp.status}`, detail: text }, { status: 502 });
        }
        const json = await resp.json();
        return NextResponse.json(json);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch Furqan search' }, { status: 500 });
    }
}



