"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastVariant = "success" | "error" | "warning";

type ToastItem = {
	id: string;
	variant: ToastVariant;
	message: string;
	isLeaving?: boolean;
};

type ToastApi = {
	success: (message: string) => void;
	error: (message: string) => void;
	warning: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

function variantClasses(variant: ToastVariant) {
	if (variant === "success") {
		return "border-green-900/60 bg-green-950/60 text-green-100";
	}
	if (variant === "warning") {
		return "border-yellow-900/60 bg-yellow-950/60 text-yellow-100";
	}
	return "border-red-900/60 bg-red-950/60 text-red-100";
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = useState<ToastItem[]>([]);

	const fadeMs = 400;
	const autoDismissMs = 3500;

	const removeToast = useCallback((id: string) => {
		setToasts((current) => current.filter((toast) => toast.id !== id));
	}, []);

	const startCloseToast = useCallback(
		(id: string) => {
			setToasts((current) =>
				current.map((t) => (t.id === id ? { ...t, isLeaving: true } : t)),
			);
			window.setTimeout(() => removeToast(id), fadeMs);
		},
		[fadeMs, removeToast],
	);

	const pushToast = useCallback(
		(variant: ToastVariant, message: string) => {
			const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
			setToasts((current) => [...current, { id, variant, message }]);
			window.setTimeout(() => startCloseToast(id), Math.max(0, autoDismissMs - fadeMs));
		},
		[autoDismissMs, fadeMs, startCloseToast],
	);

	const api = useMemo<ToastApi>(
		() => ({
			success: (message) => pushToast("success", message),
			error: (message) => pushToast("error", message),
			warning: (message) => pushToast("warning", message),
		}),
		[pushToast],
	);

	return (
		<ToastContext.Provider value={api}>
			{children}
			<div className="fixed right-4 top-4 z-[9999] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2">
				{toasts.map((toast) => (
					<div
						key={toast.id}
						role="status"
						className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 shadow-lg ${variantClasses(
							toast.variant,
						)} transition-opacity duration-[400ms] ${toast.isLeaving ? "opacity-0" : "opacity-100"
							}`}
					>
						<p className="min-w-0 text-sm font-semibold">{toast.message}</p>
						<button
							type="button"
							onClick={() => startCloseToast(toast.id)}
							className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-inherit hover:bg-white/10"
						>
							Fechar
						</button>
					</div>
				))}
			</div>
		</ToastContext.Provider>
	);
}

export function useToast() {
	const ctx = useContext(ToastContext);
	if (!ctx) {
		throw new Error("useToast must be used within ToastProvider");
	}
	return ctx;
}
