import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ExpenseGroupFilter } from "@/features/expenses/components/expense-group-filter";
import { ExpenseSearchBar } from "@/features/expenses/components/expense-search-bar";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PAGE_SIZE = 20;

type ExpensesPageProps = {
  searchParams: Promise<{ group?: string; q?: string; page?: string }>;
};

function buildUrl(base: { group?: string; q?: string }, page?: number) {
  const params = new URLSearchParams();
  if (base.group) params.set("group", base.group);
  if (base.q) params.set("q", base.q);
  if (page && page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `/expenses${qs ? `?${qs}` : ""}`;
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const { group: groupFilter, q: rawQuery, page: rawPage } = await searchParams;

  const searchQuery = rawQuery?.trim() ?? "";
  const page = Math.max(1, parseInt(rawPage ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
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

  // Escape ILIKE special chars
  const escapedQuery = searchQuery.replace(/%/g, "\\%").replace(/_/g, "\\_");

  let expensesQuery = admin
    .from("expenses")
    .select("id, title, amount, created_at, paid_by, group_id", { count: "exact" })
    .in("group_id", filteredGroupIds.length ? filteredGroupIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (escapedQuery) {
    expensesQuery = expensesQuery.ilike("title", `%${escapedQuery}%`);
  }

  const { data: expenses, count: totalCount } = filteredGroupIds.length
    ? await expensesQuery
    : { data: [], count: 0 };

  const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE);

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

  const baseParams = { group: groupFilter, q: searchQuery || undefined };

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

      <Suspense fallback={
        <div className="h-10 animate-pulse rounded-xl border border-white/10 bg-white/5" />
      }>
        <ExpenseSearchBar initialQuery={searchQuery} />
      </Suspense>

      <div className="glass-card rounded-2xl p-5">
        {/* Result count */}
        {(totalCount ?? 0) > 0 && (
          <p className="mb-3 text-xs text-slate-400">
            {totalCount} {totalCount === 1 ? "expense" : "expenses"}
            {searchQuery ? ` matching "${searchQuery}"` : ""}
            {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
          </p>
        )}

        {!expenses || expenses.length === 0 ? (
          <p className="text-sm text-slate-400">
            {searchQuery
              ? `No expenses match "${searchQuery}".`
              : groupFilter
                ? "No expenses in this group yet."
                : "No expenses yet."}{" "}
            {!searchQuery && (
              <Link href="/expenses/new" className="text-indigo-300 hover:underline">
                Add one
              </Link>
            )}
            {searchQuery && "."}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          {page > 1 ? (
            <Link
              href={buildUrl(baseParams, page - 1)}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
            >
              ← Previous
            </Link>
          ) : (
            <span className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-600 cursor-not-allowed">
              ← Previous
            </span>
          )}

          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === "…" ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-sm text-slate-500">…</span>
                ) : (
                  <Link
                    key={p}
                    href={buildUrl(baseParams, p as number)}
                    className={`h-8 w-8 rounded-lg text-center text-sm font-medium leading-8 transition ${
                      p === page
                        ? "bg-indigo-500/20 text-indigo-200"
                        : "border border-white/20 bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {p}
                  </Link>
                ),
              )}
          </div>

          {page < totalPages ? (
            <Link
              href={buildUrl(baseParams, page + 1)}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
            >
              Next →
            </Link>
          ) : (
            <span className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-600 cursor-not-allowed">
              Next →
            </span>
          )}
        </div>
      )}
    </main>
  );
}
