import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function requireAuthorizedUser() {
	const session = await getServerSession(authOptions);

	if (!session?.user?.discordId) {
		return {
			error: Response.json({ message: "Não autenticado" }, { status: 401 }),
		};
	}

	await connectToDatabase();
	const user = await User.findOne({ discordId: session.user.discordId });

	if (!user || !user.isAuthorized) {
		return {
			error: Response.json({ message: "Acesso negado" }, { status: 403 }),
		};
	}

	return { user };
}
