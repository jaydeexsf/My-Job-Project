import mongoose, { Schema, InferSchemaType, models, model } from "mongoose";

// Bookmark model: stores saved ayah references
const bookmarkSchema = new Schema(
	{
		userId: { type: String, index: true },
		surah: { type: Number, required: true },
		ayah: { type: Number, required: true },
		note: { type: String },
	},
	{ timestamps: true }
);

bookmarkSchema.index({ userId: 1, surah: 1, ayah: 1 }, { unique: true, sparse: true });

export type Bookmark = InferSchemaType<typeof bookmarkSchema>;
export const BookmarkModel = models.Bookmark || model("Bookmark", bookmarkSchema);

// Recitation history: tracks recognition results
const recitationHistorySchema = new Schema(
	{
		userId: { type: String, index: true },
		surah: { type: Number, required: true },
		ayah: { type: Number, required: true },
		accuracy: { type: Number },
		transcript: { type: String },
		audioUrl: { type: String },
	},
	{ timestamps: true }
);

recitationHistorySchema.index({ userId: 1, createdAt: -1 });

export type RecitationHistory = InferSchemaType<typeof recitationHistorySchema>;
export const RecitationHistoryModel =
	models.RecitationHistory || model("RecitationHistory", recitationHistorySchema);


