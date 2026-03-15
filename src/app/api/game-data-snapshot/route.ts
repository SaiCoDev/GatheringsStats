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
  let step = "init";
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return { error: "Supabase not configured", status: 503 };
    }

    // Fetch sequentially to stay under Cloudflare's 50 subrequest limit
    step = "players";
    const players = await getPlayerMetrics();
    step = "market";
    const market = await getMarketListings();
    step = "ratings";
    const ratings = await getFeedbackRatings();
    step = "feedback";
    const feedback = await getPlayerFeedback();
    step = "cycles";
    const cycles = await getDailyCycles();
    step = "leaderboards";
    const leaderboards = await getLeaderboards();

    step = "insert";
    const { error } = await supabase.from("game_data_snapshots").insert({
      players,
      market,
      ratings,
      feedback,
      cycles,
      leaderboards,
    });

    if (error) {
      return { error: `insert: ${error.message}`, status: 500 };
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
    console.error("captureGameDataSnapshot error at step:", step, message);
    return { error: `[${step}] ${message}`, status: 500 };
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
