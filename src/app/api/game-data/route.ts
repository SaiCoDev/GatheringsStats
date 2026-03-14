import { NextRequest, NextResponse } from "next/server";
import { getGameData } from "@/lib/cache";
import { allowRefresh, cooldownRemaining } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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
  return NextResponse.json(data);
}
