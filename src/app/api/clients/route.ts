import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthorizedUser } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { Client } from "@/models/Client";

const clientSchema = z.object({
	name: z.string().min(2),
	stateId: z.string().optional().default(""),
	phone: z.string().optional().default(""),
	discordTag: z.string().optional().default(""),
	crew: z.string().optional().default(""),
	notes: z.string().optional().default(""),
});

export async function GET() {
	const { error } = await requireAuthorizedUser();
	if (error) return error;

	await connectToDatabase();
	const clients = await Client.find().sort({ createdAt: -1 }).lean();
	return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
	const { user, error } = await requireAuthorizedUser();
	if (error) return error;

	const body = await req.json();
	const parsed = clientSchema.safeParse(body);

	if (!parsed.success) {
		return NextResponse.json({ message: parsed.error.flatten() }, { status: 400 });
	}

	await connectToDatabase();
	const client = await Client.create({
		...parsed.data,
		createdBy: user._id,
	});

	return NextResponse.json(client, { status: 201 });
}
