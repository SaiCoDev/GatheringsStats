import { supabase } from "./supabase";
import {
  getPlayerMetrics,
  getMarketListings,
  getFeedbackRatings,
  getPlayerFeedback,
  getDailyCycles,
  getLeaderboards,
  type PlayerMetric,
  type MarketListing,
  type FeedbackRating,
  type PlayerFeedback,
  type DailyCycle,
  type LeaderboardEntry,
} from "./queries";

export interface GameData {
  players: PlayerMetric[];
  market: MarketListing[];
  ratings: FeedbackRating[];
  feedback: PlayerFeedback[];
  cycles: DailyCycle[];
  leaderboards: LeaderboardEntry[];
  cachedAt: number;
}

let cached: GameData | null = null;

/**
 * Fetch the latest game data snapshot from the website DB.
 * Falls back to querying the game server directly if no snapshot exists.
 */
export async function getGameData(forceRefresh = false): Promise<GameData> {
  if (cached && !forceRefresh) return cached;

  // Try reading from the snapshot table first
  if (supabase) {
    const { data, error } = await supabase
      .from("game_data_snapshots")
      .select("*")
      .order("captured_at", { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      cached = {
        players: (data.players ?? []) as PlayerMetric[],
        market: (data.market ?? []) as MarketListing[],
        ratings: (data.ratings ?? []) as FeedbackRating[],
        feedback: (data.feedback ?? []) as PlayerFeedback[],
        cycles: (data.cycles ?? []) as DailyCycle[],
        leaderboards: (data.leaderboards ?? []) as LeaderboardEntry[],
        cachedAt: new Date(data.captured_at).getTime(),
      };
      return cached;
    }
  }

  // Fallback: query game server directly (before snapshot table exists)
  const [players, market, ratings, feedback, cycles, leaderboards] =
    await Promise.all([
      getPlayerMetrics(),
      getMarketListings(),
      getFeedbackRatings(),
      getPlayerFeedback(),
      getDailyCycles(),
      getLeaderboards(),
    ]);

  cached = { players, market, ratings, feedback, cycles, leaderboards, cachedAt: Date.now() };
  return cached;
}
