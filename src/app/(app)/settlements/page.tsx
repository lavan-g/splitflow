import { redirect } from "next/navigation";

import { calculatePeerBalances } from "@/features/balance/utils/calculate-balances";
import { CreateSettlementForm } from "@/features/settlements/components/create-settlement-form";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettlementsPage() {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch all settlements where user is payer or receiver
  const { data: allSettlements } = await admin
    .from("settlements")
    .select("id, amount, status, created_at, payer_id, receiver_id")
    .or(`payer_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  // Collect all user IDs referenced in settlements
  const peerIds = new Set<string>();
  for (const s of allSettlements ?? []) {
    if (s.payer_id !== user.id) peerIds.add(s.payer_id);
    if (s.receiver_id !== user.id) peerIds.add(s.receiver_id);
  }

  // Also fetch peers from group memberships for the "Record payment" form
  const { data: memberRows } = await admin
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  const groupIds = (memberRows ?? []).map((r) => r.group_id);

  let groupPeerIds: string[] = [];
  if (groupIds.length > 0) {
    const { data: groupMembers } = await admin
      .from("group_members")
      .select("user_id")
      .in("group_id", groupIds)
      .neq("user_id", user.id);
    groupPeerIds = [...new Set((groupMembers ?? []).map((m) => m.user_id))];
    groupPeerIds.forEach((id) => peerIds.add(id));
  }

  const allPeerIds = [...peerIds];
  const { data: profiles } = allPeerIds.length
    ? await admin
        .from("profiles")
        .select("user_id, full_name, username")
        .in("user_id", allPeerIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  // Build the peers list for the form (group peers)
  const peers = groupPeerIds
    .map((id) => {
      const p = profileMap.get(id);
      return p ? { userId: p.user_id, fullName: p.full_name, username: p.username } : null;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  // Global balances for auto-suggest when recording payments
  const { data: allExpenses } = groupIds.length
    ? await admin
        .from("expenses")
        .select("id, paid_by, group_id")
        .in("group_id", groupIds)
    : { data: [] };

  const allExpenseIds = (allExpenses ?? []).map((e) => e.id);

  const { data: allSplits } = allExpenseIds.length
    ? await admin
        .from("expense_splits")
        .select("expense_id, user_id, amount")
        .in("expense_id", allExpenseIds)
    : { data: [] };

  const expenseMap = new Map((allExpenses ?? []).map((e) => [e.id, e]));
  const normalisedSplits = (allSplits ?? [])
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

  // Only settled settlements actually reduce outstanding balances.
  const settledSettlements = (allSettlements ?? [])
    .filter((s) => s.status === "settled")
    .map((s) => ({
      payer_id: s.payer_id,
      receiver_id: s.receiver_id,
      amount: Number(s.amount),
    }));

  const peerBalanceRows = calculatePeerBalances(
    user.id,
    normalisedSplits,
    (profiles ?? []).filter((p) => groupPeerIds.includes(p.user_id)),
    settledSettlements,
  );

  const balanceByPeer = Object.fromEntries(
    peerBalanceRows.map((p) => [p.userId, p.amount]),
  );

  const pending = (allSettlements ?? []).filter((s) => s.status === "pending");
  const history = (allSettlements ?? []).filter((s) => s.status === "settled");

  function getOtherParty(s: { payer_id: string; receiver_id: string }) {
    const otherId = s.payer_id === user!.id ? s.receiver_id : s.payer_id;
    return profileMap.get(otherId);
  }

  return (
    <main className="page-main max-w-5xl space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Record payment form */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-2xl p-5">
            <h2 className="mb-4 text-base font-semibold text-white">Record a payment</h2>
            <CreateSettlementForm peers={peers} balanceByPeer={balanceByPeer} />
          </div>
        </div>

        {/* Pending + History */}
        <div className="space-y-6 lg:col-span-2">
          {/* Pending */}
          <div className="glass-card rounded-2xl p-5">
            <h2 className="mb-4 text-base font-semibold text-white">
              Pending{" "}
              {pending.length > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                  {pending.length}
                </span>
              )}
            </h2>

            {pending.length === 0 ? (
              <p className="text-sm text-slate-400">No pending settlements. All clear!</p>
            ) : (
              <ul className="space-y-3">
                {pending.map((s) => {
                  const other = getOtherParty(s);
                  const iAmPayer = s.payer_id === user.id;
                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-100">
                          {iAmPayer ? (
                            <>
                              You paid{" "}
                              <span className="text-indigo-300">
                                {other?.full_name ?? "Unknown"}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-indigo-300">
                                {other?.full_name ?? "Unknown"}
                              </span>{" "}
                              paid you
                            </>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {new Date(s.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`font-mono font-semibold ${iAmPayer ? "text-rose-300" : "text-emerald-400"}`}
                        >
                          {iAmPayer ? "-" : "+"}₹{Number(s.amount).toFixed(2)}
                        </span>

                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* History */}
          <div className="glass-card rounded-2xl p-5">
            <h2 className="mb-4 text-base font-semibold text-white">History</h2>

            {history.length === 0 ? (
              <p className="text-sm text-slate-400">No settled payments yet.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((s) => {
                  const other = getOtherParty(s);
                  const iAmPayer = s.payer_id === user.id;
                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/3 px-4 py-3 opacity-70"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-slate-300">
                          {iAmPayer ? "You paid" : `${other?.full_name ?? "Unknown"} paid you`}
                          {" — "}
                          <span className="text-slate-400">
                            {other ? `@${other.username}` : ""}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {new Date(s.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-slate-400">
                          ₹{Number(s.amount).toFixed(2)}
                        </span>
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
                          Settled
                        </span>
                      </div>
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
