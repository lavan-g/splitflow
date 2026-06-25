import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EditExpenseForm } from "@/features/expenses/components/edit-expense-form";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type EditExpensePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditExpensePage({ params }: EditExpensePageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: expense, error } = await admin
    .from("expenses")
    .select("id, title, notes, amount, paid_by, group_id")
    .eq("id", id)
    .single();

  if (error || !expense) notFound();

  // Only the person who paid can edit
  if (expense.paid_by !== user.id) notFound();

  const { data: group } = await admin
    .from("groups")
    .select("id, name")
    .eq("id", expense.group_id)
    .single();

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <div className="mb-1 flex items-center gap-2">
          <Link
            href={`/expenses/${expense.id}`}
            className="text-sm text-indigo-300 hover:underline"
          >
            ← Back
          </Link>
          {group && (
            <>
              <span className="text-slate-600">/</span>
              <Link
                href={`/groups/${group.id}`}
                className="text-sm text-slate-400 hover:underline"
              >
                {group.name}
              </Link>
            </>
          )}
        </div>
        <h1 className="mt-3 text-xl font-semibold text-white">Edit expense</h1>
        <p className="mt-1 text-sm text-slate-400">
          ₹{Number(expense.amount).toFixed(2)} total
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <EditExpenseForm
          expenseId={expense.id}
          initialTitle={expense.title}
          initialNotes={expense.notes ?? ""}
        />
      </div>
    </main>
  );
}
