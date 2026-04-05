import { Schema, model, models, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
	{
		discordId: {
			type: String,
			required: true,
			unique: true,
			index: true,
			trim: true,
		},
		name: {
			type: String,
			required: true,
			trim: true,
		},
		username: {
			type: String,
			trim: true,
			default: "",
		},
		image: {
			type: String,
			default: "",
		},
		role: {
			type: String,
			enum: ["mechanic", "manager"],
			default: "mechanic",
		},
		isAuthorized: {
			type: Boolean,
			default: false,
			index: true,
		},
	},
	{ timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema>;
export const User = models.User || model("User", userSchema);
