const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Define schemas (same as in models.ts)
const bookmarkSchema = new mongoose.Schema(
	{
		userId: { type: String, index: true },
		surah: { type: Number, required: true },
		ayah: { type: Number, required: true },
		note: { type: String },
	},
	{ timestamps: true }
);

const recitationHistorySchema = new mongoose.Schema(
	{
		userId: { type: String, index: true },
		surah: { type: Number, required: true },
		ayah: { type: Number, required: true },
		accuracy: { type: Number },
		transcript: { type: String },
		audioUrl: { type: String },
	},
	{ timestamps: true }
);

const Bookmark = mongoose.model('Bookmark', bookmarkSchema);
const RecitationHistory = mongoose.model('RecitationHistory', recitationHistorySchema);

// Sample data to populate
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

async function populateDatabase() {
	try {
		console.log('🔌 Connecting to MongoDB...');
		await mongoose.connect(process.env.MONGODB_URI);
		console.log('✅ Connected to MongoDB successfully!');

		// Clear existing data
		console.log('🧹 Clearing existing data...');
		await Bookmark.deleteMany({});
		await RecitationHistory.deleteMany({});
		console.log('✅ Existing data cleared!');

		// Insert bookmarks
		console.log('📚 Inserting bookmarks...');
		const insertedBookmarks = await Bookmark.insertMany(sampleBookmarks);
		console.log(`✅ Inserted ${insertedBookmarks.length} bookmarks!`);

		// Insert recitation history
		console.log('🎤 Inserting recitation history...');
		const insertedRecitations = await RecitationHistory.insertMany(sampleRecitations);
		console.log(`✅ Inserted ${insertedRecitations.length} recitation records!`);

		// Verify data
		const bookmarkCount = await Bookmark.countDocuments();
		const recitationCount = await RecitationHistory.countDocuments();
		
		console.log('\n🎉 Database population completed!');
		console.log(`📊 Total bookmarks: ${bookmarkCount}`);
		console.log(`📊 Total recitations: ${recitationCount}`);

		// Display sample data
		console.log('\n📋 Sample bookmarks:');
		const sampleBookmarkData = await Bookmark.find().limit(3);
		sampleBookmarkData.forEach(bookmark => {
			console.log(`   - ${bookmark.userId}: Surah ${bookmark.surah}:${bookmark.ayah} - ${bookmark.note}`);
		});

		console.log('\n📋 Sample recitations:');
		const sampleRecitationData = await RecitationHistory.find().limit(3);
		sampleRecitationData.forEach(recitation => {
			console.log(`   - ${recitation.userId}: Surah ${recitation.surah}:${recitation.ayah} - ${recitation.accuracy}% accuracy`);
		});

	} catch (error) {
		console.error('❌ Error populating database:', error);
	} finally {
		await mongoose.disconnect();
		console.log('🔌 Disconnected from MongoDB');
	}
}

// Run the population script
populateDatabase();
