import { redirect } from "next/navigation";

import { SignInForm } from "@/features/auth/components/sign-in-form";
import { getSafeRedirectPath } from "@/lib/navigation/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; deleted?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, deleted } = await searchParams;
  const redirectTo = getSafeRedirectPath(next);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(redirectTo ?? "/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-3 sm:px-4">
      <section className="w-full space-y-4">
        {deleted === "1" && (
          <div className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 border border-emerald-500/20">
            Your account has been permanently deleted. Sorry to see you go.
          </div>
        )}
      <div className="glass-card w-full rounded-2xl p-5 sm:p-6">
        <h1 className="text-xl font-semibold text-white">Welcome back to SplitFlow</h1>
        <p className="mt-2 text-sm text-slate-300">
          {redirectTo
            ? "Log in to accept your group invite."
            : "Log in to access your account."}
        </p>
        <SignInForm redirectTo={redirectTo ?? undefined} />
      </div>
      </section>
    </main>
  );
}
