import { NextRequest, NextResponse } from "next/server";
import { getGameData, type GameDataField } from "@/lib/cache";

export const dynamic = "force-dynamic";

const VALID_FIELDS: GameDataField[] = ["players", "market", "ratings", "feedback", "cycles", "leaderboards"];

export async function GET(req: NextRequest) {
  try {
    // Parse requested fields
    const fieldsParam = req.nextUrl.searchParams.get("fields");
    const fields = fieldsParam
      ? fieldsParam.split(",").filter((f): f is GameDataField => VALID_FIELDS.includes(f as GameDataField))
      : undefined;

    const data = await getGameData(fields);

    // If specific fields were requested, only return those
    if (fields) {
      const partial: Record<string, unknown> = { cachedAt: data.cachedAt };
      for (const field of fields) {
        partial[field] = data[field];
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
