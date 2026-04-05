"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ClientForm } from "@/components/ClientForm";
import { VehicleForm } from "@/components/VehicleForm";
import { OrderForm } from "@/components/OrderForm";

type ClientItem = {
	_id: string;
	name: string;
};

type VehicleItem = {
	_id: string;
	clientId: string;
	model: string;
	vin: string;
};

type ModalType = "client" | "vehicle" | "order";

export function HeaderActions({
	clients,
	vehicles,
}: {
	clients: ClientItem[];
	vehicles: VehicleItem[];
}) {
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [openModal, setOpenModal] = useState<ModalType | null>(null);
	const dropdownRef = useRef<HTMLDivElement | null>(null);
	const canUseDOM = typeof document !== "undefined";

	const dropdownItems = useMemo(
		() => [
			{ key: "client" as const, label: "Novo cliente" },
			{ key: "vehicle" as const, label: "Novo veículo" },
			{ key: "order" as const, label: "Novo registro" },
		],
		[],
	);

	useEffect(() => {
		if (!dropdownOpen) return;

		function onMouseDown(e: MouseEvent) {
			if (!dropdownRef.current) return;
			if (e.target instanceof Node && dropdownRef.current.contains(e.target)) return;
			setDropdownOpen(false);
		}

		document.addEventListener("mousedown", onMouseDown);
		return () => document.removeEventListener("mousedown", onMouseDown);
	}, [dropdownOpen]);

	useEffect(() => {
		if (!dropdownOpen && !openModal) return;

		function onKeyDown(e: KeyboardEvent) {
			if (e.key !== "Escape") return;
			if (openModal) {
				setOpenModal(null);
				return;
			}
			setDropdownOpen(false);
		}

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [dropdownOpen, openModal]);

	return (
		<div className="relative" ref={dropdownRef}>
			<button
				type="button"
				onClick={() => setDropdownOpen((v) => !v)}
				className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-900"
			>
				Novo
			</button>

			{dropdownOpen ? (
				<div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-xl shadow-black/20">
					{dropdownItems.map((item) => (
						<button
							type="button"
							key={item.key}
							onClick={() => {
								setDropdownOpen(false);
								setOpenModal(item.key);
							}}
							className="block w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-100 hover:bg-zinc-900"
						>
							{item.label}
						</button>
					))}
				</div>
			) : null}

			{canUseDOM && openModal
				? createPortal(
					<div
						className="fixed inset-0 z-[70] overflow-y-auto bg-black/70 p-4"
						onMouseDown={(e) => {
							if (e.target === e.currentTarget) setOpenModal(null);
						}}
					>
						<div className="mx-auto flex min-h-full items-center justify-center">
							<div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
								<div className="mb-4 flex items-start justify-between gap-4">
									<p className="text-sm font-semibold text-zinc-200">
										{openModal === "client"
											? "Novo cliente"
											: openModal === "vehicle"
												? "Novo veículo"
												: "Novo registro"}
									</p>
									<button
										type="button"
										onClick={() => setOpenModal(null)}
										className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-900"
									>
										Fechar
									</button>
								</div>

								{openModal === "client" ? <ClientForm /> : null}
								{openModal === "vehicle" ? (
									<VehicleForm clients={clients} />
								) : null}
								{openModal === "order" ? (
									<OrderForm clients={clients} vehicles={vehicles} />
								) : null}
							</div>
						</div>
					</div>,
					document.body,
				)
				: null}
		</div>
	);
}
