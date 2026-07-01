import { SignInForm } from "@/features/auth/components/sign-in-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-3 sm:px-4">
      <section className="glass-card w-full rounded-2xl p-5 sm:p-6">
        <h1 className="text-xl font-semibold text-white">Welcome back to SplitFlow</h1>
        <p className="mt-2 text-sm text-slate-300">
          Log in to access your account.
        </p>
        <SignInForm />
      </section>
    </main>
  );
}
