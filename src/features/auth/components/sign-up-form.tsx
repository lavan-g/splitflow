"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";

import { signUpAction } from "@/features/auth/actions/auth-actions";
import { AuthFeedbackToast } from "@/features/auth/components/auth-feedback-toast";
import { AUTH_FORM_INITIAL_STATE } from "@/features/auth/types/auth-form-state";
import {
  GMAIL_VALIDATION_MESSAGE,
  isValidGmail,
} from "@/features/auth/utils/gmail-validation";

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(
    signUpAction,
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
        <label htmlFor="fullName" className="text-sm font-medium text-slate-200">
          Full Name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none ring-indigo-500/50 transition focus:ring-2"
          placeholder="Alex Morgan"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="username" className="text-sm font-medium text-slate-200">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          minLength={3}
          maxLength={20}
          pattern="[A-Za-z0-9_]+"
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none ring-indigo-500/50 transition focus:ring-2"
          placeholder="alex_morgan"
        />
      </div>

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
          aria-describedby={isEmailInvalid ? "sign-up-email-error" : undefined}
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none ring-indigo-500/50 transition focus:ring-2"
          placeholder="name@gmail.com"
        />
        {isEmailInvalid ? (
          <div id="sign-up-email-error">
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
          maxLength={72}
          aria-invalid={isPasswordInvalid}
          aria-describedby={isPasswordInvalid ? "sign-up-password-error" : undefined}
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none ring-indigo-500/50 transition focus:ring-2"
          placeholder="********"
        />
        {isPasswordInvalid ? (
          <div id="sign-up-password-error">
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
        {isPending ? "Creating account..." : "Create Account"}
      </button>

      <p className="text-right text-sm text-slate-300">
        Already have an account?{" "}
        <Link href="/login" className="hover:text-white">
          Sign in
        </Link>
      </p>
    </form>
  );
}
