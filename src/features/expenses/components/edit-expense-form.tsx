"use client";

import { useActionState } from "react";

import {
  editExpenseAction,
} from "@/features/expenses/actions/expense-actions";
import {
  EXPENSE_FORM_INITIAL_STATE,
  type ExpenseFormState,
} from "@/features/expenses/types/expense-form-state";

type Props = {
  expenseId: string;
  initialTitle: string;
  initialNotes: string;
};

export function EditExpenseForm({ expenseId, initialTitle, initialNotes }: Props) {
  const [state, formAction, isPending] = useActionState<ExpenseFormState, FormData>(
    editExpenseAction,
    EXPENSE_FORM_INITIAL_STATE,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="expenseId" value={expenseId} />

      <div>
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-slate-300">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={initialTitle}
          maxLength={100}
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-slate-300">
          Notes <span className="text-slate-500">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={initialNotes}
          placeholder="Any extra details…"
          className="w-full resize-none rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
        />
      </div>

      <p className="text-xs text-slate-500">
        To change the amount or split, delete this expense and create a new one.
      </p>

      {state.message && (
        <p className={`text-sm ${state.success ? "text-emerald-400" : "text-rose-300"}`}>
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
