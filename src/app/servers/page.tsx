"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, StatCard, FlashValue } from "@/components/Card";
import { ErrorBox } from "@/components/ErrorBox";
import { Server, Users, Cpu, Globe, ChevronDown, ChevronRight, Loader2, ExternalLink } from "lucide-react";
import { DataStatus } from "@/components/DataStatus";
import { OnlineBanner } from "@/components/OnlineBanner";

const POLL_INTERVAL = 30_000; // 30s — read latest snapshot from Supabase

// Azure region → IANA timezone mapping
const REGION_TIMEZONES: Record<string, string> = {
  eastus: "America/New_York",
  eastus2: "America/New_York",
  westus: "America/Los_Angeles",
  westus2: "America/Los_Angeles",
  westus3: "America/Phoenix",
  centralus: "America/Chicago",
  northcentralus: "America/Chicago",
  southcentralus: "America/Chicago",
  westeurope: "Europe/Amsterdam",
  northeurope: "Europe/Dublin",
  uksouth: "Europe/London",
  ukwest: "Europe/London",
  southeastasia: "Asia/Singapore",
  eastasia: "Asia/Hong_Kong",
  japaneast: "Asia/Tokyo",
  japanwest: "Asia/Tokyo",
  australiaeast: "Australia/Sydney",
  australiasoutheast: "Australia/Melbourne",
  brazilsouth: "America/Sao_Paulo",
  canadacentral: "America/Toronto",
  koreacentral: "Asia/Seoul",
  indiacentral: "Asia/Kolkata",
};

function getRegionTime(region: string): string {
  const tz = REGION_TIMEZONES[region];
  if (!tz) return "";
  return new Date().toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

interface AllocationEntry {
  experience: string;
  scenario: string;
  world: string;
  mode: string;
  servers: number;
  playerCount: number;
  maxCapacity: number;
  regionalCapacity: Record<
    string,
    { servers: number; playerCount: number; maxCapacity: number }
  > | null;
}

interface ServerInstance {
  serverId: string;
  region: string;
  status: string;
  ipV4Address: string;
  gameplayPort: number;
  serverPlatform?: string;
  mode: string;
  world: string;
}

interface Snapshot {
  id: string;
  captured_at: string;
  total_servers: number;
  total_players: number;
  max_capacity: number;
  entries: AllocationEntry[];
  server_instances?: ServerInstance[];
}

export default function ServersPage() {
  const [latest, setLatest] = useState<Snapshot | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch("/api/server-latest");
      if (!res.ok) return;
      const json = await res.json();
      if (json.snapshot) setLatest(json.snapshot);
    } catch {
      // Silent — will retry on next poll
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/server-history?limit=500");
      if (!res.ok) return;
      const json = await res.json();
      setHistory(json.snapshots ?? []);
    } catch {
      // Silent
    }
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchLatest(), fetchHistory()])
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [fetchLatest, fetchHistory]);

  // Poll latest every 30s
  useEffect(() => {
    const id = setInterval(() => {
      fetchLatest();
      fetchHistory();
    }, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchLatest, fetchHistory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 spinner-enchanted" />
      </div>
    );
  }

  // Build live stats from latest snapshot
  const entries = latest?.entries ?? [];
  const totalServers = latest?.total_servers ?? 0;
  const totalPlayers = latest?.total_players ?? 0;
  const maxCapacity = latest?.max_capacity ?? 0;

  const regionMap = new Map<
    string,
    { servers: number; playerCount: number; maxCapacity: number }
  >();
  for (const entry of entries) {
    if (!entry.regionalCapacity) continue;
    for (const [region, d] of Object.entries(entry.regionalCapacity)) {
      if (d.servers === 0 && d.playerCount === 0) continue;
      const existing = regionMap.get(region) ?? { servers: 0, playerCount: 0, maxCapacity: 0 };
      existing.servers += d.servers;
      existing.playerCount += d.playerCount;
      existing.maxCapacity += d.maxCapacity;
      regionMap.set(region, existing);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Servers</h1>
            <p className="mt-1 text-xs text-zinc-500">
              Auto-refreshes every 30s
            </p>
          </div>
          <Link
            href="/servers/explorer"
            className="flex items-center gap-1.5 rounded-lg border border-[#2d2640] bg-[#1a1625] px-4 py-2 text-sm font-medium text-amber-300 transition-all hover:border-amber-500/50 hover:bg-amber-500/10 hover:shadow-[0_0_12px_rgba(245,158,11,0.15)]"
          >
            <ExternalLink className="h-4 w-4" />
            API Explorer
          </Link>
        </div>
        <DataStatus
          onRefresh={async () => {
            await fetch("/api/server-snapshot", { method: "POST" });
            fetchLatest();
          }}
          refreshing={false}
          cachedAt={latest ? new Date(latest.captured_at).getTime() : undefined}
        />
      </div>

      {error && <ErrorBox message={error} />}

      <OnlineBanner />

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Servers"
          value={totalServers}
          icon={<Server className="h-5 w-5" />}
          refreshKey={latest?.captured_at}
        />
        <StatCard
          label="Total Players"
          value={totalPlayers}
          icon={<Users className="h-5 w-5" />}
          refreshKey={latest?.captured_at}
        />
        <StatCard
          label="Max Capacity"
          value={maxCapacity}
          icon={<Cpu className="h-5 w-5" />}
          refreshKey={latest?.captured_at}
        />
        <StatCard
          label="Regions"
          value={regionMap.size}
          sub={
            maxCapacity > 0
              ? `${((totalPlayers / maxCapacity) * 100).toFixed(0)}% utilisation`
              : undefined
          }
          icon={<Globe className="h-5 w-5" />}
          refreshKey={latest?.captured_at}
        />
      </div>

      {/* Allocation Table */}
      {entries.length > 0 && (
        <Card>
          <h2 className="mb-4 text-xl font-semibold">Server Allocation</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="pb-3 pr-4 font-medium">Experience</th>
                  <th className="pb-3 pr-4 font-medium">Scenario</th>
                  <th className="pb-3 pr-4 font-medium">World</th>
                  <th className="pb-3 pr-4 font-medium">Mode</th>
                  <th className="pb-3 pr-4 font-medium">Servers</th>
                  <th className="pb-3 pr-4 font-medium">Players</th>
                  <th className="pb-3 pr-4 font-medium">Capacity</th>
                  <th className="pb-3 font-medium">Usage</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => {
                  const usage =
                    e.maxCapacity > 0
                      ? (e.playerCount / e.maxCapacity) * 100
                      : 0;
                  return (
                    <tr key={i} className="border-b border-zinc-800/50">
                      <td className="py-3 pr-4 font-medium">{e.experience}</td>
                      <td className="py-3 pr-4">{e.scenario}</td>
                      <td className="py-3 pr-4">{e.world}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${
                            e.mode === "Public"
                              ? "bg-emerald-900/30 text-emerald-400"
                              : e.mode === "Private"
                                ? "bg-blue-900/30 text-blue-400"
                                : e.mode === "Dev"
                                  ? "bg-amber-900/30 text-amber-400"
                                  : "bg-purple-900/30 text-purple-400"
                          }`}
                        >
                          {e.mode}
                        </span>
                      </td>
                      <td className="py-3 pr-4"><FlashValue value={e.servers}>{e.servers}</FlashValue></td>
                      <td className="py-3 pr-4"><FlashValue value={e.playerCount}>{e.playerCount}</FlashValue></td>
                      <td className="py-3 pr-4"><FlashValue value={e.maxCapacity}>{e.maxCapacity}</FlashValue></td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 rounded-full bg-zinc-800">
                            <div
                              className="h-2 rounded-full bg-emerald-500"
                              style={{ width: `${Math.min(usage, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-zinc-400">
                            {usage.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Regional Breakdown */}
      {regionMap.size > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">Regional Breakdown</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...regionMap.entries()]
              .sort((a, b) => b[1].playerCount - a[1].playerCount)
              .map(([region, data]) => {
                const usage =
                  data.maxCapacity > 0
                    ? (data.playerCount / data.maxCapacity) * 100
                    : 0;
                const localTime = getRegionTime(region);
                return (
                  <StatCard
                    key={region}
                    label={`${region}${localTime ? ` · ${localTime}` : ""}`}
                    value={`${data.playerCount} / ${data.maxCapacity}`}
                    sub={`${data.servers} server${data.servers !== 1 ? "s" : ""} · ${usage.toFixed(0)}% usage`}
                    icon={<Globe className="h-5 w-5" />}
                    refreshKey={latest?.captured_at}
                  />
                );
              })}
          </div>
        </div>
      )}

      {entries.length === 0 && !error && (
        <Card>
          <p className="text-zinc-400">
            No active servers found. Waiting for cron to capture data...
          </p>
        </Card>
      )}

      {/* Live Server Instances */}
      <LiveServerInstances servers={latest?.server_instances ?? []} />

      {/* History Charts */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Player History</h2>
        {history.length < 2 ? (
          <Card>
            <p className="text-zinc-400">
              {history.length === 0
                ? "No snapshots yet. The cron job captures data every minute."
                : "Need at least 2 snapshots to show charts."}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Total Players Over Time
              </h3>
              <div className="h-56">
                <HistoryChart
                  snapshots={history}
                  lines={[
                    { label: "Total Players", color: "#f59e0b", getValue: (s) => s.total_players },
                    { label: "Max Capacity", color: "#3b82f6", getValue: (s) => s.max_capacity, dashed: true },
                  ]}
                />
              </div>
            </Card>

            <Card>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Players by Region
              </h3>
              <div className="h-56">
                <RegionChart snapshots={history} />
              </div>
            </Card>

            <Card>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Players by Allocation
              </h3>
              <div className="h-56">
                <AllocationChart snapshots={history} />
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Recent Snapshots Table */}
      {history.length > 0 && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Recent Snapshots
          </h3>
          <div className="overflow-auto max-h-[440px]">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-[#13111a] z-10">
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="pb-3 pr-4 font-medium">Time</th>
                  <th className="pb-3 pr-4 font-medium">Servers</th>
                  <th className="pb-3 pr-4 font-medium">Players</th>
                  <th className="pb-3 pr-4 font-medium">Capacity</th>
                  <th className="pb-3 font-medium">Usage</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 10).map((s) => {
                  const usage =
                    s.max_capacity > 0
                      ? (s.total_players / s.max_capacity) * 100
                      : 0;
                  return (
                    <tr key={s.id} className="border-b border-zinc-800/50">
                      <td className="py-3 pr-4 text-zinc-300">
                        {new Date(s.captured_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 pr-4">{s.total_servers}</td>
                      <td className="py-3 pr-4">{s.total_players}</td>
                      <td className="py-3 pr-4">{s.max_capacity}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 rounded-full bg-zinc-800">
                            <div
                              className="h-2 rounded-full bg-amber-500"
                              style={{ width: `${Math.min(usage, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-zinc-400">
                            {usage.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── API Explorer Sections ─────────────────────────────────── */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">API Explorer</h2>
        <div className="space-y-4">
          <ExplorerSection title="Live Server Instances" type="servers" render={(data) => <ServerInstancesTable data={data} />} />
          <ExplorerSection title="Capacity Config" type="modes" render={(data) => <CapacityConfigView data={data} />} />
          <ExplorerSection title="Creator Store Offers" type="offers" render={(data) => <StoreOffersView data={data} />} />
          <ExplorerSection title="Dev Allowlist" type="allowlist-dev" render={(data) => <AllowlistView data={data} />} />
          <ExplorerSection title="Experience Allowlist" type="allowlist-experience" render={(data) => <AllowlistView data={data} />} />
        </div>
      </div>
    </div>
  );
}

// ── Explorer section wrapper ────────────────────────────────────────

function ExplorerSection({
  title,
  type,
  render,
}: {
  title: string;
  type: string;
  render: (data: unknown) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setSectionError(null);
    try {
      const res = await fetch(`/api/gatherings-explore?type=${type}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json.result);
    } catch (err) {
      setSectionError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [type]);

  const toggle = useCallback(() => {
    const next = !open;
    setOpen(next);
    if (next && data === null && !loading) {
      load();
    }
  }, [open, data, loading, load]);

  return (
    <Card>
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {open && !loading && data !== null && (
            <button
              onClick={(e) => { e.stopPropagation(); load(); }}
              className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
            >
              Refresh
            </button>
          )}
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
          ) : open ? (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-zinc-500" />
          )}
        </div>
      </button>

      {open && (
        <div className="mt-4">
          {loading && data === null && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
              <span className="ml-2 text-sm text-zinc-500">Loading...</span>
            </div>
          )}
          {sectionError && (
            <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-4 text-sm text-red-300">
              {sectionError}
            </div>
          )}
          {data !== null && !loading && render(data)}
        </div>
      )}
    </Card>
  );
}

// ── Data views ──────────────────────────────────────────────────────

interface ServerInstance {
  serverId: string;
  region: string;
  status: string;
  ipV4Address: string;
  gameplayPort: number;
  serverPlatform?: string;
  mode: string;
}

function ServerInstancesTable({ data }: { data: unknown }) {
  const servers = data as ServerInstance[];
  if (!Array.isArray(servers) || servers.length === 0) {
    return <p className="text-sm text-zinc-500">No live server instances found.</p>;
  }
  return (
    <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-[#13111a] z-10">
          <tr className="border-b border-zinc-800 text-zinc-400">
            <th className="pb-3 pr-4 font-medium">Server ID</th>
            <th className="pb-3 pr-4 font-medium">Region</th>
            <th className="pb-3 pr-4 font-medium">Status</th>
            <th className="pb-3 pr-4 font-medium">IP:Port</th>
            <th className="pb-3 pr-4 font-medium">Platform</th>
            <th className="pb-3 font-medium">Mode</th>
          </tr>
        </thead>
        <tbody>
          {servers.map((s, i) => (
            <tr key={i} className="border-b border-zinc-800/50">
              <td className="py-2 pr-4 font-mono text-xs">{s.serverId.slice(0, 12)}...</td>
              <td className="py-2 pr-4">{s.region}</td>
              <td className="py-2 pr-4">
                <span className={`rounded px-2 py-0.5 text-xs ${
                  s.status === "Active" ? "bg-emerald-900/30 text-emerald-400"
                    : s.status === "StandingBy" ? "bg-amber-900/30 text-amber-400"
                    : "bg-zinc-800 text-zinc-400"
                }`}>
                  {s.status}
                </span>
              </td>
              <td className="py-2 pr-4 font-mono text-xs">{s.ipV4Address}:{s.gameplayPort}</td>
              <td className="py-2 pr-4">{s.serverPlatform ?? "—"}</td>
              <td className="py-2">
                <span className={`rounded px-2 py-0.5 text-xs ${
                  s.mode === "Public" ? "bg-emerald-900/30 text-emerald-400"
                    : s.mode === "Private" ? "bg-blue-900/30 text-blue-400"
                    : s.mode === "Dev" ? "bg-amber-900/30 text-amber-400"
                    : "bg-purple-900/30 text-purple-400"
                }`}>
                  {s.mode}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-zinc-600">{servers.length} server(s)</p>
    </div>
  );
}

interface ModeConfig {
  minServers?: number;
  maxServers?: number;
  standbyServers?: number;
  capacityThreshold?: number;
  regionConfigurations?: Record<string, {
    minServers?: number;
    maxServers?: number;
    standbyServers?: number;
    capacityThreshold?: number;
  }>;
  [key: string]: unknown;
}

function CapacityConfigView({ data }: { data: unknown }) {
  const payload = data as { modes: unknown; scenario: unknown };
  const modes = payload?.modes;

  if (!modes || (typeof modes === "object" && Object.keys(modes as object).length === 0)) {
    return <p className="text-sm text-zinc-500">No capacity configuration found.</p>;
  }

  // modes may be an object keyed by mode name, or an array, or a ServiceResponse wrapper
  const modeEntries: Array<[string, ModeConfig]> = [];
  const raw = (modes as { result?: unknown }).result ?? modes;

  if (Array.isArray(raw)) {
    raw.forEach((item: ModeConfig, i: number) => modeEntries.push([`Mode ${i}`, item]));
  } else if (typeof raw === "object" && raw !== null) {
    for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
      modeEntries.push([key, val as ModeConfig]);
    }
  }

  if (modeEntries.length === 0) {
    return (
      <div className="overflow-x-auto">
        <pre className="whitespace-pre-wrap text-xs text-zinc-300">{JSON.stringify(modes, null, 2)}</pre>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {modeEntries.map(([name, config]) => (
        <div key={name} className="rounded-lg border border-zinc-800 p-4">
          <h4 className="mb-2 font-semibold text-amber-400">{name}</h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            {config.minServers !== undefined && (
              <div><span className="text-zinc-500">Min Servers:</span> <span className="text-white">{config.minServers}</span></div>
            )}
            {config.maxServers !== undefined && (
              <div><span className="text-zinc-500">Max Servers:</span> <span className="text-white">{config.maxServers}</span></div>
            )}
            {config.standbyServers !== undefined && (
              <div><span className="text-zinc-500">Standby:</span> <span className="text-white">{config.standbyServers}</span></div>
            )}
            {config.capacityThreshold !== undefined && (
              <div><span className="text-zinc-500">Capacity Threshold:</span> <span className="text-white">{config.capacityThreshold}</span></div>
            )}
          </div>
          {config.regionConfigurations && Object.keys(config.regionConfigurations).length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Region Overrides</p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="pb-2 pr-4 font-medium text-xs">Region</th>
                      <th className="pb-2 pr-4 font-medium text-xs">Min</th>
                      <th className="pb-2 pr-4 font-medium text-xs">Max</th>
                      <th className="pb-2 pr-4 font-medium text-xs">Standby</th>
                      <th className="pb-2 font-medium text-xs">Threshold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(config.regionConfigurations).map(([region, rc]) => (
                      <tr key={region} className="border-b border-zinc-800/50">
                        <td className="py-2 pr-4">{region}</td>
                        <td className="py-2 pr-4">{rc.minServers ?? "—"}</td>
                        <td className="py-2 pr-4">{rc.maxServers ?? "—"}</td>
                        <td className="py-2 pr-4">{rc.standbyServers ?? "—"}</td>
                        <td className="py-2">{rc.capacityThreshold ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Fallback for unknown shape */}
          {config.minServers === undefined && config.maxServers === undefined && config.standbyServers === undefined && (
            <pre className="mt-2 whitespace-pre-wrap text-xs text-zinc-400">{JSON.stringify(config, null, 2)}</pre>
          )}
        </div>
      ))}
    </div>
  );
}

interface StoreOffer {
  name?: string;
  displayName?: string;
  price?: number;
  rarity?: string;
  type?: string;
  [key: string]: unknown;
}

function StoreOffersView({ data }: { data: unknown }) {
  const raw = (data as { result?: unknown }).result ?? data;
  const items: StoreOffer[] = Array.isArray(raw) ? raw : [];

  if (items.length === 0) {
    if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
      return (
        <div className="overflow-x-auto">
          <pre className="whitespace-pre-wrap text-xs text-zinc-300">{JSON.stringify(raw, null, 2)}</pre>
        </div>
      );
    }
    return <p className="text-sm text-zinc-500">No store offers found.</p>;
  }

  return (
    <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-[#13111a] z-10">
          <tr className="border-b border-zinc-800 text-zinc-400">
            <th className="pb-3 pr-4 font-medium">Name</th>
            <th className="pb-3 pr-4 font-medium">Type</th>
            <th className="pb-3 pr-4 font-medium">Rarity</th>
            <th className="pb-3 font-medium">Price</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-zinc-800/50">
              <td className="py-2 pr-4 font-medium">{item.displayName ?? item.name ?? "—"}</td>
              <td className="py-2 pr-4">{item.type ?? "—"}</td>
              <td className="py-2 pr-4">
                {item.rarity ? (
                  <span className={`rounded px-2 py-0.5 text-xs ${
                    item.rarity === "Legendary" ? "bg-amber-900/30 text-amber-400"
                      : item.rarity === "Epic" ? "bg-purple-900/30 text-purple-400"
                      : item.rarity === "Rare" ? "bg-blue-900/30 text-blue-400"
                      : "bg-zinc-800 text-zinc-400"
                  }`}>
                    {item.rarity}
                  </span>
                ) : "—"}
              </td>
              <td className="py-2">{item.price ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-zinc-600">{items.length} offer(s)</p>
    </div>
  );
}

interface AllowlistEntry {
  gamertag?: string;
  xuid?: string;
  [key: string]: unknown;
}

function AllowlistView({ data }: { data: unknown }) {
  const raw = (data as { result?: unknown }).result ?? data;
  const entries: AllowlistEntry[] = Array.isArray(raw) ? raw : [];

  if (entries.length === 0) {
    if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
      return (
        <div className="overflow-x-auto">
          <pre className="whitespace-pre-wrap text-xs text-zinc-300">{JSON.stringify(raw, null, 2)}</pre>
        </div>
      );
    }
    return <p className="text-sm text-zinc-500">No entries found on allowlist.</p>;
  }

  return (
    <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-[#13111a] z-10">
          <tr className="border-b border-zinc-800 text-zinc-400">
            <th className="pb-3 pr-4 font-medium">#</th>
            <th className="pb-3 pr-4 font-medium">Gamertag</th>
            <th className="pb-3 font-medium">XUID</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={i} className="border-b border-zinc-800/50">
              <td className="py-2 pr-4 text-zinc-500">{i + 1}</td>
              <td className="py-2 pr-4 font-medium">{entry.gamertag ?? "—"}</td>
              <td className="py-2 font-mono text-xs text-zinc-400">{entry.xuid ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-zinc-600">{entries.length} entry/entries</p>
    </div>
  );
}

// ── Live Server Instances ────────────────────────────────────────────

type SortKey = "status" | "players" | "world" | "mode" | "region" | "ip" | "port" | "platform";
type SortDir = "asc" | "desc";

const STATUS_ORDER: Record<string, number> = { Ready: 0, Active: 1, StandingBy: 2, Propping: 3 };

function LiveServerInstances({ servers }: { servers: ServerInstance[] }) {
  const [expanded, setExpanded] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("players");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [pingData, setPingData] = useState<Record<string, { players: number; maxPlayers: number }>>({});
  const [pinging, setPinging] = useState(false);
  const hasFetched = useRef(false);

  const pingServers = useCallback(async () => {
    if (servers.length === 0) return;
    setPinging(true);
    try {
      // Deduplicate endpoints
      const unique = new Map<string, { ip: string; port: number }>();
      for (const s of servers) {
        const key = `${s.ipV4Address}:${s.gameplayPort}`;
        if (!unique.has(key)) unique.set(key, { ip: s.ipV4Address, port: s.gameplayPort });
      }
      // Ping each via public API directly from the browser
      const entries = [...unique.entries()];
      const results = await Promise.allSettled(
        entries.map(async ([, ep]) => {
          const res = await fetch(`https://api.mcsrvstat.us/bedrock/3/${ep.ip}:${ep.port}`);
          if (!res.ok) return null;
          return res.json();
        })
      );
      const map: Record<string, { players: number; maxPlayers: number }> = {};
      for (let i = 0; i < entries.length; i++) {
        const r = results[i];
        if (r.status === "fulfilled" && r.value?.online) {
          map[entries[i][0]] = {
            players: r.value.players?.online ?? 0,
            maxPlayers: r.value.players?.max ?? 0,
          };
        }
      }
      setPingData(map);
    } catch { /* ignore */ }
    setPinging(false);
  }, [servers]);

  // Auto-fetch pings when expanded for the first time
  useEffect(() => {
    if (expanded && !hasFetched.current && servers.length > 0) {
      hasFetched.current = true;
      pingServers();
    }
  }, [expanded, servers.length, pingServers]);

  const handleSort = useCallback((key: SortKey) => {
    setSortDir((d) => (sortKey === key ? (d === "asc" ? "desc" : "asc") : "asc"));
    setSortKey(key);
  }, [sortKey]);

  const hasPingData = Object.keys(pingData).length > 0;

  // Sort servers
  const sorted = [...servers].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "status":
        cmp = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
        break;
      case "players": {
        const pa = pingData[`${a.ipV4Address}:${a.gameplayPort}`]?.players ?? -1;
        const pb = pingData[`${b.ipV4Address}:${b.gameplayPort}`]?.players ?? -1;
        cmp = pa - pb;
        break;
      }
      case "world":
        cmp = (a.world ?? "").localeCompare(b.world ?? "");
        break;
      case "mode":
        cmp = a.mode.localeCompare(b.mode);
        break;
      case "region":
        cmp = a.region.localeCompare(b.region);
        break;
      case "ip":
        cmp = a.ipV4Address.localeCompare(b.ipV4Address);
        break;
      case "port":
        cmp = a.gameplayPort - b.gameplayPort;
        break;
      case "platform":
        cmp = (a.serverPlatform ?? "").localeCompare(b.serverPlatform ?? "");
        break;
    }
    return sortDir === "desc" ? -cmp : cmp;
  });

  // Stats
  const readyCount = servers.filter((s) => s.status === "Ready").length;
  const standbyCount = servers.filter((s) => s.status === "StandingBy").length;
  const otherCount = servers.length - readyCount - standbyCount;
  const uniqueRegions = new Set(servers.map((s) => s.region));
  const uniqueWorlds = new Set(servers.map((s) => s.world).filter(Boolean));
  const uniqueIPs = new Set(servers.map((s) => s.ipV4Address));
  const totalPingPlayers = Object.values(pingData).reduce((s, p) => s + p.players, 0);
  const totalPingMax = Object.values(pingData).reduce((s, p) => s + p.maxPlayers, 0);

  const SortHeader = ({ label, col }: { label: string; col: SortKey }) => (
    <th
      className="pb-3 pr-4 font-medium cursor-pointer select-none transition-colors hover:text-amber-300"
      onClick={() => handleSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortKey === col && (
          <span className="text-amber-400">{sortDir === "asc" ? "▲" : "▼"}</span>
        )}
      </span>
    </th>
  );

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="mb-4 flex items-center gap-2 text-xl font-semibold text-[#e4e0ed] transition-colors hover:text-amber-300"
      >
        {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        Live Server Instances
        <span className="text-sm font-normal text-zinc-500">
          ({servers.length} servers)
        </span>
      </button>

      {expanded && (
        <div className="space-y-4">
          {servers.length === 0 ? (
            <Card>
              <p className="text-sm text-zinc-500">No live server instances in latest snapshot.</p>
            </Card>
          ) : (
            <>
              {/* Overview cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Card>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#e4e0ed]">{servers.length}</div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Total Servers</div>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-400">{readyCount}</div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Ready</div>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-400">{standbyCount}</div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Standby</div>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{uniqueRegions.size}</div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Regions</div>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{uniqueWorlds.size}</div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Worlds</div>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-zinc-400">{uniqueIPs.size}</div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Unique IPs</div>
                  </div>
                </Card>
              </div>

              {/* Player totals */}
              <div className="flex items-center gap-3">
                {pinging && (
                  <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" /> Pinging servers...
                  </span>
                )}
                {hasPingData && !pinging && (
                  <span className="text-sm text-zinc-400">
                    <span className="font-semibold text-emerald-400">{totalPingPlayers}</span> players across{" "}
                    <span className="font-semibold text-blue-400">{totalPingMax}</span> slots
                    {totalPingMax > 0 && (
                      <> · <span className="font-semibold text-amber-400">{Math.round((totalPingPlayers / totalPingMax) * 100)}%</span> fill</>
                    )}
                    <button
                      onClick={() => { hasFetched.current = false; pingServers(); }}
                      className="ml-3 text-xs text-zinc-600 hover:text-amber-300"
                    >
                      refresh
                    </button>
                  </span>
                )}
              </div>

              {/* Sortable table */}
              <Card>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-[#13111a]">
                      <tr className="border-b border-zinc-800 text-zinc-400">
                        <th className="pb-3 pr-4 font-medium">#</th>
                        <SortHeader label="Status" col="status" />
                        <SortHeader label="Players" col="players" />
                        <SortHeader label="World" col="world" />
                        <SortHeader label="Mode" col="mode" />
                        <SortHeader label="Region" col="region" />
                        <SortHeader label="IP" col="ip" />
                        <SortHeader label="Port" col="port" />
                        <SortHeader label="Platform" col="platform" />
                        <th className="pb-3 font-medium">Server ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((s, i) => {
                        const ping = pingData[`${s.ipV4Address}:${s.gameplayPort}`];
                        const fill = ping?.maxPlayers ? Math.round((ping.players / ping.maxPlayers) * 100) : 0;
                        return (
                        <tr key={i} className="border-b border-zinc-800/50">
                          <td className="py-2 pr-4 text-xs text-zinc-600">{i + 1}</td>
                          <td className="py-2 pr-4">
                            <span className={`rounded px-2 py-0.5 text-xs ${
                              s.status === "Ready" ? "bg-emerald-900/30 text-emerald-400"
                              : s.status === "StandingBy" ? "bg-amber-900/30 text-amber-400"
                              : s.status === "Propping" ? "bg-blue-900/30 text-blue-400"
                              : "bg-zinc-800 text-zinc-400"
                            }`}>{s.status}</span>
                          </td>
                          <td className="py-2 pr-4">
                            {ping ? (
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold ${ping.players > 0 ? "text-emerald-400" : "text-zinc-500"}`}>
                                  {ping.players}/{ping.maxPlayers}
                                </span>
                                <div className="h-1.5 w-12 rounded-full bg-zinc-800">
                                  <div
                                    className={`h-1.5 rounded-full ${fill > 80 ? "bg-red-500" : fill > 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                                    style={{ width: `${Math.min(fill, 100)}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-600">{pinging ? <Loader2 className="h-3 w-3 animate-spin text-zinc-600" /> : "—"}</span>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-zinc-300">{s.world || "—"}</td>
                          <td className="py-2 pr-4">
                            <span className={`rounded px-2 py-0.5 text-xs ${
                              s.mode === "Public" ? "bg-emerald-900/30 text-emerald-400"
                              : s.mode === "Private" ? "bg-blue-900/30 text-blue-400"
                              : s.mode === "Dev" ? "bg-amber-900/30 text-amber-400"
                              : "bg-purple-900/30 text-purple-400"
                            }`}>{s.mode}</span>
                          </td>
                          <td className="py-2 pr-4 text-zinc-300">{s.region}</td>
                          <td className="py-2 pr-4 font-mono text-xs text-zinc-300">{s.ipV4Address}</td>
                          <td className="py-2 pr-4 font-mono text-xs text-zinc-300">{s.gameplayPort}</td>
                          <td className="py-2 pr-4 text-zinc-300">{s.serverPlatform ?? "—"}</td>
                          <td className="py-2 font-mono text-xs text-zinc-500 cursor-help" title={s.serverId}>
                            ...{s.serverId.slice(-8)}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Chart components ─────────────────────────────────────────────────

const W = 800;
const H = 180;
const PX = 45;
const PY = 24;
const CHART_RIGHT = W - 10;

const LINE_COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#ec4899", "#06b6d4", "#84cc16", "#f97316"];

interface LineConfig {
  label: string;
  color: string;
  getValue: (s: Snapshot) => number;
  dashed?: boolean;
}

interface ChartLine {
  label: string;
  color: string;
  values: number[];
  dashed?: boolean;
}

function getX(i: number, total: number) {
  return PX + (i / (total - 1)) * (CHART_RIGHT - PX);
}

function getY(v: number, maxVal: number) {
  return PY + (1 - v / maxVal) * (H - PY * 2);
}

function buildPath(values: number[], maxVal: number): string {
  return values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${getX(i, values.length)} ${getY(v, maxVal)}`)
    .join(" ");
}

function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-4 text-xs">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div
            className="w-4"
            style={{
              height: item.dashed ? 0 : 2,
              backgroundColor: item.dashed ? undefined : item.color,
              borderTop: item.dashed ? `2px dashed ${item.color}` : undefined,
            }}
          />
          <span style={{ color: item.color }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function XLabels({ sorted }: { sorted: Snapshot[] }) {
  const indices =
    sorted.length <= 5
      ? sorted.map((_, i) => i)
      : [0, Math.floor(sorted.length / 4), Math.floor(sorted.length / 2), Math.floor((sorted.length * 3) / 4), sorted.length - 1];
  return (
    <>
      {indices.map((idx) => (
        <text key={idx} x={getX(idx, sorted.length)} y={H - 2} textAnchor="middle" fill="#71717a" fontSize={9}>
          {new Date(sorted[idx].captured_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </text>
      ))}
    </>
  );
}

function YAxisLines({ maxVal }: { maxVal: number }) {
  const labels = [0, Math.round(maxVal / 2), maxVal];
  return (
    <>
      {labels.map((val) => {
        const y = getY(val, maxVal);
        return (
          <g key={val}>
            <line x1={PX} y1={y} x2={CHART_RIGHT} y2={y} stroke="#27272a" strokeWidth={1} />
            <text x={PX - 6} y={y + 4} textAnchor="end" fill="#71717a" fontSize={10}>
              {val}
            </text>
          </g>
        );
      })}
    </>
  );
}

/** Interactive chart with hover tooltip, crosshair, and dot highlights. */
function InteractiveChart({
  sorted,
  chartLines,
  maxVal,
}: {
  sorted: Snapshot[];
  chartLines: ChartLine[];
  maxVal: number;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg || sorted.length < 2) return;
      const rect = svg.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * W;
      // Find closest data point index
      let closest = 0;
      let closestDist = Infinity;
      for (let i = 0; i < sorted.length; i++) {
        const x = getX(i, sorted.length);
        const dist = Math.abs(mouseX - x);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      }
      setHoverIdx(closest);
    },
    [sorted]
  );

  const handleMouseLeave = useCallback(() => setHoverIdx(null), []);

  const hoverX = hoverIdx !== null ? getX(hoverIdx, sorted.length) : 0;

  // Tooltip positioning: flip to left side if near right edge
  const tooltipOnLeft = hoverIdx !== null && hoverX > W * 0.65;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: "crosshair" }}
    >
      <YAxisLines maxVal={maxVal} />

      {/* Lines */}
      {chartLines.map((line) => (
        <path
          key={line.label}
          d={buildPath(line.values, maxVal)}
          fill="none"
          stroke={line.color}
          strokeWidth={2}
          strokeDasharray={line.dashed ? "6 3" : undefined}
        />
      ))}

      <XLabels sorted={sorted} />

      {/* Hover crosshair + dots + tooltip */}
      {hoverIdx !== null && (
        <g>
          {/* Vertical crosshair line */}
          <line
            x1={hoverX}
            y1={PY}
            x2={hoverX}
            y2={H - PY}
            stroke="#71717a"
            strokeWidth={1}
            strokeDasharray="3 2"
            opacity={0.6}
          />

          {/* Dots on each line */}
          {chartLines.map((line) => {
            const val = line.values[hoverIdx];
            const y = getY(val, maxVal);
            return (
              <g key={line.label}>
                <circle cx={hoverX} cy={y} r={5} fill={line.color} opacity={0.3} />
                <circle cx={hoverX} cy={y} r={3} fill={line.color} />
              </g>
            );
          })}

          {/* Tooltip background + text */}
          <g
            transform={`translate(${tooltipOnLeft ? hoverX - 8 : hoverX + 8}, ${PY + 4})`}
            style={{ pointerEvents: "none" }}
          >
            <rect
              x={tooltipOnLeft ? -(chartLines.length * 16 + 36) : 0}
              y={-2}
              width={Math.max(
                ...chartLines.map((l) => l.label.length * 5.5 + 50),
                120
              )}
              height={chartLines.length * 16 + 22}
              rx={4}
              fill="#1a1625"
              stroke="#2d2640"
              strokeWidth={1}
              opacity={0.95}
            />
            {/* Time label */}
            <text
              x={tooltipOnLeft ? -(chartLines.length * 16 + 36) + 6 : 6}
              y={12}
              fill="#9892a6"
              fontSize={9}
              fontWeight={600}
            >
              {new Date(sorted[hoverIdx].captured_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </text>
            {/* Values */}
            {chartLines.map((line, li) => (
              <g key={line.label}>
                <circle
                  cx={(tooltipOnLeft ? -(chartLines.length * 16 + 36) + 6 : 6) + 4}
                  cy={26 + li * 16}
                  r={3}
                  fill={line.color}
                />
                <text
                  x={(tooltipOnLeft ? -(chartLines.length * 16 + 36) + 6 : 6) + 12}
                  y={30 + li * 16}
                  fill="#e4e0ed"
                  fontSize={10}
                >
                  {line.label}: {line.values[hoverIdx]}
                </text>
              </g>
            ))}
          </g>
        </g>
      )}
    </svg>
  );
}

function HistoryChart({ snapshots, lines }: { snapshots: Snapshot[]; lines: LineConfig[] }) {
  const sorted = [...snapshots].reverse();
  const chartLines: ChartLine[] = lines.map((l) => ({
    label: l.label,
    color: l.color,
    values: sorted.map(l.getValue),
    dashed: l.dashed,
  }));
  const maxVal = Math.ceil(Math.max(...chartLines.flatMap((l) => l.values), 1) * 1.1);

  return (
    <div className="h-full">
      <Legend items={lines} />
      <InteractiveChart sorted={sorted} chartLines={chartLines} maxVal={maxVal} />
    </div>
  );
}

function RegionChart({ snapshots }: { snapshots: Snapshot[] }) {
  const sorted = [...snapshots].reverse();
  const regionSet = new Set<string>();
  for (const s of sorted) {
    for (const entry of s.entries ?? []) {
      if (!entry.regionalCapacity) continue;
      for (const [region, d] of Object.entries(entry.regionalCapacity)) {
        if (d.playerCount > 0 || d.servers > 0) regionSet.add(region);
      }
    }
  }
  const regions = [...regionSet].sort();
  if (regions.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-zinc-500">No regional data available.</div>;
  }

  const chartLines: ChartLine[] = regions.map((region, i) => ({
    label: region,
    color: LINE_COLORS[i % LINE_COLORS.length],
    values: sorted.map((s) => {
      let total = 0;
      for (const entry of s.entries ?? []) {
        total += entry.regionalCapacity?.[region]?.playerCount ?? 0;
      }
      return total;
    }),
  }));

  const maxVal = Math.ceil(Math.max(...chartLines.flatMap((l) => l.values), 1) * 1.1);

  return (
    <div className="h-full">
      <Legend items={chartLines} />
      <InteractiveChart sorted={sorted} chartLines={chartLines} maxVal={maxVal} />
    </div>
  );
}

function AllocationChart({ snapshots }: { snapshots: Snapshot[] }) {
  const sorted = [...snapshots].reverse();
  const keySet = new Set<string>();
  for (const s of sorted) {
    for (const entry of s.entries ?? []) {
      if (entry.playerCount > 0) keySet.add(`${entry.world} (${entry.mode})`);
    }
  }
  const keys = [...keySet].sort();
  if (keys.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-zinc-500">No allocation data available.</div>;
  }

  const chartLines: ChartLine[] = keys.map((key, i) => ({
    label: key,
    color: LINE_COLORS[i % LINE_COLORS.length],
    values: sorted.map((s) => {
      let total = 0;
      for (const entry of s.entries ?? []) {
        if (`${entry.world} (${entry.mode})` === key) total += entry.playerCount;
      }
      return total;
    }),
  }));

  const maxVal = Math.ceil(Math.max(...chartLines.flatMap((l) => l.values), 1) * 1.1);

  return (
    <div className="h-full">
      <Legend items={chartLines} />
      <InteractiveChart sorted={sorted} chartLines={chartLines} maxVal={maxVal} />
    </div>
  );
}
