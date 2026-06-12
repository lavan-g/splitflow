import { redirect } from "next/navigation";

import { CreateExpenseForm } from "@/features/expenses/components/create-expense-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function NewExpensePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  const groupIds = Array.from(new Set((memberships ?? []).map((membership) => membership.group_id)));

  const [{ data: groups }, { data: groupMemberRows }] =
    groupIds.length > 0
      ? await Promise.all([
          supabase
            .from("groups")
            .select("id, name, group_code")
            .in("id", groupIds)
            .order("created_at", { ascending: false }),
          supabase
            .from("group_members")
            .select("group_id, user_id")
            .in("group_id", groupIds),
        ])
      : [{ data: [] }, { data: [] }];

  const memberUserIds = Array.from(
    new Set((groupMemberRows ?? []).map((member) => member.user_id)),
  );
  const { data: profiles } =
    memberUserIds.length > 0
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
      .filter((row) => row.group_id === group.id)
      .map((row) => {
        const profile = profileMap.get(row.user_id);
        return {
          userId: row.user_id,
          fullName: profile?.full_name ?? row.user_id,
          username: profile?.username ?? "unknown",
        };
      }),
  }));

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="glass-card rounded-2xl p-6">
        <h1 className="text-2xl font-semibold text-white">Add Expense</h1>
        <p className="mt-2 text-sm text-slate-300">
          Capture title, amount, payer, split strategy, notes, and receipt upload.
        </p>
        <div className="mt-5">
          {groupsWithMembers.length > 0 ? (
            <CreateExpenseForm groups={groupsWithMembers} currentUserId={user.id} />
          ) : (
            <p className="text-sm text-slate-300">
              Join or create a group first before adding an expense.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
