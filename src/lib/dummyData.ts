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

// Sample bookmarks data
export const dummyBookmarks: DummyBookmark[] = [
	{
		_id: "bookmark1",
		userId: "user1",
		surah: 1,
		ayah: 1,
		note: "Al-Fatiha - The Opening",
		createdAt: new Date("2024-01-15T10:00:00Z"),
		updatedAt: new Date("2024-01-15T10:00:00Z"),
	},
	{
		_id: "bookmark2",
		userId: "user1",
		surah: 2,
		ayah: 255,
		note: "Ayat al-Kursi - The Throne Verse",
		createdAt: new Date("2024-01-16T14:30:00Z"),
		updatedAt: new Date("2024-01-16T14:30:00Z"),
	},
	{
		_id: "bookmark3",
		userId: "user1",
		surah: 112,
		ayah: 1,
		note: "Al-Ikhlas - The Sincerity",
		createdAt: new Date("2024-01-17T09:15:00Z"),
		updatedAt: new Date("2024-01-17T09:15:00Z"),
	},
	{
		_id: "bookmark4",
		userId: "user1",
		surah: 36,
		ayah: 1,
		note: "Ya-Sin - The Heart of the Quran",
		createdAt: new Date("2024-01-18T16:45:00Z"),
		updatedAt: new Date("2024-01-18T16:45:00Z"),
	},
];

// Sample recitation history data
export const dummyRecitations: DummyRecitation[] = [
	{
		_id: "recitation1",
		userId: "user1",
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
		userId: "user1",
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
		userId: "user1",
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
		userId: "user1",
		surah: 2,
		ayah: 255,
		accuracy: 85,
		transcript: "Allahu la ilaha illa huwa al hayyul qayyum",
		audioUrl: "/audio/recitation4.mp3",
		createdAt: new Date("2024-01-21T15:20:00Z"),
		updatedAt: new Date("2024-01-21T15:20:00Z"),
	},
];

// In-memory storage for dummy mode
let memoryBookmarks = [...dummyBookmarks];
let memoryRecitations = [...dummyRecitations];

export function getDummyBookmarks(userId?: string) {
	return userId 
		? memoryBookmarks.filter(b => b.userId === userId)
		: memoryBookmarks;
}

export function addDummyBookmark(bookmark: Omit<DummyBookmark, '_id' | 'createdAt' | 'updatedAt'>) {
	const newBookmark: DummyBookmark = {
		...bookmark,
		_id: `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
		createdAt: new Date(),
		updatedAt: new Date(),
	};
	
	// Check if bookmark already exists and update it
	const existingIndex = memoryBookmarks.findIndex(
		b => b.userId === bookmark.userId && b.surah === bookmark.surah && b.ayah === bookmark.ayah
	);
	
	if (existingIndex >= 0) {
		memoryBookmarks[existingIndex] = { ...memoryBookmarks[existingIndex], ...bookmark, updatedAt: new Date() };
		return memoryBookmarks[existingIndex];
	} else {
		memoryBookmarks.push(newBookmark);
		return newBookmark;
	}
}

export function deleteDummyBookmark(userId?: string, surah?: number, ayah?: number) {
	const initialLength = memoryBookmarks.length;
	memoryBookmarks = memoryBookmarks.filter(
		b => !(b.userId === userId && b.surah === surah && b.ayah === ayah)
	);
	return memoryBookmarks.length < initialLength;
}

export function getDummyRecitations(userId?: string) {
	const recitations = userId 
		? memoryRecitations.filter(r => r.userId === userId)
		: memoryRecitations;
	return recitations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 100);
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

