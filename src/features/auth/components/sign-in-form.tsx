"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";

import { signInAction } from "@/features/auth/actions/auth-actions";
import { AuthFeedbackToast } from "@/features/auth/components/auth-feedback-toast";
import { AUTH_FORM_INITIAL_STATE } from "@/features/auth/types/auth-form-state";
import {
  GMAIL_VALIDATION_MESSAGE,
  isValidGmail,
} from "@/features/auth/utils/gmail-validation";

export function SignInForm() {
  const [state, formAction, isPending] = useActionState(
    signInAction,
    AUTH_FORM_INITIAL_STATE,
  );
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);

  const isEmailInvalid = emailTouched && !isValidGmail(email);
  const isPasswordInvalid = passwordTouched && password.length < 8;

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
          aria-describedby={isEmailInvalid ? "sign-in-email-error" : undefined}
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none ring-indigo-500/50 transition focus:ring-2"
          placeholder="name@gmail.com"
        />
        {isEmailInvalid ? (
          <div id="sign-in-email-error">
            <AuthFeedbackToast message={GMAIL_VALIDATION_MESSAGE} success={false} />
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-slate-200">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setPasswordTouched(true);
          }}
          onBlur={() => setPasswordTouched(true)}
          required
          minLength={8}
          aria-invalid={isPasswordInvalid}
          aria-describedby={isPasswordInvalid ? "sign-in-password-error" : undefined}
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none ring-indigo-500/50 transition focus:ring-2"
          placeholder="********"
        />
        {isPasswordInvalid ? (
          <div id="sign-in-password-error">
            <AuthFeedbackToast
              message="Password must be at least 8 characters."
              success={false}
            />
          </div>
        ) : null}
      </div>

      {state.message ? (
        <AuthFeedbackToast message={state.message} success={state.success} />
      ) : null}

      <button
        type="submit"
        disabled={isPending || isEmailInvalid || isPasswordInvalid}
        className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Signing in..." : "Sign In"}
      </button>

      <div className="flex items-center justify-between text-sm text-slate-300">
        <Link href="/forgot-password" className="hover:text-white">
          Forgot password?
        </Link>
        <Link
          href="/signup"
          className={
            state.showCreateAccountCta
              ? "rounded-md bg-indigo-500/20 px-2 py-1 font-semibold text-indigo-200 ring-1 ring-indigo-400/50 transition hover:bg-indigo-500/30"
              : "hover:text-white"
          }
        >
          Create account
        </Link>
      </div>
    </form>
  );
}
