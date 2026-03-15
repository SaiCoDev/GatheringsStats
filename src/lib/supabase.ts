import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy-init clients — on Cloudflare Workers, process.env secrets
// aren't available at module load time, only during request handling.

let _supabase: SupabaseClient | null | undefined;
let _gameSupabase: SupabaseClient | null | undefined;

/** Website Supabase — stores snapshots, served to visitors */
export function getSupabase(): SupabaseClient | null {
  if (_supabase !== undefined) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  _supabase = url && key ? createClient(url, key) : null;
  return _supabase;
}

/** Game Server Supabase — source data (player_metrics, market, etc.) */
export function getGameSupabase(): SupabaseClient | null {
  if (_gameSupabase !== undefined) return _gameSupabase;
  const url = process.env.GAME_SUPABASE_URL;
  const key = process.env.GAME_SUPABASE_SERVICE_ROLE_KEY;
  _gameSupabase = url && key ? createClient(url, key) : null;
  return _gameSupabase;
}
