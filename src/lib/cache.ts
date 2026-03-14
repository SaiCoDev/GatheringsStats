import {
  getPlayerMetrics,
  getMarketListings,
  getFeedbackRatings,
  getPlayerFeedback,
  getDailyCycles,
  type PlayerMetric,
  type MarketListing,
  type FeedbackRating,
  type PlayerFeedback,
  type DailyCycle,
} from "./queries";

export interface GameData {
  players: PlayerMetric[];
  market: MarketListing[];
  ratings: FeedbackRating[];
  feedback: PlayerFeedback[];
  cycles: DailyCycle[];
  cachedAt: number;
}

let cached: GameData | null = null;

export async function getGameData(forceRefresh = false): Promise<GameData> {
  if (cached && !forceRefresh) return cached;

  const [players, market, ratings, feedback, cycles] =
    await Promise.all([
      getPlayerMetrics(),
      getMarketListings(),
      getFeedbackRatings(),
      getPlayerFeedback(),
      getDailyCycles(),
    ]);

  cached = { players, market, ratings, feedback, cycles, cachedAt: Date.now() };
  return cached;
}
