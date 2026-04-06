import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthorizedUser } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Client } from "@/models/Client";
import { Vehicle } from "@/models/Vehicle";

function orderTypeToTitle(type: "stage_installation" | "removal" | "renewal") {
	if (type === "stage_installation") return "Instalação de stage";
	if (type === "removal") return "Remoção";
	return "Renovação";
}

const orderSchema = z.object({
	clientId: z.string().min(1),
	vehicleId: z.string().min(1),
	type: z.enum(["stage_installation", "removal", "renewal"]),
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
	if (typeof body?.vehicleId !== "string" || body.vehicleId.trim().length === 0) {
		return NextResponse.json(
			{ message: "Selecione um veículo válido" },
			{ status: 400 },
		);
	}
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

	const vehicleExists = await Vehicle.findById(parsed.data.vehicleId).lean();
	if (!vehicleExists || String(vehicleExists.clientId) !== parsed.data.clientId) {
		return NextResponse.json(
			{ message: "Selecione um veículo válido para este cliente" },
			{ status: 400 },
		);
	}

	const order = await Order.create({
		...parsed.data,
		title: orderTypeToTitle(parsed.data.type),
		createdBy: user._id,
	});

	return NextResponse.json(order, { status: 201 });
}
