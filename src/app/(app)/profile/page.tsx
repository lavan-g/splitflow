import { redirect } from "next/navigation";

import { EditProfileForm } from "@/features/profile/components/edit-profile-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username, unique_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 space-y-6">
      {/* Read-only info */}
      <div className="glass-card rounded-2xl p-6">
        <h1 className="text-2xl font-semibold text-white">Profile</h1>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-400">Email</dt>
            <dd className="mt-0.5 text-slate-100">{user.email}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Unique ID</dt>
            <dd className="mt-0.5 font-mono font-semibold text-indigo-300">
              {profile?.unique_id ?? "Not assigned"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Editable fields */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="mb-5 text-base font-semibold text-white">Edit profile</h2>
        <EditProfileForm
          initialFullName={profile?.full_name ?? ""}
          initialUsername={profile?.username ?? ""}
        />
      </div>
    </main>
  );
}
