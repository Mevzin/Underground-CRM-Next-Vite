import { Schema, model, models, type InferSchemaType, Types } from "mongoose";

const vehicleSchema = new Schema(
	{
		clientId: {
			type: Types.ObjectId,
			ref: "Client",
			required: true,
			index: true,
		},
		model: {
			type: String,
			required: true,
			trim: true,
		},
		vin: {
			type: String,
			required: true,
			trim: true,
			uppercase: true,
		},
		imageUrl: {
			type: String,
			default: "",
			trim: true,
		},
		color: {
			type: String,
			default: "",
			trim: true,
		},
		observations: {
			type: String,
			default: "",
			trim: true,
		},
		isBanned: {
			type: Boolean,
			default: false,
			index: true,
		},
		bannedAt: {
			type: Date,
			default: null,
		},
		createdBy: {
			type: Types.ObjectId,
			ref: "User",
			required: true,
		},
	},
	{ timestamps: true },
);

vehicleSchema.index({ clientId: 1, vin: 1 }, { unique: true });

export type VehicleDocument = InferSchemaType<typeof vehicleSchema>;
export const Vehicle = models.Vehicle || model("Vehicle", vehicleSchema);
