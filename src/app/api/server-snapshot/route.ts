import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  ServiceResponse,
  Experience,
  ServerAllocationStateResponse,
} from "@/lib/types";

const API_BASE_URL = process.env.GATHERINGS_API_BASE_URL!;
const API_KEY = process.env.GATHERINGS_API_KEY!;

const ALL_REGIONS = [
  "eastus", "eastus2", "westus", "westeurope", "northeurope",
  "southeastasia", "japaneast", "brazilsouth", "australiaeast",
];

interface AllocationEntry {
  experience: string;
  scenario: string;
  world: string;
  mode: string;
  servers: number;
  playerCount: number;
  maxCapacity: number;
  regionalCapacity: Record<string, { servers: number; playerCount: number; maxCapacity: number }> | null;
}

async function gatheringsApiFresh<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: { "x-api-key": API_KEY, "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

async function captureServerSnapshot() {
  if (!supabase) {
    return { error: "Supabase not configured", status: 503 };
  }

  const { result: experiences } = await gatheringsApiFresh<ServiceResponse<Experience[]>>("/experiences");

  // Build requests for active scenarios only
  const requests: { experience: string; world: string; scenario: string; mode: string; regions: string[]; path: string }[] = [];

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
          const scenario = target.scenarios?.find((s) => s.scenarioId === id);
          const overrides = scenario?.scenarioProperties?.regionOverrides;
          const modeRegion = overrides?.[mode];
          const regions = modeRegion ? [modeRegion] : ALL_REGIONS;

          requests.push({
            experience: exp.name,
            world: world.name,
            scenario: scenario?.scenarioProperties?.scenarioName ?? id,
            mode,
            regions,
            path: `/allocation/serverAllocationState/experiences/${exp.experienceId}/worlds/${world.worldId}/targets/${target.targetId}/scenarios/${id}`,
          });
        }
      }
    }
  }

  // Fetch allocations in parallel
  const results = await Promise.allSettled(
    requests.map((r) =>
      gatheringsApiFresh<ServiceResponse<ServerAllocationStateResponse>>(r.path, {
        method: "POST",
        body: { scenarioMode: r.mode, regions: r.regions },
      })
    )
  );

  const entries: AllocationEntry[] = [];
  let totalServers = 0;
  let totalPlayers = 0;
  let maxCapacity = 0;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status !== "fulfilled") continue;
    const alloc = result.value.result;
    if (!alloc || (alloc.servers === 0 && alloc.playerCount === 0)) continue;
    const r = requests[i];
    totalServers += alloc.servers;
    totalPlayers += alloc.playerCount;
    maxCapacity += alloc.maxCapacity;

    // Filter out zero regions from storage
    let filteredRegional: Record<string, { servers: number; playerCount: number; maxCapacity: number }> | null = null;
    if (alloc.regionalCapacity) {
      const nonZero = Object.entries(alloc.regionalCapacity).filter(([, d]) => d.servers > 0 || d.playerCount > 0);
      if (nonZero.length > 0) filteredRegional = Object.fromEntries(nonZero);
    }

    entries.push({
      experience: r.experience,
      scenario: r.scenario,
      world: r.world,
      mode: r.mode,
      servers: alloc.servers,
      playerCount: alloc.playerCount,
      maxCapacity: alloc.maxCapacity,
      regionalCapacity: filteredRegional,
    });
  }

  const { error } = await supabase.from("server_snapshots").insert({
    total_servers: totalServers,
    total_players: totalPlayers,
    max_capacity: maxCapacity,
    entries,
  });

  if (error) {
    return { error: error.message, status: 500 };
  }

  return {
    ok: true,
    captured_at: new Date().toISOString(),
    total_servers: totalServers,
    total_players: totalPlayers,
    max_capacity: maxCapacity,
    entries_count: entries.length,
    status: 200,
  };
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
  const result = await captureServerSnapshot();
  const { status, ...body } = result;
  return NextResponse.json(body, { status });
}

// POST — manual capture
export async function POST() {
  const result = await captureServerSnapshot();
  const { status, ...body } = result;
  return NextResponse.json(body, { status });
}
