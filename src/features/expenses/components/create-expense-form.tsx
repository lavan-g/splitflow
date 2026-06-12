"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { AuthFeedbackToast } from "@/features/auth/components/auth-feedback-toast";
import { createExpenseAction } from "@/features/expenses/actions/expense-actions";
import {
  EXPENSE_FORM_INITIAL_STATE,
  type SplitType,
} from "@/features/expenses/types/expense-form-state";
import { roundCurrency } from "@/features/expenses/utils/split-calculations";

type GroupOption = {
  id: string;
  name: string;
  groupCode: string;
  members: Array<{
    userId: string;
    fullName: string;
    username: string;
  }>;
};

type CreateExpenseFormProps = {
  groups: GroupOption[];
  currentUserId: string;
};

function computeEqualSplits(memberIds: string[], amount: number) {
  if (memberIds.length === 0) {
    return [];
  }

  const base = roundCurrency(amount / memberIds.length);
  const splits = memberIds.map((userId) => ({
    userId,
    amount: base,
  }));

  const runningTotal = splits.reduce((sum, split) => sum + split.amount, 0);
  const diff = roundCurrency(amount - runningTotal);
  const lastIndex = splits.length - 1;
  splits[lastIndex] = {
    ...splits[lastIndex],
    amount: roundCurrency(splits[lastIndex].amount + diff),
  };

  return splits;
}

export function CreateExpenseForm({ groups, currentUserId }: CreateExpenseFormProps) {
  const [state, formAction, isPending] = useActionState(
    createExpenseAction,
    EXPENSE_FORM_INITIAL_STATE,
  );

  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [notes, setNotes] = useState("");
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const receiptInputRef = useRef<HTMLInputElement | null>(null);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === groupId) ?? null,
    [groupId, groups],
  );
  const members = useMemo(() => selectedGroup?.members ?? [], [selectedGroup]);
  const amount = Number.parseFloat(amountInput || "0");
  const isAmountValid = Number.isFinite(amount) && amount > 0;

  const memberIds = useMemo(() => members.map((member) => member.userId), [members]);

  const computedSplits = useMemo(() => {
    if (!isAmountValid || memberIds.length === 0) {
      return [];
    }

    if (splitType === "equal") {
      return computeEqualSplits(memberIds, amount);
    }

    if (splitType === "percentage") {
      const withPct = memberIds.map((userId) => {
        const percentage = Number.parseFloat(percentages[userId] ?? "0");
        return {
          userId,
          percentage: Number.isFinite(percentage) ? percentage : 0,
        };
      });

      const rows = withPct.map((row) => ({
        userId: row.userId,
        percentage: row.percentage,
        amount: roundCurrency((amount * row.percentage) / 100),
      }));

      const runningTotal = rows.reduce((sum, row) => sum + row.amount, 0);
      const diff = roundCurrency(amount - runningTotal);
      const lastIndex = rows.length - 1;
      if (lastIndex >= 0) {
        rows[lastIndex] = {
          ...rows[lastIndex],
          amount: roundCurrency(rows[lastIndex].amount + diff),
        };
      }
      return rows;
    }

    const rows = memberIds.map((userId) => ({
      userId,
      amount: roundCurrency(Number.parseFloat(customAmounts[userId] ?? "0") || 0),
    }));
    return rows;
  }, [amount, customAmounts, isAmountValid, memberIds, percentages, splitType]);

  const percentageTotal = useMemo(
    () =>
      members.reduce(
        (sum, member) => sum + (Number.parseFloat(percentages[member.userId] ?? "0") || 0),
        0,
      ),
    [members, percentages],
  );

  const splitTotal = useMemo(
    () => roundCurrency(computedSplits.reduce((sum, split) => sum + split.amount, 0)),
    [computedSplits],
  );

  const isSplitValid = useMemo(() => {
    if (!isAmountValid || members.length === 0) {
      return false;
    }

    if (splitType === "percentage") {
      return Math.abs(percentageTotal - 100) <= 0.01 && Math.abs(splitTotal - amount) <= 0.01;
    }

    return Math.abs(splitTotal - amount) <= 0.01;
  }, [amount, isAmountValid, members.length, percentageTotal, splitTotal, splitType]);

  const isFormValid =
    Boolean(groupId) &&
    title.trim().length >= 2 &&
    isAmountValid &&
    Boolean(paidBy) &&
    members.some((member) => member.userId === paidBy) &&
    isSplitValid;

  useEffect(() => {
    if (!state.success) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTitle("");
      setAmountInput("");
      setSplitType("equal");
      setNotes("");
      setPercentages({});
      setCustomAmounts({});
      setPaidBy(selectedGroup?.members[0]?.userId ?? currentUserId);

      if (receiptInputRef.current) {
        receiptInputRef.current.value = "";
      }
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentUserId, selectedGroup, state.success]);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="expense-group" className="text-sm font-medium text-slate-200">
            Group
          </label>
          <select
            id="expense-group"
            name="groupId"
            value={groupId}
            onChange={(event) => {
              const nextGroupId = event.target.value;
              setGroupId(nextGroupId);
              const firstMember = groups.find((group) => group.id === nextGroupId)?.members[0];
              setPaidBy(firstMember?.userId ?? currentUserId);
            }}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none ring-indigo-500/50 transition focus:ring-2"
            required
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id} className="bg-slate-900">
                {group.name} ({group.groupCode})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="expense-paid-by" className="text-sm font-medium text-slate-200">
            Paid by
          </label>
          <select
            id="expense-paid-by"
            name="paidBy"
            value={paidBy}
            onChange={(event) => setPaidBy(event.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none ring-indigo-500/50 transition focus:ring-2"
            required
          >
            {members.map((member) => (
              <option key={member.userId} value={member.userId} className="bg-slate-900">
                {member.fullName} (@{member.username})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="expense-title" className="text-sm font-medium text-slate-200">
          Title
        </label>
        <input
          id="expense-title"
          name="title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none ring-indigo-500/50 transition focus:ring-2"
          placeholder="Dinner at Bistro"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="expense-amount" className="text-sm font-medium text-slate-200">
          Amount
        </label>
        <input
          id="expense-amount"
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          value={amountInput}
          onChange={(event) => setAmountInput(event.target.value)}
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none ring-indigo-500/50 transition focus:ring-2"
          placeholder="0.00"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-200">Split type</p>
        <div className="grid grid-cols-3 gap-2">
          {(["equal", "percentage", "custom"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSplitType(type)}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                splitType === type
                  ? "border-indigo-400/50 bg-indigo-500/15 text-indigo-100"
                  : "border-white/20 bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
            >
              {type === "equal" ? "Equal" : type === "percentage" ? "Percentage" : "Custom"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-sm font-medium text-slate-200">Members split</p>
        {members.map((member) => {
          const splitRow = computedSplits.find((split) => split.userId === member.userId);

          return (
            <div key={member.userId} className="grid items-center gap-2 md:grid-cols-3">
              <p className="text-sm text-slate-100">
                {member.fullName} <span className="text-xs text-slate-300">@{member.username}</span>
              </p>

              {splitType === "percentage" ? (
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={percentages[member.userId] ?? ""}
                  onChange={(event) =>
                    setPercentages((previous) => ({
                      ...previous,
                      [member.userId]: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-white/20 bg-slate-900/50 px-2 py-1.5 text-sm text-slate-100 outline-none ring-indigo-500/50 transition focus:ring-2"
                  placeholder="%"
                />
              ) : splitType === "custom" ? (
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customAmounts[member.userId] ?? ""}
                  onChange={(event) =>
                    setCustomAmounts((previous) => ({
                      ...previous,
                      [member.userId]: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-white/20 bg-slate-900/50 px-2 py-1.5 text-sm text-slate-100 outline-none ring-indigo-500/50 transition focus:ring-2"
                  placeholder="Amount"
                />
              ) : (
                <p className="text-sm text-slate-300">Auto-calculated</p>
              )}

              <p className="text-sm font-medium text-indigo-200">
                {splitRow ? splitRow.amount.toFixed(2) : "0.00"}
              </p>
            </div>
          );
        })}

        {splitType === "percentage" ? (
          <p className="text-xs text-slate-300">Percentage total: {percentageTotal.toFixed(2)}%</p>
        ) : null}
        <p className="text-xs text-slate-300">
          Split total: {splitTotal.toFixed(2)} / {isAmountValid ? amount.toFixed(2) : "0.00"}
        </p>
        {!isSplitValid ? (
          <p className="text-xs text-rose-300">
            Split values must match the total amount.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="expense-notes" className="text-sm font-medium text-slate-200">
          Notes
        </label>
        <textarea
          id="expense-notes"
          name="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none ring-indigo-500/50 transition focus:ring-2"
          placeholder="Optional notes..."
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="expense-receipt" className="text-sm font-medium text-slate-200">
          Receipt (optional)
        </label>
        <input
          id="expense-receipt"
          name="receipt"
          type="file"
          ref={receiptInputRef}
          accept=".pdf,image/jpeg,image/png"
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-200"
        />
      </div>

      <input type="hidden" name="splitType" value={splitType} />
      <input type="hidden" name="splitsPayload" value={JSON.stringify(computedSplits)} />

      {state.message ? (
        <AuthFeedbackToast message={state.message} success={state.success} />
      ) : null}

      <button
        type="submit"
        disabled={isPending || !isFormValid}
        className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Saving expense..." : "Add expense"}
      </button>
    </form>
  );
}
