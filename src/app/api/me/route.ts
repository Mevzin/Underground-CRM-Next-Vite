import { NextResponse } from "next/server";
import { requireAuthorizedUser } from "@/lib/auth-guard";

export async function GET() {
	const { user, error } = await requireAuthorizedUser();
	if (error) return error;

	return NextResponse.json({
		id: user._id,
		name: user.name,
		role: user.role,
		isAuthorized: user.isAuthorized,
		discordId: user.discordId,
	});
}
