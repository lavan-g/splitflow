import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type ExpenseDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ExpenseDetailsPage({ params }: ExpenseDetailsPageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: expense } = await supabase
    .from("expenses")
    .select("id, title, amount, notes, receipt_url, paid_by, group_id, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!expense) {
    notFound();
  }

  const [{ data: paidByProfile }, { data: group }, { data: splitRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, username")
      .eq("user_id", expense.paid_by)
      .maybeSingle(),
    supabase.from("groups").select("name, group_code").eq("id", expense.group_id).maybeSingle(),
    supabase
      .from("expense_splits")
      .select("user_id, amount")
      .eq("expense_id", expense.id),
  ]);

  const splitUserIds = Array.from(new Set((splitRows ?? []).map((row) => row.user_id)));
  const { data: splitProfiles } =
    splitUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("user_id, full_name, username")
          .in("user_id", splitUserIds)
      : { data: [] };

  const splitProfileMap = new Map(
    (splitProfiles ?? []).map((profile) => [profile.user_id, profile]),
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <section className="space-y-4">
        <div className="glass-card rounded-2xl p-6">
          <h1 className="text-2xl font-semibold text-white">{expense.title}</h1>
          <p className="mt-2 text-sm text-slate-300">
            Group:{" "}
            <span className="font-medium text-indigo-200">
              {group?.name ?? "Unknown"} {group?.group_code ? `(${group.group_code})` : ""}
            </span>
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Total amount: <span className="font-medium text-slate-100">{expense.amount}</span>
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Paid by:{" "}
            <span className="font-medium text-slate-100">
              {paidByProfile?.full_name ?? expense.paid_by}
              {paidByProfile?.username ? ` (@${paidByProfile.username})` : ""}
            </span>
          </p>
          {expense.notes ? <p className="mt-3 text-sm text-slate-200">{expense.notes}</p> : null}
          {expense.receipt_url ? (
            <p className="mt-2 text-sm text-slate-300">Receipt path: {expense.receipt_url}</p>
          ) : null}
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white">Split breakdown</h2>
          <ul className="mt-3 space-y-2">
            {(splitRows ?? []).map((split) => {
              const profile = splitProfileMap.get(split.user_id);
              return (
                <li
                  key={split.user_id}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                >
                  <span className="text-slate-100">
                    {profile?.full_name ?? split.user_id}
                    {profile?.username ? ` (@${profile.username})` : ""}
                  </span>
                  <span className="font-medium text-indigo-200">{split.amount}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </main>
  );
}
