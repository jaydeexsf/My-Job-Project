// Use the public Quran.com API (no authentication required)
const API_BASE = "https://api.quran.com/api/v4";

type FetchOptions = {
	path: string;
	query?: Record<string, string | number | boolean | undefined>;
	init?: RequestInit;
};

// No authentication needed for public Quran.com API

export async function quranApiFetch<T>({ path, query, init }: FetchOptions): Promise<T> {
	const qs = query
		? "?" + new URLSearchParams(Object.entries(query).reduce((acc, [k, v]) => {
			if (v === undefined) return acc;
			acc[k] = String(v);
			return acc;
		}, {} as Record<string, string>)).toString()
		: "";

	try {
		const res = await fetch(`${API_BASE}${path}${qs}`, {
			...init,
			headers: {
				"Content-Type": "application/json",
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
		console.warn("Quran API fetch failed:", error);
		throw error; // Don't use fallback data, let the error propagate
	}
}

// Updated API helpers for Quran.com API v4

export async function getAllChapters() {
	return quranApiFetch<any>({ path: "/chapters" });
}

export async function getSurah(surah: number) {
	const response = await quranApiFetch<any>({ path: `/chapters/${surah}` });
	return response.chapter;
}

export async function getAyah(surah: number, ayah: number) {
	const response = await quranApiFetch<any>({ 
		path: `/verses/by_chapter/${surah}`, 
		query: { 
			page: Math.ceil(ayah / 10),
			per_page: 10,
			translations: '20' // English translation
		} 
	});
	
	// Find the specific ayah
	const verse = response.verses?.find((v: any) => v.verse_number === ayah);
	return verse;
}

export async function getAudioForAyah(surah: number, ayah: number, reciter = 'Abdul_Basit_Murattal') {
	try {
		// Use Quran.com API to get the actual audio URL
		const response = await quranApiFetch<any>({ 
			path: `/chapter_recitations/1/${surah}` // reciter 1 = Abdul Basit
		});
		
		if (response.audio_file?.audio_url) {
			console.log('Generated audio URL from API:', response.audio_file.audio_url);
			return {
				audioUrl: response.audio_file.audio_url,
				reciter: reciter
			};
		}
		
		// Fallback to a known working format
		const fallbackUrl = `https://download.quranicaudio.com/qdc/abdul_baset/mujawwad/${surah}.mp3`;
		console.log('Using fallback audio URL:', fallbackUrl);
		
		return {
			audioUrl: fallbackUrl,
			reciter: reciter
		};
		
	} catch (error) {
		console.warn('Audio not available for this verse:', error);
		// Return a fallback URL that should work
		const fallbackUrl = `https://download.quranicaudio.com/qdc/abdul_baset/mujawwad/${surah}.mp3`;
		return {
			audioUrl: fallbackUrl,
			reciter: 'Abdul_Basit_Murattal'
		};
	}
}

export async function searchQuran(query: string, page = 1, perPage = 10) {
	try {
		const response = await quranApiFetch<any>({
			path: '/search',
			query: {
				q: query,
				size: perPage,
				page: page,
				language: 'en'
			}
		});
		return response;
	} catch (error) {
		console.warn('Search failed:', error);
		throw error;
	}
}
