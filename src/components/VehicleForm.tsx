"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

type Client = {
	_id: string;
	name: string;
};

export function VehicleForm({ clients }: { clients: Client[] }) {
	const toast = useToast();
	const router = useRouter();
	const [form, setForm] = useState({
		clientId: clients[0]?._id || "",
		model: "",
		vin: "",
		imageUrl: "",
		color: "",
		observations: "",
	});

	function extractErrorMessage(value: unknown) {
		if (typeof value === "string") return value;
		if (!value || typeof value !== "object") return "";
		const message = (value as { message?: unknown }).message;
		if (typeof message === "string") return message;
		if (!message || typeof message !== "object") return "";
		const fieldErrors = (message as { fieldErrors?: unknown }).fieldErrors as
			| Record<string, string[] | undefined>
			| undefined;
		if (!fieldErrors) return "";
		const firstKey = Object.keys(fieldErrors)[0];
		const firstErrors = firstKey ? fieldErrors[firstKey] : undefined;
		const firstText =
			Array.isArray(firstErrors) && firstErrors.length > 0 ? firstErrors[0] : "";
		return firstText;
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		const res = await fetch("/api/vehicles", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(form),
		});

		const data = await res.json();

		if (!res.ok) {
			toast.error(extractErrorMessage(data) || "Erro ao cadastrar veículo");
			return;
		}

		toast.success("Veículo cadastrado com sucesso");
		router.refresh();
	}

	if (clients.length === 0) {
		return (
			<div className="space-y-2 rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4">
				<h2 className="text-sm font-semibold text-zinc-200">Novo veículo</h2>
				<p className="text-sm text-zinc-500">Cadastre um cliente primeiro.</p>
			</div>
		);
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="space-y-3 rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4"
		>
			<h2 className="text-sm font-semibold text-zinc-200">Novo veículo</h2>
			<label className="block space-y-1">
				<span className="text-xs font-semibold text-zinc-500">Cliente</span>
				<select
					className="w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-700 focus:outline-none"
					value={form.clientId}
					onChange={(e) => setForm({ ...form, clientId: e.target.value })}
				>
					{clients.map((client) => (
						<option key={client._id} value={client._id}>
							{client.name}
						</option>
					))}
				</select>
			</label>

			<label className="block space-y-1">
				<span className="text-xs font-semibold text-zinc-500">Modelo</span>
				<input
					className="w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
					placeholder="Modelo"
					value={form.model}
					onChange={(e) => setForm({ ...form, model: e.target.value })}
				/>
			</label>
			<label className="block space-y-1">
				<span className="text-xs font-semibold text-zinc-500">VIN</span>
				<input
					className="w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
					placeholder="VIN"
					value={form.vin}
					onChange={(e) => setForm({ ...form, vin: e.target.value })}
				/>
			</label>
			<label className="block space-y-1">
				<span className="text-xs font-semibold text-zinc-500">Link da imagem</span>
				<input
					className="w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
					placeholder="Link da imagem (kappa.lol / fivemanager)"
					value={form.imageUrl}
					onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
				/>
			</label>
			<label className="block space-y-1">
				<span className="text-xs font-semibold text-zinc-500">Cor</span>
				<input
					className="w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
					placeholder="Cor"
					value={form.color}
					onChange={(e) => setForm({ ...form, color: e.target.value })}
				/>
			</label>
			<label className="block space-y-1">
				<span className="text-xs font-semibold text-zinc-500">Observações</span>
				<textarea
					className="min-h-24 w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
					placeholder="Observações"
					value={form.observations}
					onChange={(e) => setForm({ ...form, observations: e.target.value })}
				/>
			</label>

			<button className="inline-flex items-center justify-center rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200">
				Salvar
			</button>
		</form>
	);
}
