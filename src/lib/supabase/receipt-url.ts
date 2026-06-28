import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const RECEIPT_URL_EXPIRY_SECONDS = 60 * 60; // 1 hour

export async function getReceiptSignedUrl(receiptPath: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.storage
    .from("receipts")
    .createSignedUrl(receiptPath, RECEIPT_URL_EXPIRY_SECONDS);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}
