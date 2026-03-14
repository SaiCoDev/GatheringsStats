import { NextRequest, NextResponse } from "next/server";
import { pingBedrockServer, pingMultipleServers } from "@/lib/bedrock-ping";

// GET /api/ping?host=play.example.com&port=19132
export async function GET(req: NextRequest) {
  const host = req.nextUrl.searchParams.get("host");
  const port = parseInt(req.nextUrl.searchParams.get("port") ?? "19132", 10);

  if (!host) {
    return NextResponse.json({ error: "Missing host parameter" }, { status: 400 });
  }

  const result = await pingBedrockServer(host, port);
  return NextResponse.json(result);
}

// POST /api/ping — ping multiple servers
export async function POST(req: NextRequest) {
  const body = await req.json();
  const servers: { host: string; port?: number }[] = body.servers;

  if (!servers || !Array.isArray(servers) || servers.length === 0) {
    return NextResponse.json({ error: "Missing servers array" }, { status: 400 });
  }

  if (servers.length > 20) {
    return NextResponse.json({ error: "Max 20 servers per request" }, { status: 400 });
  }

  const results = await pingMultipleServers(servers);
  return NextResponse.json({ servers: results });
}
