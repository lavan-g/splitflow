import Link from "next/link";
import { notFound } from "next/navigation";

import {
  calculatePeerBalances,
  calculateUserBalance,
} from "@/features/balance/utils/calculate-balances";
import { GroupBannerActions } from "@/features/groups/components/group-banner-actions";
import { CopyCodeButton } from "@/features/groups/components/copy-code-button";
import { RemoveMemberButton } from "@/features/groups/components/remove-member-button";
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

  const { data: group, error } = await admin
    .from("groups")
    .select("id, name, group_code, created_by, created_at")
    .eq("id", id)
    .single();

  if (error || !group) notFound();

  const isCreator = group.created_by === user.id;

  const { data: membership } = await admin
    .from("group_members")
    .select("user_id")
    .eq("group_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!isCreator && !membership) notFound();

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

  // All expenses in this group (for balance calculation)
  const { data: allExpenses } = await admin
    .from("expenses")
    .select("id, title, amount, created_at, paid_by, group_id")
    .eq("group_id", id)
    .order("created_at", { ascending: false });

  const expenseIds = (allExpenses ?? []).map((e) => e.id);

  const { data: splits } = expenseIds.length
    ? await admin
        .from("expense_splits")
        .select("expense_id, user_id, amount")
        .in("expense_id", expenseIds)
    : { data: [] };

  const expenseMap = new Map((allExpenses ?? []).map((e) => [e.id, e]));
  const normalisedSplits = (splits ?? [])
    .map((s) => {
      const expense = expenseMap.get(s.expense_id);
      if (!expense) return null;
      return {
        user_id: s.user_id,
        amount: Number(s.amount),
        expense_id: s.expense_id,
        expenses: { paid_by: expense.paid_by },
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const groupBalance = calculateUserBalance(user.id, normalisedSplits);

  const balancePeerIds = [
    ...new Set([
      ...(splits ?? []).map((s) => s.user_id),
      ...(allExpenses ?? []).map((e) => e.paid_by),
    ]),
  ].filter((peerId) => peerId !== user.id);

  const { data: balancePeerProfiles } = balancePeerIds.length
    ? await admin
        .from("profiles")
        .select("user_id, full_name, username")
        .in("user_id", balancePeerIds)
    : { data: [] };

  const peerBalances = calculatePeerBalances(
    user.id,
    normalisedSplits,
    balancePeerProfiles ?? [],
  );

  const recentExpenses = (allExpenses ?? []).slice(0, 10);
  const payerIds = [...new Set(recentExpenses.map((e) => e.paid_by))];
  const { data: payerProfiles } = payerIds.length
    ? await admin
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", payerIds)
    : { data: [] };

  const netPositive = groupBalance.netBalance >= 0;

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

      {/* Group balance */}
      <div className="glass-card rounded-2xl p-5">
        <h2 className="mb-4 text-base font-semibold text-white">Your balance in this group</h2>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              You are owed
            </p>
            <p className="mt-1 text-xl font-bold text-emerald-400">
              ₹{groupBalance.totalReceivable.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">You owe</p>
            <p className="mt-1 text-xl font-bold text-rose-400">
              ₹{groupBalance.totalOwed.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Net</p>
            <p
              className={`mt-1 text-xl font-bold ${netPositive ? "text-emerald-400" : "text-rose-400"}`}
            >
              {netPositive ? "+" : ""}₹{Math.abs(groupBalance.netBalance).toFixed(2)}
            </p>
          </div>
        </div>

        {peerBalances.length > 0 ? (
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
              Per person
            </p>
            <ul className="space-y-2">
              {peerBalances.map((peer) => (
                <li key={peer.userId} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-slate-100">{peer.fullName}</p>
                    <p className="text-xs text-slate-400">@{peer.username}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${peer.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                    >
                      {peer.amount >= 0 ? "+" : ""}₹{Math.abs(peer.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {peer.amount >= 0 ? "owes you" : "you owe"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <Link
              href="/settlements"
              className="mt-3 inline-block text-xs text-indigo-300 hover:underline"
            >
              Settle up →
            </Link>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-400">All settled up in this group.</p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Members */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="mb-3 text-base font-semibold text-white">Members</h2>
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-slate-100">{m.profile?.full_name ?? "Unknown"}</p>
                  <p className="text-xs text-slate-400">
                    @{m.profile?.username ?? "—"}
                    {m.user_id === group.created_by ? " · Owner" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {m.profile?.unique_id && (
                    <span className="text-xs font-mono text-indigo-300">{m.profile.unique_id}</span>
                  )}
                  {isCreator &&
                    m.user_id !== group.created_by &&
                    m.user_id !== user.id && (
                      <RemoveMemberButton
                        groupId={group.id}
                        memberUserId={m.user_id}
                        memberName={m.profile?.full_name ?? "member"}
                      />
                    )}
                </div>
              </li>
            ))}
          </ul>

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
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Recent expenses</h2>
            <Link href="/expenses/new" className="text-xs text-indigo-300 hover:underline">
              Add expense →
            </Link>
          </div>
          {recentExpenses.length === 0 ? (
            <p className="text-sm text-slate-400">No expenses yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentExpenses.map((expense) => {
                const payer = (payerProfiles ?? []).find((p) => p.user_id === expense.paid_by);
                const iAmPayer = expense.paid_by === user.id;
                return (
                  <li key={expense.id}>
                    <Link
                      href={`/expenses/${expense.id}`}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm transition hover:bg-white/10"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-100">{expense.title}</p>
                        <p className="text-xs text-slate-400">
                          Paid by {iAmPayer ? "you" : (payer?.full_name ?? "—")}
                        </p>
                      </div>
                      <span className="ml-3 shrink-0 font-semibold text-indigo-300">
                        ₹{Number(expense.amount).toFixed(2)}
                      </span>
                    </Link>
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
