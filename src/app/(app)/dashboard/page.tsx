import Link from "next/link";
import { redirect } from "next/navigation";

import {
  calculatePeerBalances,
  calculateUserBalance,
} from "@/features/balance/utils/calculate-balances";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, unique_id")
    .eq("user_id", user.id)
    .single();

  // Groups the user belongs to
  const { data: memberRows } = await admin
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  const groupIds = (memberRows ?? []).map((r) => r.group_id);

  const { data: groups } = groupIds.length
    ? await admin
        .from("groups")
        .select("id, name, group_code, created_by")
        .in("id", groupIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Expenses across all groups
  const { data: expenses } = groupIds.length
    ? await admin
        .from("expenses")
        .select("id, title, amount, created_at, paid_by, group_id")
        .in("group_id", groupIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const expenseIds = (expenses ?? []).map((e) => e.id);

  // All splits for those expenses
  const { data: splits } = expenseIds.length
    ? await admin
        .from("expense_splits")
        .select("expense_id, user_id, amount")
        .in("expense_id", expenseIds)
    : { data: [] };

  // Attach expense data to each split for balance calculation
  const expenseMap = new Map((expenses ?? []).map((e) => [e.id, e]));
  const splitsWithExpense = (splits ?? [])
    .map((s) => {
      const expense = expenseMap.get(s.expense_id);
      if (!expense) return null;
      return {
        ...s,
        expense: { paid_by: expense.paid_by, amount: expense.amount },
      };
    })
    .filter(Boolean) as Array<{
    expense_id: string;
    user_id: string;
    amount: number;
    expense: { paid_by: string; amount: number };
  }>;

  const balance = calculateUserBalance(user.id, splitsWithExpense);

  // Peer profiles for balance breakdown
  const allUserIds = [
    ...new Set([
      ...(splits ?? []).map((s) => s.user_id),
      ...(expenses ?? []).map((e) => e.paid_by),
    ]),
  ].filter((id) => id !== user.id);

  const { data: peerProfiles } = allUserIds.length
    ? await admin
        .from("profiles")
        .select("user_id, full_name, username")
        .in("user_id", allUserIds)
    : { data: [] };

  const peerBalances = calculatePeerBalances(user.id, splitsWithExpense, peerProfiles ?? []);

  // Recent expenses with payer names
  const recentExpenses = (expenses ?? []).slice(0, 5);
  const payerIds = [...new Set(recentExpenses.map((e) => e.paid_by))];
  const { data: payerProfiles } = payerIds.length
    ? await admin
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", payerIds)
    : { data: [] };

  const groupMap = new Map((groups ?? []).map((g) => [g.id, g]));

  const netPositive = balance.netBalance >= 0;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 space-y-6">
      {/* Welcome */}
      <div className="glass-card rounded-2xl px-6 py-5">
        <h1 className="text-xl font-semibold text-white">
          Welcome back, {profile?.full_name?.split(" ")[0] ?? "there"} 👋
        </h1>
        {profile?.unique_id && (
          <p className="mt-0.5 text-xs text-indigo-300">{profile.unique_id}</p>
        )}
      </div>

      {/* Balance summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            You are owed
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-400">
            ₹{balance.totalReceivable.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Total receivable</p>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            You owe
          </p>
          <p className="mt-2 text-3xl font-bold text-rose-400">
            ₹{balance.totalOwed.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Total owed</p>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Net balance
          </p>
          <p
            className={`mt-2 text-3xl font-bold ${netPositive ? "text-emerald-400" : "text-rose-400"}`}
          >
            {netPositive ? "+" : ""}₹{Math.abs(balance.netBalance).toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {netPositive ? "In your favour" : "You owe overall"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Who owes who */}
        <div className="glass-card rounded-2xl p-5 lg:col-span-1">
          <h2 className="mb-3 text-base font-semibold text-white">Balances</h2>
          {peerBalances.length === 0 ? (
            <p className="text-sm text-slate-400">All settled up!</p>
          ) : (
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
          )}
          <div className="mt-4 border-t border-white/10 pt-3">
            <Link
              href="/settlements"
              className="text-xs text-indigo-300 hover:underline"
            >
              View settlements →
            </Link>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Groups */}
          <div className="glass-card rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Your groups</h2>
              <Link href="/groups" className="text-xs text-indigo-300 hover:underline">
                View all →
              </Link>
            </div>
            {!groups || groups.length === 0 ? (
              <p className="text-sm text-slate-400">
                No groups yet.{" "}
                <Link href="/groups" className="text-indigo-300 hover:underline">
                  Create one
                </Link>
                .
              </p>
            ) : (
              <ul className="space-y-2">
                {(groups ?? []).slice(0, 5).map((group) => (
                  <li key={group.id}>
                    <Link
                      href={`/groups/${group.id}`}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm transition hover:bg-white/10"
                    >
                      <span className="font-medium text-slate-100">{group.name}</span>
                      <span className="font-mono text-xs text-indigo-300">{group.group_code}</span>
                    </Link>
                  </li>
                ))}
              </ul>
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
                  const payer = (payerProfiles ?? []).find(
                    (p) => p.user_id === expense.paid_by,
                  );
                  const group = groupMap.get(expense.group_id);
                  return (
                    <li
                      key={expense.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm"
                    >
                      <div>
                        <p className="font-medium text-slate-100">{expense.title}</p>
                        <p className="text-xs text-slate-400">
                          {group?.name ?? "—"} · Paid by{" "}
                          {expense.paid_by === user.id ? "you" : (payer?.full_name ?? "—")}
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
      </div>
    </main>
  );
}
