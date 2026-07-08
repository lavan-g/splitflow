"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  SETTLEMENT_FORM_INITIAL_STATE,
  type SettlementFormState,
} from "@/features/settlements/types/settlement-form-state";

const createSettlementSchema = z.object({
  receiverId: z.string().uuid("Invalid recipient."),
  amount: z
    .string()
    .min(1, "Amount is required.")
    .transform((v) => parseFloat(v))
    .pipe(z.number().positive("Amount must be greater than 0.")),
});

export async function createSettlementAction(
  _prevState: SettlementFormState,
  formData: FormData,
): Promise<SettlementFormState> {
  const parsed = createSettlementSchema.safeParse({
    receiverId: formData.get("receiverId"),
    amount: formData.get("amount"),
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

  if (user.id === parsed.data.receiverId) {
    return { success: false, message: "You cannot settle with yourself." };
  }

  const { error } = await supabase.from("settlements").insert({
    payer_id: user.id,
    receiver_id: parsed.data.receiverId,
    amount: parsed.data.amount,
    status: "settled",
  });

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/settlements");
  revalidatePath("/dashboard");
  revalidatePath("/groups", "layout");

  return {
    ...SETTLEMENT_FORM_INITIAL_STATE,
    success: true,
    message: "Payment recorded successfully.",
  };
}

