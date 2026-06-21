import { notFound } from "next/navigation";

import { GroupBannerActions } from "@/features/groups/components/group-banner-actions";
import { CopyCodeButton } from "@/features/groups/components/copy-code-button";
import { UserSearchAndAdd } from "@/features/groups/components/user-search-and-add";
import { leaveGroupAction } from "@/features/groups/actions/group-actions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type GroupDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function GroupDetailsPage({ params }: GroupDetailsPageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  // Use admin client so RLS doesn't block non-creator members from loading the page.
  const { data: group, error } = await admin
    .from("groups")
    .select("id, name, group_code, created_by, created_at")
    .eq("id", id)
    .single();

  if (error || !group) notFound();

  const isCreator = group.created_by === user.id;

  // Check membership independently via admin client.
  const { data: membership } = await admin
    .from("group_members")
    .select("user_id")
    .eq("group_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!isCreator && !membership) notFound();

  // Fetch all members with profile details using admin + separate profiles query.
  const { data: memberRows } = await admin
    .from("group_members")
    .select("user_id, joined_at")
    .eq("group_id", id)
    .order("joined_at", { ascending: true });

  const memberUserIds = (memberRows ?? []).map((m) => m.user_id);

  const { data: profiles } = memberUserIds.length
    ? await admin
        .from("profiles")
        .select("user_id, full_name, username, unique_id")
        .in("user_id", memberUserIds)
    : { data: [] };

  const members = (memberRows ?? []).map((m) => {
    const profile = (profiles ?? []).find((p) => p.user_id === m.user_id);
    return { ...m, profile };
  });

  const { data: expenses } = await admin
    .from("expenses")
    .select("id, title, amount, created_at, paid_by")
    .eq("group_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  const payerIds = [...new Set((expenses ?? []).map((e) => e.paid_by))];
  const { data: payerProfiles } = payerIds.length
    ? await admin
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", payerIds)
    : { data: [] };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 space-y-6">
      {/* Banner */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">{group.name}</h1>
            <p className="mt-1 flex items-center gap-0.5 text-sm text-slate-400">
              Code:{" "}
              <span className="font-mono text-indigo-300">{group.group_code}</span>
              <CopyCodeButton code={group.group_code} />
              {" · "}
              {members.length}{" "}
              {members.length === 1 ? "member" : "members"}
            </p>
          </div>
          <GroupBannerActions
            groupId={group.id}
            groupCode={group.group_code}
            isCreator={isCreator}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Members */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="mb-3 text-base font-semibold text-white">Members</h2>
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-slate-100">{m.profile?.full_name ?? "Unknown"}</p>
                  <p className="text-xs text-slate-400">
                    @{m.profile?.username ?? "—"}
                    {m.user_id === group.created_by ? " · Owner" : ""}
                  </p>
                </div>
                {m.profile?.unique_id && (
                  <span className="text-xs font-mono text-indigo-300">{m.profile.unique_id}</span>
                )}
              </li>
            ))}
          </ul>

          {/* Add member */}
          <div className="mt-4 border-t border-white/10 pt-4">
            <p className="mb-2 text-xs text-slate-400">
              Search by username or{" "}
              <span className="font-mono text-indigo-300">SF-XXXXXX</span>
            </p>
            <UserSearchAndAdd
              groupId={group.id}
              currentUserId={user.id}
              existingMemberIds={members.map((m) => m.user_id)}
            />
          </div>

          {/* Leave group */}
          {!isCreator && (
            <form action={leaveGroupAction} className="mt-3">
              <input type="hidden" name="groupId" value={group.id} />
              <button
                type="submit"
                className="text-xs text-rose-300 underline underline-offset-2 transition hover:text-rose-200"
              >
                Leave group
              </button>
            </form>
          )}
        </div>

        {/* Recent expenses */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="mb-3 text-base font-semibold text-white">Recent expenses</h2>
          {!expenses || expenses.length === 0 ? (
            <p className="text-sm text-slate-400">No expenses yet.</p>
          ) : (
            <ul className="space-y-2">
              {expenses.map((expense) => {
                const payer = (payerProfiles ?? []).find((p) => p.user_id === expense.paid_by);
                return (
                  <li key={expense.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-slate-100">{expense.title}</p>
                      <p className="text-xs text-slate-400">
                        Paid by {payer?.full_name ?? "—"}
                      </p>
                    </div>
                    <span className="font-semibold text-indigo-300">
                      ₹{Number(expense.amount).toFixed(2)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
