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

        const verses = await getVersesRangeByChapter(surah, fromAyah, toAyah);

        // Try community transliteration API if requested; else local rules
        let items = verses.map((v: any) => {
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
                transliteration: transliterateArabicToLatin(arabic),
                translation: translationText
            };
        });

        if (useCommunity) {
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
                    items = items.map(it => ({
                        ...it,
                        transliteration: byAyah[it.ayah] || it.transliteration
                    }));
                }
            } catch (e) {
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



