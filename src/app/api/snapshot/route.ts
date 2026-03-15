import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

async function captureSnapshot() {
  const supabase = getSupabase();
  const GATHERINGS_API_BASE_URL = process.env.GATHERINGS_API_BASE_URL!;
  const GATHERINGS_API_KEY = process.env.GATHERINGS_API_KEY!;
  const GATHERINGS_LIVE_ENDPOINT = process.env.GATHERINGS_LIVE_ENDPOINT ?? "/experiences";
  if (!supabase) {
    return { error: "Supabase not configured", status: 503 };
  }

  const response = await fetch(`${GATHERINGS_API_BASE_URL}${GATHERINGS_LIVE_ENDPOINT}`, {
    headers: {
      "x-api-key": GATHERINGS_API_KEY,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    return {
      error: `Gatherings API error: ${response.status} ${text}`,
      status: 502,
    };
  }

  const data = await response.json();

  const { error } = await supabase.from("optics_snapshots").insert({ data });

  if (error) {
    return { error: error.message, status: 500 };
  }

  return { ok: true, captured_at: new Date().toISOString(), status: 200 };
}

// Called by Vercel Cron (GET)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await captureSnapshot();
  const { status, ...body } = result;
  return NextResponse.json(body, { status });
}

// Called manually / from the UI (POST)
export async function POST() {
  const result = await captureSnapshot();
  const { status, ...body } = result;
  return NextResponse.json(body, { status });
}
