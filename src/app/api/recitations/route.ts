import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, getMongoUri, isDummyMode } from "@/lib/db";
import { RecitationHistoryModel } from "@/lib/models";
import { getDummyRecitations, addDummyRecitation } from "@/lib/dummyData";

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const userId = searchParams.get("userId") || undefined;
	
	if (isDummyMode()) {
		const data = getDummyRecitations(userId);
		return NextResponse.json({ data });
	}
	
	const conn = await connectToDatabase(getMongoUri());
	if (!conn) {
		const data = getDummyRecitations(userId);
		return NextResponse.json({ data });
	}
	
	const data = await RecitationHistoryModel.find(userId ? { userId } : {})
		.sort({ createdAt: -1 })
		.limit(100)
		.lean();
	return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
	const body = await req.json();
	
	if (isDummyMode()) {
		const data = addDummyRecitation(body);
		return NextResponse.json({ data });
	}
	
	const conn = await connectToDatabase(getMongoUri());
	if (!conn) {
		const data = addDummyRecitation(body);
		return NextResponse.json({ data });
	}
	
	const created = await RecitationHistoryModel.create(body);
	return NextResponse.json({ data: created });
}


