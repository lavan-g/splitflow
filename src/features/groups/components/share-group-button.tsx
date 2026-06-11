"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

import { AuthFeedbackToast } from "@/features/auth/components/auth-feedback-toast";

type ShareGroupButtonProps = {
  groupCode: string;
};

export function ShareGroupButton({ groupCode }: ShareGroupButtonProps) {
  const [feedback, setFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  async function handleShare() {
    const inviteUrl = `${window.location.origin}/groups?code=${groupCode}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join my SplitFlow group",
          text: `Join my group with code ${groupCode}`,
          url: inviteUrl,
        });
      } else {
        await navigator.clipboard.writeText(inviteUrl);
      }

      setFeedback({
        success: true,
        message: "Invite link ready. Share it with members.",
      });
    } catch {
      setFeedback({
        success: false,
        message: "Unable to share right now. Please try again.",
      });
    }

    window.setTimeout(() => {
      setFeedback(null);
    }, 3000);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/20"
      >
        <Share2 className="h-4 w-4" />
        Share group
      </button>

      {feedback ? (
        <div className="[animation:fadeOut_3s_ease_forwards]">
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
