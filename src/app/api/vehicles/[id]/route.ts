import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthorizedUser } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { Vehicle } from "@/models/Vehicle";

function isAllowedVehicleImageUrl(value: string) {
	try {
		const url = new URL(value);
		const host = url.hostname.toLowerCase();
		return (
			url.protocol === "https:" &&
			(host === "kappa.lol" ||
				host.endsWith(".kappa.lol") ||
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
			message: "Link de imagem inválido (use https://kappa.lol ou https://fivemanager).",
		}),
	color: z.string().optional().default(""),
	observations: z.string().optional().default(""),
});

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
	const vehicle = await Vehicle.findByIdAndDelete(id).lean();

	if (!vehicle) {
		return NextResponse.json(
			{ message: "Veículo não encontrado" },
			{ status: 404 },
		);
	}

	return NextResponse.json({ ok: true });
}
