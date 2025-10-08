import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, getMongoUri } from "@/lib/db";
import { CompetitionRecitationModel } from "@/lib/models";

export async function POST(req: NextRequest) {
	try {
		const { recitationId, userId } = await req.json();

		if (!recitationId || !userId) {
			return NextResponse.json(
				{ error: "Missing required fields" },
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

		// Find the recitation
		const recitation = await CompetitionRecitationModel.findById(recitationId);
		if (!recitation) {
			return NextResponse.json(
				{ error: "Recitation not found" },
				{ status: 404 }
			);
		}

		// Toggle bookmark
		const bookmarkIndex = recitation.bookmarkedBy.indexOf(userId);
		let isBookmarked: boolean;

		if (bookmarkIndex === -1) {
			// Add bookmark
			recitation.bookmarkedBy.push(userId);
			isBookmarked = true;
		} else {
			// Remove bookmark
			recitation.bookmarkedBy.splice(bookmarkIndex, 1);
			isBookmarked = false;
		}

		await recitation.save();

		return NextResponse.json({
			success: true,
			data: {
				isBookmarked,
				bookmarkCount: recitation.bookmarkedBy.length,
			},
		});
	} catch (error) {
		console.error("Error bookmarking recitation:", error);
		return NextResponse.json(
			{ error: "Failed to bookmark recitation" },
			{ status: 500 }
		);
	}
}

// GET endpoint to fetch user's bookmarked recitations
export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const userId = searchParams.get("userId");

		if (!userId) {
			return NextResponse.json(
				{ error: "userId is required" },
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

		// Find all recitations bookmarked by this user
		const bookmarkedRecitations = await CompetitionRecitationModel.find({
			bookmarkedBy: userId,
		})
			.sort({ createdAt: -1 })
			.limit(100)
			.lean();

		return NextResponse.json({
			success: true,
			data: bookmarkedRecitations,
		});
	} catch (error) {
		console.error("Error fetching bookmarked recitations:", error);
		return NextResponse.json(
			{ error: "Failed to fetch bookmarked recitations" },
			{ status: 500 }
		);
	}
}
