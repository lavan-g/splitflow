"use client";

import { useState } from "react";
import { useActionState } from "react";

import { AuthFeedbackToast } from "@/features/auth/components/auth-feedback-toast";
import { joinGroupAction } from "@/features/groups/actions/group-actions";
import { GROUP_CODE_PATTERN } from "@/lib/constants/ids";
import {
  GROUP_FORM_INITIAL_STATE,
  type GroupFormState,
} from "@/features/groups/types/group-form-state";

type JoinGroupFormProps = {
  initialState?: GroupFormState;
  initialGroupCode?: string;
};

export function JoinGroupForm({ initialState, initialGroupCode }: JoinGroupFormProps) {
  const [state, formAction, isPending] = useActionState(
    joinGroupAction,
    initialState ?? GROUP_FORM_INITIAL_STATE,
  );
  const [groupCode, setGroupCode] = useState(initialGroupCode ?? "");
  const [groupCodeTouched, setGroupCodeTouched] = useState(false);

  const isGroupCodeInvalid =
    groupCodeTouched && !GROUP_CODE_PATTERN.test(groupCode.trim().toUpperCase());

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-2">
        <label htmlFor="group-code" className="text-sm font-medium text-slate-200">
          Group code
        </label>
        {initialGroupCode ? (
          <p className="text-xs text-indigo-200">
            Invite link detected. Review the code and click Join group.
          </p>
        ) : null}
        <input
          id="group-code"
          name="groupCode"
          required
          value={groupCode}
          onChange={(event) => {
            setGroupCode(event.target.value);
            setGroupCodeTouched(true);
          }}
          onBlur={() => setGroupCodeTouched(true)}
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm uppercase text-slate-100 outline-none ring-indigo-500/50 transition focus:ring-2"
          placeholder="GRP-ABC123"
        />
        {isGroupCodeInvalid ? (
          <p className="text-sm text-rose-300">Enter a valid group code (GRP-XXXXXX).</p>
        ) : null}
      </div>

      {state.message ? (
        <AuthFeedbackToast message={state.message} success={state.success} />
      ) : null}

      <button
        type="submit"
        disabled={isPending || isGroupCodeInvalid}
        className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Joining group..." : "Join group"}
      </button>
    </form>
  );
}
