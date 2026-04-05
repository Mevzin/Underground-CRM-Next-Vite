import type { NextAuthOptions } from "next-auth";
import Discord from "next-auth/providers/discord";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";

export const authOptions: NextAuthOptions = {
	providers: [
		Discord({
			clientId: process.env.AUTH_DISCORD_ID || "",
			clientSecret: process.env.AUTH_DISCORD_SECRET || "",
			authorization: {
				params: {
					scope: "identify email",
				},
			},
		}),
	],
	secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
	pages: {
		signIn: "/login",
	},
	session: {
		strategy: "jwt",
	},
	callbacks: {
		async signIn({ user, profile }) {
			await connectToDatabase();

			const discordProfile = profile as
				| { id?: string; username?: string }
				| undefined;
			const discordId = discordProfile?.id;

			if (!discordId) return false;

			const existing = await User.findOne({ discordId });

			if (!existing) {
				await User.create({
					discordId,
					name: user.name || discordProfile?.username || "Sem nome",
					username: discordProfile?.username || "",
					image: user.image || "",
					isAuthorized: false,
					role: "mechanic",
				});
				return false;
			}

			if (!existing.isAuthorized) {
				return false;
			}

			await User.updateOne(
				{ discordId },
				{
					$set: {
						name: user.name || existing.name,
						username: discordProfile?.username || existing.username,
						image: user.image || existing.image,
					},
				},
			);

			return true;
		},
		async jwt({ token, profile }) {
			await connectToDatabase();

			const discordId =
				(profile as { id?: string } | undefined)?.id || token.discordId;
			if (!discordId) return token;

			const dbUser = await User.findOne({ discordId }).lean();
			if (!dbUser) return token;

			token.id = dbUser._id.toString();
			token.discordId = dbUser.discordId;
			token.role = dbUser.role;
			token.isAuthorized = dbUser.isAuthorized;
			return token;
		},
		async session({ session, token }) {
			if (session.user) {
				session.user.id = token.id;
				session.user.discordId = token.discordId;
				session.user.role = token.role;
				session.user.isAuthorized = token.isAuthorized;
			}
			return session;
		},
	},
};
