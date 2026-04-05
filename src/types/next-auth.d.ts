import { DefaultSession } from "next-auth";

declare module "next-auth" {
	interface Session {
		user: DefaultSession["user"] & {
			id: string;
			discordId: string;
			role: "mechanic" | "manager";
			isAuthorized: boolean;
		};
	}

	interface User {
		id: string;
		discordId: string;
		role: "mechanic" | "manager";
		isAuthorized: boolean;
	}
}

declare module "next-auth/jwt" {
	interface JWT {
		id: string;
		discordId: string;
		role: "mechanic" | "manager";
		isAuthorized: boolean;
	}
}
