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

// Competition Recitation model: for recitation competition with likes and rankings
const competitionRecitationSchema = new Schema(
	{
		userId: { type: String, required: true, index: true }, // Machine ID
		surah: { type: Number, required: true, index: true },
		ayah: { type: Number }, // Optional: can be whole chapter or specific verse
		audioPath: { type: String, required: true }, // Path to audio file
		likes: [{ type: String }], // Array of user IDs who liked
		likeCount: { type: Number, default: 0 },
	},
	{ timestamps: true }
);

competitionRecitationSchema.index({ surah: 1, likeCount: -1 });
competitionRecitationSchema.index({ userId: 1, createdAt: -1 });

export type CompetitionRecitation = InferSchemaType<typeof competitionRecitationSchema>;
export const CompetitionRecitationModel =
	models.CompetitionRecitation || model("CompetitionRecitation", competitionRecitationSchema);


