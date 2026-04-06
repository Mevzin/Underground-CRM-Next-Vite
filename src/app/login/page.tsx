import { LoginButton } from "@/components/LoginButton";

export default function LoginPage() {
	return (
		<main className="flex min-h-screen items-center justify-center px-6">
			<div className="w-full max-w-md space-y-5 rounded-2xl border border-zinc-900 bg-zinc-950/40 p-8">
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
						Underground Prodigy
					</h1>
					<p className="text-sm text-zinc-500">
						Faça login com Discord. Apenas mecânicos autorizados podem acessar.
					</p>
				</div>
				<LoginButton />
			</div>
		</main>
	);
}
