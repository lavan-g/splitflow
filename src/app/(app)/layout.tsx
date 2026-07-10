import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleUserRound } from "lucide-react";

import { signOutAction } from "@/features/auth/actions/auth-actions";
import { RealtimeRefresher } from "@/features/realtime/components/realtime-refresher";
import { ThemeToggle } from "@/components/theme-toggle";
import { getAvatarPublicUrl } from "@/lib/supabase/avatar-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const routes = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/groups", label: "Groups" },
  { href: "/expenses", label: "Expenses" },
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
    .select("full_name, username, unique_id, avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();

  const displayName = profile?.full_name ?? user.email ?? "Profile";
  const avatarUrl = getAvatarPublicUrl(profile?.avatar_url);

  return (
    <div className="min-h-screen">
      <RealtimeRefresher userId={user.id} />

      <header className="mx-auto w-full max-w-7xl px-3 py-3 sm:px-4 sm:py-4">
        <div className="glass-card flex items-center justify-between gap-2 rounded-2xl px-2 py-2 sm:px-3">
          <nav className="-mx-1 flex flex-1 items-center gap-1 overflow-x-auto px-1 scrollbar-none">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
              >
                {route.label}
              </Link>
            ))}
          </nav>

          <ThemeToggle />

          <details className="group relative shrink-0">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-2 py-1.5 text-sm text-slate-100 transition hover:bg-white/10 sm:px-3">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <CircleUserRound className="h-4 w-4 text-slate-300" />
              )}
              <span className="hidden max-w-[8rem] truncate sm:inline">{displayName}</span>
            </summary>

            <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-white/10 bg-slate-900/95 p-3 shadow-2xl backdrop-blur">
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                    <CircleUserRound className="h-5 w-5 text-slate-300" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                  <p className="truncate text-xs text-slate-300">{user.email}</p>
                </div>
              </div>
              {profile?.unique_id ? (
                <p className="mt-2 text-xs text-indigo-200">{profile.unique_id}</p>
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
