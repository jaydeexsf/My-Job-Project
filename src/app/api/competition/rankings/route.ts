import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, getMongoUri } from "@/lib/db";
import { CompetitionRecitationModel } from "@/lib/models";

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const surah = searchParams.get("surah");
		const ayah = searchParams.get("ayah");

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
		if (ayah) query.ayah = Number(ayah);

		// Get recitations sorted by likes (descending)
		const recitations = await CompetitionRecitationModel.find(query)
			.sort({ likeCount: -1, createdAt: -1 })
			.limit(100)
			.lean();

		// Calculate rankings
		const rankings = recitations.map((rec, index) => ({
			...rec,
			rank: index + 1,
		}));

		return NextResponse.json({
			success: true,
			data: rankings,
		});
	} catch (error) {
		console.error("Error fetching rankings:", error);
		return NextResponse.json(
			{ error: "Failed to fetch rankings" },
			{ status: 500 }
		);
	}
}
