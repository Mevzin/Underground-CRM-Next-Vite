"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
	return (
		<button
			onClick={() => signOut({ callbackUrl: "/login" })}
			className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-900"
		>
			Sair
		</button>
	);
}
