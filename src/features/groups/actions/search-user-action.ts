"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { USER_ID_PATTERN } from "@/lib/constants/ids";
import type { UserSearchState } from "@/features/groups/types/user-search-state";

export async function searchUserAction(
  _prevState: UserSearchState,
  formData: FormData,
): Promise<UserSearchState> {
  const rawQuery = String(formData.get("query") ?? "").trim();

  if (!rawQuery) {
    return { status: "not_found", message: "Enter a username or unique ID to search." };
  }

  const admin = createSupabaseAdminClient();
  const isUniqueId = USER_ID_PATTERN.test(rawQuery.toUpperCase());

  const { data: profile, error } = isUniqueId
    ? await admin
        .from("profiles")
        .select("user_id, full_name, username, unique_id")
        .eq("unique_id", rawQuery.toUpperCase())
        .maybeSingle()
    : await admin
        .from("profiles")
        .select("user_id, full_name, username, unique_id")
        .eq("username", rawQuery.toLowerCase())
        .maybeSingle();

  if (error) {
    return { status: "error", message: "Search failed. Please try again." };
  }

  if (!profile) {
    return {
      status: "not_found",
      message: isUniqueId
        ? `No user found with ID "${rawQuery.toUpperCase()}".`
        : `No user found with username "@${rawQuery}".`,
    };
  }

  return {
    status: "found",
    user: {
      userId: profile.user_id,
      fullName: profile.full_name,
      username: profile.username,
      uniqueId: profile.unique_id,
    },
  };
}
