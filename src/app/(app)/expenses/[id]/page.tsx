import Link from "next/link";
import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type ExpenseDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ExpenseDetailsPage({ params }: ExpenseDetailsPageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: expense, error } = await supabase
    .from("expenses")
    .select(
      "id, title, amount, notes, receipt_url, created_at, group_id, paid_by, profiles!expenses_paid_by_fkey(full_name, username)",
    )
    .eq("id", id)
    .single();

  if (error || !expense) notFound();

  const { data: splits } = await supabase
    .from("expense_splits")
    .select("amount, user_id, profiles(full_name, username)")
    .eq("expense_id", id);

  const { data: group } = await supabase
    .from("groups")
    .select("id, name")
    .eq("id", expense.group_id)
    .single();

  const payer = Array.isArray(expense.profiles) ? expense.profiles[0] : expense.profiles;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">{expense.title}</h1>
            {group && (
              <Link
                href={`/groups/${group.id}`}
                className="mt-1 text-sm text-indigo-300 hover:underline"
              >
                {group.name}
              </Link>
            )}
          </div>
          <span className="text-2xl font-bold text-indigo-300">
            ₹{Number(expense.amount).toFixed(2)}
          </span>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-400">Paid by</dt>
            <dd className="mt-0.5 font-medium text-slate-100">
              {payer?.full_name ?? "—"}
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
                <a
                  href={expense.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-300 underline underline-offset-2"
                >
                  View receipt
                </a>
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Splits */}
      <div className="glass-card rounded-2xl p-5">
        <h2 className="mb-3 text-base font-semibold text-white">Split breakdown</h2>
        {!splits || splits.length === 0 ? (
          <p className="text-sm text-slate-400">No splits recorded.</p>
        ) : (
          <ul className="space-y-2">
            {splits.map((s) => {
              const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
              return (
                <li
                  key={s.user_id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-100">{profile?.full_name ?? "Unknown"}</p>
                    <p className="text-xs text-slate-400">@{profile?.username ?? "—"}</p>
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
