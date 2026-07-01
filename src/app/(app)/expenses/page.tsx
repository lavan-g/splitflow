import Link from "next/link";
import { redirect } from "next/navigation";

import { ExpenseGroupFilter } from "@/features/expenses/components/expense-group-filter";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ExpensesPageProps = {
  searchParams: Promise<{ group?: string }>;
};

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const { group: groupFilter } = await searchParams;
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

  const { data: userGroups } = groupIds.length
    ? await admin
        .from("groups")
        .select("id, name")
        .in("id", groupIds)
        .order("name", { ascending: true })
    : { data: [] };

  const filteredGroupIds =
    groupFilter && groupIds.includes(groupFilter) ? [groupFilter] : groupIds;

  const { data: expenses } = filteredGroupIds.length
    ? await admin
        .from("expenses")
        .select("id, title, amount, created_at, paid_by, group_id")
        .in("group_id", filteredGroupIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const groupIdList = [...new Set((expenses ?? []).map((e) => e.group_id))];
  const payerIdList = [...new Set((expenses ?? []).map((e) => e.paid_by))];

  const [{ data: expenseGroups }, { data: payers }] = await Promise.all([
    groupIdList.length
      ? admin.from("groups").select("id, name").in("id", groupIdList)
      : Promise.resolve({ data: [] }),
    payerIdList.length
      ? admin.from("profiles").select("user_id, full_name").in("user_id", payerIdList)
      : Promise.resolve({ data: [] }),
  ]);

  const groupMap = new Map((expenseGroups ?? []).map((g) => [g.id, g]));
  const payerMap = new Map((payers ?? []).map((p) => [p.user_id, p]));

  const activeGroupName = groupFilter
    ? (userGroups ?? []).find((g) => g.id === groupFilter)?.name
    : null;

  return (
    <main className="page-main max-w-4xl space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">All expenses</h1>
          {activeGroupName && (
            <p className="mt-1 text-sm text-slate-400">Filtered by {activeGroupName}</p>
          )}
        </div>
        <Link
          href="/expenses/new"
          className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          + Add expense
        </Link>
      </div>

      {(userGroups ?? []).length > 0 && (
        <ExpenseGroupFilter groups={userGroups ?? []} selectedGroupId={groupFilter} />
      )}

      <div className="glass-card rounded-2xl p-5">
        {!expenses || expenses.length === 0 ? (
          <p className="text-sm text-slate-400">
            {groupFilter ? "No expenses in this group yet." : "No expenses yet."}{" "}
            <Link href="/expenses/new" className="text-indigo-300 hover:underline">
              Add one
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
                    className="flex items-center justify-between gap-4 rounded-xl px-2 py-3.5 transition hover:bg-white/5"
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
