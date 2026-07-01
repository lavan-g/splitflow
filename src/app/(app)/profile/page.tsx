import { redirect } from "next/navigation";

import { AvatarUpload } from "@/features/profile/components/avatar-upload";
import { EditProfileForm } from "@/features/profile/components/edit-profile-form";
import { getAvatarPublicUrl } from "@/lib/supabase/avatar-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username, unique_id, avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();

  const avatarUrl = getAvatarPublicUrl(profile?.avatar_url);

  return (
    <main className="page-main max-w-2xl space-y-6">
      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <h1 className="page-title">Profile</h1>
        <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">Email</dt>
            <dd className="mt-0.5 break-all text-slate-100">{user.email}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Unique ID</dt>
            <dd className="mt-0.5 font-mono font-semibold text-indigo-300">
              {profile?.unique_id ?? "Not assigned"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="mb-5 text-base font-semibold text-white">Profile photo</h2>
        <AvatarUpload
          avatarUrl={avatarUrl}
          displayName={profile?.full_name ?? "User"}
        />
      </div>

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
