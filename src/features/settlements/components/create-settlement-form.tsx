"use client";

import { useActionState, useEffect, useState } from "react";

import { createSettlementAction } from "@/features/settlements/actions/settlement-actions";
import {
  SETTLEMENT_FORM_INITIAL_STATE,
  type SettlementFormState,
} from "@/features/settlements/types/settlement-form-state";

type Peer = {
  userId: string;
  fullName: string;
  username: string;
};

type Props = {
  peers: Peer[];
  /** Signed balance per peer: positive = they owe you, negative = you owe them. */
  balanceByPeer?: Record<string, number>;
};

export function CreateSettlementForm({ peers, balanceByPeer = {} }: Props) {
  const [state, formAction, isPending] = useActionState<SettlementFormState, FormData>(
    createSettlementAction,
    SETTLEMENT_FORM_INITIAL_STATE,
  );

  const [receiverId, setReceiverId] = useState("");
  const [amount, setAmount] = useState("");

  const selectedBalance = receiverId ? balanceByPeer[receiverId] : undefined;
  const suggestedPayAmount =
    selectedBalance !== undefined && selectedBalance < 0
      ? Math.abs(selectedBalance)
      : undefined;

  useEffect(() => {
    if (!receiverId) {
      setAmount("");
      return;
    }

    const balance = balanceByPeer[receiverId];
    if (balance !== undefined && balance < 0) {
      setAmount(Math.abs(balance).toFixed(2));
    }
  }, [receiverId, balanceByPeer]);

  if (peers.length === 0) {
    return (
      <p className="text-sm text-slate-400">No group members to settle with yet.</p>
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
          value={receiverId}
          onChange={(e) => setReceiverId(e.target.value)}
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none"
        >
          <option value="" className="bg-slate-900">
            Select a person…
          </option>
          {peers.map((p) => {
            const balance = balanceByPeer[p.userId];
            let suffix = "";
            if (balance !== undefined && balance < -0.01) {
              suffix = ` — you owe ₹${Math.abs(balance).toFixed(2)}`;
            } else if (balance !== undefined && balance > 0.01) {
              suffix = ` — owes you ₹${balance.toFixed(2)}`;
            }
            return (
              <option key={p.userId} value={p.userId} className="bg-slate-900">
                {p.fullName} (@{p.username}){suffix}
              </option>
            );
          })}
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
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
        />
        {suggestedPayAmount !== undefined && (
          <p className="mt-1 text-xs text-indigo-300">
            Suggested based on your balance: ₹{suggestedPayAmount.toFixed(2)}
          </p>
        )}
        {receiverId &&
          selectedBalance !== undefined &&
          selectedBalance >= -0.01 &&
          selectedBalance <= 0.01 && (
            <p className="mt-1 text-xs text-slate-500">You are settled with this person.</p>
          )}
        {receiverId && selectedBalance !== undefined && selectedBalance > 0.01 && (
          <p className="mt-1 text-xs text-slate-500">
            They owe you — enter an amount only if you are recording a payment you made to them.
          </p>
        )}
      </div>

      {state.message && (
        <p className={`text-sm ${state.success ? "text-emerald-400" : "text-rose-300"}`}>
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Recording…" : "Record payment"}
      </button>
    </form>
  );
}
