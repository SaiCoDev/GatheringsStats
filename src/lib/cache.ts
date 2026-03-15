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

export type GameDataField = "players" | "market" | "ratings" | "feedback" | "cycles" | "leaderboards";

const ALL_FIELDS: GameDataField[] = ["players", "market", "ratings", "feedback", "cycles", "leaderboards"];

/**
 * Fetch specific fields from the latest game data snapshot.
 * Only selects the requested columns from Supabase to keep the payload small.
 */
export async function getGameData(fields?: GameDataField[]): Promise<GameData> {
  if (!supabase) {
    console.error("[game-data] supabase client is null");
    return emptyData();
  }

  const selected = fields ?? ALL_FIELDS;
  const columns = ["captured_at", ...selected].join(",");

  const { data, error } = await supabase
    .from("game_data_snapshots")
    .select(columns)
    .order("captured_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.error("[game-data] query failed:", error?.message ?? "no data");
    return emptyData();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  return {
    players: (row.players ?? []) as PlayerMetric[],
    market: (row.market ?? []) as MarketListing[],
    ratings: (row.ratings ?? []) as FeedbackRating[],
    feedback: (row.feedback ?? []) as PlayerFeedback[],
    cycles: (row.cycles ?? []) as DailyCycle[],
    leaderboards: (row.leaderboards ?? []) as LeaderboardEntry[],
    cachedAt: new Date(row.captured_at).getTime(),
  };
}

function emptyData(): GameData {
  return {
    players: [],
    market: [],
    ratings: [],
    feedback: [],
    cycles: [],
    leaderboards: [],
    cachedAt: 0,
  };
}
