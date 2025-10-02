import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, getMongoUri, isDummyMode } from "@/lib/db";
import { BookmarkModel } from "@/lib/models";
import { getDummyBookmarks, addDummyBookmark, deleteDummyBookmark } from "@/lib/dummyData";

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const userId = searchParams.get("userId") || undefined;
	
	if (isDummyMode()) {
		const data = getDummyBookmarks(userId);
		return NextResponse.json({ data });
	}
	
	const conn = await connectToDatabase(getMongoUri());
	if (!conn) {
		const data = getDummyBookmarks(userId);
		return NextResponse.json({ data });
	}
	
	const data = await BookmarkModel.find(userId ? { userId } : {}).sort({ createdAt: -1 }).lean();
	return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
	const body = await req.json();
	
	if (isDummyMode()) {
		const data = addDummyBookmark(body);
		return NextResponse.json({ data });
	}
	
	const conn = await connectToDatabase(getMongoUri());
	if (!conn) {
		const data = addDummyBookmark(body);
		return NextResponse.json({ data });
	}
	
	const doc = await BookmarkModel.findOneAndUpdate(
		{ userId: body.userId, surah: body.surah, ayah: body.ayah },
		{ $set: body },
		{ upsert: true, new: true }
	);
	return NextResponse.json({ data: doc });
}

export async function DELETE(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const userId = searchParams.get("userId");
	const surah = Number(searchParams.get("surah"));
	const ayah = Number(searchParams.get("ayah"));
	
	if (isDummyMode()) {
		const success = deleteDummyBookmark(userId || undefined, surah, ayah);
		return NextResponse.json({ ok: success });
	}
	
	const conn = await connectToDatabase(getMongoUri());
	if (!conn) {
		const success = deleteDummyBookmark(userId || undefined, surah, ayah);
		return NextResponse.json({ ok: success });
	}
	
	await BookmarkModel.deleteOne({ userId: userId || undefined, surah, ayah });
	return NextResponse.json({ ok: true });
}


