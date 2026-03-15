import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Website Supabase — stores snapshots, served to visitors
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

// Game Server Supabase — source data (player_metrics, market, etc.)
const gameSupabaseUrl = process.env.GAME_SUPABASE_URL;
const gameSupabaseKey = process.env.GAME_SUPABASE_SERVICE_ROLE_KEY;

export const gameSupabase: SupabaseClient | null =
  gameSupabaseUrl && gameSupabaseKey
    ? createClient(gameSupabaseUrl, gameSupabaseKey)
    : null;
