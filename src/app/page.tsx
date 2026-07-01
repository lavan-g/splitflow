import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-3 sm:px-4">
      <section className="glass-card w-full rounded-3xl p-6 text-center sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Welcome to SplitFlow</h1>
        <p className="mt-3 text-sm text-slate-300">
          Choose how you want to continue.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/signup"
            className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            I&apos;m new - Sign up
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/10"
          >
            I have an account - Log in
          </Link>
        </div>
      </section>
    </main>
  );
}
