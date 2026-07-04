"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { addMemberToGroupAction } from "@/features/groups/actions/group-actions";
import { searchUserAction } from "@/features/groups/actions/search-user-action";
import { type GroupFormState } from "@/features/groups/types/group-form-state";
import {
  USER_SEARCH_INITIAL,
  type UserSearchResult,
} from "@/features/groups/types/user-search-state";

const ADD_INITIAL: GroupFormState = { success: false, message: "" };

type Props = {
  groupId: string;
  currentUserId: string;
  existingMemberIds: string[];
};

export function UserSearchAndAdd({
  groupId,
  currentUserId,
  existingMemberIds,
}: Props) {
  const router = useRouter();
  const [searchState, searchAction, isSearching] = useActionState(
    searchUserAction,
    USER_SEARCH_INITIAL,
  );
  const [addState, addAction, isAdding] = useActionState(
    addMemberToGroupAction,
    ADD_INITIAL,
  );

  const [query, setQuery] = useState("");
  const [foundUser, setFoundUser] = useState<UserSearchResult | null>(null);
  const [visibleAddMessage, setVisibleAddMessage] = useState<GroupFormState | null>(null);
  const searchFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (searchState.status === "found") {
      setFoundUser(searchState.user);
    }
  }, [searchState]);

  useEffect(() => {
    if (!addState.message) {
      return;
    }

    setVisibleAddMessage(addState);

    if (!addState.success) {
      return;
    }

    setFoundUser(null);
    setQuery("");
    searchFormRef.current?.reset();
    router.refresh();

    const timeoutId = window.setTimeout(() => {
      setVisibleAddMessage(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [addState, router]);

  const isAlreadyMember =
    foundUser !== null &&
    (existingMemberIds.includes(foundUser.userId) || foundUser.userId === currentUserId);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-slate-200">Add people</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Search by username or{" "}
          <span className="font-mono text-indigo-300">SF-XXXXXX</span>, or share the invite link
          above for them to join automatically.
        </p>
      </div>

      <form ref={searchFormRef} action={searchAction} className="flex gap-2">
        <input
          name="query"
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setFoundUser(null);
            setVisibleAddMessage(null);
          }}
          placeholder="Username or SF-XXXXXX"
          className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none ring-indigo-500/50 transition placeholder:text-slate-500 focus:ring-2"
        />
        <button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="shrink-0 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSearching ? "…" : "Search"}
        </button>
      </form>

      {(searchState.status === "not_found" || searchState.status === "error") && (
        <p className="text-xs text-rose-300">{searchState.message}</p>
      )}

      {foundUser && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                {foundUser.fullName
                  .split(" ")
                  .map((name) => name[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-100">{foundUser.fullName}</p>
                <p className="text-xs text-slate-400">
                  @{foundUser.username}{" "}
                  <span className="ml-1 font-mono text-indigo-300">{foundUser.uniqueId}</span>
                </p>
              </div>
            </div>

            {isAlreadyMember ? (
              <span className="text-xs text-slate-500">Already a member</span>
            ) : (
              <form action={addAction}>
                <input type="hidden" name="groupId" value={groupId} />
                <input type="hidden" name="userId" value={foundUser.userId} />
                <button
                  type="submit"
                  disabled={isAdding}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAdding ? "Adding…" : "Add to group"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {visibleAddMessage?.message && (
        <p
          className={`text-xs ${visibleAddMessage.success ? "text-emerald-400" : "text-rose-300"}`}
        >
          {visibleAddMessage.message}
        </p>
      )}
    </div>
  );
}
