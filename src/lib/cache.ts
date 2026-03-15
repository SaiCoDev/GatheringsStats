import { supabase } from "./supabase";
import type {
  PlayerMetric,
  MarketListing,
  FeedbackRating,
  PlayerFeedback,
  DailyCycle,
  LeaderboardEntry,
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

const EMPTY: GameData = {
  players: [],
  market: [],
  ratings: [],
  feedback: [],
  cycles: [],
  leaderboards: [],
  cachedAt: 0,
};

let cached: GameData | null = null;

/**
 * Fetch the latest game data snapshot from the website DB.
 * Never queries the game server directly — that only happens via the cron
 * or the "Sync now" button (/api/game-data-snapshot).
 */
export async function getGameData(forceRefresh = false): Promise<GameData> {
  if (cached && !forceRefresh) return cached;

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

  return EMPTY;
}
