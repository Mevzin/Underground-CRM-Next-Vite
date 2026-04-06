"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

type Client = {
	_id: string;
	name: string;
};

type Vehicle = {
	_id: string;
	clientId: string;
	model: string;
	vin: string;
};

export function OrderForm({
	clients,
	vehicles,
}: {
	clients: Client[];
	vehicles: Vehicle[];
}) {
	const toast = useToast();
	const router = useRouter();
	const [form, setForm] = useState({
		clientId: clients[0]?._id || "",
		vehicleId: "",
		type: "stage_installation",
		description: "",
	});

	const filteredVehicles = useMemo(
		() => vehicles.filter((vehicle) => vehicle.clientId === form.clientId),
		[vehicles, form.clientId],
	);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		const isValidVehicle = filteredVehicles.some((v) => v._id === form.vehicleId);
		if (!isValidVehicle) {
			toast.error("Selecione um veículo válido");
			return;
		}

		const res = await fetch("/api/orders", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				...form,
			}),
		});

		const data = await res.json();

		if (!res.ok) {
			toast.error(data?.message || "Erro ao salvar registro");
			return;
		}

		toast.success("Registro salvo com sucesso");
		router.refresh();
	}

	if (clients.length === 0) {
		return (
			<div className="space-y-2 rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4">
				<h2 className="text-sm font-semibold text-zinc-200">Novo registro</h2>
				<p className="text-sm text-zinc-500">Cadastre um cliente primeiro.</p>
			</div>
		);
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="space-y-3 rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4"
		>
			<h2 className="text-sm font-semibold text-zinc-200">Novo registro</h2>

			<label className="block space-y-1">
				<span className="text-xs font-semibold text-zinc-500">Cliente</span>
				<select
					className="w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-700 focus:outline-none"
					value={form.clientId}
					onChange={(e) =>
						setForm({ ...form, clientId: e.target.value, vehicleId: "" })
					}
				>
					{clients.map((client) => (
						<option key={client._id} value={client._id}>
							{client.name}
						</option>
					))}
				</select>
			</label>

			<label className="block space-y-1">
				<span className="text-xs font-semibold text-zinc-500">Veículo</span>
				<select
					className="w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-700 focus:outline-none"
					value={form.vehicleId}
					onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
					disabled={filteredVehicles.length === 0}
				>
					<option value="">Selecione um veículo</option>
					{filteredVehicles.map((vehicle) => (
						<option key={vehicle._id} value={vehicle._id}>
							{vehicle.model} - {vehicle.vin}
						</option>
					))}
				</select>
			</label>

			<label className="block space-y-1">
				<span className="text-xs font-semibold text-zinc-500">Tipo</span>
				<select
					className="w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-700 focus:outline-none"
					value={form.type}
					onChange={(e) => {
						const nextType = e.target.value;
						setForm({
							...form,
							type: nextType,
						});
					}}
				>
					<option value="stage_installation">Instalação de stage</option>
					<option value="removal">Remoção</option>
					<option value="renewal">Renovação</option>
				</select>
			</label>

			<label className="block space-y-1">
				<span className="text-xs font-semibold text-zinc-500">Descrição</span>
				<textarea
					className="min-h-24 w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
					placeholder="Descrição"
					value={form.description}
					onChange={(e) => setForm({ ...form, description: e.target.value })}
				/>
			</label>

			<button className="inline-flex items-center justify-center rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200">
				Salvar
			</button>
		</form>
	);
}
