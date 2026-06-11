"use client";

import { useState } from "react";
import { useActionState } from "react";

import { AuthFeedbackToast } from "@/features/auth/components/auth-feedback-toast";
import { addMemberToGroupAction } from "@/features/groups/actions/group-actions";
import { GROUP_FORM_INITIAL_STATE } from "@/features/groups/types/group-form-state";

type AddMemberFormProps = {
  groupId: string;
};

export function AddMemberForm({ groupId }: AddMemberFormProps) {
  const [state, formAction, isPending] = useActionState(
    addMemberToGroupAction,
    GROUP_FORM_INITIAL_STATE,
  );
  const [username, setUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);

  const isUsernameInvalid =
    usernameTouched && !/^[a-z0-9_]{3,20}$/i.test(username.trim());

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="groupId" value={groupId} />

      <div className="space-y-2">
        <label htmlFor="member-id" className="text-sm font-medium text-slate-200">
          Add member by username
        </label>
        <input
          id="member-id"
          name="username"
          required
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
            setUsernameTouched(true);
          }}
          onBlur={() => setUsernameTouched(true)}
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none ring-indigo-500/50 transition focus:ring-2"
          placeholder="alex_morgan"
        />
        {isUsernameInvalid ? (
          <p className="text-sm text-rose-300 [animation:fadeOut_4s_ease_forwards]">
            Enter a valid username (3-20 chars, letters, numbers, underscore).
          </p>
        ) : null}
      </div>

      {state.message ? (
        <div className="pointer-events-none [animation:fadeOut_4s_ease_forwards]">
          <AuthFeedbackToast message={state.message} success={state.success} />
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending || isUsernameInvalid}
        className="w-full rounded-xl border border-indigo-400/40 bg-indigo-500/10 px-4 py-2.5 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Adding member..." : "Add member"}
      </button>

      <style jsx>{`
        @keyframes fadeOut {
          0%,
          75% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </form>
  );
}
