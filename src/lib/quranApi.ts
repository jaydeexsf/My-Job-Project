const DEFAULT_BASE = process.env.QURAN_API_BASE || "https://api.quran.foundation";
const API_KEY = process.env.QURAN_API_KEY;

type FetchOptions = {
	path: string;
	query?: Record<string, string | number | boolean | undefined>;
	init?: RequestInit;
};

// Fallback Quran data for when API is not available
const fallbackQuranData = {
	surahs: {
		1: { name: "Al-Fatiha", englishName: "The Opening", numberOfAyahs: 7 },
		2: { name: "Al-Baqarah", englishName: "The Cow", numberOfAyahs: 286 },
		36: { name: "Ya-Sin", englishName: "Ya Sin", numberOfAyahs: 83 },
		112: { name: "Al-Ikhlas", englishName: "The Sincerity", numberOfAyahs: 4 },
	},
	ayahs: {
		"1:1": { text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", translation: "In the name of Allah, the Entirely Merciful, the Especially Merciful." },
		"1:2": { text: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", translation: "All praise is due to Allah, Lord of the worlds." },
		"2:255": { text: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ", translation: "Allah - there is no deity except Him, the Ever-Living, the Sustainer of existence." },
		"112:1": { text: "قُلْ هُوَ اللَّهُ أَحَدٌ", translation: "Say, He is Allah, [who is] One," },
		"36:1": { text: "يس", translation: "Ya, Sin." },
	}
};

export async function quranApiFetch<T>({ path, query, init }: FetchOptions): Promise<T> {
	const qs = query
		? "?" + new URLSearchParams(Object.entries(query).reduce((acc, [k, v]) => {
			if (v === undefined) return acc;
			acc[k] = String(v);
			return acc;
		}, {} as Record<string, string>)).toString()
		: "";

	try {
		const res = await fetch(`${DEFAULT_BASE}${path}${qs}`, {
			...init,
			headers: {
				"Content-Type": "application/json",
				...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
				...(init?.headers || {}),
			},
		cache: "force-cache",
		next: { revalidate: 3600 }, // Cache for 1 hour for better performance
		});
		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Quran API error ${res.status}: ${text}`);
		}
		return (await res.json()) as T;
	} catch (error) {
		console.warn("Quran API fetch failed, using fallback data:", error);
		// Return fallback data based on the path
		return getFallbackData(path, query) as T;
	}
}

function getFallbackData(path: string, query?: Record<string, string | number | boolean | undefined>) {
	if (path.includes('/search')) {
		return {
			results: [
				{ surah: 1, ayah: 1, text: fallbackQuranData.ayahs["1:1"].text, translation: fallbackQuranData.ayahs["1:1"].translation },
				{ surah: 2, ayah: 255, text: fallbackQuranData.ayahs["2:255"].text, translation: fallbackQuranData.ayahs["2:255"].translation },
			]
		};
	}
	
	if (path.includes('/surah/')) {
		const surahMatch = path.match(/\/surah\/(\d+)/);
		if (surahMatch) {
			const surahNum = parseInt(surahMatch[1]);
			const surah = fallbackQuranData.surahs[surahNum as keyof typeof fallbackQuranData.surahs];
			if (surah) {
				return {
					number: surahNum,
					name: surah.name,
					englishName: surah.englishName,
					numberOfAyahs: surah.numberOfAyahs,
					ayahs: Object.entries(fallbackQuranData.ayahs)
						.filter(([key]) => key.startsWith(`${surahNum}:`))
						.map(([key, value]) => ({
							number: parseInt(key.split(':')[1]),
							text: value.text,
							translation: value.translation
						}))
				};
			}
		}
	}
	
	if (path.includes('/audio/ayah')) {
		return {
			audioUrl: "/audio/sample-recitation.mp3",
			reciter: "Sample Reciter"
		};
	}
	
	return { message: "Fallback data - API not available" };
}

// Example helpers based on Quran Foundation API structure
export async function searchAyat(query: string) {
	return quranApiFetch<any>({ path: "/v1/search", query: { q: query } });
}

export async function getSurah(surah: number) {
	return quranApiFetch<any>({ path: `/v1/surah/${surah}` });
}

export async function getAyah(surah: number, ayah: number) {
	return quranApiFetch<any>({ path: `/v1/surah/${surah}/ayah/${ayah}` });
}

export async function getAudioForAyah(surah: number, ayah: number, reciter?: string) {
	return quranApiFetch<any>({ path: `/v1/audio/ayah`, query: { surah, ayah, reciter } });
}


