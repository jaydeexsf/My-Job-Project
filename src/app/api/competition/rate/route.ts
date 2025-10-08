import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, getMongoUri } from "@/lib/db";
import { CompetitionRecitationModel } from "@/lib/models";

export async function POST(req: NextRequest) {
	try {
		const { recitationId, userId, rating } = await req.json();

		if (!recitationId || !userId || !rating) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 }
			);
		}

		if (rating < 1 || rating > 5) {
			return NextResponse.json(
				{ error: "Rating must be between 1 and 5" },
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

		// Check if user already rated
		const existingRatingIndex = recitation.ratings.findIndex(
			(r: any) => r.userId === userId
		);

		if (existingRatingIndex !== -1) {
			// Update existing rating
			recitation.ratings[existingRatingIndex].rating = rating;
			recitation.ratings[existingRatingIndex].createdAt = new Date();
		} else {
			// Add new rating
			recitation.ratings.push({
				userId,
				rating,
				createdAt: new Date(),
			});
		}

		// Recalculate average rating
		const totalRating = recitation.ratings.reduce(
			(sum: number, r: any) => sum + r.rating,
			0
		);
		recitation.averageRating = totalRating / recitation.ratings.length;
		recitation.ratingCount = recitation.ratings.length;

		await recitation.save();

		return NextResponse.json({
			success: true,
			data: {
				averageRating: recitation.averageRating,
				ratingCount: recitation.ratingCount,
				userRating: rating,
			},
		});
	} catch (error) {
		console.error("Error rating recitation:", error);
		return NextResponse.json(
			{ error: "Failed to rate recitation" },
			{ status: 500 }
		);
	}
}
