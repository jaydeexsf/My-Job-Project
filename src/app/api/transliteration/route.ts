import { NextRequest, NextResponse } from 'next/server';
import { getVersesRangeByChapter } from '@/lib/quranApi';
import { transliterateArabicToLatin } from '@/lib/transliteration';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const surahStr = searchParams.get('surah');
        const fromStr = searchParams.get('from');
        const toStr = searchParams.get('to');
        const useCommunity = searchParams.get('community') === '1';
        const useFurqan = searchParams.get('furqan') !== '0'; // default to true

        if (!surahStr) {
            return NextResponse.json({ error: 'Missing surah parameter' }, { status: 400 });
        }

        const surah = parseInt(surahStr, 10);
        if (Number.isNaN(surah) || surah < 1 || surah > 114) {
            return NextResponse.json({ error: 'Invalid surah number' }, { status: 400 });
        }

        const fromAyah = fromStr ? parseInt(fromStr, 10) : 1;
        const toAyah = toStr ? parseInt(toStr, 10) : Number.MAX_SAFE_INTEGER;

        if (Number.isNaN(fromAyah) || Number.isNaN(toAyah) || fromAyah <= 0 || toAyah < fromAyah) {
            return NextResponse.json({ error: 'Invalid ayah range' }, { status: 400 });
        }

        // First, try Furqan API for this surah's transliteration if enabled
        let furqanItems: Array<{ ayah: number; arabic: string; transliteration: string; translation?: string }> | null = null;
        if (useFurqan) {
            try {
                // Preferred accurate endpoint per docs: /api/{surah}?fields=transliteration
                const preferred = await fetch(`https://furqan-api.vercel.app/api/${surah}?fields=transliteration`, { cache: 'no-store' });
                if (preferred.ok) {
                    const j = await preferred.json();
                    // Shape example:
                    // { id, surah_name, versers: { "1": { transliteration: string }, ... } }
                    const versesObj = j?.verses || j?.data?.verses || null;
                    if (versesObj && typeof versesObj === 'object') {
                        const mappedFromObj: Array<{ ayah: number; arabic: string; transliteration: string; translation?: string }> = Object
                            .entries(versesObj)
                            .map(([k, v]: [string, any]) => ({
                                ayah: Number(k),
                                arabic: '',
                                transliteration: String(v?.transliteration || v?.latin || v?.trans || '').trim(),
                                translation: undefined
                            }))
                            .filter(v => Number.isFinite(v.ayah) && v.ayah >= fromAyah && v.ayah <= toAyah)
                            .sort((a, b) => a.ayah - b.ayah);
                        if (mappedFromObj.length > 0) {
                            furqanItems = mappedFromObj;
                        }
                    }
                }

                // If preferred not available, try a few other known Furqan shapes
                if (!furqanItems) {
                    const endpoints = [
                        `https://furqan-api.vercel.app/chapters/${surah}`,
                        `https://furqan-api.vercel.app/quran/${surah}`
                    ];
                    let furqanData: any | null = null;
                    for (const url of endpoints) {
                        try {
                            const resp = await fetch(url, { cache: 'no-store' });
                            if (resp.ok) {
                                furqanData = await resp.json();
                                break;
                            }
                        } catch {}
                    }

                    if (furqanData) {
                        const rawVerses: any[] = (furqanData?.verses
                            || furqanData?.data?.verses
                            || furqanData?.chapter?.verses
                            || furqanData?.["verses"]
                            || []);

                        const mapped = rawVerses.map((v: any) => {
                            const ayahNum = Number(v?.number || v?.id || v?.ayah || v?.verse);
                            const arabic = String(v?.arabic || v?.text || v?.ar || v?.arab || '').trim();
                            const transliteration = String(v?.transliteration || v?.latin || v?.trans || '').trim();
                            const translation = (v?.translation ? String(v.translation) : '').trim();
                            return { ayah: ayahNum, arabic, transliteration, translation };
                        }).filter((v: any) => Number.isFinite(v.ayah) && v.ayah >= fromAyah && v.ayah <= toAyah);

                        if (mapped.length > 0) {
                            furqanItems = mapped;
                        }
                    }
                }
            } catch {
                // ignore and fallback to local
            }
        }

        // Always use Quran.com for Arabic + translation as the base
        const verses = await getVersesRangeByChapter(surah, fromAyah, toAyah);
        const stripTrailingVowel = (s: string) => {
            if (!s) return s;
            const m = /[aeiouyAEIOUY]$/.exec(s.trim());
            if (m) return s.trim().slice(0, -1);
            return s;
        };

        let items: Array<{ surah: number; ayah: number; arabic: string; transliteration: string; translation?: string }> = verses.map((v: any) => {
            const arabic: string = v?.text_uthmani || v?.text_indopak || v?.text_simple || '';
            const rawTranslation: string = (v?.translations?.[0]?.text) || '';
            const translationText: string = rawTranslation
                .replace(/<sup[^>]*>[^<]*<\/sup>/gi, '')
                .replace(/<[^>]+>/g, '')
                .trim();
            return {
                surah,
                ayah: v?.verse_number,
                arabic,
                transliteration: stripTrailingVowel(transliterateArabicToLatin(arabic)),
                translation: translationText
            };
        });

        // If Furqan transliterations are available, overlay them by ayah number
        if (furqanItems && furqanItems.length > 0) {
            const furqanByAyah: Record<number, string> = {};
            for (const it of furqanItems) {
                if (Number.isFinite(it.ayah) && it.transliteration) {
                    furqanByAyah[it.ayah] = it.transliteration;
                }
            }
            items = items.map((it) => {
                const chosen = furqanByAyah[it.ayah] ?? it.transliteration;
                return {
                    ...it,
                    transliteration: stripTrailingVowel(chosen)
                };
            });
        }

        if (useCommunity && (!furqanItems || furqanItems.length === 0)) {
            try {
                // Example: quran-json-api returns full surahs; we only need the ayah range.
                const resp = await fetch(`https://quran-json-api.vercel.app/surah/${surah}`);
                if (resp.ok) {
                    const data = await resp.json();
                    const byAyah: Record<number, string> = {};
                    for (const v of (data?.verses || [])) {
                        const n = Number(v?.id) || Number(v?.ayah) || Number(v?.verse) || undefined;
                        if (n) {
                            byAyah[n] = v?.transliteration || v?.latin || v?.trans || '';
                        }
                    }
                    items = items.map((it: any) => ({
                        ...it,
                        transliteration: byAyah[it.ayah] || it.transliteration
                    }));
                }
            } catch {
                // fallback silently to local
            }
        }

        return NextResponse.json({
            surah,
            from: fromAyah,
            to: toAyah,
            count: items.length,
            items
        });
    } catch (error) {
        console.error('Error in transliteration endpoint:', error);
        return NextResponse.json({ error: 'Failed to generate transliteration' }, { status: 500 });
    }
}



