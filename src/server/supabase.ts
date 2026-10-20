import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getDatabaseEnv } from "./env";

let client: SupabaseClient<Database> | undefined;

/**
 * Supabase client authenticated with the project's secret key. The key bypasses row-level
 * security, so this module is server-only: importing it from a Client Component fails the build.
 */
export function getSupabase(): SupabaseClient<Database> {
  if (!client) {
    const { SUPABASE_URL, SUPABASE_SECRET_KEY } = getDatabaseEnv();
    client = createClient<Database>(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}
