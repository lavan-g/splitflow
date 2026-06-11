"use client";

import { useActionState } from "react";

import { createGroupAction } from "@/features/groups/actions/group-actions";
import { AuthFeedbackToast } from "@/features/auth/components/auth-feedback-toast";
import {
  GROUP_FORM_INITIAL_STATE,
  type GroupFormState,
} from "@/features/groups/types/group-form-state";

type CreateGroupFormProps = {
  initialState?: GroupFormState;
};

export function CreateGroupForm({ initialState }: CreateGroupFormProps) {
  const [state, formAction, isPending] = useActionState(
    createGroupAction,
    initialState ?? GROUP_FORM_INITIAL_STATE,
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-2">
        <label htmlFor="group-name" className="text-sm font-medium text-slate-200">
          Group name
        </label>
        <input
          id="group-name"
          name="name"
          required
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none ring-indigo-500/50 transition focus:ring-2"
          placeholder="Europe Trip 2026"
        />
      </div>

      {state.message ? (
        <AuthFeedbackToast message={state.message} success={state.success} />
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Creating group..." : "Create group"}
      </button>
    </form>
  );
}
