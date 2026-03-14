import { NextRequest, NextResponse } from "next/server";
import { getPlayerMetricsLimited, getPlayerNamesByPfids, type PlayerMetric } from "@/lib/queries";
import { allowRefresh, cooldownRemaining } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 250;
const MAX_LIMIT = 250;

interface PlayersResponse {
  players: (PlayerMetric & { player_name: string | null })[];
  total: number;
  limit: number;
  offset: number;
  cachedAt: number;
  rateLimited?: boolean;
  cooldown?: number;
}

const playersCache = new Map<string, PlayersResponse>();

export async function GET(req: NextRequest) {
  const requestedLimit = parseInt(req.nextUrl.searchParams.get("limit") ?? `${DEFAULT_LIMIT}`, 10);
  const requestedOffset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0", 10);
  const wantsRefresh = req.nextUrl.searchParams.get("refresh") === "1";
  const refresh = wantsRefresh && allowRefresh("players");

  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const offset = Number.isFinite(requestedOffset) ? Math.max(requestedOffset, 0) : 0;
  const cacheKey = `${offset}:${limit}`;

  if (refresh) {
    playersCache.clear();
  } else {
    const cached = playersCache.get(cacheKey);
    if (cached) {
      const response = wantsRefresh && !refresh
        ? { ...cached, rateLimited: true, cooldown: cooldownRemaining("players") }
        : cached;
      return NextResponse.json(response);
    }
  }

  try {
    const { players, total } = await getPlayerMetricsLimited(limit, offset);
    const names = await getPlayerNamesByPfids(players.map((player) => player.player_pfid));
    const response: PlayersResponse = {
      players: players.map((player) => ({
        ...player,
        player_name: names.get(player.player_pfid) ?? null,
      })),
      total,
      limit,
      offset,
      cachedAt: Date.now(),
    };

    playersCache.set(cacheKey, response);

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch players";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
