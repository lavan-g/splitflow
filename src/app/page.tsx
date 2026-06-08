import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-6 px-6">
      <div className="glass-card w-full max-w-2xl rounded-3xl p-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white">SplitFlow</h1>
        <p className="mt-3 text-sm text-slate-300">
          Production-grade expense sharing with generated IDs instead of phone numbers.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Create Account
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/10"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-2.5 text-sm font-medium text-indigo-200 transition hover:bg-indigo-500/20"
          >
            Open Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
