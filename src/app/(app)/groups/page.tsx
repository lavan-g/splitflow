import Link from "next/link";

import { CreateGroupForm } from "@/features/groups/components/create-group-form";
import { GroupCardActions } from "@/features/groups/components/group-card-actions";
import { JoinGroupForm } from "@/features/groups/components/join-group-form";
import { GROUP_CODE_PATTERN } from "@/lib/constants/ids";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type GroupsPageProps = {
  searchParams: Promise<{ code?: string }>;
};

export default async function GroupsPage({ searchParams }: GroupsPageProps) {
  const resolvedSearchParams = await searchParams;
  const sharedCode = resolvedSearchParams.code?.trim().toUpperCase() ?? "";
  const initialGroupCode = GROUP_CODE_PATTERN.test(sharedCode) ? sharedCode : "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [{ data: memberships }, { data: createdGroups }] = await Promise.all([
    supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id),
    supabase.from("groups").select("id").eq("created_by", user.id),
  ]);

  const groupIds = Array.from(
    new Set([
      ...(memberships ?? []).map((membership) => membership.group_id),
      ...(createdGroups ?? []).map((group) => group.id),
    ]),
  );

  const [{ data: groups }, { data: memberRows }] =
    groupIds.length > 0
      ? await Promise.all([
          supabase
            .from("groups")
            .select("id, name, group_code, created_by, created_at")
            .in("id", groupIds)
            .order("created_at", { ascending: false }),
          supabase.from("group_members").select("group_id").in("group_id", groupIds),
        ])
      : [{ data: [] }, { data: [] }];

  const memberCountMap = (memberRows ?? []).reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.group_id] = (acc[row.group_id] ?? 0) + 1;
      return acc;
    },
    {},
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      <section className="space-y-6">
        <div className="glass-card rounded-2xl p-6">
          <h1 className="text-2xl font-semibold text-white">Groups</h1>
          <p className="mt-2 text-sm text-slate-300">
            Create groups, join with `GRP-XXXXXX` codes, and manage members.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="glass-card rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-white">Create group</h2>
            <p className="mt-1 text-sm text-slate-300">
              Start a new group and invite members using a generated group code.
            </p>
            <div className="mt-4">
              <CreateGroupForm />
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-white">Join group</h2>
            <p className="mt-1 text-sm text-slate-300">
              Enter a group code to join an existing group.
            </p>
            <div className="mt-4">
              <JoinGroupForm initialGroupCode={initialGroupCode} />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Your groups</h2>
          {groups && groups.length > 0 ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/groups/${group.id}`} className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-white">{group.name}</p>
                      <p className="mt-1 text-sm text-indigo-200">{group.group_code}</p>
                      <p className="mt-2 text-xs text-slate-300">
                        {memberCountMap[group.id] ?? 0} members
                      </p>
                    </Link>

                    <GroupCardActions
                      groupId={group.id}
                      groupCode={group.group_code}
                      isCreator={group.created_by === user.id}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-300">
              You are not in any groups yet. Create one or join with a group code.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
