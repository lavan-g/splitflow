import { redirect } from "next/navigation";

import { CreateExpenseForm } from "@/features/expenses/components/create-expense-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type NewExpensePageProps = {
  searchParams: Promise<{ group?: string }>;
};

export default async function NewExpensePage({ searchParams }: NewExpensePageProps) {
  const { group: preselectedGroupId } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch all groups the user belongs to
  const { data: memberRows } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  const groupIds = (memberRows ?? []).map((r) => r.group_id);

  if (groupIds.length === 0) {
    return (
      <main className="page-main max-w-3xl">
        <div className="glass-card rounded-2xl p-5 sm:p-6">
          <h1 className="page-title">Add Expense</h1>
          <p className="mt-3 text-sm text-slate-400">
            You need to be in at least one group before adding an expense.{" "}
            <a href="/groups" className="text-indigo-300 underline underline-offset-2">
              Create or join a group
            </a>
            .
          </p>
        </div>
      </main>
    );
  }

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, group_code")
    .in("id", groupIds)
    .order("created_at", { ascending: false });

  // Fetch all members of those groups (no direct FK between group_members and profiles,
  // so profiles are fetched separately and joined in memory).
  const { data: groupMemberRows } = await supabase
    .from("group_members")
    .select("group_id, user_id")
    .in("group_id", groupIds);

  const memberUserIds = [...new Set((groupMemberRows ?? []).map((mp) => mp.user_id))];

  const { data: profiles } = memberUserIds.length
    ? await supabase
        .from("profiles")
        .select("user_id, full_name, username")
        .in("user_id", memberUserIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));

  const groupsWithMembers = (groups ?? []).map((group) => ({
    id: group.id,
    name: group.name,
    groupCode: group.group_code,
    members: (groupMemberRows ?? [])
      .filter((mp) => mp.group_id === group.id)
      .map((mp) => {
        const profile = profileMap.get(mp.user_id);
        return {
          userId: mp.user_id,
          fullName: profile?.full_name ?? "Unknown",
          username: profile?.username ?? "",
        };
      }),
  }));

  return (
    <main className="page-main max-w-3xl">
      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <h1 className="page-title mb-1">Add Expense</h1>
        <p className="mb-6 text-sm text-slate-400">
          Fill in the details and choose how to split.
        </p>
        <CreateExpenseForm
          groups={groupsWithMembers}
          currentUserId={user.id}
          defaultGroupId={preselectedGroupId}
        />
      </div>
    </main>
  );
}
