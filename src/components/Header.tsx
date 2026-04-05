import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { HeaderActions } from "@/components/HeaderActions";

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

export async function Header({
	clients,
	vehicles,
}: {
	clients: ClientItem[];
	vehicles: VehicleItem[];
}) {
	const session = await getServerSession(authOptions);

	return (
		<header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur">
			<div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
				<div>
					<h1 className="text-lg font-semibold tracking-tight">Underground CRM</h1>
					<p className="text-sm text-zinc-500">
						Clientes, veículos e histórico
					</p>
				</div>

				<div className="flex items-center gap-3">
					<HeaderActions clients={clients} vehicles={vehicles} />
					<div className="text-right leading-tight">
						<p className="text-sm font-medium text-zinc-200">
							{session?.user?.name || "—"}
						</p>
						<p className="text-xs text-zinc-500">{session?.user?.role || ""}</p>
					</div>
					<LogoutButton />
				</div>
			</div>
		</header>
	);
}
