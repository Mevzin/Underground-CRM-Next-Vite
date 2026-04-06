import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthorizedUser } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { Types } from "mongoose";
import { Vehicle } from "@/models/Vehicle";
import { Order } from "@/models/Order";
import { Client } from "@/models/Client";

let vehicleIndexesSynced = false;

async function ensureVehicleIndexes() {
	if (vehicleIndexesSynced) return;
	try {
		await Vehicle.syncIndexes();
	} finally {
		vehicleIndexesSynced = true;
	}
}

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

function isValidObjectId(value: string) {
	return Types.ObjectId.isValid(value);
}

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
	if (!isValidObjectId(id)) {
		return NextResponse.json({ message: "Veículo inválido" }, { status: 400 });
	}
	const body = await req.json();
	const parsed = patchVehicleSchema.safeParse(body);

	if (!parsed.success) {
		return NextResponse.json({ message: parsed.error.flatten() }, { status: 400 });
	}

	await connectToDatabase();
	try {
		await ensureVehicleIndexes();
	} catch {
	}

	if ("clientId" in parsed.data) {
		if (!isValidObjectId(parsed.data.clientId)) {
			return NextResponse.json({ message: "Cliente inválido" }, { status: 400 });
		}

		const vehicle = await Vehicle.findById(id).lean();
		if (!vehicle) {
			return NextResponse.json(
				{ message: "Veículo não encontrado" },
				{ status: 404 },
			);
		}

		const legacyPlate = (vehicle as unknown as { plate?: unknown }).plate;
		const effectivePlate =
			typeof legacyPlate === "string" ? legacyPlate.trim() : "";
		const effectiveVin = (
			(typeof vehicle.vin === "string" ? vehicle.vin : "") ||
			(typeof legacyPlate === "string" ? legacyPlate : "")
		)
			.trim()
			.toUpperCase();
		if (!effectiveVin) {
			return NextResponse.json(
				{ message: "Veículo precisa ter um VIN válido para trocar o proprietário" },
				{ status: 400 },
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

		const conflict = await Vehicle.findOne({
			_id: { $ne: id },
			clientId: parsed.data.clientId,
			vin: effectiveVin,
		}).lean();
		if (conflict) {
			await Promise.all([
				Order.updateMany(
					{ vehicleId: id },
					{ $set: { vehicleId: String(conflict._id) } },
				),
				Vehicle.deleteOne({ _id: id }),
			]);
			return NextResponse.json(conflict);
		}

		if (effectivePlate) {
			const plateConflict = await Vehicle.findOne({
				_id: { $ne: id },
				clientId: parsed.data.clientId,
				plate: effectivePlate,
			}).lean();
			if (plateConflict) {
				await Promise.all([
					Order.updateMany(
						{ vehicleId: id },
						{ $set: { vehicleId: String(plateConflict._id) } },
					),
					Vehicle.deleteOne({ _id: id }),
				]);
				return NextResponse.json(plateConflict);
			}
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

		try {
			const updated = await Vehicle.findByIdAndUpdate(
				id,
				{ $set: { clientId: parsed.data.clientId, vin: effectiveVin } },
				{ new: true },
			).lean();

			if (!updated) {
				return NextResponse.json(
					{ message: "Veículo não encontrado" },
					{ status: 404 },
				);
			}

			return NextResponse.json(updated);
		} catch (e: unknown) {
			const error = e as { code?: unknown; name?: unknown };
			if (error?.code === 11000) {
				const conflict = await Vehicle.findOne({
					_id: { $ne: id },
					clientId: parsed.data.clientId,
					vin: effectiveVin,
				}).lean();
				if (conflict) {
					await Promise.all([
						Order.updateMany(
							{ vehicleId: id },
							{ $set: { vehicleId: String(conflict._id) } },
						),
						Vehicle.deleteOne({ _id: id }),
					]);
					return NextResponse.json(conflict);
				}
				if (effectivePlate) {
					const plateConflict = await Vehicle.findOne({
						_id: { $ne: id },
						clientId: parsed.data.clientId,
						plate: effectivePlate,
					}).lean();
					if (plateConflict) {
						await Promise.all([
							Order.updateMany(
								{ vehicleId: id },
								{ $set: { vehicleId: String(plateConflict._id) } },
							),
							Vehicle.deleteOne({ _id: id }),
						]);
						return NextResponse.json(plateConflict);
					}
				}
				return NextResponse.json(
					{ message: "Já existe um veículo com este VIN para este cliente" },
					{ status: 409 },
				);
			}
			if (error?.name === "CastError") {
				return NextResponse.json(
					{ message: "Dados inválidos" },
					{ status: 400 },
				);
			}
			return NextResponse.json(
				{ message: "Erro ao atualizar proprietário" },
				{ status: 500 },
			);
		}
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
