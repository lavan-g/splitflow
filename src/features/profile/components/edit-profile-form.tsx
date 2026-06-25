"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  PROFILE_FORM_INITIAL_STATE,
  type ProfileFormState,
  updateProfileAction,
} from "@/features/profile/actions/profile-actions";

type Props = {
  initialFullName: string;
  initialUsername: string;
};

export function EditProfileForm({ initialFullName, initialUsername }: Props) {
  const [state, formAction, isPending] = useActionState<ProfileFormState, FormData>(
    updateProfileAction,
    PROFILE_FORM_INITIAL_STATE,
  );

  const formRef = useRef<HTMLFormElement>(null);

  // Reset the form to saved values on success
  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <div>
        <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-slate-300">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          defaultValue={initialFullName}
          placeholder="Alex Morgan"
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-slate-300">
          Username
        </label>
        <div className="flex items-center rounded-xl border border-white/20 bg-white/5 px-3 focus-within:border-indigo-400">
          <span className="shrink-0 text-sm text-slate-500">@</span>
          <input
            id="username"
            name="username"
            type="text"
            required
            defaultValue={initialUsername}
            placeholder="alex_morgan"
            className="flex-1 bg-transparent py-2.5 pl-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Letters, numbers, and underscores only. 3–20 characters.
        </p>
      </div>

      {state.message && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            state.success
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-rose-500/10 text-rose-300"
          }`}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
