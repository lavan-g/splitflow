"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  addMemberByUserIdSchema,
  addMemberByUsernameSchema,
  createGroupSchema,
  joinGroupSchema,
} from "@/features/groups/schemas/group-schemas";
import { type GroupFormState } from "@/features/groups/types/group-form-state";

export async function createGroupAction(
  _prevState: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const parsed = createGroupSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid group name.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be signed in.",
    };
  }

  const { data: group, error: createError } = await supabase
    .from("groups")
    .insert({
      name: parsed.data.name,
      created_by: user.id,
    })
    .select("id, group_code")
    .single();

  if (createError || !group) {
    return {
      success: false,
      message: createError?.message ?? "Failed to create group.",
    };
  }

  const { error: membershipError } = await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: user.id,
  });

  if (membershipError) {
    return {
      success: false,
      message: membershipError.message,
    };
  }

  revalidatePath("/groups");

  return {
    success: true,
    message: `Group created. Share code ${group.group_code} to invite others.`,
  };
}

export type JoinGroupResult =
  | {
      ok: true;
      groupId: string;
      groupName: string;
      alreadyMember: boolean;
      message: string;
    }
  | {
      ok: false;
      reason: "invalid" | "not_found" | "unauthenticated" | "error";
      message: string;
    };

export async function joinGroupByInviteCode(groupCode: string): Promise<JoinGroupResult> {
  const parsed = joinGroupSchema.safeParse({ groupCode });

  if (!parsed.success) {
    return {
      ok: false,
      reason: "invalid",
      message: parsed.error.issues[0]?.message ?? "Invalid group invite link.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      reason: "unauthenticated",
      message: "You must be signed in to join a group.",
    };
  }

  const admin = createSupabaseAdminClient();
  const { data: group, error: groupError } = await admin
    .from("groups")
    .select("id, name")
    .eq("group_code", parsed.data.groupCode)
    .maybeSingle();

  if (groupError || !group) {
    return {
      ok: false,
      reason: "not_found",
      message: "Group not found. The invite link may be invalid or expired.",
    };
  }

  const { data: existingMembership } = await admin
    .from("group_members")
    .select("id")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMembership) {
    return {
      ok: true,
      groupId: group.id,
      groupName: group.name,
      alreadyMember: true,
      message: "You are already a member of this group.",
    };
  }

  const { error: membershipError } = await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: user.id,
  });

  if (membershipError) {
    return {
      ok: false,
      reason: "error",
      message: membershipError.message,
    };
  }

  revalidatePath("/groups");
  revalidatePath(`/groups/${group.id}`);

  return {
    ok: true,
    groupId: group.id,
    groupName: group.name,
    alreadyMember: false,
    message: `Joined ${group.name} successfully.`,
  };
}

export async function joinGroupAction(
  _prevState: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const groupCode = String(formData.get("groupCode") ?? "");
  const result = await joinGroupByInviteCode(groupCode);

  if (!result.ok) {
    return {
      success: false,
      message: result.message,
    };
  }

  return {
    success: true,
    message: result.message,
  };
}

export async function leaveGroupAction(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");

  if (!groupId) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { data: group } = await supabase
    .from("groups")
    .select("created_by")
    .eq("id", groupId)
    .maybeSingle();

  if (group?.created_by === user.id) {
    return;
  }

  await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id);

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  redirect("/groups");
}

export async function addMemberToGroupAction(
  _prevState: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const groupId = String(formData.get("groupId") ?? "");
  const userIdInput = formData.get("userId");
  const usernameInput = formData.get("username");

  const parsedByUserId = addMemberByUserIdSchema.safeParse({ userId: userIdInput });
  const parsedByUsername = addMemberByUsernameSchema.safeParse({ username: usernameInput });

  if (!groupId) {
    return {
      success: false,
      message: "Group context is missing.",
    };
  }

  if (!parsedByUserId.success && !parsedByUsername.success) {
    return {
      success: false,
      message: "Select a user to add.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be signed in.",
    };
  }

  const { data: callerMembership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!callerMembership) {
    return {
      success: false,
      message: "You must be a group member to add people.",
    };
  }

  const admin = createSupabaseAdminClient();

  const { data: profile, error: profileError } = parsedByUserId.success
    ? await admin
        .from("profiles")
        .select("user_id, username, full_name")
        .eq("user_id", parsedByUserId.data.userId)
        .maybeSingle()
    : await admin
        .from("profiles")
        .select("user_id, username, full_name")
        .eq("username", parsedByUsername.data!.username)
        .maybeSingle();

  if (profileError || !profile) {
    return {
      success: false,
      message:
        "User is not registered yet. Ask them to create an account first, then add by username or ID.",
    };
  }

  if (profile.user_id === user.id) {
    return {
      success: false,
      message: "You are already in this group.",
    };
  }

  const { data: existingMembership } = await admin
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", profile.user_id)
    .maybeSingle();

  if (existingMembership) {
    return {
      success: false,
      message: "This user is already in the group.",
    };
  }

  const { error: membershipError } = await supabase.from("group_members").insert({
    group_id: groupId,
    user_id: profile.user_id,
  });

  if (membershipError) {
    return {
      success: false,
      message: membershipError.message,
    };
  }

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);

  return {
    success: true,
    message: `Added ${profile.full_name} (@${profile.username}) to the group.`,
  };
}

export async function deleteGroupAction(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");

  if (!groupId) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { data: group } = await supabase
    .from("groups")
    .select("created_by")
    .eq("id", groupId)
    .maybeSingle();

  if (!group || group.created_by !== user.id) {
    return;
  }

  await supabase.from("groups").delete().eq("id", groupId);

  revalidatePath("/groups");
  redirect("/groups");
}

export async function removeMemberAction(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const memberUserId = String(formData.get("memberUserId") ?? "");

  if (!groupId || !memberUserId) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { data: group } = await supabase
    .from("groups")
    .select("created_by")
    .eq("id", groupId)
    .maybeSingle();

  if (!group || group.created_by !== user.id) {
    return;
  }

  if (memberUserId === user.id || memberUserId === group.created_by) {
    return;
  }

  await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", memberUserId);

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
}
