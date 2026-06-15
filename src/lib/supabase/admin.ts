import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { serverEnv } from "@/lib/validation/server-env";

export function createSupabaseAdminClient() {
  return createClient<Database>(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
