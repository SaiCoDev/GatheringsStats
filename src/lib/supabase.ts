import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Create clients fresh each call — on Cloudflare Workers, process.env
// secrets may not be available at module load time or may vary between
// requests, so we never cache the client.

/** Website Supabase — stores snapshots, served to visitors */
export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** Game Server Supabase — source data (player_metrics, market, etc.) */
export function getGameSupabase(): SupabaseClient | null {
  const url = process.env.GAME_SUPABASE_URL;
  const key = process.env.GAME_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}
