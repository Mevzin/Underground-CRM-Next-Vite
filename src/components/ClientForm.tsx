"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

export function ClientForm() {
    const toast = useToast();
    const router = useRouter();
    const [form, setForm] = useState({
        name: "",
        stateId: "",
        phone: "",
        discordTag: "",
        crew: "",
        notes: "",
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const res = await fetch("/api/clients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });

        if (!res.ok) {
            const data = await res.json();
            toast.error(
                data?.message?.fieldErrors
                    ? "Erro de validação"
                    : data?.message || "Erro ao criar cliente",
            );
            return;
        }

        toast.success("Cliente cadastrado com sucesso");
        setForm({
            name: "",
            stateId: "",
            phone: "",
            discordTag: "",
            crew: "",
            notes: "",
        });
        router.refresh();
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-3 rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4"
        >
            <h2 className="text-sm font-semibold text-zinc-200">Novo cliente</h2>
            <label className="block space-y-1">
                <span className="text-xs font-semibold text-zinc-500">Nome</span>
                <input
                    className="w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
                    placeholder="Nome"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
            </label>
            <label className="block space-y-1">
                <span className="text-xs font-semibold text-zinc-500">State ID</span>
                <input
                    className="w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
                    placeholder="State ID"
                    value={form.stateId}
                    onChange={(e) => setForm({ ...form, stateId: e.target.value })}
                />
            </label>
            <label className="block space-y-1">
                <span className="text-xs font-semibold text-zinc-500">Telefone</span>
                <input
                    className="w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
                    placeholder="Telefone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
            </label>
            <label className="block space-y-1">
                <span className="text-xs font-semibold text-zinc-500">Discord</span>
                <input
                    className="w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
                    placeholder="Discord"
                    value={form.discordTag}
                    onChange={(e) => setForm({ ...form, discordTag: e.target.value })}
                />
            </label>
            <label className="block space-y-1">
                <span className="text-xs font-semibold text-zinc-500">Crew</span>
                <input
                    className="w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
                    placeholder="Crew"
                    value={form.crew}
                    onChange={(e) => setForm({ ...form, crew: e.target.value })}
                />
            </label>
            <label className="block space-y-1">
                <span className="text-xs font-semibold text-zinc-500">Observações</span>
                <textarea
                    className="min-h-24 w-full rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
                    placeholder="Observações"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
            </label>
            <button className="inline-flex items-center justify-center rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200">
                Salvar
            </button>
        </form>
    );
}
