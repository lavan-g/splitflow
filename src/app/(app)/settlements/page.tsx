import { redirect } from "next/navigation";

import { markSettledAction } from "@/features/settlements/actions/settlement-actions";
import { CreateSettlementForm } from "@/features/settlements/components/create-settlement-form";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettlementsPage() {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch all settlements where user is payer or receiver
  const { data: settlements } = await admin
    .from("settlements")
    .select("id, amount, status, created_at, payer_id, receiver_id")
    .or(`payer_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  // Collect all involved user IDs to fetch profiles
  const involvedIds = [
    ...new Set([
      ...(settlements ?? []).map((s) => s.payer_id),
      ...(settlements ?? []).map((s) => s.receiver_id),
    ]),
  ].filter((id) => id !== user.id);

  const { data: profiles } = involvedIds.length
    ? await admin
        .from("profiles")
        .select("user_id, full_name, username")
        .in("user_id", involvedIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  const pending = (settlements ?? []).filter((s) => s.status === "pending");
  const settled = (settlements ?? []).filter((s) => s.status === "settled");

  // Peers from groups for creating new settlements
  const { data: memberRows } = await admin
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  const groupIds = (memberRows ?? []).map((r) => r.group_id);

  const { data: groupMembersAll } = groupIds.length
    ? await admin
        .from("group_members")
        .select("user_id")
        .in("group_id", groupIds)
    : { data: [] };

  const peerIds = [
    ...new Set((groupMembersAll ?? []).map((m) => m.user_id)),
  ].filter((id) => id !== user!.id);

  const { data: peerProfiles } = peerIds.length
    ? await admin
        .from("profiles")
        .select("user_id, full_name, username")
        .in("user_id", peerIds)
    : { data: [] };

  const peers = (peerProfiles ?? []).map((p) => ({
    userId: p.user_id,
    fullName: p.full_name,
    username: p.username,
  }));

  function getOtherParty(payerId: string, receiverId: string) {
    const otherId = payerId === user!.id ? receiverId : payerId;
    return profileMap.get(otherId);
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <h1 className="text-2xl font-semibold text-white">Settlements</h1>
        <p className="mt-1 text-sm text-slate-400">
          Record and track payments between group members.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Record new payment */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="mb-4 text-base font-semibold text-white">Record a payment</h2>
          <CreateSettlementForm peers={peers} />
        </div>

        {/* Pending settlements */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="mb-3 text-base font-semibold text-white">
            Pending{" "}
            {pending.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                {pending.length}
              </span>
            )}
          </h2>
          {pending.length === 0 ? (
            <p className="text-sm text-slate-400">No pending settlements.</p>
          ) : (
            <ul className="space-y-3">
              {pending.map((s) => {
                const other = getOtherParty(s.payer_id, s.receiver_id);
                const isIPayer = s.payer_id === user.id;
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-100">
                        {isIPayer ? "You → " : "← "}
                        {other?.full_name ?? "Unknown"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {isIPayer ? "You paid" : "They paid you"} ₹{Number(s.amount).toFixed(2)}
                      </p>
                    </div>
                    <form action={markSettledAction}>
                      <input type="hidden" name="settlementId" value={s.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
                      >
                        Mark settled
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Settlement history */}
      {settled.length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <h2 className="mb-3 text-base font-semibold text-white">History</h2>
          <ul className="space-y-2">
            {settled.map((s) => {
              const other = getOtherParty(s.payer_id, s.receiver_id);
              const isIPayer = s.payer_id === user.id;
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm opacity-60"
                >
                  <div>
                    <p className="font-medium text-slate-100">
                      {isIPayer ? `You → ${other?.full_name ?? "Unknown"}` : `${other?.full_name ?? "Unknown"} → You`}
                    </p>
                    <p className="text-xs text-slate-400">
                      ₹{Number(s.amount).toFixed(2)} ·{" "}
                      {new Date(s.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                    Settled
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </main>
  );
}
