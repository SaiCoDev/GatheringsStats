import { NextRequest, NextResponse } from "next/server";
import { getGameData } from "@/lib/cache";
import { allowRefresh, cooldownRemaining } from "@/lib/rate-limit";
import type { PlayerMetric } from "@/lib/queries";

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

export async function GET(req: NextRequest) {
  const requestedLimit = parseInt(req.nextUrl.searchParams.get("limit") ?? `${DEFAULT_LIMIT}`, 10);
  const requestedOffset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0", 10);
  const wantsRefresh = req.nextUrl.searchParams.get("refresh") === "1";
  const refresh = wantsRefresh && allowRefresh("players");

  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const offset = Number.isFinite(requestedOffset) ? Math.max(requestedOffset, 0) : 0;

  try {
    const gameData = await getGameData(refresh);

    // Build a name lookup from leaderboards + player_feedback in the snapshot
    const names = new Map<string, string>();
    for (const entry of gameData.leaderboards) {
      if (entry.playerPfid && entry.playerName && !names.has(entry.playerPfid)) {
        names.set(entry.playerPfid, entry.playerName);
      }
    }
    for (const fb of gameData.feedback) {
      if (fb.player_pfid && fb.player_name && !names.has(fb.player_pfid)) {
        names.set(fb.player_pfid, fb.player_name);
      }
    }

    // Players are already sorted by gameplay_time desc from the snapshot
    const allPlayers = gameData.players;
    const page = allPlayers.slice(offset, offset + limit);

    const response: PlayersResponse = {
      players: page.map((player) => ({
        ...player,
        player_name: names.get(player.player_pfid) ?? null,
      })),
      total: allPlayers.length,
      limit,
      offset,
      cachedAt: gameData.cachedAt,
    };

    if (wantsRefresh && !refresh) {
      response.rateLimited = true;
      response.cooldown = cooldownRemaining("players");
    }

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch players";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
