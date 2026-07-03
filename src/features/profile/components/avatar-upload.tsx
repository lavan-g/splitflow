"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { UserRound } from "lucide-react";

import {
  removeAvatarAction,
  uploadAvatarAction,
} from "@/features/profile/actions/profile-actions";
import {
  PROFILE_FORM_INITIAL_STATE,
  type ProfileFormState,
} from "@/features/profile/types/profile-form-state";

type Props = {
  avatarUrl: string | null;
  displayName: string;
};

export function AvatarUpload({ avatarUrl, displayName }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadState, uploadAction, isUploading] = useActionState<
    ProfileFormState,
    FormData
  >(uploadAvatarAction, PROFILE_FORM_INITIAL_STATE);
  const [removeState, removeAction, isRemoving] = useActionState<
    ProfileFormState,
    FormData
  >(removeAvatarAction, PROFILE_FORM_INITIAL_STATE);

  const latestFeedback = uploadState.message
    ? uploadState
    : removeState.message
      ? removeState
      : null;

  const [visibleFeedback, setVisibleFeedback] = useState<ProfileFormState | null>(null);

  useEffect(() => {
    if (!latestFeedback?.message) {
      return;
    }

    setVisibleFeedback(latestFeedback);

    if (!latestFeedback.success) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setVisibleFeedback(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [latestFeedback]);

  function handleAvatarSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);
    startTransition(() => {
      uploadAction(formData);
    });
    event.target.value = "";
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/20 bg-white/5">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <UserRound className="h-8 w-8 text-slate-400" />
          </div>
        )}
      </div>

      <div className="flex-1 space-y-3 text-center sm:text-left">
        <div>
          <p className="text-sm font-medium text-slate-200">Profile photo</p>
          <p className="mt-0.5 text-xs text-slate-500">JPG, PNG, or WebP. Max 2MB.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <input
            ref={fileRef}
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarSelect}
          />
          <button
            type="button"
            disabled={isUploading || isRemoving}
            onClick={() => fileRef.current?.click()}
            className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
          >
            {isUploading ? "Uploading…" : "Upload photo"}
          </button>

          {avatarUrl && (
            <form action={removeAction}>
              <button
                type="submit"
                disabled={isUploading || isRemoving}
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
              >
                {isRemoving ? "Removing…" : "Remove"}
              </button>
            </form>
          )}
        </div>

        {visibleFeedback?.message && (
          <p
            className={`text-sm ${visibleFeedback.success ? "text-emerald-400" : "text-rose-300"}`}
          >
            {visibleFeedback.message}
          </p>
        )}
      </div>
    </div>
  );
}
