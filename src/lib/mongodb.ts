import mongoose from "mongoose";

type MongooseCache = {
	conn: typeof mongoose | null;
	promise: Promise<typeof mongoose> | null;
};

declare global {
	var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || {
	conn: null,
	promise: null,
};

if (!global.mongooseCache) {
	global.mongooseCache = cached;
}

export async function connectToDatabase() {
	const mongodbUri = process.env.MONGODB_URI;
	if (!mongodbUri) {
		throw new Error("Defina MONGODB_URI no .env.local");
	}

	if (cached.conn) return cached.conn;

	if (!cached.promise) {
		cached.promise = mongoose.connect(mongodbUri, {
			dbName: process.env.MONGODB_DB || "underground_crm",
			bufferCommands: false,
		});
	}

	cached.conn = await cached.promise;
	return cached.conn;
}
