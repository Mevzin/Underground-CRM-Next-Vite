import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Client } from "@/models/Client";
import { Vehicle } from "@/models/Vehicle";
import { Order } from "@/models/Order";
import { Header } from "@/components/Header";
import { ClientList, VehicleList } from "@/components/ClientList";

type ClientItem = {
	_id: string;
	name: string;
	stateId?: string;
	phone?: string;
	discordTag?: string;
};

type VehicleItem = {
	_id: string;
	clientId: string;
	model: string;
	vin: string;
	imageUrl?: string;
};

type OrderItem = {
	_id: string;
	title: string;
	type: string;
	clientId?: { name?: string } | null;
	createdBy?: { discordId?: string; username?: string; name?: string } | null;
	vehicleId?: { model: string; vin?: string; plate?: string } | null;
};

function orderTypeLabel(type: string) {
	if (type === "stage_installation") return "Instalação de stage";
	if (type === "removal") return "Remoção";
	if (type === "renewal") return "Renovação";
	return type;
}

export default async function HomePage() {
	const session = await getServerSession(authOptions);
	if (!session?.user?.discordId) redirect("/login");

	await connectToDatabase();

	const currentUser = await User.findOne({
		discordId: session.user.discordId,
	}).lean();
	if (!currentUser?.isAuthorized) {
		return (
			<main className="flex min-h-screen items-center justify-center px-6">
				<div className="max-w-lg rounded-2xl border border-zinc-900 bg-zinc-950/40 p-8 text-center">
					<h1 className="mb-3 text-xl font-semibold tracking-tight text-zinc-100">
						Acesso pendente
					</h1>
					<p className="text-sm text-zinc-500">
						Sua conta existe, mas ainda não foi autorizada por um gerente da
						mecânica.
					</p>
				</div>
			</main>
		);
	}

	await Order.updateMany(
		{ $or: [{ price: { $exists: true } }, { status: { $exists: true } }] },
		{ $unset: { price: "", status: "" } },
		{ strict: false },
	);

	const [clients, vehicles, orders] = await Promise.all([
		Client.find().sort({ createdAt: -1 }).lean(),
		Vehicle.find().sort({ createdAt: -1 }).lean(),
		Order.find()
			.populate("clientId", "name")
			.populate("createdBy", "username name discordId")
			.populate("vehicleId", "model vin plate")
			.sort({ createdAt: -1 })
			.lean(),
	]);

	const serializedClients: ClientItem[] = JSON.parse(JSON.stringify(clients));
	const serializedVehiclesRaw = JSON.parse(JSON.stringify(vehicles)) as unknown[];
	const serializedVehicles: VehicleItem[] = serializedVehiclesRaw
		.map((v) => v as Record<string, unknown>)
		.map((v) => ({
			...(v as unknown as VehicleItem),
			vin:
				(typeof v.vin === "string" && v.vin.trim().length > 0
					? v.vin
					: typeof v.plate === "string"
						? v.plate
						: "") || "",
		}));

	const serializedOrdersRaw = JSON.parse(JSON.stringify(orders)) as unknown[];
	const serializedOrders: OrderItem[] = serializedOrdersRaw
		.map((o) => o as Record<string, unknown>)
		.map((o) => {
			const vehicleId = (o.vehicleId as
				| { model: string; vin?: string; plate?: string }
				| null
				| undefined) ?? null;

			return {
				...(o as unknown as OrderItem),
				vehicleId: vehicleId
					? { ...vehicleId, vin: vehicleId.vin || vehicleId.plate || "" }
					: null,
			};
		});

	return (
		<main>
			<Header clients={serializedClients} vehicles={serializedVehicles} />

			<section className="mx-auto max-w-6xl space-y-8 px-6 py-8">
				<div className="grid gap-6 lg:grid-cols-3">
					<ClientList
						clients={serializedClients}
						vehicles={serializedVehicles}
						orders={serializedOrders}
					/>
					<VehicleList
						vehicles={serializedVehicles}
						orders={serializedOrders}
						clients={serializedClients}
					/>

					<div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4 lg:col-span-1">
						<h2 className="mb-4 text-sm font-semibold text-zinc-200">
							Histórico
						</h2>
						<div className="space-y-3">
							{serializedOrders.map((order) => (
								<div
									key={order._id}
									className="rounded-xl border border-zinc-900 bg-zinc-950 p-3"
								>
									<p className="text-sm font-semibold text-zinc-100">
										{order.title}
									</p>
									<p className="text-sm text-zinc-500">
										Tipo: {orderTypeLabel(order.type)}
									</p>
									<p className="text-sm text-zinc-600">
										Cliente: {order.clientId?.name || "-"}
									</p>
									<p className="text-sm text-zinc-600">
										Veículo:{" "}
										{order.vehicleId
											? `${order.vehicleId.model} - ${order.vehicleId.vin}`
											: "-"}
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
					</div>
				</div>
			</section>
		</main>
	);
}
