import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import {
  getPlayerMetrics,
  getMarketListings,
  getFeedbackRatings,
  getPlayerFeedback,
  getDailyCycles,
  getLeaderboards,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

async function captureGameDataSnapshot() {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return { error: "Supabase not configured", status: 503 };
    }

    const [players, market, ratings, feedback, cycles, leaderboards] = await Promise.all([
      getPlayerMetrics(),
      getMarketListings(),
      getFeedbackRatings(),
      getPlayerFeedback(),
      getDailyCycles(),
      getLeaderboards(),
    ]);

    const { error } = await supabase.from("game_data_snapshots").insert({
      players,
      market,
      ratings,
      feedback,
      cycles,
      leaderboards,
    });

    if (error) {
      return { error: error.message, status: 500 };
    }

    return {
      ok: true,
      captured_at: new Date().toISOString(),
      counts: {
        players: players.length,
        market: market.length,
        ratings: ratings.length,
        feedback: feedback.length,
        cycles: cycles.length,
        leaderboards: leaderboards.length,
      },
      status: 200,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("captureGameDataSnapshot error:", message);
    return { error: message, status: 500 };
  }
}

// GET — called by cron
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await captureGameDataSnapshot();
  const { status, ...body } = result;
  return NextResponse.json(body, { status });
}

// POST — manual capture
export async function POST() {
  const result = await captureGameDataSnapshot();
  const { status, ...body } = result;
  return NextResponse.json(body, { status });
}
