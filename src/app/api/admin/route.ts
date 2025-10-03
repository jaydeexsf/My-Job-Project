import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getMongoUri } from '@/lib/db';
import { BookmarkModel, RecitationHistoryModel } from '@/lib/models';

// Sample data to populate database
const sampleBookmarks = [
	{
		userId: "Ahmad",
		surah: 1,
		ayah: 1,
		note: "Al-Fatiha - The Opening - Beautiful recitation",
		createdAt: new Date("2024-01-15T10:00:00Z"),
		updatedAt: new Date("2024-01-15T10:00:00Z"),
	},
	{
		userId: "Fatima",
		surah: 2,
		ayah: 255,
		note: "Ayat al-Kursi - The Throne Verse - Protection prayer",
		createdAt: new Date("2024-01-16T14:30:00Z"),
		updatedAt: new Date("2024-01-16T14:30:00Z"),
	},
	{
		userId: "Omar",
		surah: 112,
		ayah: 1,
		note: "Al-Ikhlas - The Sincerity - Equals 1/3 of Quran",
		createdAt: new Date("2024-01-17T09:15:00Z"),
		updatedAt: new Date("2024-01-17T09:15:00Z"),
	},
	{
		userId: "Aisha",
		surah: 36,
		ayah: 1,
		note: "Ya-Sin - The Heart of the Quran - Friday reading",
		createdAt: new Date("2024-01-18T16:45:00Z"),
		updatedAt: new Date("2024-01-18T16:45:00Z"),
	},
	{
		userId: "Hassan",
		surah: 55,
		ayah: 13,
		note: "Ar-Rahman - Which favors will you deny?",
		createdAt: new Date("2024-01-19T11:20:00Z"),
		updatedAt: new Date("2024-01-19T11:20:00Z"),
	},
	{
		userId: "Khadija",
		surah: 67,
		ayah: 1,
		note: "Al-Mulk - The Sovereignty - Night reading",
		createdAt: new Date("2024-01-20T20:30:00Z"),
		updatedAt: new Date("2024-01-20T20:30:00Z"),
	},
	{
		userId: "Ali",
		surah: 18,
		ayah: 10,
		note: "Al-Kahf - The Cave - Friday protection",
		createdAt: new Date("2024-01-21T14:15:00Z"),
		updatedAt: new Date("2024-01-21T14:15:00Z"),
	},
	{
		userId: "Zaynab",
		surah: 3,
		ayah: 26,
		note: "Al-Imran - You give honor to whom You will",
		createdAt: new Date("2024-01-22T08:30:00Z"),
		updatedAt: new Date("2024-01-22T08:30:00Z"),
	}
];

const sampleRecitations = [
	{
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
		userId: "Khadija",
		surah: 67,
		ayah: 1,
		accuracy: 87,
		transcript: "Tabarakalladhi biyadihil mulk",
		audioUrl: "/audio/recitation6.mp3",
		createdAt: new Date("2024-01-22T19:45:00Z"),
		updatedAt: new Date("2024-01-22T19:45:00Z"),
	},
	{
		userId: "Ali",
		surah: 18,
		ayah: 1,
		accuracy: 91,
		transcript: "Alhamdulillahilladhi anzala ala abdihi alkitab",
		audioUrl: "/audio/recitation7.mp3",
		createdAt: new Date("2024-01-23T11:00:00Z"),
		updatedAt: new Date("2024-01-23T11:00:00Z"),
	},
	{
		userId: "Zaynab",
		surah: 3,
		ayah: 26,
		accuracy: 89,
		transcript: "Qulillahumma malikal mulki",
		audioUrl: "/audio/recitation8.mp3",
		createdAt: new Date("2024-01-23T16:30:00Z"),
		updatedAt: new Date("2024-01-23T16:30:00Z"),
	}
];

export async function POST(request: NextRequest) {
	try {
		const { action } = await request.json();
		
		const conn = await connectToDatabase(getMongoUri());
		if (!conn) {
			return NextResponse.json({ 
				error: 'Database connection failed. Please ensure MongoDB is accessible.' 
			}, { status: 500 });
		}

		switch (action) {
			case 'populate':
				// Clear existing data and populate with sample data
				await BookmarkModel.deleteMany({});
				await RecitationHistoryModel.deleteMany({});
				
				const insertedBookmarks = await BookmarkModel.insertMany(sampleBookmarks);
				const insertedRecitations = await RecitationHistoryModel.insertMany(sampleRecitations);
				
				return NextResponse.json({
					success: true,
					message: 'Database populated successfully',
					data: {
						bookmarks: insertedBookmarks.length,
						recitations: insertedRecitations.length
					}
				});

			case 'clear':
				// Clear all data
				const bookmarkDeleteResult = await BookmarkModel.deleteMany({});
				const recitationDeleteResult = await RecitationHistoryModel.deleteMany({});
				
				return NextResponse.json({
					success: true,
					message: 'Database cleared successfully',
					data: {
						deletedBookmarks: bookmarkDeleteResult.deletedCount,
						deletedRecitations: recitationDeleteResult.deletedCount
					}
				});

			case 'stats':
				// Get database statistics
				const bookmarkCount = await BookmarkModel.countDocuments();
				const recitationCount = await RecitationHistoryModel.countDocuments();
				
				const recentBookmarks = await BookmarkModel.find()
					.sort({ createdAt: -1 })
					.limit(5)
					.lean();
				
				const recentRecitations = await RecitationHistoryModel.find()
					.sort({ createdAt: -1 })
					.limit(5)
					.lean();
				
				return NextResponse.json({
					success: true,
					data: {
						counts: {
							bookmarks: bookmarkCount,
							recitations: recitationCount
						},
						recent: {
							bookmarks: recentBookmarks,
							recitations: recentRecitations
						}
					}
				});

			case 'clear-bookmarks':
				// Clear only bookmarks
				const bookmarkResult = await BookmarkModel.deleteMany({});
				return NextResponse.json({
					success: true,
					message: 'All bookmarks cleared',
					data: { deletedBookmarks: bookmarkResult.deletedCount }
				});

			case 'clear-recitations':
				// Clear only recitations
				const recitationResult = await RecitationHistoryModel.deleteMany({});
				return NextResponse.json({
					success: true,
					message: 'All recitations cleared',
					data: { deletedRecitations: recitationResult.deletedCount }
				});

			default:
				return NextResponse.json({ 
					error: 'Invalid action. Available actions: populate, clear, stats, clear-bookmarks, clear-recitations' 
				}, { status: 400 });
		}

	} catch (error) {
		console.error('Admin API error:', error);
		return NextResponse.json({ 
			error: 'Failed to perform admin operation' 
		}, { status: 500 });
	}
}

// GET method for quick stats
export async function GET() {
	try {
		const conn = await connectToDatabase(getMongoUri());
		if (!conn) {
			return NextResponse.json({ 
				error: 'Database connection failed. Please ensure MongoDB is accessible.' 
			}, { status: 500 });
		}

		const bookmarkCount = await BookmarkModel.countDocuments();
		const recitationCount = await RecitationHistoryModel.countDocuments();
		
		return NextResponse.json({
			success: true,
			data: {
				bookmarks: bookmarkCount,
				recitations: recitationCount,
				total: bookmarkCount + recitationCount
			}
		});

	} catch (error) {
		console.error('Admin API error:', error);
		return NextResponse.json({ 
			error: 'Failed to get database stats' 
		}, { status: 500 });
	}
}
