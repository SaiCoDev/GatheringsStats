import { NextResponse } from "next/server";
import { getGameSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const gameSupabase = getGameSupabase();
  if (!gameSupabase) {
    return NextResponse.json({ online: 0, players: [], error: "Game server not configured" });
  }

  try {
    const PAGE_SIZE = 1000;
    const onlinePfids: string[] = [];
    let from = 0;

    while (true) {
      const { data, error } = await gameSupabase
        .from("player_metrics")
        .select("player_pfid, sessions")
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw new Error(error.message);
      if (!data || data.length === 0) break;

      for (const row of data) {
        const sessions = row.sessions;
        if (Array.isArray(sessions) && sessions.length > 0) {
          const last = sessions[sessions.length - 1];
          if (last.endTimestamp === 0) onlinePfids.push(row.player_pfid);
        }
      }

      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    // Resolve names from leaderboards + player_feedback
    const names = new Map<string, string>();
    if (onlinePfids.length > 0) {
      const [lb, fb] = await Promise.all([
        gameSupabase
          .from("leaderboards")
          .select("playerPfid, playerName")
          .in("playerPfid", onlinePfids),
        gameSupabase
          .from("player_feedback")
          .select("player_pfid, player_name")
          .in("player_pfid", onlinePfids),
      ]);

      for (const row of lb.data ?? []) {
        if (row.playerPfid && row.playerName && !names.has(row.playerPfid)) {
          names.set(row.playerPfid, row.playerName);
        }
      }
      for (const row of fb.data ?? []) {
        if (row.player_pfid && row.player_name && !names.has(row.player_pfid)) {
          names.set(row.player_pfid, row.player_name);
        }
      }
    }

    const players = onlinePfids
      .filter((pfid) => names.has(pfid))
      .map((pfid) => ({ pfid, name: names.get(pfid)! }));

    return NextResponse.json({ online: players.length, players, timestamp: Date.now() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch online count";
    console.error("[online-count]", message);
    return NextResponse.json({ online: 0, players: [], error: message }, { status: 500 });
  }
}
