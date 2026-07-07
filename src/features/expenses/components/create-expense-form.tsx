"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthFeedbackToast } from "@/features/auth/components/auth-feedback-toast";
import {
  createExpenseAction,
  updateExpenseAction,
} from "@/features/expenses/actions/expense-actions";
import {
  EXPENSE_FORM_INITIAL_STATE,
  type SplitPayloadEntry,
  type SplitType,
} from "@/features/expenses/types/expense-form-state";
import {
  computeEqualSplits,
  computePercentageSplits,
  distributeEqualPercentages,
  isAmountMatching,
  roundCurrency,
} from "@/features/expenses/utils/split-calculations";
import { payerDisplayName } from "@/features/expenses/utils/expense-owes";

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

type EditExpenseValues = {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  paidBy: string;
  notes: string;
  splits: SplitPayloadEntry[];
  hasReceipt: boolean;
};

type CreateExpenseFormProps = {
  groups: GroupOption[];
  currentUserId: string;
  editExpense?: EditExpenseValues;
};

function inferInitialSplitState(splits: SplitPayloadEntry[]) {
  if (splits.length === 0) {
    return {
      splitType: "equal" as SplitType,
      customAmounts: {} as Record<string, string>,
      percentages: {} as Record<string, string>,
    };
  }

  const first = splits[0].amount;
  const allEqual = splits.every((s) => Math.abs(s.amount - first) < 0.01);

  if (allEqual) {
    return {
      splitType: "equal" as SplitType,
      customAmounts: {} as Record<string, string>,
      percentages: {} as Record<string, string>,
    };
  }

  const customAmounts: Record<string, string> = {};
  for (const split of splits) {
    customAmounts[split.userId] = split.amount.toFixed(2);
  }

  return {
    splitType: "custom" as SplitType,
    customAmounts,
    percentages: {} as Record<string, string>,
  };
}

export function CreateExpenseForm({ groups, currentUserId, editExpense }: CreateExpenseFormProps) {
  const router = useRouter();
  const isEditing = Boolean(editExpense);
  const initialSplit = editExpense ? inferInitialSplitState(editExpense.splits) : null;

  const [state, formAction, isPending] = useActionState(
    isEditing ? updateExpenseAction : createExpenseAction,
    EXPENSE_FORM_INITIAL_STATE,
  );

  const [groupId, setGroupId] = useState(editExpense?.groupId ?? groups[0]?.id ?? "");
  const [title, setTitle] = useState(editExpense?.title ?? "");
  const [amountInput, setAmountInput] = useState(
    editExpense ? editExpense.amount.toFixed(2) : "",
  );
  const [splitType, setSplitType] = useState<SplitType>(initialSplit?.splitType ?? "equal");
  const [notes, setNotes] = useState(editExpense?.notes ?? "");
  const [paidBy, setPaidBy] = useState(editExpense?.paidBy ?? currentUserId);
  const [percentages, setPercentages] = useState<Record<string, string>>(
    initialSplit?.percentages ?? {},
  );
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(
    initialSplit?.customAmounts ?? {},
  );
  const [includedMembers, setIncludedMembers] = useState<Record<string, boolean>>({});
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement | null>(null);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === groupId) ?? null,
    [groupId, groups],
  );
  const members = useMemo(() => selectedGroup?.members ?? [], [selectedGroup]);
  const amount = Number.parseFloat(amountInput || "0");
  const isAmountValid = Number.isFinite(amount) && amount > 0;

  const memberIds = useMemo(() => members.map((member) => member.userId), [members]);

  useEffect(() => {
    setIncludedMembers((previous) => {
      const next: Record<string, boolean> = {};

      for (const member of members) {
        if (editExpense) {
          const wasInSplit = editExpense.splits.some((split) => split.userId === member.userId);
          next[member.userId] = previous[member.userId] ?? wasInSplit;
        } else {
          next[member.userId] = previous[member.userId] ?? true;
        }
      }

      return next;
    });
  }, [editExpense, members]);

  const includedMemberIds = useMemo(
    () => memberIds.filter((memberId) => includedMembers[memberId] !== false),
    [includedMembers, memberIds],
  );

  const computedSplits = useMemo(() => {
    if (!isAmountValid || includedMemberIds.length === 0) {
      return [];
    }

    if (splitType === "equal") {
      return computeEqualSplits(includedMemberIds, amount);
    }

    if (splitType === "percentage") {
      return computePercentageSplits(includedMemberIds, amount, percentages);
    }

    const rows = includedMemberIds.map((userId) => ({
      userId,
      amount: roundCurrency(Number.parseFloat(customAmounts[userId] ?? "0") || 0),
    }));
    return rows;
  }, [amount, customAmounts, includedMemberIds, isAmountValid, percentages, splitType]);

  function handleSplitTypeChange(nextType: SplitType) {
    if (nextType === "percentage") {
      setPercentages(distributeEqualPercentages(includedMemberIds));
      setCustomAmounts({});
    } else if (nextType === "custom") {
      if (isAmountValid && includedMemberIds.length > 0) {
        const equalSplits = computeEqualSplits(includedMemberIds, amount);
        setCustomAmounts(
          Object.fromEntries(
            equalSplits.map((split) => [split.userId, split.amount.toFixed(2)]),
          ),
        );
      } else {
        setCustomAmounts({});
      }
      setPercentages({});
    } else {
      setPercentages({});
      setCustomAmounts({});
    }

    setSplitType(nextType);
  }

  function handleIncludedMemberChange(userId: string, included: boolean) {
    setIncludedMembers((previous) => ({
      ...previous,
      [userId]: included,
    }));

    if (!included) {
      setPercentages((previous) => {
        const next = { ...previous };
        delete next[userId];
        return next;
      });
      setCustomAmounts((previous) => {
        const next = { ...previous };
        delete next[userId];
        return next;
      });
    }
  }

  const percentageTotal = useMemo(
    () =>
      includedMemberIds.reduce(
        (sum, memberId) => sum + (Number.parseFloat(percentages[memberId] ?? "0") || 0),
        0,
      ),
    [includedMemberIds, percentages],
  );

  const splitTotal = useMemo(
    () => roundCurrency(computedSplits.reduce((sum, split) => sum + split.amount, 0)),
    [computedSplits],
  );

  const isSplitValid = useMemo(() => {
    if (!isAmountValid || includedMemberIds.length === 0) {
      return false;
    }

    if (!isAmountMatching(amount, computedSplits)) {
      return false;
    }

    if (splitType === "percentage") {
      return Math.abs(percentageTotal - 100) <= 0.01;
    }

    return true;
  }, [amount, computedSplits, includedMemberIds.length, isAmountValid, percentageTotal, splitType]);

  const effectivePaidBy = isEditing ? paidBy : currentUserId;
  const payerMember = members.find((member) => member.userId === effectivePaidBy);
  const payerLabel = payerDisplayName(
    effectivePaidBy,
    currentUserId,
    payerMember?.fullName ?? "payer",
  );

  const isFormValid =
    Boolean(groupId) &&
    title.trim().length >= 2 &&
    isAmountValid &&
    Boolean(effectivePaidBy) &&
    members.some((member) => member.userId === effectivePaidBy) &&
    isSplitValid;

  useEffect(() => {
    if (!state.message) {
      return;
    }

    setToastVisible(true);
    const dismissId = window.setTimeout(() => setToastVisible(false), 3000);
    return () => window.clearTimeout(dismissId);
  }, [state.message]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    if (isEditing && editExpense) {
      router.push(`/expenses/${editExpense.id}`);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTitle("");
      setAmountInput("");
      setSplitType("equal");
      setNotes("");
      setPercentages({});
      setCustomAmounts({});
      setIncludedMembers(
        Object.fromEntries(members.map((member) => [member.userId, true])),
      );

      if (receiptInputRef.current) {
        receiptInputRef.current.value = "";
      }
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [editExpense, isEditing, members, router, state.success]);

  return (
    <form action={formAction} className="space-y-5">
      {isEditing && editExpense ? (
        <input type="hidden" name="expenseId" value={editExpense.id} />
      ) : null}
      <input type="hidden" name="removeReceipt" value={removeReceipt ? "true" : "false"} />

      <div className={isEditing ? "grid gap-4 md:grid-cols-2" : "space-y-2"}>
        <div className="space-y-2">
          <label htmlFor="expense-group" className="text-sm font-medium text-slate-200">
            Group
          </label>
          {isEditing ? (
            <>
              <input type="hidden" name="groupId" value={groupId} />
              <p className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-300">
                {selectedGroup?.name ?? "—"} ({selectedGroup?.groupCode ?? "—"})
              </p>
            </>
          ) : (
            <select
              id="expense-group"
              name="groupId"
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none ring-indigo-500/50 transition focus:ring-2"
              required
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id} className="bg-slate-900">
                  {group.name} ({group.groupCode})
                </option>
              ))}
            </select>
          )}
        </div>

        {isEditing ? (
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
        ) : (
          <input type="hidden" name="paidBy" value={currentUserId} />
        )}
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
              onClick={() => handleSplitTypeChange(type)}
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

      {isAmountValid ? <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-sm font-medium text-slate-200">Members split</p>
        <div className="hidden gap-2 text-xs font-medium uppercase tracking-wide text-slate-400 md:grid md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <span />
          <span>Member</span>
          <span>Split</span>
          <span className="text-right">Share / Owes</span>
        </div>
        {members.map((member) => {
          const splitRow = computedSplits.find((split) => split.userId === member.userId);
          const isIncluded = includedMembers[member.userId] !== false;
          const isPayer = member.userId === effectivePaidBy;
          const shareAmount = splitRow?.amount ?? 0;

          return (
            <div
              key={member.userId}
              className={`grid items-center gap-2 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] ${
                isIncluded ? "" : "opacity-50"
              }`}
            >
              <input
                type="checkbox"
                checked={isIncluded}
                onChange={(event) =>
                  handleIncludedMemberChange(member.userId, event.target.checked)
                }
                className="h-4 w-4 rounded border-white/20 bg-slate-900/50 text-indigo-500"
                aria-label={`Include ${member.fullName} in split`}
              />
              <p className="text-sm text-slate-100">
                {member.fullName} <span className="text-xs text-slate-300">@{member.username}</span>
              </p>

              {!isIncluded ? (
                <p className="text-sm text-slate-400 md:col-span-2">Not included</p>
              ) : splitType === "percentage" ? (
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

              {isIncluded ? (
                <div className="text-right">
                  <p className="text-sm font-medium text-indigo-200">
                    ₹{shareAmount.toFixed(2)}
                  </p>
                  {isSplitValid && shareAmount > 0 ? (
                    <p
                      className={`text-xs ${
                        isPayer ? "text-emerald-300" : "text-amber-200"
                      }`}
                    >
                      {isPayer
                        ? "Paid full amount"
                        : member.userId === currentUserId
                          ? `You owe ${payerLabel}`
                          : `Owes ${payerLabel}`}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}

        {includedMemberIds.length === 0 ? (
          <p className="text-xs text-rose-300">Select at least one member to split with.</p>
        ) : null}

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

      </div> : null}

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
        {isEditing && editExpense?.hasReceipt && !removeReceipt ? (
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
            <span>Current receipt attached</span>
            <button
              type="button"
              onClick={() => setRemoveReceipt(true)}
              className="text-xs text-rose-300 hover:underline"
            >
              Remove
            </button>
          </div>
        ) : null}
        {isEditing && editExpense?.hasReceipt && removeReceipt ? (
          <p className="text-xs text-rose-300">Receipt will be removed when you save.</p>
        ) : null}
        <input
          id="expense-receipt"
          name="receipt"
          type="file"
          ref={receiptInputRef}
          accept=".pdf,image/jpeg,image/png"
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-200"
        />
        {isEditing ? (
          <p className="text-xs text-slate-500">Upload a new file to replace the existing receipt.</p>
        ) : null}
      </div>

      <input type="hidden" name="splitType" value={splitType} />
      <input type="hidden" name="splitsPayload" value={JSON.stringify(computedSplits)} />

      {toastVisible && state.message ? (
        <AuthFeedbackToast message={state.message} success={state.success} />
      ) : null}

      <button
        type="submit"
        disabled={isPending || !isFormValid}
        className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? "Saving expense..."
          : isEditing
            ? "Save changes"
            : "Add expense"}
      </button>
    </form>
  );
}
