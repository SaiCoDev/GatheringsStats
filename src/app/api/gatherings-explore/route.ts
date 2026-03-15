import { NextRequest, NextResponse } from "next/server";
import {
  ServiceResponse,
  Experience,
  GetServersResponse,
} from "@/lib/types";

const EXPERIENCE_ID = "81ac183c-1d09-44a2-b0b5-78abaf8c9877";

/* ── Bedrock UDP ping ─────────────────────────────────────────────── */

interface BedrockPingResult {
  online: boolean;
  players?: number;
  maxPlayers?: number;
  version?: string;
  motd?: string;
  gameMode?: string;
}

async function pingBedrockServer(ip: string, port: number, timeoutMs = 3000): Promise<BedrockPingResult> {
  try {
    // Dynamic import — dgram only available in Node.js, not Cloudflare Workers
    const dgram = await import("dgram").catch(() => null);
    if (!dgram) return { online: false };

    return new Promise((resolve) => {
      const client = dgram.createSocket("udp4");
      const timer = setTimeout(() => {
        client.close();
        resolve({ online: false });
      }, timeoutMs);

      client.on("message", (msg: Buffer) => {
        clearTimeout(timer);
        try {
          if (msg[0] === 0x1c) {
            const offset = 1 + 8 + 8 + 16 + 2;
            const motd = msg.slice(offset).toString("utf8");
            const parts = motd.split(";");
            // Format: Edition;MOTD;Protocol;Version;Players;MaxPlayers;ServerID;SubMOTD;GameMode;...
            resolve({
              online: true,
              players: parseInt(parts[4]) || 0,
              maxPlayers: parseInt(parts[5]) || 0,
              version: parts[3] || undefined,
              motd: parts[1] || undefined,
              gameMode: parts[8] || undefined,
            });
          } else {
            resolve({ online: true });
          }
        } catch {
          resolve({ online: true });
        }
        client.close();
      });

      client.on("error", () => {
        clearTimeout(timer);
        client.close();
        resolve({ online: false });
      });

      // Build Unconnected Ping packet
      const buf = Buffer.alloc(33);
      buf[0] = 0x01;
      buf.writeBigInt64BE(BigInt(Date.now()), 1);
      Buffer.from("00ffff00fefefefefdfdfdfd12345678", "hex").copy(buf, 9);
      buf.writeBigInt64BE(BigInt(0), 25);
      client.send(buf, port, ip);
    });
  } catch {
    return { online: false };
  }
}

async function gatheringsApi<T>(path: string): Promise<T> {
  const API_BASE_URL = process.env.GATHERINGS_API_BASE_URL!;
  const API_KEY = process.env.GATHERINGS_API_KEY!;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: { "x-api-key": API_KEY, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

interface ActiveScenario {
  experienceId: string;
  worldId: string;
  targetId: string;
  scenarioId: string;
  mode: string;
}

async function getActiveScenarios(): Promise<ActiveScenario[]> {
  const { result: experiences } = await gatheringsApi<ServiceResponse<Experience[]>>("/experiences");
  const scenarios: ActiveScenario[] = [];

  for (const exp of experiences) {
    for (const world of exp.worlds ?? []) {
      for (const target of world.targets ?? []) {
        if (!target.isEnabled) continue;
        const active: { id: string; mode: string }[] = [];
        if (target.activePublicScenarioId) active.push({ id: target.activePublicScenarioId, mode: "Public" });
        if (target.activePrivateScenarioId) active.push({ id: target.activePrivateScenarioId, mode: "Private" });
        if (target.activeDevScenarioId) active.push({ id: target.activeDevScenarioId, mode: "Dev" });
        if (target.activeQaScenarioId) active.push({ id: target.activeQaScenarioId, mode: "QA" });

        for (const { id, mode } of active) {
          scenarios.push({
            experienceId: exp.experienceId,
            worldId: world.worldId,
            targetId: target.targetId,
            scenarioId: id,
            mode,
          });
        }
      }
    }
  }

  return scenarios;
}

async function handleServers() {
  const scenarios = await getActiveScenarios();
  const results = await Promise.allSettled(
    scenarios.map(async (s) => {
      const path = `/experiences/${s.experienceId}/worlds/${s.worldId}/targets/${s.targetId}/scenarios/${s.scenarioId}/servers/${s.mode}`;
      const data = await gatheringsApi<{ result: GetServersResponse }>(path);
      return { ...s, servers: data.result?.servers ?? [] };
    })
  );

  const allServers: Array<{
    serverId: string;
    region: string;
    status: string;
    ipV4Address: string;
    gameplayPort: number;
    serverPlatform: string | undefined;
    mode: string;
    scenarioId: string;
    players?: number;
    maxPlayers?: number;
    version?: string;
    gameMode?: string;
    pingOnline?: boolean;
  }> = [];

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const srv of result.value.servers) {
      allServers.push({
        serverId: srv.serverId,
        region: srv.region,
        status: srv.status,
        ipV4Address: srv.ipV4Address,
        gameplayPort: srv.gameplayPort,
        serverPlatform: srv.serverPlatform,
        mode: result.value.mode,
        scenarioId: result.value.scenarioId,
      });
    }
  }

  // Ping all servers in parallel for player counts
  const pingResults = await Promise.allSettled(
    allServers.map((srv) => pingBedrockServer(srv.ipV4Address, srv.gameplayPort, 3000))
  );

  for (let i = 0; i < allServers.length; i++) {
    const ping = pingResults[i];
    if (ping.status === "fulfilled" && ping.value.online) {
      allServers[i].players = ping.value.players;
      allServers[i].maxPlayers = ping.value.maxPlayers;
      allServers[i].version = ping.value.version;
      allServers[i].gameMode = ping.value.gameMode;
      allServers[i].pingOnline = true;
    } else {
      allServers[i].pingOnline = false;
    }
  }

  return allServers;
}

async function handleModes() {
  const scenarios = await getActiveScenarios();
  if (scenarios.length === 0) {
    return { modes: [], scenario: null };
  }
  const s = scenarios[0];
  const path = `/experiences/${s.experienceId}/worlds/${s.worldId}/targets/${s.targetId}/scenarios/${s.scenarioId}/modes`;
  const data = await gatheringsApi<unknown>(path);
  return { modes: data, scenario: s };
}

async function handleOffers() {
  return gatheringsApi<unknown>("/Inventory/creator");
}

async function handleAllowlistDev() {
  return gatheringsApi<unknown>("/allowlist/dev");
}

async function handleAllowlistExperience() {
  return gatheringsApi<unknown>(`/allowlist/experiences/${EXPERIENCE_ID}`);
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");

  if (!type) {
    return NextResponse.json({ error: "Missing 'type' query parameter" }, { status: 400 });
  }

  try {
    let data: unknown;
    switch (type) {
      case "servers":
        data = await handleServers();
        break;
      case "modes":
        data = await handleModes();
        break;
      case "offers":
        data = await handleOffers();
        break;
      case "allowlist-dev":
        data = await handleAllowlistDev();
        break;
      case "allowlist-experience":
        data = await handleAllowlistExperience();
        break;
      default:
        return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
    }

    return NextResponse.json({ result: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
