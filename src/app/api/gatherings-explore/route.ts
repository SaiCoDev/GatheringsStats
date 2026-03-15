import { NextRequest, NextResponse } from "next/server";
import {
  ServiceResponse,
  Experience,
  GetServersResponse,
} from "@/lib/types";

const EXPERIENCE_ID = "81ac183c-1d09-44a2-b0b5-78abaf8c9877";

/* ── Bedrock server ping via public API ────────────────────────────── */

interface BedrockPingResult {
  online: boolean;
  players?: number;
  maxPlayers?: number;
  version?: string;
}

async function pingBedrockServer(ip: string, port: number): Promise<BedrockPingResult> {
  try {
    const res = await fetch(`https://api.mcsrvstat.us/bedrock/3/${ip}:${port}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { online: false };
    const json = await res.json();
    return {
      online: !!json.online,
      players: json.players?.online ?? 0,
      maxPlayers: json.players?.max ?? 0,
      version: json.version ?? undefined,
    };
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

  // Ping all servers via public API for player counts
  // Deduplicate by ip:port to avoid hitting the API multiple times for same server
  const uniqueEndpoints = new Map<string, { ip: string; port: number }>();
  for (const srv of allServers) {
    const key = `${srv.ipV4Address}:${srv.gameplayPort}`;
    if (!uniqueEndpoints.has(key)) uniqueEndpoints.set(key, { ip: srv.ipV4Address, port: srv.gameplayPort });
  }
  const pingResults = await Promise.allSettled(
    [...uniqueEndpoints.values()].map((ep) => pingBedrockServer(ep.ip, ep.port))
  );
  const pingMap = new Map<string, BedrockPingResult>();
  const endpoints = [...uniqueEndpoints.keys()];
  for (let i = 0; i < endpoints.length; i++) {
    const pr = pingResults[i];
    if (pr.status === "fulfilled") pingMap.set(endpoints[i], pr.value);
  }

  for (let i = 0; i < allServers.length; i++) {
    const key = `${allServers[i].ipV4Address}:${allServers[i].gameplayPort}`;
    const ping = pingMap.get(key);
    if (ping?.online) {
      allServers[i].players = ping.players;
      allServers[i].maxPlayers = ping.maxPlayers;
      allServers[i].version = ping.version;
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
