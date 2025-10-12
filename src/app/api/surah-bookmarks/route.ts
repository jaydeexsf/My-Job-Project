import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, getMongoUri } from "@/lib/db";
import { SurahBookmarkModel } from "@/lib/models";
import { getMachineId } from "@/lib/machineId";

export async function GET() {
	try {
		const userId = getMachineId();
		const conn = await connectToDatabase(getMongoUri());
		if (!conn) {
			return NextResponse.json({ 
				error: 'Database connection failed. Please ensure MongoDB is accessible.' 
			}, { status: 500 });
		}
		
		// Get surah bookmarks for the current user
		const data = await SurahBookmarkModel.find({ userId }).sort({ createdAt: -1 }).lean();
		const response = { data };
		console.log('Surah Bookmarks API Response - GET:', response);
		return NextResponse.json(response);
	} catch (error) {
		console.error('Error fetching surah bookmarks:', error);
		return NextResponse.json({ 
			error: 'Failed to fetch surah bookmarks from database' 
		}, { status: 500 });
	}
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const userId = getMachineId();
		
		const conn = await connectToDatabase(getMongoUri());
		if (!conn) {
			return NextResponse.json({ 
				error: 'Database connection failed. Please ensure MongoDB is accessible.' 
			}, { status: 500 });
		}
		
		// Create surah bookmark with user ID
		const bookmarkData = {
			...body,
			userId
		};
		
		const doc = await SurahBookmarkModel.create(bookmarkData);
		const response = { data: doc };
		console.log('Surah Bookmarks API Response - POST:', response);
		return NextResponse.json(response);
	} catch (error) {
		console.error('Error creating surah bookmark:', error);
		return NextResponse.json({ 
			error: 'Failed to create surah bookmark' 
		}, { status: 500 });
	}
}

export async function DELETE(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const bookmarkId = searchParams.get("id");
		const surah = Number(searchParams.get("surah"));
		const userId = getMachineId();
		
		const conn = await connectToDatabase(getMongoUri());
		if (!conn) {
			return NextResponse.json({ 
				error: 'Database connection failed. Please ensure MongoDB is accessible.' 
			}, { status: 500 });
		}
		
		// Delete surah bookmark for the current user
		let result;
		if (bookmarkId) {
			// Delete by specific bookmark ID
			result = await SurahBookmarkModel.deleteOne({ _id: bookmarkId, userId });
		} else if (surah) {
			// Delete by surah number
			result = await SurahBookmarkModel.deleteOne({ surah, userId });
		} else {
			return NextResponse.json({ 
				error: 'Either bookmark ID or surah must be provided' 
			}, { status: 400 });
		}
		
		const response = { 
			ok: true, 
			deletedCount: result.deletedCount 
		};
		console.log('Surah Bookmarks API Response - DELETE:', response);
		return NextResponse.json(response);
	} catch (error) {
		console.error('Error deleting surah bookmark:', error);
		return NextResponse.json({ 
			error: 'Failed to delete surah bookmark' 
		}, { status: 500 });
	}
}
