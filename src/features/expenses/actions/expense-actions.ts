"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createExpenseSchema, updateExpenseSchema } from "@/features/expenses/schemas/create-expense-schema";
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
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

async function uploadReceipt(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  receipt: FormDataEntryValue | null,
): Promise<{ path: string | null; error: string | null }> {
  if (!(receipt instanceof File) || receipt.size === 0) {
    return { path: null, error: null };
  }

  if (!ALLOWED_RECEIPT_TYPES.has(receipt.type)) {
    return { path: null, error: "Receipt must be a PDF, JPG, or PNG file." };
  }

  if (receipt.size > MAX_RECEIPT_SIZE_BYTES) {
    return { path: null, error: "Receipt exceeds 8MB size limit." };
  }

  const safeName = receipt.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
  const receiptPath = `${userId}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(receiptPath, receipt, {
      contentType: receipt.type,
      upsert: false,
    });

  if (uploadError) {
    return { path: null, error: uploadError.message };
  }

  return { path: receiptPath, error: null };
}

type ValidatedExpenseInput = {
  groupId: string;
  title: string;
  amount: number;
  paidBy: string;
  notes?: string;
  splitType: "equal" | "percentage" | "custom";
  splits: SplitPayloadEntry[];
};

async function validateExpenseInput(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  parsed: ValidatedExpenseInput,
): Promise<ExpenseFormState | null> {
  const { data: currentMembership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", parsed.groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!currentMembership) {
    return {
      success: false,
      message: "You can only manage expenses in groups you belong to.",
    };
  }

  const splitUserIds = Array.from(new Set(parsed.splits.map((split) => split.userId)));
  const { data: groupMembers } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", parsed.groupId)
    .in("user_id", splitUserIds.concat(parsed.paidBy));

  const memberIds = new Set((groupMembers ?? []).map((member) => member.user_id));
  if (!memberIds.has(parsed.paidBy)) {
    return { success: false, message: "Payer must be a member of the group." };
  }

  const everySplitUserIsMember = parsed.splits.every((split) => memberIds.has(split.userId));
  if (!everySplitUserIsMember) {
    return {
      success: false,
      message: "All split users must belong to the selected group.",
    };
  }

  if (!validateSplitTypeRules(parsed.splitType, parsed.amount, parsed.splits)) {
    return {
      success: false,
      message: "Split totals are invalid for the selected split type.",
    };
  }

  if (!isAmountMatching(parsed.amount, parsed.splits)) {
    return {
      success: false,
      message: "Split amounts must exactly match the expense amount.",
    };
  }

  return null;
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

  const validationError = await validateExpenseInput(supabase, user.id, parsed.data);
  if (validationError) {
    return validationError;
  }

  const { path: receiptPath, error: receiptError } = await uploadReceipt(
    supabase,
    user.id,
    formData.get("receipt"),
  );
  if (receiptError) {
    return { success: false, message: receiptError };
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
  revalidatePath("/expenses");

  return {
    ...EXPENSE_FORM_INITIAL_STATE,
    success: true,
    message: "Expense added successfully.",
  };
}

export async function updateExpenseAction(
  _prevState: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const splitPayload = parseSplitPayload(formData.get("splitsPayload"));

  const parsed = updateExpenseSchema.safeParse({
    expenseId: formData.get("expenseId"),
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
  const admin = createSupabaseAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "You must be signed in." };
  }

  const { data: existing } = await admin
    .from("expenses")
    .select("id, paid_by, group_id, receipt_url")
    .eq("id", parsed.data.expenseId)
    .single();

  if (!existing || existing.paid_by !== user.id) {
    return { success: false, message: "You can only edit expenses you created." };
  }

  if (existing.group_id !== parsed.data.groupId) {
    return { success: false, message: "Cannot move an expense to a different group." };
  }

  const validationError = await validateExpenseInput(supabase, user.id, parsed.data);
  if (validationError) {
    return validationError;
  }

  const { path: newReceiptPath, error: receiptError } = await uploadReceipt(
    supabase,
    user.id,
    formData.get("receipt"),
  );
  if (receiptError) {
    return { success: false, message: receiptError };
  }

  const removeReceipt = formData.get("removeReceipt") === "true";
  let receiptUrl = existing.receipt_url;

  if (newReceiptPath) {
    if (existing.receipt_url) {
      await admin.storage.from("receipts").remove([existing.receipt_url]);
    }
    receiptUrl = newReceiptPath;
  } else if (removeReceipt && existing.receipt_url) {
    await admin.storage.from("receipts").remove([existing.receipt_url]);
    receiptUrl = null;
  }

  const { error: expenseError } = await supabase
    .from("expenses")
    .update({
      title: parsed.data.title,
      amount: roundCurrency(parsed.data.amount),
      paid_by: parsed.data.paidBy,
      notes: parsed.data.notes || null,
      receipt_url: receiptUrl,
    })
    .eq("id", parsed.data.expenseId);

  if (expenseError) {
    return {
      success: false,
      message: expenseError.message ?? "Failed to update expense.",
    };
  }

  await admin.from("expense_splits").delete().eq("expense_id", parsed.data.expenseId);

  const splitsInsertRows = parsed.data.splits.map((split) => ({
    expense_id: parsed.data.expenseId,
    user_id: split.userId,
    amount: roundCurrency(split.amount),
  }));

  const { error: splitsError } = await supabase.from("expense_splits").insert(splitsInsertRows);

  if (splitsError) {
    return {
      success: false,
      message: splitsError.message,
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/groups");
  revalidatePath(`/groups/${parsed.data.groupId}`);
  revalidatePath("/expenses");
  revalidatePath(`/expenses/${parsed.data.expenseId}`);
  revalidatePath(`/expenses/${parsed.data.expenseId}/edit`);

  return {
    ...EXPENSE_FORM_INITIAL_STATE,
    success: true,
    message: "Expense updated successfully.",
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
