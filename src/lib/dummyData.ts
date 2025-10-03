// Dummy data for when MongoDB is not available
export interface DummyBookmark {
	_id: string;
	userId?: string;
	surah: number;
	ayah: number;
	note?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface DummyRecitation {
	_id: string;
	userId?: string;
	surah: number;
	ayah: number;
	accuracy?: number;
	transcript?: string;
	audioUrl?: string;
	createdAt: Date;
	updatedAt: Date;
}

// Sample bookmarks data from multiple users - now globally accessible
export const dummyBookmarks: DummyBookmark[] = [
	{
		_id: "bookmark1",
		userId: "Ahmad",
		surah: 1,
		ayah: 1,
		note: "Al-Fatiha - The Opening - Beautiful recitation",
		createdAt: new Date("2024-01-15T10:00:00Z"),
		updatedAt: new Date("2024-01-15T10:00:00Z"),
	},
	{
		_id: "bookmark2",
		userId: "Fatima",
		surah: 2,
		ayah: 255,
		note: "Ayat al-Kursi - The Throne Verse - Protection prayer",
		createdAt: new Date("2024-01-16T14:30:00Z"),
		updatedAt: new Date("2024-01-16T14:30:00Z"),
	},
	{
		_id: "bookmark3",
		userId: "Omar",
		surah: 112,
		ayah: 1,
		note: "Al-Ikhlas - The Sincerity - Equals 1/3 of Quran",
		createdAt: new Date("2024-01-17T09:15:00Z"),
		updatedAt: new Date("2024-01-17T09:15:00Z"),
	},
	{
		_id: "bookmark4",
		userId: "Aisha",
		surah: 36,
		ayah: 1,
		note: "Ya-Sin - The Heart of the Quran - Friday reading",
		createdAt: new Date("2024-01-18T16:45:00Z"),
		updatedAt: new Date("2024-01-18T16:45:00Z"),
	},
	{
		_id: "bookmark5",
		userId: "Hassan",
		surah: 55,
		ayah: 13,
		note: "Ar-Rahman - Which favors will you deny?",
		createdAt: new Date("2024-01-19T11:20:00Z"),
		updatedAt: new Date("2024-01-19T11:20:00Z"),
	},
	{
		_id: "bookmark6",
		userId: "Khadija",
		surah: 67,
		ayah: 1,
		note: "Al-Mulk - The Sovereignty - Night reading",
		createdAt: new Date("2024-01-20T20:30:00Z"),
		updatedAt: new Date("2024-01-20T20:30:00Z"),
	},
];

// Sample recitation history data from multiple users - now globally accessible
export const dummyRecitations: DummyRecitation[] = [
	{
		_id: "recitation1",
		userId: "Ahmad",
		surah: 1,
		ayah: 1,
		accuracy: 95,
		transcript: "Bismillahir rahmanir raheem",
		audioUrl: "/audio/recitation1.mp3",
		createdAt: new Date("2024-01-20T08:00:00Z"),
		updatedAt: new Date("2024-01-20T08:00:00Z"),
	},
	{
		_id: "recitation2",
		userId: "Fatima",
		surah: 1,
		ayah: 2,
		accuracy: 88,
		transcript: "Alhamdulillahi rabbil alameen",
		audioUrl: "/audio/recitation2.mp3",
		createdAt: new Date("2024-01-20T08:05:00Z"),
		updatedAt: new Date("2024-01-20T08:05:00Z"),
	},
	{
		_id: "recitation3",
		userId: "Omar",
		surah: 112,
		ayah: 1,
		accuracy: 92,
		transcript: "Qul huwa Allahu ahad",
		audioUrl: "/audio/recitation3.mp3",
		createdAt: new Date("2024-01-20T10:30:00Z"),
		updatedAt: new Date("2024-01-20T10:30:00Z"),
	},
	{
		_id: "recitation4",
		userId: "Aisha",
		surah: 2,
		ayah: 255,
		accuracy: 85,
		transcript: "Allahu la ilaha illa huwa al hayyul qayyum",
		audioUrl: "/audio/recitation4.mp3",
		createdAt: new Date("2024-01-21T15:20:00Z"),
		updatedAt: new Date("2024-01-21T15:20:00Z"),
	},
	{
		_id: "recitation5",
		userId: "Hassan",
		surah: 36,
		ayah: 1,
		accuracy: 90,
		transcript: "Ya Sin",
		audioUrl: "/audio/recitation5.mp3",
		createdAt: new Date("2024-01-22T09:15:00Z"),
		updatedAt: new Date("2024-01-22T09:15:00Z"),
	},
	{
		_id: "recitation6",
		userId: "Khadija",
		surah: 67,
		ayah: 1,
		accuracy: 87,
		transcript: "Tabarakalladhi biyadihil mulk",
		audioUrl: "/audio/recitation6.mp3",
		createdAt: new Date("2024-01-22T19:45:00Z"),
		updatedAt: new Date("2024-01-22T19:45:00Z"),
	},
];

// In-memory storage for dummy mode
let memoryBookmarks = [...dummyBookmarks];
let memoryRecitations = [...dummyRecitations];

export function getDummyBookmarks(userId?: string) {
	// Always return all bookmarks for global access
	return memoryBookmarks;
}

export function addDummyBookmark(bookmark: Omit<DummyBookmark, '_id' | 'createdAt' | 'updatedAt'>) {
	const newBookmark: DummyBookmark = {
		...bookmark,
		_id: `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
		createdAt: new Date(),
		updatedAt: new Date(),
	};
	
	// For global access, just add the bookmark without checking for duplicates
	// This allows multiple users to bookmark the same verse
	memoryBookmarks.push(newBookmark);
	return newBookmark;
}

export function deleteDummyBookmark(userId?: string, surah?: number, ayah?: number) {
	const initialLength = memoryBookmarks.length;
	// For global access, delete by surah/ayah regardless of user
	memoryBookmarks = memoryBookmarks.filter(
		b => !(b.surah === surah && b.ayah === ayah)
	);
	return memoryBookmarks.length < initialLength;
}

export function getDummyRecitations(userId?: string) {
	// Always return all recitations for global access
	return memoryRecitations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 100);
}

export function addDummyRecitation(recitation: Omit<DummyRecitation, '_id' | 'createdAt' | 'updatedAt'>) {
	const newRecitation: DummyRecitation = {
		...recitation,
		_id: `recitation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
		createdAt: new Date(),
		updatedAt: new Date(),
	};
	
	memoryRecitations.push(newRecitation);
	return newRecitation;
}

