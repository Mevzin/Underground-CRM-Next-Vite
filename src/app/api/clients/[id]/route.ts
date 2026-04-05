import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthorizedUser } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { Client } from "@/models/Client";

const updateClientSchema = z.object({
	name: z.string().min(2),
	stateId: z.string().optional().default(""),
	phone: z.string().optional().default(""),
	discordTag: z.string().optional().default(""),
	notes: z.string().optional().default(""),
});

export async function GET(
	_: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuthorizedUser();
	if (error) return error;

	const { id } = await context.params;
	await connectToDatabase();
	const client = await Client.findById(id).lean();

	if (!client) {
		return NextResponse.json({ message: "Cliente não encontrado" }, { status: 404 });
	}

	return NextResponse.json(client);
}

export async function PUT(
	req: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuthorizedUser();
	if (error) return error;

	const { id } = await context.params;
	const body = await req.json();
	const parsed = updateClientSchema.safeParse(body);

	if (!parsed.success) {
		return NextResponse.json({ message: parsed.error.flatten() }, { status: 400 });
	}

	await connectToDatabase();
	const client = await Client.findByIdAndUpdate(id, parsed.data, {
		new: true,
	}).lean();

	if (!client) {
		return NextResponse.json({ message: "Cliente não encontrado" }, { status: 404 });
	}

	return NextResponse.json(client);
}

export async function DELETE(
	_: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuthorizedUser();
	if (error) return error;

	const { id } = await context.params;
	await connectToDatabase();
	const client = await Client.findByIdAndDelete(id).lean();

	if (!client) {
		return NextResponse.json({ message: "Cliente não encontrado" }, { status: 404 });
	}

	return NextResponse.json({ ok: true });
}
