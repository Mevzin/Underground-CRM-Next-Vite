"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ClientForm } from "@/components/ClientForm";
import { VehicleForm } from "@/components/VehicleForm";
import { OrderForm } from "@/components/OrderForm";
import { useToast } from "@/components/ToastProvider";

type ClientItem = {
	_id: string;
	name: string;
	stateId?: string;
	phone?: string;
	discordTag?: string;
	crew?: string;
	isBanned?: boolean;
};

type VehicleItem = {
	_id: string;
	clientId: string;
	model: string;
	vin: string;
	imageUrl?: string;
	isBanned?: boolean;
};

type OrderItem = {
	_id: string;
	title: string;
	type: string;
	description?: string;
	createdAt?: string;
	clientId?: { name?: string } | null;
	createdBy?: { discordId?: string; username?: string; name?: string } | null;
	vehicleId?:
	| { _id?: string; model?: string; vin?: string; plate?: string }
	| string
	| null;
};

function normalize(value: string) {
	return value.trim().toLowerCase();
}

function isAllowedVehicleImageUrl(value: string) {
	try {
		const url = new URL(value);
		const host = url.hostname.toLowerCase();
		return (
			url.protocol === "https:" &&
			(host === "kappa.lol" ||
				host.endsWith(".kappa.lol") ||
				host === "fivemanage.com" ||
				host.endsWith(".fivemanage.com") ||
				host === "fivemanager.net" ||
				host.endsWith(".fivemanager.net") ||
				host === "fivemanager.com" ||
				host.endsWith(".fivemanager.com"))
		);
	} catch {
		return false;
	}
}

function orderTypeLabel(type: string) {
	if (type === "stage_installation") return "Instalação de stage";
	if (type === "removal") return "Remoção";
	if (type === "renewal") return "Renovação";
	return type;
}

function orderVehicleId(order: OrderItem) {
	if (!order.vehicleId) return null;
	if (typeof order.vehicleId === "string") return order.vehicleId;
	return order.vehicleId._id || null;
}

export function ClientList({
	clients,
	vehicles,
	orders,
}: {
	clients: ClientItem[];
	vehicles: VehicleItem[];
	orders: OrderItem[];
}) {
	const toast = useToast();
	const router = useRouter();
	const [clientQuery, setClientQuery] = useState("");
	const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);
	const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
	const [vehicleQuery, setVehicleQuery] = useState("");
	const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
	const [clientEdit, setClientEdit] = useState<{
		_id: string;
		name: string;
		crew: string;
		stateId: string;
		phone: string;
		discordTag: string;
		notes: string;
	} | null>(null);
	const [clientEditInitial, setClientEditInitial] = useState<{
		_id: string;
		name: string;
		crew: string;
	} | null>(null);
	const [isClientEditLoading, setIsClientEditLoading] = useState(false);
	const [isClientEditSaving, setIsClientEditSaving] = useState(false);

	async function setClientBanned(clientId: string, isBanned: boolean) {
		const res = await fetch(`/api/clients/${clientId}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ isBanned }),
		});

		const data = await res.json().catch(() => null);

		if (!res.ok) {
			toast.error(data?.message || "Erro ao atualizar cliente");
			return;
		}

		toast.success(isBanned ? "Cliente banido" : "Cliente desbanido");
		router.refresh();
	}

	async function deleteClient(clientId: string) {
		const res = await fetch(`/api/clients/${clientId}`, {
			method: "DELETE",
		});

		const data = await res.json().catch(() => null);

		if (!res.ok) {
			toast.error(data?.message || "Erro ao deletar cliente");
			return;
		}

		toast.warning("Cliente deletado");
		setSelectedClientId(null);
		router.refresh();
	}

	async function saveClientEdit() {
		if (!clientEdit) return;
		if (!isClientEditDirty) return;
		const name = clientEdit.name.trim();
		if (name.length < 2) {
			toast.error("Nome precisa ter pelo menos 2 caracteres");
			return;
		}

		setIsClientEditSaving(true);
		try {
			const res = await fetch(`/api/clients/${clientEdit._id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name,
					crew: clientEdit.crew.trim(),
					stateId: clientEdit.stateId,
					phone: clientEdit.phone,
					discordTag: clientEdit.discordTag,
					notes: clientEdit.notes,
				}),
			});

			const data = await res.json().catch(() => null);

			if (!res.ok) {
				toast.error(data?.message || "Erro ao salvar cliente");
				return;
			}

			toast.success("Cliente atualizado");
			setClientEditInitial({
				_id: clientEdit._id,
				name: name,
				crew: clientEdit.crew.trim(),
			});
			setClientEdit({
				...clientEdit,
				name: name,
				crew: clientEdit.crew.trim(),
			});
			router.refresh();
		} finally {
			setIsClientEditSaving(false);
		}
	}

	const filteredClients = useMemo(() => {
		const q = normalize(clientQuery);
		if (!q) return clients;

		return clients.filter((c) => {
			const haystack = [
				c.name,
				c.stateId || "",
				c.phone || "",
				c.discordTag || "",
			]
				.join(" ")
				.toLowerCase();

			return haystack.includes(q);
		});
	}, [clients, clientQuery]);

	const selectedClient = useMemo(
		() => clients.find((c) => c._id === selectedClientId) || null,
		[clients, selectedClientId],
	);

	const groupClientIds = useMemo(() => {
		if (!selectedClient) return new Set<string>();

		const stateId = (selectedClient.stateId || "").trim();
		const normalized = normalize(selectedClient.name);
		return new Set(
			clients
				.filter((c) => {
					const sameName = normalize(c.name) === normalized;
					const sameStateId =
						stateId.length > 0 && (c.stateId || "").trim() === stateId;
					return sameName || sameStateId;
				})
				.map((c) => c._id),
		);
	}, [clients, selectedClient]);

	const groupVehicles = useMemo(() => {
		if (!selectedClient) return [];
		return vehicles.filter((v) => groupClientIds.has(v.clientId));
	}, [vehicles, groupClientIds, selectedClient]);

	const filteredGroupVehicles = useMemo(() => {
		const q = normalize(vehicleQuery);
		if (!q) return groupVehicles;
		return groupVehicles.filter((v) => {
			const haystack = `${v.model} ${v.vin}`.toLowerCase();
			return haystack.includes(q);
		});
	}, [groupVehicles, vehicleQuery]);

	const selectedVehicle = useMemo(
		() => vehicles.find((v) => v._id === selectedVehicleId) || null,
		[vehicles, selectedVehicleId],
	);

	const selectedVehicleOrders = useMemo(() => {
		if (!selectedVehicleId) return [];
		return orders.filter((order) => orderVehicleId(order) === selectedVehicleId);
	}, [orders, selectedVehicleId]);

	const selectedVehicleOwner = useMemo(() => {
		if (!selectedVehicle) return null;
		return clients.find((c) => c._id === selectedVehicle.clientId) || null;
	}, [clients, selectedVehicle]);

	const isClientModalOpen = selectedClientId !== null;
	const isVehicleModalOpen = selectedVehicleId !== null;

	const isClientEditDirty = useMemo(() => {
		if (!clientEdit || !clientEditInitial) return false;
		if (clientEdit._id !== clientEditInitial._id) return false;
		return (
			clientEdit.name.trim() !== clientEditInitial.name.trim() ||
			clientEdit.crew.trim() !== clientEditInitial.crew.trim()
		);
	}, [clientEdit, clientEditInitial]);

	useEffect(() => {
		if (!selectedClientId) {
			setClientEdit(null);
			setClientEditInitial(null);
			return;
		}

		let cancelled = false;
		setIsClientEditLoading(true);
		void (async () => {
			try {
				const res = await fetch(`/api/clients/${selectedClientId}`);
				const data = await res.json().catch(() => null);
				if (!res.ok) return;
				if (cancelled) return;

				const id = String(data?._id || selectedClientId);
				const name = String(data?.name || "");
				const crew = String(data?.crew || "");
				setClientEditInitial({ _id: id, name, crew });
				setClientEdit({
					_id: id,
					name,
					crew,
					stateId: String(data?.stateId || ""),
					phone: String(data?.phone || ""),
					discordTag: String(data?.discordTag || ""),
					notes: String(data?.notes || ""),
				});
			} finally {
				if (!cancelled) setIsClientEditLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [selectedClientId]);

	useEffect(() => {
		if (!isClientModalOpen && !isVehicleModalOpen && !isCreateClientOpen) return;
		function onKeyDown(e: KeyboardEvent) {
			if (e.key !== "Escape") return;
			if (isVehicleModalOpen) {
				setSelectedVehicleId(null);
				return;
			}
			if (isClientModalOpen) {
				setSelectedClientId(null);
				return;
			}
			setIsCreateClientOpen(false);
		}

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isClientModalOpen, isVehicleModalOpen, isCreateClientOpen]);

	return (
		<div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4 lg:col-span-1">
			<div className="mb-3 flex items-center justify-between gap-3">
				<h2 className="text-sm font-semibold text-zinc-200">Clientes</h2>
				<button
					type="button"
					onClick={() => setIsCreateClientOpen(true)}
					className="rounded-xl bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
				>
					Novo cliente
				</button>
			</div>
			<input
				className="mb-4 w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
				placeholder="Pesquisar cliente (nome, State ID, telefone, Discord)"
				value={clientQuery}
				onChange={(e) => setClientQuery(e.target.value)}
			/>
			<div className="space-y-3">
				{filteredClients.map((client) => (
					<button
						type="button"
						key={client._id}
						onClick={() => {
							setVehicleQuery("");
							setSelectedClientId(client._id);
						}}
						className={`block w-full rounded-xl border p-3 text-left hover:border-zinc-700 ${client.isBanned
								? "border-red-900/60 bg-red-950/40"
								: "border-zinc-900 bg-zinc-950"
							}`}
					>
						<p className="text-sm font-semibold text-zinc-100">
							{client.name}
						</p>
						<p className="text-sm text-zinc-500">
							{client.stateId ? `State ID: ${client.stateId}` : "Sem State ID"}
						</p>
						<p className="text-sm text-zinc-600">
							{client.phone || "Sem telefone"}
						</p>
						<p className="text-sm text-zinc-600">
							Crew: {(client.crew || "").trim() ? client.crew : "n/a"}
						</p>
					</button>
				))}
			</div>

			{isCreateClientOpen ? (
				<div
					className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4"
					onMouseDown={(e) => {
						if (e.target === e.currentTarget) setIsCreateClientOpen(false);
					}}
				>
					<div className="mx-auto flex min-h-full items-center justify-center">
						<div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
							<div className="flex items-center justify-between gap-4">
								<h3 className="text-lg font-semibold text-zinc-100">
									Novo cliente
								</h3>
								<button
									type="button"
									onClick={() => setIsCreateClientOpen(false)}
									className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-900"
								>
									Fechar
								</button>
							</div>
							<div className="mt-4">
								<ClientForm />
							</div>
						</div>
					</div>
				</div>
			) : null}

			{isClientModalOpen && selectedClient ? (
				<div
					className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4"
					onMouseDown={(e) => {
						if (e.target === e.currentTarget) setSelectedClientId(null);
					}}
				>
					<div className="mx-auto flex min-h-full items-center justify-center">
						<div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
							<div className="flex items-start justify-between gap-4">
								<div>
									<h3 className="text-lg font-semibold text-zinc-100">
										{selectedClient.name}
									</h3>
									<p className="text-sm text-zinc-500">
										{selectedClient.stateId
											? `State ID: ${selectedClient.stateId}`
											: "Sem State ID"}
									</p>
									<p className="text-sm text-zinc-600">
										Veículos registrados: {groupVehicles.length}/2
									</p>
									{selectedClient.isBanned ? (
										<p className="mt-2 inline-flex rounded-full border border-red-900/60 bg-red-950/40 px-2 py-0.5 text-xs font-semibold text-red-200">
											Banido
										</p>
									) : null}
								</div>
								<div className="flex items-center gap-2">
									<button
										type="button"
										disabled={
											isClientEditLoading ||
											isClientEditSaving ||
											!clientEdit ||
											clientEdit._id !== selectedClient._id ||
											!isClientEditDirty
										}
										onClick={() => void saveClientEdit()}
										className="rounded-xl bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
									>
										Salvar
									</button>
									<button
										type="button"
										onClick={() => {
											const next = !selectedClient.isBanned;
											void setClientBanned(selectedClient._id, next);
										}}
										className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-900"
									>
										{selectedClient.isBanned ? "Desbanir" : "Banir"}
									</button>
									<button
										type="button"
										onClick={() => {
											void deleteClient(selectedClient._id);
										}}
										className="rounded-xl border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-950/60"
									>
										Deletar
									</button>
									<button
										type="button"
										onClick={() => setSelectedClientId(null)}
										className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-900"
									>
										Fechar
									</button>
								</div>
							</div>

							<div className="mt-4 grid gap-3 sm:grid-cols-2">
								<label className="block space-y-1">
									<span className="text-xs font-semibold text-zinc-500">
										Nome
									</span>
									<input
										className="w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none disabled:opacity-60"
										placeholder="Nome"
										value={
											clientEdit && clientEdit._id === selectedClient._id
												? clientEdit.name
												: selectedClient.name
										}
										disabled={
											isClientEditLoading ||
											isClientEditSaving ||
											!clientEdit ||
											clientEdit._id !== selectedClient._id
										}
										onChange={(e) => {
											if (!clientEdit) return;
											setClientEdit({ ...clientEdit, name: e.target.value });
										}}
									/>
								</label>
								<label className="block space-y-1">
									<span className="text-xs font-semibold text-zinc-500">
										Crew
									</span>
									<input
										className="w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none disabled:opacity-60"
										placeholder="Crew"
										value={
											clientEdit && clientEdit._id === selectedClient._id
												? clientEdit.crew
												: selectedClient.crew || ""
										}
										disabled={
											isClientEditLoading ||
											isClientEditSaving ||
											!clientEdit ||
											clientEdit._id !== selectedClient._id
										}
										onChange={(e) => {
											if (!clientEdit) return;
											setClientEdit({ ...clientEdit, crew: e.target.value });
										}}
									/>
								</label>
							</div>

							<label className="mt-4 block space-y-1">
								<span className="text-xs font-semibold text-zinc-500">
									Pesquisar veículo
								</span>
								<input
									className="w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
									placeholder="Pesquisar veículo (modelo ou VIN)"
									value={vehicleQuery}
									onChange={(e) => setVehicleQuery(e.target.value)}
								/>
							</label>

							<div className="mt-4 space-y-3">
								{groupVehicles.length === 0 ? (
									<p className="text-sm text-zinc-500">
										Nenhum veículo registrado para este cliente.
									</p>
								) : (
									filteredGroupVehicles.map((vehicle) => (
										<button
											type="button"
											key={vehicle._id}
											className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:border-zinc-700 ${vehicle.isBanned
													? "border-red-900/60 bg-red-950/30"
													: "border-zinc-900 bg-zinc-950/60"
												}`}
											onClick={() => setSelectedVehicleId(vehicle._id)}
										>
											{vehicle.imageUrl &&
												isAllowedVehicleImageUrl(vehicle.imageUrl) ? (
												<div className="relative h-12 w-12 overflow-hidden rounded-lg border border-zinc-900 bg-zinc-950">
													<Image
														src={vehicle.imageUrl}
														alt={vehicle.model}
														fill
														sizes="48px"
														className="object-cover"
													/>
												</div>
											) : (
												<div className="h-12 w-12 rounded-lg border border-zinc-900 bg-zinc-950" />
											)}

											<div className="min-w-0">
												<p className="truncate text-sm font-semibold text-zinc-100">
													{vehicle.model}
												</p>
												<p className="truncate text-sm text-zinc-500">
													VIN: {vehicle.vin}
												</p>
											</div>
										</button>
									))
								)}
							</div>
						</div>
					</div>
				</div>
			) : null}

			{isVehicleModalOpen && selectedVehicle ? (
				<div
					className="fixed inset-0 z-[60] overflow-y-auto bg-black/70 p-4"
					onMouseDown={(e) => {
						if (e.target === e.currentTarget) setSelectedVehicleId(null);
					}}
				>
					<div className="mx-auto flex min-h-full items-center justify-center">
						<div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
							<div className="flex items-start justify-between gap-4">
								<div className="flex min-w-0 items-start gap-4">
									{selectedVehicle.imageUrl &&
										isAllowedVehicleImageUrl(selectedVehicle.imageUrl) ? (
										<div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-zinc-900 bg-zinc-950">
											<Image
												src={selectedVehicle.imageUrl}
												alt={selectedVehicle.model}
												fill
												sizes="96px"
												className="object-cover"
											/>
										</div>
									) : (
										<div className="h-24 w-24 shrink-0 rounded-xl border border-zinc-900 bg-zinc-950" />
									)}

									<div className="min-w-0">
										<h3 className="truncate text-lg font-semibold text-zinc-100">
											{selectedVehicle.model}
										</h3>
										<p className="text-sm text-zinc-500">
											VIN: {selectedVehicle.vin}
										</p>
										<p className="truncate text-sm text-zinc-600">
											{selectedVehicle.imageUrl ? (
												<a
													href={selectedVehicle.imageUrl}
													target="_blank"
													rel="noreferrer"
													className="text-zinc-300 hover:text-zinc-100"
												>
													{selectedVehicle.imageUrl}
												</a>
											) : (
												"Sem imagem"
											)}
										</p>
									</div>
								</div>
								<button
									type="button"
									onClick={() => setSelectedVehicleId(null)}
									className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-900"
								>
									Fechar
								</button>
							</div>

							<div className="mt-5 rounded-xl border border-zinc-900 bg-zinc-950/60 p-3">
								<p className="text-sm font-semibold text-zinc-200">Proprietário</p>
								{selectedVehicleOwner ? (
									<div className="mt-1 space-y-1">
										<p className="text-sm text-zinc-100">
											{selectedVehicleOwner.name}
										</p>
										<p className="text-sm text-zinc-500">
											{selectedVehicleOwner.stateId
												? `State ID: ${selectedVehicleOwner.stateId}`
												: "Sem State ID"}
										</p>
										<p className="text-sm text-zinc-600">
											{selectedVehicleOwner.phone || "Sem telefone"}
										</p>
										<p className="text-sm text-zinc-600">
											{selectedVehicleOwner.discordTag || "Sem Discord"}
										</p>
									</div>
								) : (
									<p className="mt-1 text-sm text-zinc-500">
										Proprietário não encontrado.
									</p>
								)}
							</div>

							<div className="mt-5">
								<h4 className="text-sm font-semibold text-zinc-200">
									Histórico do veículo
								</h4>
								<div className="mt-3 space-y-3">
									{selectedVehicleOrders.length === 0 ? (
										<p className="text-sm text-zinc-500">
											Nenhum registro encontrado para este veículo.
										</p>
									) : (
										selectedVehicleOrders.map((order) => (
											<div
												key={order._id}
												className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-3"
											>
												<div className="flex items-start justify-between gap-3">
													<div className="min-w-0">
														<p className="truncate text-sm font-semibold text-zinc-100">
															{orderTypeLabel(order.type)}
														</p>
														<p className="text-sm text-zinc-500">
															{(order.description || "").trim() || "Sem descrição"}
														</p>
														<p className="text-sm text-zinc-600">
															Cliente: {order.clientId?.name || "-"}
														</p>
														<p className="text-sm text-zinc-600">
															Mecânico:{" "}
															{order.createdBy?.username ||
																order.createdBy?.name ||
																order.createdBy?.discordId ||
																"-"}
														</p>
													</div>
													<div className="shrink-0 text-right">
														{order.createdAt ? (
															<p className="text-xs text-zinc-600">
																{new Date(order.createdAt).toLocaleString("pt-BR")}
															</p>
														) : null}
													</div>
												</div>
											</div>
										))
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}

export function VehicleList({
	vehicles,
	orders,
	clients,
}: {
	vehicles: VehicleItem[];
	orders: OrderItem[];
	clients: ClientItem[];
}) {
	const toast = useToast();
	const router = useRouter();
	const [query, setQuery] = useState("");
	const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
	const [isCreateVehicleOpen, setIsCreateVehicleOpen] = useState(false);

	async function setVehicleBanned(vehicleId: string, isBanned: boolean) {
		const res = await fetch(`/api/vehicles/${vehicleId}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ isBanned }),
		});

		const data = await res.json().catch(() => null);

		if (!res.ok) {
			toast.error(data?.message || "Erro ao atualizar veículo");
			return;
		}

		toast.success(isBanned ? "Veículo banido" : "Veículo desbanido");
		router.refresh();
	}

	async function deleteVehicle(vehicleId: string) {
		const res = await fetch(`/api/vehicles/${vehicleId}`, {
			method: "DELETE",
		});

		const data = await res.json().catch(() => null);

		if (!res.ok) {
			toast.error(data?.message || "Erro ao deletar veículo");
			return;
		}

		toast.warning("Veículo deletado");
		setSelectedVehicleId(null);
		router.refresh();
	}

	const selectedVehicle = useMemo(
		() => vehicles.find((v) => v._id === selectedVehicleId) || null,
		[vehicles, selectedVehicleId],
	);

	const selectedVehicleOwner = useMemo(() => {
		if (!selectedVehicle) return null;
		return clients.find((c) => c._id === selectedVehicle.clientId) || null;
	}, [clients, selectedVehicle]);

	const filteredVehicles = useMemo(() => {
		const q = normalize(query);
		if (!q) return vehicles;
		return vehicles.filter((v) => `${v.model} ${v.vin}`.toLowerCase().includes(q));
	}, [vehicles, query]);

	const selectedVehicleOrders = useMemo(() => {
		if (!selectedVehicleId) return [];
		return orders.filter((order) => orderVehicleId(order) === selectedVehicleId);
	}, [orders, selectedVehicleId]);

	useEffect(() => {
		if (!selectedVehicleId && !isCreateVehicleOpen) return;
		function onKeyDown(e: KeyboardEvent) {
			if (e.key !== "Escape") return;
			if (selectedVehicleId) {
				setSelectedVehicleId(null);
				return;
			}
			setIsCreateVehicleOpen(false);
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [selectedVehicleId, isCreateVehicleOpen]);

	return (
		<div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4 lg:col-span-1">
			<div className="mb-3 flex items-center justify-between gap-3">
				<h2 className="text-sm font-semibold text-zinc-200">Veículos</h2>
				<button
					type="button"
					onClick={() => setIsCreateVehicleOpen(true)}
					className="rounded-xl bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
				>
					Novo veículo
				</button>
			</div>
			<input
				className="mb-4 w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
				placeholder="Pesquisar veículo (modelo ou VIN)"
				value={query}
				onChange={(e) => setQuery(e.target.value)}
			/>
			<div className="space-y-3">
				{filteredVehicles.map((vehicle) => (
					<button
						type="button"
						key={vehicle._id}
						className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:border-zinc-700 ${vehicle.isBanned
								? "border-red-900/60 bg-red-950/40"
								: "border-zinc-900 bg-zinc-950"
							}`}
						onClick={() => setSelectedVehicleId(vehicle._id)}
					>
						{vehicle.imageUrl && isAllowedVehicleImageUrl(vehicle.imageUrl) ? (
							<div className="relative h-12 w-12 overflow-hidden rounded-lg border border-zinc-900 bg-zinc-950">
								<Image
									src={vehicle.imageUrl}
									alt={vehicle.model}
									fill
									sizes="48px"
									className="object-cover"
								/>
							</div>
						) : (
							<div className="h-12 w-12 rounded-lg border border-zinc-900 bg-zinc-950" />
						)}

						<div className="min-w-0">
							<p className="truncate text-sm font-semibold text-zinc-100">
								{vehicle.model}
							</p>
							<p className="truncate text-sm text-zinc-500">VIN: {vehicle.vin}</p>
						</div>
					</button>
				))}
				{filteredVehicles.length === 0 ? (
					<p className="text-sm text-zinc-500">Nenhum veículo encontrado.</p>
				) : null}
			</div>

			{isCreateVehicleOpen ? (
				<div
					className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4"
					onMouseDown={(e) => {
						if (e.target === e.currentTarget) setIsCreateVehicleOpen(false);
					}}
				>
					<div className="mx-auto flex min-h-full items-center justify-center">
						<div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
							<div className="flex items-center justify-between gap-4">
								<h3 className="text-lg font-semibold text-zinc-100">
									Novo veículo
								</h3>
								<button
									type="button"
									onClick={() => setIsCreateVehicleOpen(false)}
									className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-900"
								>
									Fechar
								</button>
							</div>
							<div className="mt-4">
								<VehicleForm clients={clients} />
							</div>
						</div>
					</div>
				</div>
			) : null}

			{selectedVehicleId && selectedVehicle ? (
				<div
					className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4"
					onMouseDown={(e) => {
						if (e.target === e.currentTarget) setSelectedVehicleId(null);
					}}
				>
					<div className="mx-auto flex min-h-full items-center justify-center">
						<div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
							<div className="flex items-start justify-between gap-4">
								<div className="flex min-w-0 items-start gap-4">
									{selectedVehicle.imageUrl &&
										isAllowedVehicleImageUrl(selectedVehicle.imageUrl) ? (
										<div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-zinc-900 bg-zinc-950">
											<Image
												src={selectedVehicle.imageUrl}
												alt={selectedVehicle.model}
												fill
												sizes="96px"
												className="object-cover"
											/>
										</div>
									) : (
										<div className="h-24 w-24 shrink-0 rounded-xl border border-zinc-900 bg-zinc-950" />
									)}

									<div className="min-w-0">
										<h3 className="truncate text-lg font-semibold text-zinc-100">
											{selectedVehicle.model}
										</h3>
										{selectedVehicle.isBanned ? (
											<p className="mt-2 inline-flex rounded-full border border-red-900/60 bg-red-950/40 px-2 py-0.5 text-xs font-semibold text-red-200">
												Banido
											</p>
										) : null}
										<p className="text-sm text-zinc-500">
											VIN: {selectedVehicle.vin}
										</p>
										<p className="truncate text-sm text-zinc-600">
											{selectedVehicle.imageUrl ? (
												<a
													href={selectedVehicle.imageUrl}
													target="_blank"
													rel="noreferrer"
													className="text-zinc-300 hover:text-zinc-100"
												>
													{selectedVehicle.imageUrl}
												</a>
											) : (
												"Sem imagem"
											)}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => {
											const next = !selectedVehicle.isBanned;
											void setVehicleBanned(selectedVehicle._id, next);
										}}
										className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-900"
									>
										{selectedVehicle.isBanned ? "Desbanir" : "Banir"}
									</button>
									<button
										type="button"
										onClick={() => {
											void deleteVehicle(selectedVehicle._id);
										}}
										className="rounded-xl border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-950/60"
									>
										Deletar
									</button>
									<button
										type="button"
										onClick={() => setSelectedVehicleId(null)}
										className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-900"
									>
										Fechar
									</button>
								</div>
							</div>

							<div className="mt-5 rounded-xl border border-zinc-900 bg-zinc-950/60 p-3">
								<p className="text-sm font-semibold text-zinc-200">Proprietário</p>
								{selectedVehicleOwner ? (
									<div className="mt-1 space-y-1">
										<p className="text-sm text-zinc-100">
											{selectedVehicleOwner.name}
										</p>
										<p className="text-sm text-zinc-500">
											{selectedVehicleOwner.stateId
												? `State ID: ${selectedVehicleOwner.stateId}`
												: "Sem State ID"}
										</p>
										<p className="text-sm text-zinc-600">
											{selectedVehicleOwner.phone || "Sem telefone"}
										</p>
										<p className="text-sm text-zinc-600">
											{selectedVehicleOwner.discordTag || "Sem Discord"}
										</p>
									</div>
								) : (
									<p className="mt-1 text-sm text-zinc-500">
										Proprietário não encontrado.
									</p>
								)}
							</div>

							<div className="mt-5">
								<h4 className="text-sm font-semibold text-zinc-200">
									Histórico do veículo
								</h4>
								<div className="mt-3 space-y-3">
									{selectedVehicleOrders.length === 0 ? (
										<p className="text-sm text-zinc-500">
											Nenhum registro encontrado para este veículo.
										</p>
									) : (
										selectedVehicleOrders.map((order) => (
											<div
												key={order._id}
												className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-3"
											>
												<div className="flex items-start justify-between gap-3">
													<div className="min-w-0">
														<p className="truncate text-sm font-semibold text-zinc-100">
															{orderTypeLabel(order.type)}
														</p>
														<p className="text-sm text-zinc-500">
															{(order.description || "").trim() || "Sem descrição"}
														</p>
														<p className="text-sm text-zinc-600">
															Cliente: {order.clientId?.name || "-"}
														</p>
														<p className="text-sm text-zinc-600">
															Mecânico:{" "}
															{order.createdBy?.username ||
																order.createdBy?.name ||
																order.createdBy?.discordId ||
																"-"}
														</p>
													</div>
													<div className="shrink-0 text-right">
														{order.createdAt ? (
															<p className="text-xs text-zinc-600">
																{new Date(order.createdAt).toLocaleString("pt-BR")}
															</p>
														) : null}
													</div>
												</div>
											</div>
										))
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}

function orderVehicleLabel(order: OrderItem) {
	if (!order.vehicleId) return "-";
	if (typeof order.vehicleId === "string") return "-";
	const model = order.vehicleId.model || "";
	const vin = order.vehicleId.vin || order.vehicleId.plate || "";
	if (!model && !vin) return "-";
	return vin ? `${model} - ${vin}` : model;
}

export function HistoryPanel({
	clients,
	vehicles,
	orders,
}: {
	clients: ClientItem[];
	vehicles: VehicleItem[];
	orders: OrderItem[];
}) {
	const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);

	useEffect(() => {
		if (!isCreateOrderOpen) return;
		function onKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") setIsCreateOrderOpen(false);
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isCreateOrderOpen]);

	return (
		<div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4 lg:col-span-1">
			<div className="mb-4 flex items-center justify-between gap-3">
				<h2 className="text-sm font-semibold text-zinc-200">Histórico</h2>
				<button
					type="button"
					onClick={() => setIsCreateOrderOpen(true)}
					className="rounded-xl bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
				>
					Novo registro
				</button>
			</div>

			<div className="space-y-3">
				{orders.map((order) => (
					<div
						key={order._id}
						className="rounded-xl border border-zinc-900 bg-zinc-950 p-3"
					>
						<p className="text-sm font-semibold text-zinc-100">
							{orderTypeLabel(order.type)}
						</p>
						<p className="text-sm text-zinc-500">
							{(order.description || "").trim() || "Sem descrição"}
						</p>
						<p className="text-sm text-zinc-600">
							Cliente: {order.clientId?.name || "-"}
						</p>
						<p className="text-sm text-zinc-600">
							Veículo: {orderVehicleLabel(order)}
						</p>
						<p className="text-sm text-zinc-600">
							Mecânico:{" "}
							{order.createdBy?.username ||
								order.createdBy?.name ||
								order.createdBy?.discordId ||
								"-"}
						</p>
					</div>
				))}
			</div>

			{isCreateOrderOpen ? (
				<div
					className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4"
					onMouseDown={(e) => {
						if (e.target === e.currentTarget) setIsCreateOrderOpen(false);
					}}
				>
					<div className="mx-auto flex min-h-full items-center justify-center">
						<div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
							<div className="flex items-center justify-between gap-4">
								<h3 className="text-lg font-semibold text-zinc-100">
									Novo registro
								</h3>
								<button
									type="button"
									onClick={() => setIsCreateOrderOpen(false)}
									className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-900"
								>
									Fechar
								</button>
							</div>
							<div className="mt-4">
								<OrderForm clients={clients} vehicles={vehicles} />
							</div>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
