"use client";

import { useState } from "react";

import { getGroupInvitePath } from "@/lib/navigation/safe-redirect";

type ShareInviteLinkProps = {
  groupCode: string;
  label?: string;
  className?: string;
};

export function ShareInviteLink({
  groupCode,
  label = "Copy invite link",
  className = "",
}: ShareInviteLinkProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleCopy() {
    const inviteUrl = `${window.location.origin}${getGroupInvitePath(groupCode)}`;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setFeedback("Invite link copied");
    } catch {
      setFeedback("Could not copy link");
    }

    window.setTimeout(() => {
      setFeedback(null);
    }, 3000);
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/20"
      >
        {label}
      </button>
      {feedback ? <p className="mt-2 text-xs text-emerald-400">{feedback}</p> : null}
    </div>
  );
}
