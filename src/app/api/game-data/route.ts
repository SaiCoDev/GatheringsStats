import { NextRequest, NextResponse } from "next/server";
import { getGameData } from "@/lib/cache";
import { allowRefresh, cooldownRemaining } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const wantsRefresh = req.nextUrl.searchParams.get("refresh") === "1";
    const refresh = wantsRefresh && allowRefresh("game-data");

    if (wantsRefresh && !refresh) {
      // Still return cached data but tell the client they're rate-limited
      const data = await getGameData(false);
      return NextResponse.json(
        { ...data, rateLimited: true, cooldown: cooldownRemaining("game-data") },
        { status: 200 }
      );
    }

    const data = await getGameData(refresh);

    // Optional field selection: ?fields=ratings,feedback,cycles
    const fieldsParam = req.nextUrl.searchParams.get("fields");
    if (fieldsParam) {
      const allowed = ["players", "market", "ratings", "feedback", "cycles", "leaderboards"] as const;
      const requested = fieldsParam.split(",").filter((f) => allowed.includes(f as typeof allowed[number]));
      const partial: Record<string, unknown> = { cachedAt: data.cachedAt };
      for (const field of requested) {
        partial[field] = data[field as keyof typeof data];
      }
      return NextResponse.json(partial);
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch game data";
    console.error("[game-data]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
