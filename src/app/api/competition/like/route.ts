import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, getMongoUri } from "@/lib/db";
import { CompetitionRecitationModel } from "@/lib/models";

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { recitationId, userId } = body;

		if (!recitationId || !userId) {
			return NextResponse.json(
				{ error: "Missing required fields: recitationId, userId" },
				{ status: 400 }
			);
		}

		const conn = await connectToDatabase(getMongoUri());
		if (!conn) {
			return NextResponse.json(
				{ error: "Database connection failed" },
				{ status: 500 }
			);
		}

		// Check if user already liked
		const recitation = await CompetitionRecitationModel.findById(recitationId);
		if (!recitation) {
			return NextResponse.json(
				{ error: "Recitation not found" },
				{ status: 404 }
			);
		}

		const alreadyLiked = recitation.likes.includes(userId);

		if (alreadyLiked) {
			// Unlike: remove user from likes array
			await CompetitionRecitationModel.findByIdAndUpdate(
				recitationId,
				{
					$pull: { likes: userId },
					$inc: { likeCount: -1 },
				}
			);
			return NextResponse.json({
				success: true,
				action: "unliked",
			});
		} else {
			// Like: add user to likes array
			await CompetitionRecitationModel.findByIdAndUpdate(
				recitationId,
				{
					$addToSet: { likes: userId },
					$inc: { likeCount: 1 },
				}
			);
			return NextResponse.json({
				success: true,
				action: "liked",
			});
		}
	} catch (error) {
		console.error("Error liking recitation:", error);
		return NextResponse.json(
			{ error: "Failed to like recitation" },
			{ status: 500 }
		);
	}
}
