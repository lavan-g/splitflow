import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleUserRound } from "lucide-react";

import { signOutAction } from "@/features/auth/actions/auth-actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const routes = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/groups", label: "Groups" },
  { href: "/expenses/new", label: "Add Expense" },
  { href: "/settlements", label: "Settlements" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username, unique_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const displayName = profile?.full_name ?? user.email ?? "Profile";

  return (
    <div className="min-h-screen">
      <header className="mx-auto w-full max-w-7xl px-4 py-4">
        <div className="glass-card flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-2">
          <nav className="flex flex-wrap items-center gap-1.5">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
              >
                {route.label}
              </Link>
            ))}
          </nav>
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-slate-100 transition hover:bg-white/10">
              <CircleUserRound className="h-4 w-4 text-slate-300" />
            </summary>

            <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-white/10 bg-slate-900/95 p-3 shadow-2xl backdrop-blur">
              <p className="text-sm font-semibold text-white">{displayName}</p>
              <p className="mt-1 text-xs text-slate-300">{user.email}</p>
              {profile?.unique_id ? (
                <p className="mt-1 text-xs text-indigo-200">{profile.unique_id}</p>
              ) : null}

              <div className="mt-3 space-y-1 text-sm">
                <Link
                  href="/profile"
                  className="block rounded-lg px-2 py-1.5 text-slate-100 transition hover:bg-white/10"
                >
                  Profile
                </Link>
              </div>

              <div className="mt-3 border-t border-white/10 pt-3">
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </details>
        </div>
      </header>
      {children}
    </div>
  );
}
