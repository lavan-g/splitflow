"use client";

import { useActionState } from "react";

import { createSettlementAction } from "@/features/settlements/actions/settlement-actions";
import { type SettlementFormState } from "@/features/settlements/types/settlement-form-state";

const INITIAL_STATE: SettlementFormState = { success: false, message: "" };

type Peer = {
  userId: string;
  fullName: string;
  username: string;
};

type Props = {
  peers: Peer[];
};

export function CreateSettlementForm({ peers }: Props) {
  const [state, formAction, isPending] = useActionState(
    createSettlementAction,
    INITIAL_STATE,
  );

  if (peers.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No group members to settle with yet.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-200">Paying to</label>
        <select
          name="receiverId"
          required
          className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none ring-indigo-500/50 transition focus:ring-2"
        >
          <option value="" className="bg-slate-900">Select a person…</option>
          {peers.map((p) => (
            <option key={p.userId} value={p.userId} className="bg-slate-900">
              {p.fullName} (@{p.username})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-200">Amount (₹)</label>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          placeholder="0.00"
          className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none ring-indigo-500/50 transition focus:ring-2"
        />
      </div>

      {state.message && (
        <p className={`text-sm ${state.success ? "text-emerald-400" : "text-rose-300"}`}>
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Recording…" : "Record payment"}
      </button>
    </form>
  );
}
