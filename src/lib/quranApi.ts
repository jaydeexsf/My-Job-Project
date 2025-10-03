const OAUTH_BASE = process.env.QURAN_API_BASE || "https://prelive-oauth2.quran.foundation";
const API_BASE = "https://apis-prelive.quran.foundation/content/api/v4";
const CLIENT_ID = process.env.QURAN_API_CLIENT_ID;
const CLIENT_SECRET = process.env.QURAN_API_CLIENT_SECRET;

// Token cache
let accessToken: string | null = null;
let tokenExpiry: number = 0;

type FetchOptions = {
	path: string;
	query?: Record<string, string | number | boolean | undefined>;
	init?: RequestInit;
};

interface TokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	scope: string;
}

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

// Get OAuth2 access token
async function getAccessToken(): Promise<string | null> {
	if (!CLIENT_ID || !CLIENT_SECRET) {
		console.warn('Quran API credentials not configured');
		return null;
	}

	// Return cached token if still valid
	if (accessToken && Date.now() < tokenExpiry) {
		return accessToken;
	}

	try {
		const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
		
		const response = await fetch(`${OAUTH_BASE}/oauth2/token`, {
			method: 'POST',
			headers: {
				'Authorization': `Basic ${auth}`,
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: 'grant_type=client_credentials&scope=content'
		});

		if (!response.ok) {
			throw new Error(`OAuth error ${response.status}`);
		}

		const data = await response.json();
		accessToken = data.access_token;
		tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min early
		
		return accessToken;
	} catch (error) {
		console.warn('Failed to get access token:', error);
		return null;
	}
}

export async function quranApiFetch<T>({ path, query, init }: FetchOptions): Promise<T> {
	const qs = query
		? "?" + new URLSearchParams(Object.entries(query).reduce((acc, [k, v]) => {
			if (v === undefined) return acc;
			acc[k] = String(v);
			return acc;
		}, {} as Record<string, string>)).toString()
		: "";

	try {
		const token = await getAccessToken();
		if (!token) {
			throw new Error('No access token available');
		}

		const res = await fetch(`${API_BASE}${path}${qs}`, {
			...init,
			headers: {
				"Content-Type": "application/json",
				"x-auth-token": token,
				"x-client-id": CLIENT_ID!,
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
	
	if (path.includes('/chapters')) {
		return {
			chapters: Object.entries(fallbackQuranData.surahs).map(([id, surah]) => ({
				id: parseInt(id),
				name_simple: surah.name,
				name_arabic: surah.name,
				verses_count: surah.numberOfAyahs,
				translated_name: { name: surah.englishName }
			}))
		};
	}
	
	if (path.includes('/chapters/')) {
		const chapterMatch = path.match(/\/chapters\/(\d+)/);
		if (chapterMatch) {
			const surahNum = parseInt(chapterMatch[1]);
			const surah = fallbackQuranData.surahs[surahNum as keyof typeof fallbackQuranData.surahs];
			if (surah) {
				return {
					chapter: {
						id: surahNum,
						name_simple: surah.name,
						name_arabic: surah.name,
						verses_count: surah.numberOfAyahs,
						translated_name: { name: surah.englishName }
					}
				};
			}
		}
	}
	
	if (path.includes('/audio')) {
		return {
			audioUrl: "/audio/sample-recitation.mp3",
			reciter: "Sample Reciter"
		};
	}
	
	return { message: "Fallback data - API not available" };
}

// Updated API helpers for Quran Foundation API v4
export async function searchAyat(query: string) {
	return quranApiFetch<any>({ path: "/search", query: { q: query } });
}

export async function getAllChapters() {
	return quranApiFetch<any>({ path: "/chapters" });
}

export async function getSurah(surah: number) {
	const response = await quranApiFetch<any>({ path: `/chapters/${surah}` });
	// Transform to match old format
	if (response.chapter) {
		return {
			number: response.chapter.id,
			name: response.chapter.name_simple,
			englishName: response.chapter.translated_name?.name || response.chapter.name_simple,
			numberOfAyahs: response.chapter.verses_count,
			revelationType: response.chapter.revelation_place || 'Unknown'
		};
	}
	return response;
}

export async function getAyah(surah: number, ayah: number) {
	return quranApiFetch<any>({ path: `/chapters/${surah}/verses/${ayah}` });
}

export async function getAudioForAyah(surah: number, ayah: number, reciter?: string) {
	return quranApiFetch<any>({ path: `/chapters/${surah}/verses/${ayah}/audio`, query: { reciter } });
}


