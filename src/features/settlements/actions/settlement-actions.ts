"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type SettlementFormState } from "@/features/settlements/types/settlement-form-state";

const createSettlementSchema = z.object({
  receiverId: z.string().uuid("Select who you are paying."),
  amount: z.coerce
    .number()
    .positive("Amount must be greater than 0."),
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
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, message: "You must be signed in." };

  if (parsed.data.receiverId === user.id) {
    return { success: false, message: "You cannot settle with yourself." };
  }

  const { error } = await supabase.from("settlements").insert({
    payer_id: user.id,
    receiver_id: parsed.data.receiverId,
    amount: parsed.data.amount,
    status: "pending",
  });

  if (error) {
    return { success: false, message: "Failed to record settlement. Please try again." };
  }

  revalidatePath("/settlements");
  revalidatePath("/dashboard");

  return { success: true, message: "Settlement recorded successfully." };
}

export async function markSettledAction(formData: FormData): Promise<void> {
  const settlementId = String(formData.get("settlementId") ?? "");
  if (!settlementId) return;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("settlements")
    .update({ status: "settled" })
    .eq("id", settlementId)
    .or(`payer_id.eq.${user.id},receiver_id.eq.${user.id}`);

  revalidatePath("/settlements");
  revalidatePath("/dashboard");
}
