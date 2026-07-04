import { redirect } from "next/navigation";

import { SignInForm } from "@/features/auth/components/sign-in-form";
import { getSafeRedirectPath } from "@/lib/navigation/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
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
      <section className="glass-card w-full rounded-2xl p-5 sm:p-6">
        <h1 className="text-xl font-semibold text-white">Welcome back to SplitFlow</h1>
        <p className="mt-2 text-sm text-slate-300">
          {redirectTo
            ? "Log in to accept your group invite."
            : "Log in to access your account."}
        </p>
        <SignInForm redirectTo={redirectTo ?? undefined} />
      </section>
    </main>
  );
}
