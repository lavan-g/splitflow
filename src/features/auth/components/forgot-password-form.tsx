"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";

import { forgotPasswordAction } from "@/features/auth/actions/auth-actions";
import { AuthFeedbackToast } from "@/features/auth/components/auth-feedback-toast";
import { AUTH_FORM_INITIAL_STATE } from "@/features/auth/types/auth-form-state";
import {
  GMAIL_VALIDATION_MESSAGE,
  isValidGmail,
} from "@/features/auth/utils/gmail-validation";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    AUTH_FORM_INITIAL_STATE,
  );
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);

  const isEmailInvalid = emailTouched && !isValidGmail(email);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-slate-200">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setEmailTouched(true);
          }}
          onBlur={() => setEmailTouched(true)}
          required
          aria-invalid={isEmailInvalid}
          aria-describedby={isEmailInvalid ? "forgot-password-email-error" : undefined}
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none ring-indigo-500/50 transition focus:ring-2"
          placeholder="name@gmail.com"
        />
        {isEmailInvalid ? (
          <div id="forgot-password-email-error">
            <AuthFeedbackToast message={GMAIL_VALIDATION_MESSAGE} success={false} />
          </div>
        ) : null}
      </div>

      {state.message ? (
        <AuthFeedbackToast message={state.message} success={state.success} />
      ) : null}

      <button
        type="submit"
        disabled={isPending || isEmailInvalid}
        className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Sending reset email..." : "Send reset email"}
      </button>

      <p className="text-right text-sm text-slate-300">
        Back to{" "}
        <Link href="/login" className="hover:text-white">
          Sign in
        </Link>
      </p>
    </form>
  );
}
