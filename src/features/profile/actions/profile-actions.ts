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
