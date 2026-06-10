import Link from "next/link";
import { redirect } from "next/navigation";

import { signOutAction } from "@/features/auth/actions/auth-actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const routes = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/groups", label: "Groups" },
  { href: "/expenses/new", label: "Add Expense" },
  { href: "/settlements", label: "Settlements" },
  { href: "/profile", label: "Profile" },
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

  return (
    <div className="min-h-screen">
      <header className="mx-auto w-full max-w-7xl px-4 py-5">
        <div className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3">
          <nav className="flex flex-wrap items-center gap-2">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
              >
                {route.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-300">{user.email}</span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
