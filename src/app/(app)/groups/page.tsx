import Link from "next/link";

import { GroupCardActions } from "@/features/groups/components/group-card-actions";
import { CreateGroupForm } from "@/features/groups/components/create-group-form";
import { JoinGroupForm } from "@/features/groups/components/join-group-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type GroupsPageProps = {
  searchParams: Promise<{ code?: string; delete?: string }>;
};

export default async function GroupsPage({ searchParams }: GroupsPageProps) {
  const { code, delete: deleteStatus } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberRows } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user!.id);

  const groupIds = (memberRows ?? []).map((r) => r.group_id);

  const { data: groups } = groupIds.length
    ? await supabase
        .from("groups")
        .select("id, name, group_code, created_by, created_at")
        .in("id", groupIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const groupMemberCounts: Record<string, number> = {};
  if (groups && groups.length > 0) {
    const { data: counts } = await supabase
      .from("group_members")
      .select("group_id")
      .in("group_id", groups.map((g) => g.id));

    (counts ?? []).forEach((row) => {
      groupMemberCounts[row.group_id] = (groupMemberCounts[row.group_id] ?? 0) + 1;
    });
  }

  const deleteMessage =
    deleteStatus === "success"
      ? { text: "Group deleted successfully.", success: true }
      : deleteStatus === "forbidden"
        ? { text: "Only the group creator can delete this group.", success: false }
        : deleteStatus === "failed"
          ? { text: "Failed to delete group. Please try again.", success: false }
          : null;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      {deleteMessage && (
        <div
          className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${
            deleteMessage.success
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-rose-500/10 text-rose-300"
          }`}
        >
          {deleteMessage.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar: Create & Join */}
        <div className="space-y-4 lg:col-span-1">
          <div className="glass-card rounded-2xl p-5">
            <h2 className="mb-4 text-base font-semibold text-white">Create a group</h2>
            <CreateGroupForm />
          </div>
          <div className="glass-card rounded-2xl p-5">
            <h2 className="mb-4 text-base font-semibold text-white">Join a group</h2>
            <JoinGroupForm initialGroupCode={code} />
          </div>
        </div>

        {/* Main: Group list */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-2xl p-5">
            <h1 className="mb-4 text-xl font-semibold text-white">Your groups</h1>

            {!groups || groups.length === 0 ? (
              <p className="text-sm text-slate-400">
                You haven&apos;t joined any groups yet. Create one or ask a friend for their
                group code.
              </p>
            ) : (
              <ul className="space-y-3">
                {groups.map((group) => (
                  <li
                    key={group.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
                  >
                    <Link href={`/groups/${group.id}`} className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-100">{group.name}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        <span className="font-mono text-indigo-300">{group.group_code}</span>
                        {" · "}
                        {groupMemberCounts[group.id] ?? 1}{" "}
                        {groupMemberCounts[group.id] === 1 ? "member" : "members"}
                        {group.created_by === user!.id ? " · Owner" : ""}
                      </p>
                    </Link>
                    <GroupCardActions
                      groupId={group.id}
                      groupCode={group.group_code}
                      groupName={group.name}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
