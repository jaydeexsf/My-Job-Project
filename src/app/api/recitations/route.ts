import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, getMongoUri } from "@/lib/db";
import { RecitationHistoryModel } from "@/lib/models";

export async function GET(req: NextRequest) {
	try {
		const conn = await connectToDatabase(getMongoUri());
		if (!conn) {
			return NextResponse.json({ 
				error: 'Database connection failed. Please ensure MongoDB is accessible.' 
			}, { status: 500 });
		}
		
		// Get ALL recitations from database, sorted by creation date, limit to 100 for performance
		const data = await RecitationHistoryModel.find({})
			.sort({ createdAt: -1 })
			.limit(100)
			.lean();
		return NextResponse.json({ data });
	} catch (error) {
		console.error('Error fetching recitations:', error);
		return NextResponse.json({ 
			error: 'Failed to fetch recitations from database' 
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
		
		// For global access, allow anyone to create recitation records
		const created = await RecitationHistoryModel.create(body);
		return NextResponse.json({ data: created });
	} catch (error) {
		console.error('Error creating recitation:', error);
		return NextResponse.json({ 
			error: 'Failed to create recitation record' 
		}, { status: 500 });
	}
}

export async function DELETE(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const recitationId = searchParams.get("id");
		const surah = Number(searchParams.get("surah"));
		const ayah = Number(searchParams.get("ayah"));
		const userId = searchParams.get("userId");
		
		const conn = await connectToDatabase(getMongoUri());
		if (!conn) {
			return NextResponse.json({ 
				error: 'Database connection failed. Please ensure MongoDB is accessible.' 
			}, { status: 500 });
		}
		
		// Global delete - anyone can delete any recitation record
		let result;
		if (recitationId) {
			// Delete by specific recitation ID
			result = await RecitationHistoryModel.deleteOne({ _id: recitationId });
		} else if (userId) {
			// Delete all recitations by a specific user
			result = await RecitationHistoryModel.deleteMany({ userId });
		} else if (surah && ayah) {
			// Delete all recitations for a specific verse
			result = await RecitationHistoryModel.deleteMany({ surah, ayah });
		} else if (surah) {
			// Delete all recitations for a specific surah
			result = await RecitationHistoryModel.deleteMany({ surah });
		} else {
			return NextResponse.json({ 
				error: 'Either recitation ID, userId, or surah+ayah must be provided' 
			}, { status: 400 });
		}
		
		return NextResponse.json({ 
			ok: true, 
			deletedCount: result.deletedCount 
		});
	} catch (error) {
		console.error('Error deleting recitation:', error);
		return NextResponse.json({ 
			error: 'Failed to delete recitation record' 
		}, { status: 500 });
	}
}


