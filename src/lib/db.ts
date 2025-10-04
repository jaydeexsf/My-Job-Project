import mongoose from "mongoose";

const globalForMongoose = global as unknown as { mongooseConn?: typeof mongoose };

export async function connectToDatabase(mongoUri: string | undefined): Promise<typeof mongoose | null> {
	if (!mongoUri) {
		console.warn("❌ MONGODB_URI is not set - using dummy data mode");
		console.warn("💡 Make sure .env.local exists with MONGODB_URI");
		return null;
	}

	console.log("🔗 MongoDB URI found:", mongoUri.substring(0, 30) + "...");

	if (globalForMongoose.mongooseConn) {
		console.log("✅ Using existing MongoDB connection");
		return globalForMongoose.mongooseConn;
	}

	try {
		console.log("🔌 Attempting to connect to MongoDB...");
		const conn = await mongoose.connect(mongoUri, {
			// Keep options minimal; mongoose v7+ uses sensible defaults
		});
		globalForMongoose.mongooseConn = conn;
		console.log("✅ MongoDB connected successfully!");
		console.log("📊 Database:", conn.connection.name);
		console.log("🌐 Host:", conn.connection.host);
		return conn;
	} catch (error) {
		console.error("❌ Failed to connect to MongoDB:");
		console.error("Error message:", error instanceof Error ? error.message : error);
		console.error("Full error:", error);
		return null;
	}
}

export function getMongoUri(): string | undefined {
	return process.env.MONGODB_URI;
}

// Removed isDummyMode - now always use MongoDB directly


