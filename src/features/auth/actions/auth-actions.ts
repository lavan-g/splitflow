"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSafeRedirectPath } from "@/lib/navigation/safe-redirect";
import {
  forgotPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/features/auth/schemas/auth-schemas";
import { type AuthFormState } from "@/features/auth/types/auth-form-state";

export async function signInAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid sign in payload.",
      showCreateAccountCta: false,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    const normalized = error.message.toLowerCase();

    if (normalized.includes("email not confirmed")) {
      return {
        success: false,
        message:
          "Your email is not verified yet. Please check your inbox and click the confirmation link.",
        showCreateAccountCta: false,
      };
    }

    if (normalized.includes("invalid login credentials")) {
      return {
        success: false,
        message: "Incorrect password. If you don't have an account yet, create one.",
        showCreateAccountCta: true,
      };
    }

    return {
      success: false,
      message: error.message,
      showCreateAccountCta: false,
    };
  }

  redirect(getSafeRedirectPath(String(formData.get("next") ?? "")) ?? "/dashboard");
}

export async function signUpAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid sign up payload.",
      showCreateAccountCta: false,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        username: parsed.data.username.toLowerCase(),
      },
    },
  });

  if (error) {
    const normalized = error.message.toLowerCase();
    const isDuplicateUsername =
      normalized.includes("profiles_username_key") ||
      normalized.includes("duplicate key value");

    if (isDuplicateUsername) {
      return {
        success: false,
        message: "Username already exists. Please choose a different username.",
        showCreateAccountCta: false,
      };
    }

    if (normalized.includes("user already registered")) {
      return {
        success: false,
        message: "This Gmail is already registered. Please log in instead.",
        showCreateAccountCta: false,
      };
    }

    return {
      success: false,
      message: error.message,
      showCreateAccountCta: false,
    };
  }

  if (data.session) {
    redirect(getSafeRedirectPath(String(formData.get("next") ?? "")) ?? "/dashboard");
  }

  redirect(`/signup/confirm?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function forgotPasswordAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid email payload.",
      showCreateAccountCta: false,
    };
  }

  const headerList = await headers();
  const origin = headerList.get("origin") ?? "http://localhost:3000";

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return {
      success: false,
      message: error.message,
      showCreateAccountCta: false,
    };
  }

  return {
    success: true,
    message: "Password reset email sent. Check your inbox.",
    showCreateAccountCta: false,
  };
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function deleteAccountAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You must be signed in.", showCreateAccountCta: false };
  }

  const confirmedEmail = String(formData.get("confirmEmail") ?? "").trim().toLowerCase();
  if (confirmedEmail !== user.email?.toLowerCase()) {
    return {
      success: false,
      message: "Email does not match. Please type your email exactly.",
      showCreateAccountCta: false,
    };
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return { success: false, message: error.message, showCreateAccountCta: false };
  }

  await supabase.auth.signOut();
  redirect("/login?deleted=1");
}
