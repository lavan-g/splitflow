"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  searchUserAction,
  type UserSearchResult,
  type UserSearchState,
} from "@/features/groups/actions/search-user-action";
import { addMemberToGroupAction } from "@/features/groups/actions/group-actions";
import { type GroupFormState } from "@/features/groups/types/group-form-state";

const SEARCH_INITIAL: UserSearchState = { status: "idle" };
const ADD_INITIAL: GroupFormState = { success: false, message: "" };

type Props = {
  groupId: string;
  currentUserId: string;
  existingMemberIds: string[];
};

export function UserSearchAndAdd({ groupId, currentUserId, existingMemberIds }: Props) {
  const [searchState, searchAction, isSearching] = useActionState(
    searchUserAction,
    SEARCH_INITIAL,
  );
  const [addState, addAction, isAdding] = useActionState(
    addMemberToGroupAction,
    ADD_INITIAL,
  );

  const [query, setQuery] = useState("");
  const [confirmedUser, setConfirmedUser] = useState<UserSearchResult | null>(null);
  const searchFormRef = useRef<HTMLFormElement>(null);

  // When a user is found, store it so we can show the card
  useEffect(() => {
    if (searchState.status === "found") {
      setConfirmedUser(searchState.user);
    }
  }, [searchState]);

  // After successful add, reset everything
  useEffect(() => {
    if (addState.success) {
      setConfirmedUser(null);
      setQuery("");
      searchFormRef.current?.reset();
    }
  }, [addState]);

  const foundUser = searchState.status === "found" ? searchState.user : null;
  const isAlreadyMember =
    foundUser !== null &&
    (existingMemberIds.includes(foundUser.userId) || foundUser.userId === currentUserId);

  return (
    <div className="space-y-3">
      {/* Search input */}
      <form ref={searchFormRef} action={searchAction} className="flex gap-2">
        <input
          name="query"
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            // Clear previous result when user changes the query
            if (confirmedUser) setConfirmedUser(null);
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

      {/* Search error / not found */}
      {(searchState.status === "not_found" || searchState.status === "error") && (
        <p className="text-xs text-rose-300">{searchState.message}</p>
      )}

      {/* Found user card */}
      {foundUser && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between gap-3">
            {/* Avatar initials */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                {foundUser.fullName
                  .split(" ")
                  .map((n) => n[0])
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

            {/* Add button */}
            {isAlreadyMember ? (
              <span className="text-xs text-slate-500">Already a member</span>
            ) : (
              <form action={addAction}>
                <input type="hidden" name="groupId" value={groupId} />
                <input type="hidden" name="username" value={foundUser.username} />
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

          {/* Add feedback */}
          {addState.message && (
            <p
              className={`mt-2 text-xs ${addState.success ? "text-emerald-400" : "text-rose-300"}`}
            >
              {addState.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
