import { supabase } from "./supabase";

const PAGE_SIZE = 1000;

/** Fetch all rows from a table, paginating past the 1000-row default limit. */
async function fetchAll<T>(
  table: string,
  opts?: { order?: { column: string; ascending: boolean } }
): Promise<T[]> {
  if (!supabase) return [];
  const results: T[] = [];
  let from = 0;

  while (true) {
    let query = supabase.from(table).select("*").range(from, from + PAGE_SIZE - 1);
    if (opts?.order) query = query.order(opts.order.column, { ascending: opts.order.ascending });
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    results.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return results;
}

// ── Player Metrics ──────────────────────────────────────────────────
export interface PlayerMetric {
  player_pfid: string;
  level_reached: number;
  gameplay_time: number;
  blocks_broken: number;
  tutorial_time: number | null;
  sessions: { startTimestamp: number; endTimestamp: number }[];
  mine_times: number[];
  abilities_purchased: number;
  pets_purchased: number;
  saw_cosmetics: boolean;
  saw_market: boolean;
  bought_in_market: boolean;
  upgrades_purchased: number;
  tool_material_on_quit: string | null;
  tool_material_on_tutorial_complete: string | null;
  coins_earnt: number;
  coins_spent: number;
  coins_tutorial: number;
  created_at: number;
  prestige_reached: number;
}

export interface PlayerNameLookup {
  player_pfid: string;
  player_name: string | null;
}

export async function getPlayerMetrics() {
  return fetchAll<PlayerMetric>("player_metrics", {
    order: { column: "gameplay_time", ascending: false },
  });
}

/** Fetch a limited number of player metric rows for the players page. */
export async function getPlayerMetricsLimited(limit: number, offset = 0) {
  if (!supabase) return { players: [], total: 0 };
  const { data, error, count } = await supabase
    .from("player_metrics")
    .select("*", { count: "exact" })
    .order("gameplay_time", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);

  return {
    players: (data ?? []) as PlayerMetric[],
    total: count ?? 0,
  };
}

export async function getPlayerNamesByPfids(playerPfids: string[]) {
  if (!supabase || playerPfids.length === 0) return new Map<string, string>();

  const uniquePfids = [...new Set(playerPfids)];
  const [leaderboardsResult, feedbackResult] = await Promise.all([
    supabase
      .from("leaderboards")
      .select("playerPfid, playerName, updatedTimestamp")
      .in("playerPfid", uniquePfids)
      .order("updatedTimestamp", { ascending: false }),
    supabase
      .from("player_feedback")
      .select("player_pfid, player_name")
      .in("player_pfid", uniquePfids),
  ]);

  if (leaderboardsResult.error) throw new Error(leaderboardsResult.error.message);
  if (feedbackResult.error) throw new Error(feedbackResult.error.message);

  const names = new Map<string, string>();

  for (const row of (leaderboardsResult.data ?? []) as {
    playerPfid: string;
    playerName: string | null;
  }[]) {
    if (!row.playerPfid || !row.playerName || names.has(row.playerPfid)) continue;
    names.set(row.playerPfid, row.playerName);
  }

  for (const row of (feedbackResult.data ?? []) as {
    player_pfid: string;
    player_name: string | null;
  }[]) {
    if (!row.player_pfid || !row.player_name || names.has(row.player_pfid)) continue;
    names.set(row.player_pfid, row.player_name);
  }

  return names;
}

// ── Market ──────────────────────────────────────────────────────────
export interface MarketListing {
  id: string;
  sellerPfid: string;
  sellerName: string;
  itemType: string;
  buyPrice: number;
  itemData: Record<string, unknown>;
  timestampListed: number;
  expiresAt: number;
}

export async function getMarketListings() {
  return fetchAll<MarketListing>("market", {
    order: { column: "timestampListed", ascending: false },
  });
}

// ── Leaderboards ────────────────────────────────────────────────────
export interface LeaderboardEntry {
  _id: string;
  playerPfid: string;
  playerName: string;
  leaderboardId: string;
  score: number;
  updatedTimestamp: number;
}

export async function getLeaderboards() {
  return fetchAll<LeaderboardEntry>("leaderboards", {
    order: { column: "score", ascending: false },
  });
}

/** Alias used by the leaderboards API cache to fetch everything once. */
export const fetchAllLeaderboards = getLeaderboards;

/** Fetch a limited number of leaderboard rows (for initial page load). */
export async function getLeaderboardsLimited(limit: number) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("leaderboards")
    .select("*")
    .order("score", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as LeaderboardEntry[];
}

// ── Feedback (ratings) ──────────────────────────────────────────────
export interface FeedbackRating {
  id: string;
  created_at: string;
  rating: number;
  playerPfid: string;
}

export async function getFeedbackRatings() {
  return fetchAll<FeedbackRating>("feedback", {
    order: { column: "created_at", ascending: false },
  });
}

// ── Player Feedback (written) ───────────────────────────────────────
export interface PlayerFeedback {
  id: string;
  player_pfid: string;
  player_name: string;
  type: string;
  feedback: string;
}

export async function getPlayerFeedback() {
  return fetchAll<PlayerFeedback>("player_feedback");
}

// ── Daily Cycles ────────────────────────────────────────────────────
export interface DailyCycle {
  cycle: number;
  created_at: string;
}

export async function getDailyCycles() {
  return fetchAll<DailyCycle>("daily_cycles", {
    order: { column: "cycle", ascending: false },
  });
}
