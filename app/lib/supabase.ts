/*
  Supabase browser client.

  The client is created lazily and only in the browser. Dashboard routes are
  client-gated (see `routes/dashboard.tsx`), so nothing here runs during SSR.

  Required environment variables (see `.env.example`):
    VITE_SUPABASE_URL
    VITE_SUPABASE_ANON_KEY

  When those are missing the app does not crash: `isSupabaseConfigured` is
  false, auth falls back to the local mock backend, and the dashboard shows a
  setup card instead of blank panels.
*/

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

/** Storage bucket that holds uploaded transcript files. Must exist in Supabase. */
export const TRANSCRIPT_BUCKET = "transcripts";

let client: SupabaseClient | null = null;

/** Throws if called before the env vars are set — always guard with `isSupabaseConfigured`. */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.",
    );
  }
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

/** Turns a PostgrestError / AuthError / unknown throw into a sentence we can show a user. */
export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message);
    return message || fallback;
  }
  return fallback;
}
