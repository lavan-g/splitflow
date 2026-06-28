import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CreateExpenseForm } from "@/features/expenses/components/create-expense-form";
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
    .select("id, title, notes, amount, paid_by, group_id, receipt_url")
    .eq("id", id)
    .single();

  if (error || !expense) notFound();
  if (expense.paid_by !== user.id) notFound();

  const { data: group } = await admin
    .from("groups")
    .select("id, name, group_code")
    .eq("id", expense.group_id)
    .single();

  if (!group) notFound();

  const { data: memberRows } = await admin
    .from("group_members")
    .select("user_id")
    .eq("group_id", expense.group_id);

  const memberUserIds = (memberRows ?? []).map((m) => m.user_id);

  const { data: profiles } = memberUserIds.length
    ? await admin
        .from("profiles")
        .select("user_id, full_name, username")
        .in("user_id", memberUserIds)
    : { data: [] };

  const { data: splits } = await admin
    .from("expense_splits")
    .select("user_id, amount")
    .eq("expense_id", id);

  const groupsWithMembers = [
    {
      id: group.id,
      name: group.name,
      groupCode: group.group_code,
      members: (profiles ?? []).map((p) => ({
        userId: p.user_id,
        fullName: p.full_name,
        username: p.username,
      })),
    },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <div className="mb-1 flex items-center gap-2">
          <Link
            href={`/expenses/${expense.id}`}
            className="text-sm text-indigo-300 hover:underline"
          >
            ← Back
          </Link>
          <span className="text-slate-600">/</span>
          <Link
            href={`/groups/${group.id}`}
            className="text-sm text-slate-400 hover:underline"
          >
            {group.name}
          </Link>
        </div>
        <h1 className="mt-3 text-xl font-semibold text-white">Edit expense</h1>
        <p className="mt-1 text-sm text-slate-400">
          Update amount, splits, payer, notes, or receipt.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <CreateExpenseForm
          groups={groupsWithMembers}
          currentUserId={user.id}
          editExpense={{
            id: expense.id,
            groupId: expense.group_id,
            title: expense.title,
            amount: Number(expense.amount),
            paidBy: expense.paid_by,
            notes: expense.notes ?? "",
            splits: (splits ?? []).map((s) => ({
              userId: s.user_id,
              amount: Number(s.amount),
            })),
            hasReceipt: Boolean(expense.receipt_url),
          }}
        />
      </div>
    </main>
  );
}
