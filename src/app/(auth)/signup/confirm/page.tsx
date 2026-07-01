import Link from "next/link";
import { redirect } from "next/navigation";
import { MailCheck } from "lucide-react";

type SignupConfirmPageProps = {
  searchParams: Promise<{ email?: string }>;
};

export default async function SignupConfirmPage({ searchParams }: SignupConfirmPageProps) {
  const { email } = await searchParams;

  if (!email) {
    redirect("/signup");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-3 sm:px-4">
      <section className="glass-card w-full rounded-2xl p-5 text-center sm:p-6">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
          <MailCheck className="h-7 w-7 text-emerald-400" />
        </div>

        <h1 className="text-xl font-semibold text-white">Check your email</h1>
        <p className="mt-3 text-sm text-slate-300">
          We sent a confirmation link to{" "}
          <span className="font-medium text-white">{email}</span>.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Click the link in that email to verify your account, then sign in.
        </p>

        <div className="mt-6 space-y-3">
          <Link
            href="/login"
            className="block w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Go to sign in
          </Link>
          <p className="text-xs text-slate-500">
            Didn&apos;t get it? Check spam, or wait a few minutes and try signing up again.
          </p>
        </div>
      </section>
    </main>
  );
}
