"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createExpenseSchema } from "@/features/expenses/schemas/create-expense-schema";
import {
  EXPENSE_FORM_INITIAL_STATE,
  type ExpenseFormState,
  type SplitPayloadEntry,
} from "@/features/expenses/types/expense-form-state";
import {
  isAmountMatching,
  roundCurrency,
  validateSplitTypeRules,
} from "@/features/expenses/utils/split-calculations";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ALLOWED_RECEIPT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);
const MAX_RECEIPT_SIZE_BYTES = 8 * 1024 * 1024;

function parseSplitPayload(payload: unknown): SplitPayloadEntry[] {
  if (typeof payload !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(payload);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function createExpenseAction(
  _prevState: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const splitPayload = parseSplitPayload(formData.get("splitsPayload"));

  const parsed = createExpenseSchema.safeParse({
    groupId: formData.get("groupId"),
    title: formData.get("title"),
    amount: formData.get("amount"),
    paidBy: formData.get("paidBy"),
    notes: formData.get("notes"),
    splitType: formData.get("splitType"),
    splits: splitPayload,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid expense payload.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You must be signed in." };
  }

  const { data: currentMembership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", parsed.data.groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!currentMembership) {
    return {
      success: false,
      message: "You can only add expenses to groups you belong to.",
    };
  }

  const splitUserIds = Array.from(new Set(parsed.data.splits.map((split) => split.userId)));
  const { data: groupMembers } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", parsed.data.groupId)
    .in("user_id", splitUserIds.concat(parsed.data.paidBy));

  const memberIds = new Set((groupMembers ?? []).map((member) => member.user_id));
  if (!memberIds.has(parsed.data.paidBy)) {
    return { success: false, message: "Payer must be a member of the group." };
  }

  const everySplitUserIsMember = parsed.data.splits.every((split) =>
    memberIds.has(split.userId),
  );
  if (!everySplitUserIsMember) {
    return {
      success: false,
      message: "All split users must belong to the selected group.",
    };
  }

  if (
    !validateSplitTypeRules(parsed.data.splitType, parsed.data.amount, parsed.data.splits)
  ) {
    return {
      success: false,
      message: "Split totals are invalid for the selected split type.",
    };
  }

  if (!isAmountMatching(parsed.data.amount, parsed.data.splits)) {
    return {
      success: false,
      message: "Split amounts must exactly match the expense amount.",
    };
  }

  let receiptPath: string | null = null;
  const receipt = formData.get("receipt");
  if (receipt instanceof File && receipt.size > 0) {
    if (!ALLOWED_RECEIPT_TYPES.has(receipt.type)) {
      return {
        success: false,
        message: "Receipt must be a PDF, JPG, or PNG file.",
      };
    }

    if (receipt.size > MAX_RECEIPT_SIZE_BYTES) {
      return {
        success: false,
        message: "Receipt exceeds 8MB size limit.",
      };
    }

    const safeName = receipt.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
    receiptPath = `${user.id}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(receiptPath, receipt, {
        contentType: receipt.type,
        upsert: false,
      });

    if (uploadError) {
      return {
        success: false,
        message: uploadError.message,
      };
    }
  }

  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .insert({
      group_id: parsed.data.groupId,
      title: parsed.data.title,
      amount: roundCurrency(parsed.data.amount),
      paid_by: parsed.data.paidBy,
      notes: parsed.data.notes || null,
      receipt_url: receiptPath,
    })
    .select("id")
    .single();

  if (expenseError || !expense) {
    return {
      success: false,
      message: expenseError?.message ?? "Failed to create expense.",
    };
  }

  const splitsInsertRows = parsed.data.splits.map((split) => ({
    expense_id: expense.id,
    user_id: split.userId,
    amount: roundCurrency(split.amount),
  }));

  const { error: splitsError } = await supabase.from("expense_splits").insert(splitsInsertRows);

  if (splitsError) {
    await supabase.from("expenses").delete().eq("id", expense.id);
    return {
      success: false,
      message: splitsError.message,
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/groups");
  revalidatePath(`/groups/${parsed.data.groupId}`);
  revalidatePath("/expenses/new");

  return {
    ...EXPENSE_FORM_INITIAL_STATE,
    success: true,
    message: "Expense added successfully.",
  };
}

export async function deleteExpenseAction(formData: FormData): Promise<void> {
  const expenseId = String(formData.get("expenseId") ?? "");
  if (!expenseId) return;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Fetch the expense to get group_id for redirect and verify ownership
  const { data: expense } = await supabase
    .from("expenses")
    .select("id, group_id, paid_by")
    .eq("id", expenseId)
    .single();

  if (!expense || expense.paid_by !== user.id) return;

  await supabase.from("expenses").delete().eq("id", expenseId);

  revalidatePath("/dashboard");
  revalidatePath(`/groups/${expense.group_id}`);

  redirect(`/groups/${expense.group_id}`);
}
