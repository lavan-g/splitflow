import { notFound } from "next/navigation";

import { GroupBannerActions } from "@/features/groups/components/group-banner-actions";
import { AddMemberForm } from "@/features/groups/components/add-member-form";
import { leaveGroupAction } from "@/features/groups/actions/group-actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type GroupDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function GroupDetailsPage({ params }: GroupDetailsPageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: group, error } = await supabase
    .from("groups")
    .select("id, name, group_code, created_by, created_at")
    .eq("id", id)
    .single();

  if (error || !group) notFound();

  const { data: memberRows } = await supabase
    .from("group_members")
    .select("user_id, joined_at, profiles(full_name, username, unique_id)")
    .eq("group_id", id)
    .order("joined_at", { ascending: true });

  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, title, amount, created_at, paid_by, profiles!expenses_paid_by_fkey(full_name)")
    .eq("group_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  const isCreator = group.created_by === user!.id;
  const isMember = (memberRows ?? []).some((m) => m.user_id === user!.id);

  if (!isMember && !isCreator) notFound();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 space-y-6">
      {/* Banner */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">{group.name}</h1>
            <p className="mt-1 text-sm text-slate-400">
              Code:{" "}
              <span className="font-mono text-indigo-300">{group.group_code}</span>
              {" · "}
              {(memberRows ?? []).length}{" "}
              {(memberRows ?? []).length === 1 ? "member" : "members"}
            </p>
          </div>
          <GroupBannerActions
            groupId={group.id}
            groupCode={group.group_code}
            groupName={group.name}
            isCreator={isCreator}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Members */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="mb-3 text-base font-semibold text-white">Members</h2>
          <ul className="space-y-2">
            {(memberRows ?? []).map((m) => {
              const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
              return (
                <li key={m.user_id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-slate-100">{profile?.full_name ?? "Unknown"}</p>
                    <p className="text-xs text-slate-400">
                      @{profile?.username ?? "—"}
                      {m.user_id === group.created_by ? " · Owner" : ""}
                    </p>
                  </div>
                  {profile?.unique_id && (
                    <span className="text-xs font-mono text-indigo-300">{profile.unique_id}</span>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Add member */}
          <div className="mt-4 border-t border-white/10 pt-4">
            <p className="mb-2 text-xs text-slate-400">Add member by username</p>
            <div className="relative">
              <AddMemberForm groupId={group.id} />
            </div>
          </div>

          {/* Leave group */}
          {!isCreator && (
            <form
              action={async () => {
                "use server";
                await leaveGroupAction(id);
              }}
              className="mt-3"
            >
              <button
                type="submit"
                className="text-xs text-rose-300 underline underline-offset-2 transition hover:text-rose-200"
              >
                Leave group
              </button>
            </form>
          )}
        </div>

        {/* Recent expenses */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="mb-3 text-base font-semibold text-white">Recent expenses</h2>
          {!expenses || expenses.length === 0 ? (
            <p className="text-sm text-slate-400">No expenses yet.</p>
          ) : (
            <ul className="space-y-2">
              {expenses.map((expense) => {
                const payer = Array.isArray(expense.profiles)
                  ? expense.profiles[0]
                  : expense.profiles;
                return (
                  <li key={expense.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-slate-100">{expense.title}</p>
                      <p className="text-xs text-slate-400">
                        Paid by {payer?.full_name ?? "—"}
                      </p>
                    </div>
                    <span className="font-semibold text-indigo-300">
                      ₹{Number(expense.amount).toFixed(2)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
