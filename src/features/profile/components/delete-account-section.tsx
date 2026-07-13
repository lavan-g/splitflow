"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { deleteAccountAction } from "@/features/auth/actions/auth-actions";
import { type AuthFormState } from "@/features/auth/types/auth-form-state";

const INITIAL_STATE: AuthFormState = {
  success: false,
  message: "",
  showCreateAccountCta: false,
};

type Props = { email: string };

export function DeleteAccountSection({ email }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [state, formAction, isPending] = useActionState(deleteAccountAction, INITIAL_STATE);

  const isMatch = confirmEmail.trim().toLowerCase() === email.toLowerCase();

  useEffect(() => {
    if (expanded) {
      // Small delay so the element is rendered before focus
      const id = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    } else {
      setConfirmEmail("");
    }
  }, [expanded]);

  return (
    <div className="glass-card rounded-2xl p-6">
      <h2 className="mb-1 text-base font-semibold text-rose-400">Danger zone</h2>
      <p className="mb-5 text-sm text-slate-400">
        Permanently delete your account and all associated data.
      </p>

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20"
        >
          Delete account…
        </button>
      ) : (
        <div className="space-y-4 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-rose-300">This will permanently delete:</p>
            <ul className="ml-4 list-disc space-y-0.5 text-sm text-slate-400">
              <li>Your profile and account</li>
              <li>All groups you created</li>
              <li>All expenses you recorded</li>
              <li>All settlements</li>
            </ul>
            <p className="pt-1 text-xs text-slate-500">This action cannot be undone.</p>
          </div>

          <form action={formAction} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="confirm-email" className="text-sm text-slate-300">
                Type <span className="font-mono text-slate-200">{email}</span> to confirm
              </label>
              <input
                id="confirm-email"
                ref={inputRef}
                name="confirmEmail"
                type="email"
                autoComplete="off"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none ring-rose-500/50 transition focus:ring-2"
                placeholder={email}
              />
            </div>

            {state.message && !state.success && (
              <p className="text-xs text-rose-300">{state.message}</p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={!isMatch || isPending}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Deleting…" : "Permanently delete account"}
              </button>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                disabled={isPending}
                className="text-sm text-slate-400 transition hover:text-slate-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
