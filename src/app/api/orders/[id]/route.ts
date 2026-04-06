import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthorizedUser } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";

function orderTypeToTitle(type: "stage_installation" | "removal" | "renewal") {
	if (type === "stage_installation") return "Instalação de stage";
	if (type === "removal") return "Remoção";
	return "Renovação";
}

const updateOrderSchema = z.object({
	type: z.enum(["stage_installation", "removal", "renewal"]),
	description: z.string().optional().default(""),
});

export async function GET(
	_: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuthorizedUser();
	if (error) return error;

	const { id } = await context.params;
	await connectToDatabase();
	await Order.updateMany(
		{ $or: [{ price: { $exists: true } }, { status: { $exists: true } }] },
		{ $unset: { price: "", status: "" } },
		{ strict: false },
	);
	const order = await Order.findById(id)
		.populate("clientId", "name")
		.populate("createdBy", "username name discordId")
		.populate("vehicleId", "model vin")
		.lean();

	if (!order) {
		return NextResponse.json(
			{ message: "Registro não encontrado" },
			{ status: 404 },
		);
	}

	return NextResponse.json(order);
}

export async function PUT(
	req: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuthorizedUser();
	if (error) return error;

	const { id } = await context.params;
	const body = await req.json();
	const parsed = updateOrderSchema.safeParse(body);

	if (!parsed.success) {
		return NextResponse.json({ message: parsed.error.flatten() }, { status: 400 });
	}

	await connectToDatabase();
	await Order.updateMany(
		{ $or: [{ price: { $exists: true } }, { status: { $exists: true } }] },
		{ $unset: { price: "", status: "" } },
		{ strict: false },
	);
	const order = await Order.findByIdAndUpdate(
		id,
		{
			$set: {
				type: parsed.data.type,
				title: orderTypeToTitle(parsed.data.type),
				description: parsed.data.description,
			},
		},
		{ new: true },
	).lean();

	if (!order) {
		return NextResponse.json(
			{ message: "Registro não encontrado" },
			{ status: 404 },
		);
	}

	return NextResponse.json(order);
}

export async function DELETE(
	_: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuthorizedUser();
	if (error) return error;

	const { id } = await context.params;
	await connectToDatabase();
	const order = await Order.findByIdAndDelete(id).lean();

	if (!order) {
		return NextResponse.json(
			{ message: "Registro não encontrado" },
			{ status: 404 },
		);
	}

	return NextResponse.json({ ok: true });
}
