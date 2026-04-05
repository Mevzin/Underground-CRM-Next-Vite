"use client";

import { useState } from "react";

type Client = {
	_id: string;
	name: string;
};

export function VehicleForm({ clients }: { clients: Client[] }) {
	const [form, setForm] = useState({
		clientId: clients[0]?._id || "",
		model: "",
		vin: "",
		imageUrl: "",
		color: "",
		observations: "",
	});

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		const res = await fetch("/api/vehicles", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(form),
		});

		const data = await res.json();

		if (!res.ok) {
			alert(data?.message || "Erro ao cadastrar veículo");
			return;
		}

		alert("Veículo cadastrado com sucesso");
		window.location.reload();
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

			<input
				className="w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
				placeholder="Modelo"
				value={form.model}
				onChange={(e) => setForm({ ...form, model: e.target.value })}
			/>
			<input
				className="w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
				placeholder="VIN"
				value={form.vin}
				onChange={(e) => setForm({ ...form, vin: e.target.value })}
			/>
			<input
				className="w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
				placeholder="Link da imagem (kappa.lol / fivemanager)"
				value={form.imageUrl}
				onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
			/>
			<input
				className="w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
				placeholder="Cor"
				value={form.color}
				onChange={(e) => setForm({ ...form, color: e.target.value })}
			/>
			<textarea
				className="min-h-24 w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
				placeholder="Observações"
				value={form.observations}
				onChange={(e) => setForm({ ...form, observations: e.target.value })}
			/>

			<button className="inline-flex items-center justify-center rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200">
				Salvar
			</button>
		</form>
	);
}
