"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProfileFormState = {
  success: boolean;
  message: string;
};

export const PROFILE_FORM_INITIAL_STATE: ProfileFormState = {
  success: false,
  message: "",
};

const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(60, "Full name must be under 60 characters."),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters.")
    .max(20, "Username must be under 20 characters.")
    .regex(/^[a-z0-9_]+$/, "Only letters, numbers, and underscores allowed."),
});

export async function updateProfileAction(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = updateProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    username: formData.get("username"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You must be signed in." };
  }

  const admin = createSupabaseAdminClient();

  // Check username uniqueness (exclude the current user)
  const { data: existing } = await admin
    .from("profiles")
    .select("user_id")
    .eq("username", parsed.data.username)
    .neq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      message: "That username is already taken. Please choose another.",
    };
  }

  const { error } = await admin
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      username: parsed.data.username,
    })
    .eq("user_id", user.id);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");

  return { success: true, message: "Profile updated successfully." };
}

export async function uploadAvatarAction(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You must be signed in." };
  }

  const avatar = formData.get("avatar");
  if (!(avatar instanceof File) || avatar.size === 0) {
    return { success: false, message: "Choose an image to upload." };
  }

  if (!ALLOWED_AVATAR_TYPES.has(avatar.type)) {
    return { success: false, message: "Avatar must be JPG, PNG, or WebP." };
  }

  if (avatar.size > MAX_AVATAR_SIZE_BYTES) {
    return { success: false, message: "Avatar must be under 2MB." };
  }

  const admin = createSupabaseAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("avatar_url")
    .eq("user_id", user.id)
    .single();

  const ext = avatar.type === "image/png" ? "png" : avatar.type === "image/webp" ? "webp" : "jpg";
  const avatarPath = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(avatarPath, avatar, {
      contentType: avatar.type,
      upsert: true,
    });

  if (uploadError) {
    return { success: false, message: "Failed to upload avatar." };
  }

  if (profile?.avatar_url && profile.avatar_url !== avatarPath) {
    await admin.storage.from("avatars").remove([profile.avatar_url]);
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({ avatar_url: avatarPath })
    .eq("user_id", user.id);

  if (updateError) {
    return { success: false, message: updateError.message };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");

  return { success: true, message: "Avatar updated." };
}

export async function removeAvatarAction(
  _prevState: ProfileFormState,
  _formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You must be signed in." };
  }

  const admin = createSupabaseAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("avatar_url")
    .eq("user_id", user.id)
    .single();

  if (profile?.avatar_url) {
    await admin.storage.from("avatars").remove([profile.avatar_url]);
  }

  const { error } = await admin
    .from("profiles")
    .update({ avatar_url: null })
    .eq("user_id", user.id);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");

  return { success: true, message: "Avatar removed." };
}
