import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = parseInt(searchParams.get("limit") ?? "200", 10);

  let query = supabase
    .from("server_snapshots")
    .select("id, captured_at, total_servers, total_players, max_capacity, entries")
    .order("captured_at", { ascending: false })
    .limit(limit);

  if (from) query = query.gte("captured_at", from);
  if (to) query = query.lte("captured_at", to);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ snapshots: data });
}
