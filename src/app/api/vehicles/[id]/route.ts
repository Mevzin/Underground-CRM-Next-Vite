import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthorizedUser } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { Vehicle } from "@/models/Vehicle";
import { Order } from "@/models/Order";
import { Client } from "@/models/Client";

function isAllowedVehicleImageUrl(value: string) {
	try {
		const url = new URL(value);
		const host = url.hostname.toLowerCase();
		return (
			url.protocol === "https:" &&
			(host === "kappa.lol" ||
				host.endsWith(".kappa.lol") ||
				host === "fivemanage.com" ||
				host.endsWith(".fivemanage.com") ||
				host === "fivemanager.net" ||
				host.endsWith(".fivemanager.net") ||
				host === "fivemanager.com" ||
				host.endsWith(".fivemanager.com"))
		);
	} catch {
		return false;
	}
}

const updateVehicleSchema = z.object({
	model: z.string().min(2),
	vin: z.string().min(2),
	imageUrl: z
		.string()
		.optional()
		.default("")
		.refine((value) => value === "" || isAllowedVehicleImageUrl(value), {
			message: "Link de imagem inválido (use https://kappa.lol ou https://fivemanage.com).",
		}),
	color: z.string().optional().default(""),
	observations: z.string().optional().default(""),
});

const patchVehicleSchema = z.union([
	z.object({
		isBanned: z.boolean(),
	}),
	z.object({
		clientId: z.string().min(1),
	}),
]);

export async function GET(
	_: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuthorizedUser();
	if (error) return error;

	const { id } = await context.params;
	await connectToDatabase();
	const vehicle = await Vehicle.findById(id).lean();

	if (!vehicle) {
		return NextResponse.json(
			{ message: "Veículo não encontrado" },
			{ status: 404 },
		);
	}

	return NextResponse.json(vehicle);
}

export async function PUT(
	req: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuthorizedUser();
	if (error) return error;

	const { id } = await context.params;
	const body = await req.json();
	const parsed = updateVehicleSchema.safeParse(body);

	if (!parsed.success) {
		return NextResponse.json({ message: parsed.error.flatten() }, { status: 400 });
	}

	await connectToDatabase();
	const vehicle = await Vehicle.findByIdAndUpdate(
		id,
		{ ...parsed.data, vin: parsed.data.vin.toUpperCase() },
		{ new: true },
	).lean();

	if (!vehicle) {
		return NextResponse.json(
			{ message: "Veículo não encontrado" },
			{ status: 404 },
		);
	}

	return NextResponse.json(vehicle);
}

export async function DELETE(
	_: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuthorizedUser();
	if (error) return error;

	const { id } = await context.params;
	await connectToDatabase();
	const vehicle = await Vehicle.findById(id).lean();

	if (!vehicle) {
		return NextResponse.json(
			{ message: "Veículo não encontrado" },
			{ status: 404 },
		);
	}

	await Promise.all([
		Order.deleteMany({ vehicleId: id }),
		Vehicle.deleteOne({ _id: id }),
	]);

	return NextResponse.json({ ok: true });
}

export async function PATCH(
	req: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuthorizedUser();
	if (error) return error;

	const { id } = await context.params;
	const body = await req.json();
	const parsed = patchVehicleSchema.safeParse(body);

	if (!parsed.success) {
		return NextResponse.json({ message: parsed.error.flatten() }, { status: 400 });
	}

	await connectToDatabase();

	if ("clientId" in parsed.data) {
		const vehicle = await Vehicle.findById(id).lean();
		if (!vehicle) {
			return NextResponse.json(
				{ message: "Veículo não encontrado" },
				{ status: 404 },
			);
		}

		const client = await Client.findById(parsed.data.clientId).lean();
		if (!client) {
			return NextResponse.json(
				{ message: "Cliente não encontrado" },
				{ status: 404 },
			);
		}
		if (client.isBanned) {
			return NextResponse.json(
				{ message: "Cliente não possui vagas disponíveis" },
				{ status: 400 },
			);
		}

		if (String(vehicle.clientId) !== parsed.data.clientId) {
			const count = await Vehicle.countDocuments({ clientId: parsed.data.clientId });
			if (count >= 2) {
				return NextResponse.json(
					{ message: "Cliente não possui vagas disponíveis" },
					{ status: 400 },
				);
			}
		}

		const updated = await Vehicle.findByIdAndUpdate(
			id,
			{ $set: { clientId: parsed.data.clientId } },
			{ new: true },
		).lean();

		if (!updated) {
			return NextResponse.json(
				{ message: "Veículo não encontrado" },
				{ status: 404 },
			);
		}

		return NextResponse.json(updated);
	}

	const vehicle = await Vehicle.findByIdAndUpdate(
		id,
		{
			$set: {
				isBanned: parsed.data.isBanned,
				bannedAt: parsed.data.isBanned ? new Date() : null,
			},
		},
		{ new: true },
	).lean();

	if (!vehicle) {
		return NextResponse.json(
			{ message: "Veículo não encontrado" },
			{ status: 404 },
		);
	}

	return NextResponse.json(vehicle);
}
