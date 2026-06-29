"use client";

import { useRef, useState } from "react";

import { removeMemberAction } from "@/features/groups/actions/group-actions";

type Props = {
  groupId: string;
  memberUserId: string;
  memberName: string;
};

export function RemoveMemberButton({ groupId, memberUserId, memberName }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs text-rose-300 transition hover:text-rose-200"
      >
        Remove
      </button>
    );
  }

  return (
    <form ref={formRef} action={removeMemberAction} className="flex items-center gap-2">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="memberUserId" value={memberUserId} />
      <span className="text-xs text-rose-200">Remove {memberName}?</span>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-xs text-slate-400 hover:text-slate-200"
      >
        Cancel
      </button>
      <button
        type="submit"
        className="rounded-md border border-rose-400/30 bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-200 transition hover:bg-rose-500/25"
      >
        Confirm
      </button>
    </form>
  );
}
