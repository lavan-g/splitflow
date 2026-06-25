import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ExpensesPage() {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberRows } = await admin
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  const groupIds = (memberRows ?? []).map((r) => r.group_id);

  const { data: expenses } = groupIds.length
    ? await admin
        .from("expenses")
        .select("id, title, amount, created_at, paid_by, group_id")
        .in("group_id", groupIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const groupIdList = [...new Set((expenses ?? []).map((e) => e.group_id))];
  const payerIdList = [...new Set((expenses ?? []).map((e) => e.paid_by))];

  const [{ data: groups }, { data: payers }] = await Promise.all([
    groupIdList.length
      ? admin.from("groups").select("id, name").in("id", groupIdList)
      : Promise.resolve({ data: [] }),
    payerIdList.length
      ? admin.from("profiles").select("user_id, full_name").in("user_id", payerIdList)
      : Promise.resolve({ data: [] }),
  ]);

  const groupMap = new Map((groups ?? []).map((g) => [g.id, g]));
  const payerMap = new Map((payers ?? []).map((p) => [p.user_id, p]));

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">All expenses</h1>
        <Link
          href="/expenses/new"
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          + Add expense
        </Link>
      </div>

      <div className="glass-card rounded-2xl p-5">
        {!expenses || expenses.length === 0 ? (
          <p className="text-sm text-slate-400">
            No expenses yet.{" "}
            <Link href="/expenses/new" className="text-indigo-300 hover:underline">
              Add your first one
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {expenses.map((expense) => {
              const group = groupMap.get(expense.group_id);
              const payer = payerMap.get(expense.paid_by);
              const iAmPayer = expense.paid_by === user.id;

              return (
                <li key={expense.id}>
                  <Link
                    href={`/expenses/${expense.id}`}
                    className="flex items-center justify-between gap-4 px-2 py-3.5 transition hover:bg-white/5 rounded-xl"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-100">{expense.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {group?.name ?? "—"}
                        {" · "}
                        Paid by {iAmPayer ? "you" : (payer?.full_name ?? "—")}
                        {" · "}
                        {new Date(expense.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono font-semibold text-indigo-300">
                      ₹{Number(expense.amount).toFixed(2)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
