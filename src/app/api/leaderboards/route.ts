import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fetchAllLeaderboards } from "@/lib/queries";
import type { LeaderboardEntry } from "@/lib/queries";

export const dynamic = "force-dynamic";

// In-memory cache: all leaderboard entries grouped by board
let cachedBoards: Record<string, LeaderboardEntry[]> | null = null;

async function ensureCache(forceRefresh = false) {
  if (cachedBoards && !forceRefresh) return cachedBoards;

  const all = await fetchAllLeaderboards();

  const grouped: Record<string, LeaderboardEntry[]> = {};
  for (const e of all) {
    (grouped[e.leaderboardId] ??= []).push(e);
  }
  // Sort each board by score desc
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => b.score - a.score);
  }

  cachedBoards = grouped;
  return cachedBoards;
}

export async function GET(req: NextRequest) {
  if (!supabase) return NextResponse.json({ entries: [], total: 0, boards: [] });

  const refresh = req.nextUrl.searchParams.get("refresh") === "1";
  const action = req.nextUrl.searchParams.get("action");

  const grouped = await ensureCache(refresh);

  // List all distinct board IDs with counts
  if (action === "list") {
    const boards = Object.entries(grouped)
      .map(([id, entries]) => ({ id, count: entries.length }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return NextResponse.json({ boards });
  }

  // Fetch entries for a specific board (sliced from cache)
  const boardId = req.nextUrl.searchParams.get("board");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0", 10);
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "100", 10);

  if (boardId) {
    const boardEntries = grouped[boardId] ?? [];
    return NextResponse.json({
      entries: boardEntries.slice(offset, offset + limit),
      total: boardEntries.length,
    });
  }

  // All boards combined (shouldn't normally be called, but fallback)
  const all = Object.values(grouped).flat();
  return NextResponse.json({
    entries: all.slice(offset, offset + limit),
    total: all.length,
  });
}
