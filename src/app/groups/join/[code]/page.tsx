import Link from "next/link";
import { redirect } from "next/navigation";

import { joinGroupByInviteCode } from "@/features/groups/actions/group-actions";
import { GROUP_CODE_PATTERN } from "@/lib/constants/ids";
import { getGroupInvitePath } from "@/lib/navigation/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type JoinGroupPageProps = {
  params: Promise<{ code: string }>;
};

export default async function JoinGroupPage({ params }: JoinGroupPageProps) {
  const { code } = await params;
  const normalizedCode = decodeURIComponent(code).trim().toUpperCase();

  if (!GROUP_CODE_PATTERN.test(normalizedCode)) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
        <section className="glass-card w-full rounded-2xl p-6">
          <h1 className="text-xl font-semibold text-white">Invalid invite link</h1>
          <p className="mt-2 text-sm text-slate-400">
            This group invite link is not valid. Ask the group owner for a new link.
          </p>
          <Link
            href="/groups"
            className="mt-4 inline-block text-sm text-indigo-300 hover:underline"
          >
            Go to groups →
          </Link>
        </section>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(getGroupInvitePath(normalizedCode))}`);
  }

  const result = await joinGroupByInviteCode(normalizedCode);

  if (!result.ok) {
    if (result.reason === "unauthenticated") {
      redirect(`/login?next=${encodeURIComponent(getGroupInvitePath(normalizedCode))}`);
    }

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
        <section className="glass-card w-full rounded-2xl p-6">
          <h1 className="text-xl font-semibold text-white">Could not join group</h1>
          <p className="mt-2 text-sm text-slate-400">{result.message}</p>
          <Link
            href="/groups"
            className="mt-4 inline-block text-sm text-indigo-300 hover:underline"
          >
            Go to groups →
          </Link>
        </section>
      </main>
    );
  }

  const joinedQuery = result.alreadyMember ? "already" : "1";
  redirect(`/groups/${result.groupId}?joined=${joinedQuery}`);
}
