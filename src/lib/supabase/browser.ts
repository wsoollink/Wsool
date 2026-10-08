import { createClient } from "@supabase/supabase-js";

/** Browser Supabase client (publishable key only). Used to upload to signed URLs. */
export function createSupabaseBrowser() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
