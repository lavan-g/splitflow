"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AuthFeedbackToast } from "@/features/auth/components/auth-feedback-toast";
import { resetPasswordSchema } from "@/features/auth/schemas/auth-schemas";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type FeedbackState = {
  success: boolean;
  message: string;
};

export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const isPasswordInvalid = passwordTouched && password.length < 8;
  const doPasswordsMismatch =
    confirmTouched && confirmPassword.length > 0 && password !== confirmPassword;
  const isFormInvalid = isPasswordInvalid || doPasswordsMismatch;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    const parsed = resetPasswordSchema.safeParse({
      password,
      confirmPassword,
    });

    if (!parsed.success) {
      setFeedback({
        success: false,
        message:
          parsed.error.issues[0]?.message ??
          "Please check your password and try again.",
      });
      setIsSubmitting(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setFeedback({
        success: false,
        message: "Reset link is invalid or expired. Please request a new link.",
      });
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      setFeedback({
        success: false,
        message: error.message,
      });
      setIsSubmitting(false);
      return;
    }

    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-slate-200">
          New password
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
          aria-describedby={isPasswordInvalid ? "reset-password-error" : undefined}
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none ring-indigo-500/50 transition focus:ring-2"
          placeholder="Enter new password"
        />
        {isPasswordInvalid ? (
          <p id="reset-password-error" className="text-sm text-rose-300">
            Password must be at least 8 characters.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="confirmPassword"
          className="text-sm font-medium text-slate-200"
        >
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setConfirmTouched(true);
          }}
          onBlur={() => setConfirmTouched(true)}
          required
          aria-invalid={doPasswordsMismatch}
          aria-describedby={doPasswordsMismatch ? "confirm-password-error" : undefined}
          className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none ring-indigo-500/50 transition focus:ring-2"
          placeholder="Confirm new password"
        />
        {doPasswordsMismatch ? (
          <p id="confirm-password-error" className="text-sm text-rose-300">
            Passwords do not match.
          </p>
        ) : null}
      </div>

      {feedback ? (
        <AuthFeedbackToast message={feedback.message} success={feedback.success} />
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || isFormInvalid}
        className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Updating password..." : "Update password"}
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
