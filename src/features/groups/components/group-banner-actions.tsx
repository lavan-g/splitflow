"use client";

import { MoreHorizontal, Share2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { AuthFeedbackToast } from "@/features/auth/components/auth-feedback-toast";
import { deleteGroupAction } from "@/features/groups/actions/group-actions";
import { getGroupInvitePath } from "@/lib/navigation/safe-redirect";

type GroupBannerActionsProps = {
  groupCode: string;
  groupId: string;
  isCreator: boolean;
};

export function GroupBannerActions({
  groupCode,
  groupId,
  isCreator,
}: GroupBannerActionsProps) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const deleteFormRef = useRef<HTMLFormElement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [feedback, setFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  async function handleShare() {
    const inviteUrl = `${window.location.origin}${getGroupInvitePath(groupCode)}`;

    try {
      await navigator.clipboard.writeText(inviteUrl);

      setFeedback({
        success: true,
        message: "Invite link copied",
      });
      detailsRef.current?.removeAttribute("open");
    } catch {
      setFeedback({
        success: false,
        message: "Unable to copy link. Please try again.",
      });
    }

    window.setTimeout(() => {
      setFeedback(null);
    }, 3000);
  }

  return (
    <div className="relative">
      <details
        ref={detailsRef}
        className="group"
        onToggle={(event) => {
          const target = event.currentTarget as HTMLDetailsElement;
          if (!target.open) {
            setConfirmDelete(false);
          }
        }}
      >
        <summary className="flex list-none cursor-pointer items-center rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10">
          <MoreHorizontal className="h-4 w-4" />
        </summary>

        <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl backdrop-blur">
          <button
            type="button"
            onClick={handleShare}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-100 transition hover:bg-white/10"
          >
            <Share2 className="h-4 w-4" />
            Share group
          </button>

          {isCreator ? (
            <form ref={deleteFormRef} action={deleteGroupAction}>
              <input type="hidden" name="groupId" value={groupId} />
              {confirmDelete ? (
                <div className="mt-2 rounded-lg border border-rose-500/20 bg-rose-500/5 p-2">
                  <p className="text-xs text-rose-200">Delete this group?</p>
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-md border border-white/20 bg-white/5 px-2 py-1 text-xs text-slate-100 transition hover:bg-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        detailsRef.current?.removeAttribute("open");
                        deleteFormRef.current?.requestSubmit();
                      }}
                      className="rounded-md border border-rose-400/30 bg-rose-500/15 px-2 py-1 text-xs font-medium text-rose-200 transition hover:bg-rose-500/25"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-rose-300 transition hover:bg-rose-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete group
                </button>
              )}
            </form>
          ) : null}
        </div>
      </details>

      {feedback ? (
        <div className="pointer-events-none absolute right-0 top-full z-30 mt-2 w-64 [animation:fadeOut_3s_ease_forwards]">
          <AuthFeedbackToast message={feedback.message} success={feedback.success} />
        </div>
      ) : null}

      <style jsx>{`
        @keyframes fadeOut {
          0%,
          75% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
