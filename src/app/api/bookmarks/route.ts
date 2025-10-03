import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, getMongoUri } from "@/lib/db";
import { BookmarkModel } from "@/lib/models";

export async function GET() {
	try {
		const conn = await connectToDatabase(getMongoUri());
		if (!conn) {
			return NextResponse.json({ 
				error: 'Database connection failed. Please ensure MongoDB is accessible.' 
			}, { status: 500 });
		}
		
		// Get ALL bookmarks from database, sorted by creation date
		const data = await BookmarkModel.find({}).sort({ createdAt: -1 }).lean();
		return NextResponse.json({ data });
	} catch (error) {
		console.error('Error fetching bookmarks:', error);
		return NextResponse.json({ 
			error: 'Failed to fetch bookmarks from database' 
		}, { status: 500 });
	}
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		
		const conn = await connectToDatabase(getMongoUri());
		if (!conn) {
			return NextResponse.json({ 
				error: 'Database connection failed. Please ensure MongoDB is accessible.' 
			}, { status: 500 });
		}
		
		// For global access, allow anyone to create bookmarks
		const doc = await BookmarkModel.create(body);
		return NextResponse.json({ data: doc });
	} catch (error) {
		console.error('Error creating bookmark:', error);
		return NextResponse.json({ 
			error: 'Failed to create bookmark' 
		}, { status: 500 });
	}
}

export async function DELETE(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const bookmarkId = searchParams.get("id");
		const surah = Number(searchParams.get("surah"));
		const ayah = Number(searchParams.get("ayah"));
		
		const conn = await connectToDatabase(getMongoUri());
		if (!conn) {
			return NextResponse.json({ 
				error: 'Database connection failed. Please ensure MongoDB is accessible.' 
			}, { status: 500 });
		}
		
		// Global delete - anyone can delete any bookmark
		let result;
		if (bookmarkId) {
			// Delete by specific bookmark ID
			result = await BookmarkModel.deleteOne({ _id: bookmarkId });
		} else if (surah && ayah) {
			// Delete by surah and ayah (could delete multiple bookmarks for same verse)
			result = await BookmarkModel.deleteMany({ surah, ayah });
		} else {
			return NextResponse.json({ 
				error: 'Either bookmark ID or surah+ayah must be provided' 
			}, { status: 400 });
		}
		
		return NextResponse.json({ 
			ok: true, 
			deletedCount: result.deletedCount 
		});
	} catch (error) {
		console.error('Error deleting bookmark:', error);
		return NextResponse.json({ 
			error: 'Failed to delete bookmark' 
		}, { status: 500 });
	}
}


