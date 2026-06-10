import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const { data: profile, error: profileError } = user
    ? await supabase
        .from("profiles")
        .select("full_name, username, unique_id")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null, error: null };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <section className="glass-card rounded-2xl p-6">
        <h1 className="text-2xl font-semibold text-white">Profile</h1>

        {userError || profileError ? (
          <p className="mt-3 text-sm text-rose-400">
            Failed to load profile details. Please refresh and try again.
          </p>
        ) : (
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-400">Full Name</dt>
              <dd className="text-slate-100">{profile?.full_name ?? "N/A"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Username</dt>
              <dd className="text-slate-100">@{profile?.username ?? "N/A"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Unique User ID</dt>
              <dd className="font-semibold text-indigo-300">
                {profile?.unique_id ?? "Not assigned"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Email</dt>
              <dd className="text-slate-100">{user?.email ?? "N/A"}</dd>
            </div>
          </dl>
        )}
      </section>
    </main>
  );
}
