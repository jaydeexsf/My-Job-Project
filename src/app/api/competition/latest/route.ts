import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, getMongoUri } from "@/lib/db";
import { CompetitionRecitationModel } from "@/lib/models";

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const limit = Number(searchParams.get("limit")) || 20;
		const surah = searchParams.get("surah");

		const conn = await connectToDatabase(getMongoUri());
		if (!conn) {
			return NextResponse.json(
				{ error: "Database connection failed" },
				{ status: 500 }
			);
		}

		// Build query
		const query: any = {};
		if (surah) query.surah = Number(surah);

		// Get latest recitations sorted by creation date
		const recitations = await CompetitionRecitationModel.find(query)
			.sort({ createdAt: -1 })
			.limit(limit)
			.lean();

		return NextResponse.json({
			success: true,
			data: recitations,
		});
	} catch (error) {
		console.error("Error fetching latest recitations:", error);
		return NextResponse.json(
			{ error: "Failed to fetch latest recitations" },
			{ status: 500 }
		);
	}
}
