import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteExpenseButton } from "@/features/expenses/components/delete-expense-button";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getReceiptSignedUrl } from "@/lib/supabase/receipt-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ExpenseDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ExpenseDetailsPage({ params }: ExpenseDetailsPageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: expense, error } = await admin
    .from("expenses")
    .select("id, title, amount, notes, receipt_url, created_at, group_id, paid_by")
    .eq("id", id)
    .single();

  if (error || !expense) notFound();

  // Verify current user is in the group (access check)
  const { data: membership } = await admin
    .from("group_members")
    .select("user_id")
    .eq("group_id", expense.group_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) notFound();

  // Fetch splits and profiles separately (no direct FK between splits and profiles)
  const { data: splits } = await admin
    .from("expense_splits")
    .select("user_id, amount")
    .eq("expense_id", id);

  const splitUserIds = [...new Set((splits ?? []).map((s) => s.user_id))];
  const allUserIds = [...new Set([...splitUserIds, expense.paid_by])];

  const { data: profiles } = allUserIds.length
    ? await admin
        .from("profiles")
        .select("user_id, full_name, username")
        .in("user_id", allUserIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  const { data: group } = await admin
    .from("groups")
    .select("id, name")
    .eq("id", expense.group_id)
    .single();

  const payer = profileMap.get(expense.paid_by);
  const isOwner = expense.paid_by === user.id;

  const receiptSignedUrl = expense.receipt_url
    ? await getReceiptSignedUrl(expense.receipt_url)
    : null;

  return (
    <main className="page-main max-w-3xl space-y-6">
      {/* Header card */}
      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="page-title">{expense.title}</h1>
            {group && (
              <Link
                href={`/groups/${group.id}`}
                className="mt-1 inline-block text-sm text-indigo-300 hover:underline"
              >
                ← {group.name}
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xl font-bold text-indigo-300 sm:text-2xl">
              ₹{Number(expense.amount).toFixed(2)}
            </span>
            {isOwner && (
              <>
                <Link
                  href={`/expenses/${expense.id}/edit`}
                  className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                >
                  Edit
                </Link>
                <DeleteExpenseButton expenseId={expense.id} expenseTitle={expense.title} />
              </>
            )}
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-400">Paid by</dt>
            <dd className="mt-0.5 font-medium text-slate-100">
              {isOwner ? "You" : (payer?.full_name ?? "—")}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Date</dt>
            <dd className="mt-0.5 text-slate-100">
              {new Date(expense.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </dd>
          </div>
          {expense.notes && (
            <div className="col-span-2">
              <dt className="text-slate-400">Notes</dt>
              <dd className="mt-0.5 text-slate-100">{expense.notes}</dd>
            </div>
          )}
          {expense.receipt_url && (
            <div className="col-span-2">
              <dt className="text-slate-400">Receipt</dt>
              <dd className="mt-0.5">
                {receiptSignedUrl ? (
                  <a
                    href={receiptSignedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-300 underline underline-offset-2"
                  >
                    View receipt
                  </a>
                ) : (
                  <span className="text-sm text-slate-500">Receipt unavailable</span>
                )}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Split breakdown */}
      <div className="glass-card rounded-2xl p-5">
        <h2 className="mb-3 text-base font-semibold text-white">Split breakdown</h2>
        {!splits || splits.length === 0 ? (
          <p className="text-sm text-slate-400">No splits recorded.</p>
        ) : (
          <ul className="space-y-2">
            {splits.map((s) => {
              const profile = profileMap.get(s.user_id);
              return (
                <li key={s.user_id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-slate-100">
                      {s.user_id === user.id ? "You" : (profile?.full_name ?? "Unknown")}
                    </p>
                    <p className="text-xs text-slate-400">
                      @{profile?.username ?? "—"}
                    </p>
                  </div>
                  <span className="font-mono font-semibold text-indigo-300">
                    ₹{Number(s.amount).toFixed(2)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
