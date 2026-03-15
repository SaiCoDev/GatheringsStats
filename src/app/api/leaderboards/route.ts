import { NextRequest, NextResponse } from "next/server";
import { getGameData } from "@/lib/cache";
import { allowRefresh, cooldownRemaining } from "@/lib/rate-limit";
import type { LeaderboardEntry } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const wantsRefresh = req.nextUrl.searchParams.get("refresh") === "1";
  const refresh = wantsRefresh && allowRefresh("leaderboards");
  const action = req.nextUrl.searchParams.get("action");

  const gameData = await getGameData(refresh);
  const all = gameData.leaderboards;

  // Group by leaderboardId
  const grouped: Record<string, LeaderboardEntry[]> = {};
  for (const e of all) {
    (grouped[e.leaderboardId] ??= []).push(e);
  }
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => b.score - a.score);
  }

  const rateLimitInfo = wantsRefresh && !refresh
    ? { rateLimited: true, cooldown: cooldownRemaining("leaderboards") }
    : {};

  if (action === "list") {
    const boards = Object.entries(grouped)
      .map(([id, entries]) => ({ id, count: entries.length }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return NextResponse.json({ boards, ...rateLimitInfo });
  }

  // Return all boards with their top entries in a single response
  if (action === "all") {
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "100", 10);
    const boards: Record<string, { entries: LeaderboardEntry[]; total: number }> = {};
    for (const [id, entries] of Object.entries(grouped)) {
      boards[id] = { entries: entries.slice(0, limit), total: entries.length };
    }
    return NextResponse.json({ boards, cachedAt: gameData.cachedAt, ...rateLimitInfo });
  }

  const boardId = req.nextUrl.searchParams.get("board");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0", 10);
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "100", 10);

  if (boardId) {
    const boardEntries = grouped[boardId] ?? [];
    return NextResponse.json({
      entries: boardEntries.slice(offset, offset + limit),
      total: boardEntries.length,
      ...rateLimitInfo,
    });
  }

  const flat = Object.values(grouped).flat();
  return NextResponse.json({
    entries: flat.slice(offset, offset + limit),
    total: flat.length,
    ...rateLimitInfo,
  });
}
