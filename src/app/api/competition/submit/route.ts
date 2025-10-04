import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, getMongoUri } from "@/lib/db";
import { CompetitionRecitationModel } from "@/lib/models";
import { uploadAudioToCloudinary } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
	try {
		console.log('📥 Recitation submission received');
		
		const formData = await req.formData();
		const audioFile = formData.get("audio") as File;
		const userId = formData.get("userId") as string;
		const surah = Number(formData.get("surah"));
		const ayah = formData.get("ayah") ? Number(formData.get("ayah")) : undefined;

		console.log('📋 Submission details:', {
			userId: userId?.substring(0, 20) + '...',
			surah,
			ayah: ayah || 'full chapter',
			audioFileSize: audioFile ? `${(audioFile.size / 1024).toFixed(2)} KB` : 'N/A',
			audioFileType: audioFile?.type
		});

		if (!audioFile || !userId || !surah) {
			console.error('❌ Missing required fields');
			return NextResponse.json(
				{ error: "Missing required fields: audio, userId, surah" },
				{ status: 400 }
			);
		}

		// Connect to database
		console.log('🔌 Connecting to database...');
		const conn = await connectToDatabase(getMongoUri());
		if (!conn) {
			console.error('❌ Database connection failed');
			return NextResponse.json(
				{ error: "Database connection failed" },
				{ status: 500 }
			);
		}
		console.log('✅ Database connected');

		// Convert audio file to buffer
		console.log('🎵 Processing audio file...');
		const bytes = await audioFile.arrayBuffer();
		const buffer = Buffer.from(bytes);
		console.log(`✅ Audio converted to buffer: ${buffer.length} bytes`);

		// Create unique filename
		const timestamp = Date.now();
		const filename = `${userId.substring(0, 15)}_${surah}_${ayah || "full"}_${timestamp}`;
		console.log('📝 Generated filename:', filename);

		// Upload to Cloudinary
		console.log('☁️ Uploading to Cloudinary...');
		const uploadResult = await uploadAudioToCloudinary(buffer, filename);
		console.log('✅ Upload successful:', {
			url: uploadResult.url,
			publicId: uploadResult.publicId
		});

		// Store metadata in database with Cloudinary URL
		console.log('💾 Saving to database...');
		const recitation = await CompetitionRecitationModel.create({
			userId,
			surah,
			ayah,
			audioPath: uploadResult.url, // Cloudinary URL
			likes: [],
			likeCount: 0,
		});
		console.log('✅ Recitation saved to database with ID:', recitation._id);

		console.log('🎉 Submission completed successfully!');
		return NextResponse.json({
			success: true,
			data: recitation,
			message: "Recitation uploaded to Cloudinary successfully",
		});
	} catch (error) {
		console.error('❌ Error submitting recitation:', error);
		console.error('Error details:', {
			message: error instanceof Error ? error.message : 'Unknown error',
			stack: error instanceof Error ? error.stack : undefined
		});
		return NextResponse.json(
			{ error: "Failed to submit recitation" },
			{ status: 500 }
		);
	}
}
