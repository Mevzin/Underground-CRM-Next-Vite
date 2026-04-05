import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthorizedUser } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Client } from "@/models/Client";

const orderSchema = z.object({
	clientId: z.string().min(1),
	vehicleId: z.string().optional().nullable(),
	type: z.enum(["stage_installation", "removal", "renewal"]),
	title: z.string().min(2),
	description: z.string().optional().default(""),
});

export async function GET(req: NextRequest) {
	const { error } = await requireAuthorizedUser();
	if (error) return error;

	await connectToDatabase();
	await Order.updateMany(
		{ $or: [{ price: { $exists: true } }, { status: { $exists: true } }] },
		{ $unset: { price: "", status: "" } },
		{ strict: false },
	);
	const clientId = req.nextUrl.searchParams.get("clientId");

	const query = clientId ? { clientId } : {};
	const orders = await Order.find(query)
		.populate("clientId", "name")
		.populate("createdBy", "username name discordId")
		.populate("vehicleId", "model vin")
		.sort({ createdAt: -1 })
		.lean();

	return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
	const { user, error } = await requireAuthorizedUser();
	if (error) return error;

	const body = await req.json();
	const parsed = orderSchema.safeParse(body);

	if (!parsed.success) {
		return NextResponse.json({ message: parsed.error.flatten() }, { status: 400 });
	}

	await connectToDatabase();
	await Order.updateMany(
		{ $or: [{ price: { $exists: true } }, { status: { $exists: true } }] },
		{ $unset: { price: "", status: "" } },
		{ strict: false },
	);
	const clientExists = await Client.findById(parsed.data.clientId).lean();

	if (!clientExists) {
		return NextResponse.json({ message: "Cliente não encontrado" }, { status: 404 });
	}

	const order = await Order.create({
		...parsed.data,
		vehicleId: parsed.data.vehicleId || null,
		createdBy: user._id,
	});

	return NextResponse.json(order, { status: 201 });
}
