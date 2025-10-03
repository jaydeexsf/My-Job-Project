import mongoose from "mongoose";

const globalForMongoose = global as unknown as { mongooseConn?: typeof mongoose };

export async function connectToDatabase(mongoUri: string | undefined): Promise<typeof mongoose | null> {
	if (!mongoUri) {
		console.warn("MONGODB_URI is not set - using dummy data mode");
		return null;
	}

	if (globalForMongoose.mongooseConn) {
		return globalForMongoose.mongooseConn;
	}

	try {
		const conn = await mongoose.connect(mongoUri, {
			// Keep options minimal; mongoose v7+ uses sensible defaults
		});
		globalForMongoose.mongooseConn = conn;
		return conn;
	} catch (error) {
		console.warn("Failed to connect to MongoDB - using dummy data mode:", error);
		return null;
	}
}

export function getMongoUri(): string | undefined {
	return process.env.MONGODB_URI;
}

// Removed isDummyMode - now always use MongoDB directly


