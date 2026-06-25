"use client";

import { useActionState } from "react";

import {
  SETTLEMENT_FORM_INITIAL_STATE,
  type SettlementFormState,
} from "@/features/settlements/types/settlement-form-state";
import { createSettlementAction } from "@/features/settlements/actions/settlement-actions";

type Peer = {
  userId: string;
  fullName: string;
  username: string;
};

type Props = {
  peers: Peer[];
};

export function CreateSettlementForm({ peers }: Props) {
  const [state, formAction, isPending] = useActionState<SettlementFormState, FormData>(
    createSettlementAction,
    SETTLEMENT_FORM_INITIAL_STATE,
  );

  if (peers.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No peers found. Join a group and add expenses first.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="receiverId" className="mb-1.5 block text-sm font-medium text-slate-300">
          Paying to
        </label>
        <select
          id="receiverId"
          name="receiverId"
          required
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none"
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
        <label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-slate-300">
          Amount (₹)
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          placeholder="0.00"
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
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
        className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
      >
        {isPending ? "Recording…" : "Record payment"}
      </button>
    </form>
  );
}
