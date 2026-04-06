import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthorizedUser } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { Vehicle } from "@/models/Vehicle";
import { Client } from "@/models/Client";

type ClientLean = {
	_id: unknown;
	name?: string;
	stateId?: string;
};

function escapeRegex(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

const vehicleSchema = z.object({
	clientId: z.string().min(1),
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

export async function GET(req: NextRequest) {
	const { error } = await requireAuthorizedUser();
	if (error) return error;

	await connectToDatabase();
	const clientId = req.nextUrl.searchParams.get("clientId");

	const query = clientId ? { clientId } : {};
	const vehicles = await Vehicle.find(query).sort({ createdAt: -1 }).lean();
	return NextResponse.json(vehicles);
}

export async function POST(req: NextRequest) {
	const { user, error } = await requireAuthorizedUser();
	if (error) return error;

	const body = await req.json();
	const parsed = vehicleSchema.safeParse(body);

	if (!parsed.success) {
		return NextResponse.json({ message: parsed.error.flatten() }, { status: 400 });
	}

	await connectToDatabase();

	const clientExists = (await Client.findById(parsed.data.clientId).lean()) as
		| ClientLean
		| null;
	if (!clientExists) {
		return NextResponse.json({ message: "Cliente não encontrado" }, { status: 404 });
	}

	const clientName = String(clientExists.name || "").trim();
	const clientStateId = String(clientExists.stateId || "").trim();

	const nameQuery = {
		name: { $regex: `^${escapeRegex(clientName)}$`, $options: "i" },
	};

	const query =
		clientStateId.length > 0
			? { $or: [{ stateId: clientStateId }, nameQuery] }
			: nameQuery;

	const groupClients = (await Client.find(query).select("_id").lean()) as ClientLean[];

	const groupClientIds =
		groupClients.length > 0 ? groupClients.map((c) => c._id) : [clientExists._id];

	const totalVehicles = await Vehicle.countDocuments({
		clientId: { $in: groupClientIds },
	});
	if (totalVehicles >= 2) {
		return NextResponse.json(
			{
				message:
					"Este cliente já possui o limite máximo de 2 veículos (por nome ou State ID).",
			},
			{ status: 400 },
		);
	}

	const vehicle = await Vehicle.create({
		...parsed.data,
		vin: parsed.data.vin.toUpperCase(),
		createdBy: user._id,
	});

	return NextResponse.json(vehicle, { status: 201 });
}
