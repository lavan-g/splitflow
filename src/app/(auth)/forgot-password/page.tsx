import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-3 sm:px-4">
      <section className="glass-card w-full rounded-2xl p-5 sm:p-6">
        <h1 className="text-xl font-semibold text-white">Reset your password</h1>
        <p className="mt-2 text-sm text-slate-300">
          Request a secure password reset link to recover account access.
        </p>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
