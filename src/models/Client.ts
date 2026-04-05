import { Schema, model, models, type InferSchemaType, Types } from "mongoose";

const clientSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
			index: true,
		},
		stateId: {
			type: String,
			default: "",
			trim: true,
			index: true,
		},
		phone: {
			type: String,
			default: "",
			trim: true,
		},
		discordTag: {
			type: String,
			default: "",
			trim: true,
		},
		notes: {
			type: String,
			default: "",
			trim: true,
		},
		createdBy: {
			type: Types.ObjectId,
			ref: "User",
			required: true,
		},
	},
	{ timestamps: true },
);

export type ClientDocument = InferSchemaType<typeof clientSchema>;
export const Client = models.Client || model("Client", clientSchema);
