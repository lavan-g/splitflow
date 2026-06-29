"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
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

export async function joinGroupAction(
  _prevState: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const parsed = joinGroupSchema.safeParse({
    groupCode: formData.get("groupCode"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid group code.",
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

  // Use admin client so RLS doesn't block non-members from finding a group by code.
  const adminClient = createSupabaseAdminClient();
  const { data: group, error: groupError } = await adminClient
    .from("groups")
    .select("id")
    .eq("group_code", parsed.data.groupCode.toUpperCase())
    .maybeSingle();

  if (groupError || !group) {
    return {
      success: false,
      message: "Group not found. Check the code and try again.",
    };
  }

  const { error: membershipError } = await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: user.id,
  });

  if (membershipError) {
    const isAlreadyMember = membershipError.message
      .toLowerCase()
      .includes("duplicate key");
    return {
      success: !isAlreadyMember,
      message: isAlreadyMember
        ? "You are already a member of this group."
        : membershipError.message,
    };
  }

  revalidatePath("/groups");
  revalidatePath(`/groups/${group.id}`);

  return {
    success: true,
    message: "Joined group successfully.",
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
  const parsed = addMemberByUsernameSchema.safeParse({
    username: formData.get("username"),
  });

  if (!groupId) {
    return {
      success: false,
      message: "Group context is missing.",
    };
  }

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid username.",
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, username, full_name")
    .eq("username", parsed.data.username)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      success: false,
      message:
        "User is not registered yet. Ask them to create an account first, then add by username.",
    };
  }

  if (profile.user_id === user.id) {
    return {
      success: false,
      message: "You are already in this group.",
    };
  }

  const { error: membershipError } = await supabase.from("group_members").insert({
    group_id: groupId,
    user_id: profile.user_id,
  });

  if (membershipError) {
    const isAlreadyMember = membershipError.message
      .toLowerCase()
      .includes("duplicate key");
    return {
      success: !isAlreadyMember,
      message: isAlreadyMember
        ? "This user is already in the group."
        : membershipError.message,
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
