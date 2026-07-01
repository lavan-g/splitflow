import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-3 sm:px-4">
      <section className="glass-card w-full rounded-2xl p-5 sm:p-6">
        <h1 className="text-xl font-semibold text-white">Create a new password</h1>
        <p className="mt-2 text-sm text-slate-300">
          Enter and confirm your new password to continue.
        </p>
        <ResetPasswordForm />
      </section>
    </main>
  );
}
