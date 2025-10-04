import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

/**
 * Upload audio file to Cloudinary
 * @param buffer Audio file buffer
 * @param filename Desired filename
 * @returns Cloudinary upload result with secure_url
 */
export async function uploadAudioToCloudinary(
	buffer: Buffer,
	filename: string
): Promise<{ url: string; publicId: string }> {
	console.log('☁️ Cloudinary upload starting...');
	console.log('📋 Upload details:', {
		filename,
		bufferSize: `${(buffer.length / 1024).toFixed(2)} KB`,
		cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'NOT SET',
	});

	if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
		console.error('❌ Cloudinary credentials not found in environment variables');
		throw new Error('Cloudinary credentials missing. Check .env.local file');
	}

	return new Promise((resolve, reject) => {
		const uploadStream = cloudinary.uploader.upload_stream(
			{
				folder: 'quran-recitations',
				resource_type: 'video', // 'video' type is used for audio files in Cloudinary
				public_id: filename.replace(/\.[^/.]+$/, ''), // Remove extension
				format: 'mp3', // Convert to mp3 for better compatibility
				overwrite: false,
			},
			(error, result) => {
				if (error) {
					console.error('❌ Cloudinary upload failed:', error);
					console.error('Error details:', {
						message: error.message,
						http_code: error.http_code,
					});
					reject(error);
				} else if (result) {
					console.log('✅ Cloudinary upload successful!');
					console.log('📦 Cloudinary response:', {
						url: result.secure_url,
						publicId: result.public_id,
						format: result.format,
						duration: result.duration,
						bytes: result.bytes,
					});
					resolve({
						url: result.secure_url,
						publicId: result.public_id,
					});
				} else {
					console.error('❌ Cloudinary upload failed: No result returned');
					reject(new Error('Upload failed: No result returned'));
				}
			}
		);

		uploadStream.end(buffer);
	});
}

/**
 * Delete audio file from Cloudinary
 * @param publicId Cloudinary public ID of the file
 */
export async function deleteAudioFromCloudinary(publicId: string): Promise<void> {
	try {
		await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
		console.log('Successfully deleted audio from Cloudinary:', publicId);
	} catch (error) {
		console.error('Error deleting audio from Cloudinary:', error);
		throw error;
	}
}
