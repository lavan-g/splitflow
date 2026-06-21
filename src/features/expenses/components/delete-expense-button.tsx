"use client";

import { useRef, useState } from "react";

import { deleteExpenseAction } from "@/features/expenses/actions/expense-actions";

type Props = {
  expenseId: string;
  expenseTitle: string;
};

export function DeleteExpenseButton({ expenseId, expenseTitle }: Props) {
  const [showModal, setShowModal] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20"
      >
        Delete
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-white">Delete expense?</h2>
            <p className="mt-2 text-sm text-slate-300">
              <span className="font-medium text-white">"{expenseTitle}"</span> and all its
              split data will be permanently deleted. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
              >
                Cancel
              </button>
              <form ref={formRef} action={deleteExpenseAction} className="flex-1">
                <input type="hidden" name="expenseId" value={expenseId} />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-500"
                >
                  Delete
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
