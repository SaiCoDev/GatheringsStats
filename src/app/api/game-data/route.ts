import { NextRequest, NextResponse } from "next/server";
import { getGameData } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const refresh = req.nextUrl.searchParams.get("refresh") === "1";
  const data = await getGameData(refresh);
  return NextResponse.json(data);
}
