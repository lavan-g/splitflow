import { notFound } from "next/navigation";

import { AddMemberForm } from "@/features/groups/components/add-member-form";
import { GroupBannerActions } from "@/features/groups/components/group-banner-actions";
import { leaveGroupAction } from "@/features/groups/actions/group-actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type GroupDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function GroupDetailsPage({ params }: GroupDetailsPageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, group_code, created_by, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!group) {
    notFound();
  }

  const { data: memberRows } = await supabase
    .from("group_members")
    .select("user_id, joined_at")
    .eq("group_id", id)
    .order("joined_at", { ascending: true });

  const memberUserIds = (memberRows ?? []).map((row) => row.user_id);
  const { data: profileRows } =
    memberUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("user_id, full_name, username, unique_id")
          .in("user_id", memberUserIds)
      : { data: [] };

  const profileMap = new Map((profileRows ?? []).map((profile) => [profile.user_id, profile]));
  const members = (memberRows ?? []).map((member) => ({
    userId: member.user_id,
    joinedAt: member.joined_at,
    profile: profileMap.get(member.user_id) ?? null,
  }));

  const isCreator = group.created_by === user.id;
  const isCurrentMember = memberUserIds.includes(user.id);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      <section className="space-y-6">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-white">{group.name}</h1>
              <p className="mt-2 text-sm text-slate-300">
                Group code: <span className="font-medium text-indigo-200">{group.group_code}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <GroupBannerActions
                groupCode={group.group_code}
                groupId={group.id}
                isCreator={isCreator}
              />
              {isCurrentMember ? (
                <form action={leaveGroupAction}>
                  <input type="hidden" name="groupId" value={group.id} />
                  <button
                    type="submit"
                    disabled={isCreator}
                    className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCreator ? "Creator cannot leave" : "Leave group"}
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="glass-card rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-white">Members</h2>
            {members.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {members.map((member) => (
                  <li
                    key={member.userId}
                    className="rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    <p className="text-sm font-semibold text-white">
                      {member.profile?.full_name ?? member.userId}
                    </p>
                    <p className="mt-1 text-xs text-slate-300">
                      @{member.profile?.username ?? "unknown"} ·{" "}
                      {member.profile?.unique_id ?? "N/A"}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-300">No members found in this group.</p>
            )}
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-white">Add member</h2>
            <p className="mt-1 text-sm text-slate-300">
              Enter the member&apos;s unique username to add them.
            </p>
            <div className="mt-4">
              <AddMemberForm groupId={group.id} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
