"use client";

import { signIn } from "next-auth/react";

export function LoginButton() {
	return (
		<button
			onClick={() => signIn("discord", { callbackUrl: "/" })}
			className="inline-flex items-center justify-center rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
		>
			Entrar com Discord
		</button>
	);
}
