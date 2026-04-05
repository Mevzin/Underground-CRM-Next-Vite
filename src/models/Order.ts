import { Schema, model, models, type InferSchemaType, Types } from "mongoose";

const orderSchema = new Schema(
	{
		clientId: {
			type: Types.ObjectId,
			ref: "Client",
			required: true,
			index: true,
		},
		vehicleId: {
			type: Types.ObjectId,
			ref: "Vehicle",
			default: null,
		},
		type: {
			type: String,
			enum: ["stage_installation", "removal", "renewal"],
			required: true,
		},
		title: {
			type: String,
			required: true,
			trim: true,
		},
		description: {
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

export type OrderDocument = InferSchemaType<typeof orderSchema>;
export const Order = models.Order || model("Order", orderSchema);
