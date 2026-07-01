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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, unique_id")
    .eq("user_id", user.id)
    .single();

  // Get all groups the user belongs to
  const { data: memberRows } = await admin
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  const groupIds = (memberRows ?? []).map((r) => r.group_id);

  const { data: groups } = groupIds.length
    ? await admin
        .from("groups")
        .select("id, name, group_code")
        .in("id", groupIds)
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: [] };

  // Fetch splits to calculate balances (for all expenses in user's groups)
  const { data: splits } = groupIds.length
    ? await admin
        .from("expense_splits")
        .select("user_id, amount, expense_id, expenses!inner(paid_by, group_id)")
        .in("expenses.group_id", groupIds)
    : { data: [] };

  // Collect all peer user IDs
  const peerIds = new Set<string>();
  for (const s of splits ?? []) {
    const expense = Array.isArray(s.expenses) ? s.expenses[0] : s.expenses;
    if (expense?.paid_by && expense.paid_by !== user.id) peerIds.add(expense.paid_by);
    if (s.user_id !== user.id) peerIds.add(s.user_id);
  }

  const { data: peerProfiles } = peerIds.size > 0
    ? await admin
        .from("profiles")
        .select("user_id, full_name, username")
        .in("user_id", [...peerIds])
    : { data: [] };

  // Normalise splits to the shape calculate-balances expects
  const normalisedSplits = (splits ?? []).map((s) => {
    const expense = Array.isArray(s.expenses) ? s.expenses[0] : s.expenses;
    return {
      user_id: s.user_id,
      amount: Number(s.amount),
      expense_id: s.expense_id,
      expenses: expense ? { paid_by: expense.paid_by } : null,
    };
  });

  const balance = calculateUserBalance(user.id, normalisedSplits);
  const peerBalances = calculatePeerBalances(user.id, normalisedSplits, peerProfiles ?? []);

  // Recent expenses across all groups
  const { data: recentExpenses } = groupIds.length
    ? await admin
        .from("expenses")
        .select("id, title, amount, created_at, paid_by, group_id")
        .in("group_id", groupIds)
        .order("created_at", { ascending: false })
        .limit(8)
    : { data: [] };

  const expensePayerIds = [...new Set((recentExpenses ?? []).map((e) => e.paid_by))];
  const { data: expensePayerProfiles } = expensePayerIds.length
    ? await admin
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", expensePayerIds)
    : { data: [] };

  const payerMap = new Map((expensePayerProfiles ?? []).map((p) => [p.user_id, p]));
  const groupMap = new Map((groups ?? []).map((g) => [g.id, g]));

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <main className="page-main max-w-6xl space-y-6">
      {/* Welcome */}
      <div className="glass-card rounded-2xl p-6">
        <h1 className="page-title">
          Hey, {firstName} 👋
        </h1>
        {profile?.unique_id && (
          <p className="mt-1 font-mono text-sm text-indigo-300">{profile.unique_id}</p>
        )}
      </div>

      {/* Balance summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">You owe</p>
          <p className="mt-2 text-3xl font-bold text-rose-300">
            ₹{balance.totalOwed.toFixed(2)}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">You are owed</p>
          <p className="mt-2 text-3xl font-bold text-emerald-400">
            ₹{balance.totalReceivable.toFixed(2)}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Net balance</p>
          <p
            className={`mt-2 text-3xl font-bold ${
              balance.netBalance >= 0 ? "text-emerald-400" : "text-rose-300"
            }`}
          >
            {balance.netBalance >= 0 ? "+" : ""}₹{balance.netBalance.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Peer balances */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="mb-3 text-base font-semibold text-white">Per person</h2>
          {peerBalances.length === 0 ? (
            <p className="text-sm text-slate-400">
              No shared expenses yet.{" "}
              <Link href="/expenses/new" className="text-indigo-300 hover:underline">
                Add one
              </Link>
            </p>
          ) : (
            <ul className="space-y-3">
              {peerBalances.map((peer) => (
                <li key={peer.userId} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-slate-100">{peer.fullName}</p>
                    <p className="text-xs text-slate-400">@{peer.username}</p>
                  </div>
                  <span
                    className={`font-mono font-semibold ${
                      peer.amount >= 0 ? "text-emerald-400" : "text-rose-300"
                    }`}
                  >
                    {peer.amount >= 0 ? "+" : ""}₹{Math.abs(peer.amount).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {peerBalances.length > 0 && (
            <Link
              href="/settlements"
              className="mt-4 block text-center text-xs text-indigo-300 hover:underline"
            >
              Settle up →
            </Link>
          )}
        </div>

        {/* Groups + Recent expenses */}
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
                  Create or join one
                </Link>
              </p>
            ) : (
              <ul className="space-y-2">
                {groups.map((g) => (
                  <li key={g.id}>
                    <Link
                      href={`/groups/${g.id}`}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 transition hover:bg-white/10"
                    >
                      <span className="text-sm font-medium text-slate-100">{g.name}</span>
                      <span className="font-mono text-xs text-indigo-300">{g.group_code}</span>
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
                + Add expense
              </Link>
            </div>

            {!recentExpenses || recentExpenses.length === 0 ? (
              <p className="text-sm text-slate-400">No expenses recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentExpenses.map((e) => {
                  const payer = payerMap.get(e.paid_by);
                  const group = groupMap.get(e.group_id);
                  const iAmPayer = e.paid_by === user.id;
                  return (
                    <li key={e.id}>
                      <Link
                        href={`/expenses/${e.id}`}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 transition hover:bg-white/10"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-100">{e.title}</p>
                          <p className="text-xs text-slate-400">
                            {iAmPayer ? "You paid" : `${payer?.full_name ?? "—"} paid`}
                            {group ? ` · ${group.name}` : ""}
                          </p>
                        </div>
                        <span className="ml-3 shrink-0 font-mono text-sm font-semibold text-indigo-300">
                          ₹{Number(e.amount).toFixed(2)}
                        </span>
                      </Link>
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
