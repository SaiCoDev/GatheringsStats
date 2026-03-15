"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShoppingBag,
  Shield,
} from "lucide-react";

/* ── Types ────────────────────────────────────────────────────────── */

interface ServerInstance {
  serverId: string;
  region: string;
  status: string;
  ipV4Address: string;
  gameplayPort: number;
  serverPlatform?: string;
  mode: string;
  scenarioId: string;
  players?: number;
  maxPlayers?: number;
  version?: string;
  gameMode?: string;
  pingOnline?: boolean;
}


interface AllowlistEntry {
  gamertag?: string;
  xuid?: string;
  playFabId?: string;
  [key: string]: unknown;
}

/* ── Tab definitions ──────────────────────────────────────────────── */

type TabKey = "servers" | "capacity" | "store" | "allowlists";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "servers", label: "Live Servers", icon: <Server className="h-4 w-4" /> },
  { key: "capacity", label: "Capacity Config", icon: <Settings className="h-4 w-4" /> },
  { key: "store", label: "Store & Offers", icon: <ShoppingBag className="h-4 w-4" /> },
  { key: "allowlists", label: "Allowlists", icon: <Shield className="h-4 w-4" /> },
];

/* ── Main page ────────────────────────────────────────────────────── */

export default function ExplorerPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("servers");

  // Cache per tab so switching doesn't refetch
  const cache = useRef<Record<string, unknown>>({});
  const [tabData, setTabData] = useState<Record<string, unknown>>({});
  const [tabLoading, setTabLoading] = useState<Record<string, boolean>>({});
  const [tabError, setTabError] = useState<Record<string, string | null>>({});
  const [initialLoaded, setInitialLoaded] = useState<Record<string, boolean>>({});

  const fetchTab = useCallback(
    async (apiType: string, cacheKey: string, force = false) => {
      if (!force && cache.current[cacheKey] !== undefined) return;
      setTabLoading((p) => ({ ...p, [cacheKey]: true }));
      setTabError((p) => ({ ...p, [cacheKey]: null }));
      try {
        const res = await fetch(`/api/gatherings-explore?type=${apiType}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        cache.current[cacheKey] = json.result;
        setTabData((p) => ({ ...p, [cacheKey]: json.result }));
      } catch (err) {
        setTabError((p) => ({
          ...p,
          [cacheKey]: err instanceof Error ? err.message : String(err),
        }));
      } finally {
        setTabLoading((p) => ({ ...p, [cacheKey]: false }));
      }
    },
    [],
  );

  const handleTabClick = useCallback(
    (key: TabKey) => {
      setActiveTab(key);
      if (!initialLoaded[key]) {
        setInitialLoaded((p) => ({ ...p, [key]: true }));
        if (key === "servers") fetchTab("servers", "servers");
        if (key === "capacity") fetchTab("modes", "capacity");
        if (key === "store") fetchTab("offers", "store");
        if (key === "allowlists") {
          fetchTab("allowlist-dev", "allowlist-dev");
          fetchTab("allowlist-experience", "allowlist-experience");
        }
      }
    },
    [initialLoaded, fetchTab],
  );

  // Auto-load the servers tab on first render
  const didInit = useRef(false);
  if (!didInit.current) {
    didInit.current = true;
    // schedule after render
    setTimeout(() => handleTabClick("servers"), 0);
  }

  const refreshCurrentTab = useCallback(() => {
    if (activeTab === "servers") fetchTab("servers", "servers", true);
    if (activeTab === "capacity") fetchTab("modes", "capacity", true);
    if (activeTab === "store") fetchTab("offers", "store", true);
    if (activeTab === "allowlists") {
      fetchTab("allowlist-dev", "allowlist-dev", true);
      fetchTab("allowlist-experience", "allowlist-experience", true);
    }
  }, [activeTab, fetchTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/servers"
          className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:border-[#2d2640] hover:text-[#e4e0ed]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#e4e0ed]">Gatherings API Explorer</h1>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabClick(tab.key)}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-amber-500 text-amber-300"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}

        <div className="ml-auto">
          <button
            onClick={refreshCurrentTab}
            disabled={tabLoading[activeTab] || tabLoading["allowlist-dev"] || tabLoading["allowlist-experience"]}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-amber-500/50 hover:text-amber-300 disabled:opacity-40"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "servers" && (
        <LiveServersTab
          data={tabData["servers"]}
          loading={!!tabLoading["servers"]}
          error={tabError["servers"] ?? null}
        />
      )}
      {activeTab === "capacity" && (
        <CapacityTab
          data={tabData["capacity"]}
          loading={!!tabLoading["capacity"]}
          error={tabError["capacity"] ?? null}
        />
      )}
      {activeTab === "store" && (
        <StoreTab
          data={tabData["store"]}
          loading={!!tabLoading["store"]}
          error={tabError["store"] ?? null}
        />
      )}
      {activeTab === "allowlists" && (
        <AllowlistsTab
          devData={tabData["allowlist-dev"]}
          expData={tabData["allowlist-experience"]}
          devLoading={!!tabLoading["allowlist-dev"]}
          expLoading={!!tabLoading["allowlist-experience"]}
          devError={tabError["allowlist-dev"] ?? null}
          expError={tabError["allowlist-experience"] ?? null}
        />
      )}
    </div>
  );
}

/* ── Shared helpers ───────────────────────────────────────────────── */

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
      <span className="ml-2 text-sm text-zinc-500">Loading...</span>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-4 text-sm text-red-300">
      {message}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "Active"
      ? "bg-emerald-900/30 text-emerald-400"
      : status === "StandingBy"
        ? "bg-amber-900/30 text-amber-400"
        : status === "Propping"
          ? "bg-blue-900/30 text-blue-400"
          : "bg-zinc-800 text-zinc-400";
  return <span className={`rounded px-2 py-0.5 text-xs ${cls}`}>{status}</span>;
}

function ModeBadge({ mode }: { mode: string }) {
  const cls =
    mode === "Public"
      ? "bg-emerald-900/30 text-emerald-400"
      : mode === "Private"
        ? "bg-blue-900/30 text-blue-400"
        : mode === "Dev"
          ? "bg-amber-900/30 text-amber-400"
          : "bg-purple-900/30 text-purple-400";
  return <span className={`rounded px-2 py-0.5 text-xs ${cls}`}>{mode}</span>;
}

/* ── Tab 1: Live Servers ──────────────────────────────────────────── */

function LiveServersTab({
  data,
  loading,
  error,
}: {
  data: unknown;
  loading: boolean;
  error: string | null;
}) {
  if (loading && data === undefined) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const servers = (Array.isArray(data) ? data : []) as ServerInstance[];

  if (servers.length === 0) {
    return (
      <Card>
        <p className="text-sm text-zinc-500">No live server instances found.</p>
      </Card>
    );
  }

  // Group by world (we don't have world name directly — group by scenarioId prefix or mode)
  // The API returns scenarioId; let's group by region for a meaningful grouping
  const grouped = new Map<string, ServerInstance[]>();
  for (const s of servers) {
    const key = s.region;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(s);
  }

  const totalPlayers = servers.reduce((sum, s) => sum + (s.players ?? 0), 0);
  const totalMaxPlayers = servers.reduce((sum, s) => sum + (s.maxPlayers ?? 0), 0);
  const hasPingData = servers.some((s) => s.pingOnline);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
        <span>Total servers: <span className="font-semibold text-[#e4e0ed]">{servers.length}</span></span>
        {hasPingData && (
          <>
            <span>Players online: <span className="font-semibold text-emerald-400">{totalPlayers}</span></span>
            <span>Max capacity: <span className="font-semibold text-blue-400">{totalMaxPlayers}</span></span>
            <span>Fill rate: <span className="font-semibold text-amber-400">{totalMaxPlayers > 0 ? Math.round((totalPlayers / totalMaxPlayers) * 100) : 0}%</span></span>
          </>
        )}
      </div>

      <Card>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#13111a]">
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="pb-3 pr-4 font-medium">Server ID</th>
                <th className="pb-3 pr-4 font-medium">Players</th>
                <th className="pb-3 pr-4 font-medium">Mode</th>
                <th className="pb-3 pr-4 font-medium">Region</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium">IP Address</th>
                <th className="pb-3 pr-4 font-medium">Port</th>
                <th className="pb-3 font-medium">Platform</th>
              </tr>
            </thead>
            <tbody>
              {[...grouped.entries()]
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([region, regionServers]) => (
                  <GroupedRows key={region} groupLabel={region} servers={regionServers} />
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function GroupedRows({
  groupLabel,
  servers,
}: {
  groupLabel: string;
  servers: ServerInstance[];
}) {
  return (
    <>
      <tr>
        <td
          colSpan={8}
          className="bg-[#1a1625]/80 px-2 py-2 text-xs font-semibold uppercase tracking-wider text-amber-400"
        >
          {groupLabel} ({servers.length} servers, {servers.reduce((s, sv) => s + (sv.players ?? 0), 0)} players)
        </td>
      </tr>
      {servers.map((s, i) => {
        const fill = s.maxPlayers ? Math.round(((s.players ?? 0) / s.maxPlayers) * 100) : 0;
        return (
          <tr key={i} className="border-b border-zinc-800/50">
            <td className="py-2 pr-4 font-mono text-xs text-zinc-300 cursor-help" title={s.serverId}>
              ...{s.serverId.slice(-8)}
            </td>
            <td className="py-2 pr-4">
              {s.pingOnline ? (
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${(s.players ?? 0) > 0 ? "text-emerald-400" : "text-zinc-500"}`}>
                    {s.players ?? 0}/{s.maxPlayers ?? "?"}
                  </span>
                  <div className="h-1.5 w-12 rounded-full bg-zinc-800">
                    <div
                      className={`h-1.5 rounded-full ${fill > 80 ? "bg-red-500" : fill > 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(fill, 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <span className="text-xs text-zinc-600">—</span>
              )}
            </td>
            <td className="py-2 pr-4">
              <ModeBadge mode={s.mode} />
            </td>
            <td className="py-2 pr-4 text-zinc-300">{s.region}</td>
            <td className="py-2 pr-4">
              <StatusBadge status={s.status} />
            </td>
            <td className="py-2 pr-4 font-mono text-xs text-zinc-300">{s.ipV4Address}</td>
            <td className="py-2 pr-4 font-mono text-xs text-zinc-300">{s.gameplayPort}</td>
            <td className="py-2 text-zinc-300">{s.serverPlatform ?? "\u2014"}</td>
          </tr>
        );
      })}
    </>
  );
}

/* ── Tab 2: Capacity Config ───────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CapacityTab({ data, loading, error }: { data: any; loading: boolean; error: string | null }) {
  if (loading && data === undefined) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (data === undefined) return null;

  const scenarioModes = data?.modes?.result?.scenarioModes ?? data?.modes?.scenarioModes ?? {};
  const entries = Object.entries(scenarioModes).filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ([, v]: [string, any]) => v && typeof v === "object"
  ) as [string, Record<string, unknown>][];

  if (entries.length === 0) {
    return <Card><p className="text-sm text-zinc-500">No capacity configuration found.</p></Card>;
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-zinc-400">
        {entries.length} scenario mode{entries.length !== 1 && "s"} configured
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {entries.map(([modeName, config]) => (
          <CapacityModeCard key={modeName} modeName={modeName} config={config} />
        ))}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CapacityModeCard({ modeName, config }: { modeName: string; config: any }) {
  const regionConfig = config.regionConfiguration ?? {};
  const regions = Object.entries(regionConfig) as [string, Record<string, unknown>][];
  const serverBuild = config.gameServer?.serverBuild;
  const capacityMgmt = config.capacityManagement;
  const onDemand = config.onDemandAllocation;
  const allocateStart = config.allocateServersStartTime;
  const endTime = config.endTime;

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ModeBadge mode={modeName} />
          <h3 className="text-lg font-semibold text-[#e4e0ed]">{modeName} Mode</h3>
        </div>
        <div className="flex gap-2">
          {capacityMgmt && (
            <span className="rounded bg-emerald-900/30 px-2 py-0.5 text-[10px] font-medium text-emerald-400">AUTO-SCALE</span>
          )}
          {onDemand && (
            <span className="rounded bg-blue-900/30 px-2 py-0.5 text-[10px] font-medium text-blue-400">ON-DEMAND</span>
          )}
        </div>
      </div>

      {/* Server Build Info */}
      {serverBuild && (
        <div className="mb-4 rounded-lg border border-zinc-800/50 bg-[#0d0b14] p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Server Build</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-zinc-500">Platform: </span>
              <span className="text-[#e4e0ed]">{serverBuild.platform}</span>
            </div>
            <div>
              <span className="text-zinc-500">Version: </span>
              <span className="font-mono text-amber-300">{serverBuild.serverVersion}</span>
            </div>
            <div className="col-span-2">
              <span className="text-zinc-500">Build: </span>
              <span className="font-mono text-zinc-400">{serverBuild.id}</span>
            </div>
          </div>
        </div>
      )}

      {/* Timing */}
      {(allocateStart || endTime) && (
        <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
          {allocateStart && (
            <div>
              <span className="text-zinc-500">Start: </span>
              <span className="text-zinc-300">{new Date(allocateStart).toLocaleDateString()}</span>
            </div>
          )}
          {endTime && (
            <div>
              <span className="text-zinc-500">End: </span>
              <span className="text-zinc-300">{new Date(endTime).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Region Configuration Table */}
      {regions.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Region Configuration
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="pb-2 pr-3 font-medium">Region</th>
                  <th className="pb-2 pr-3 font-medium">Initial</th>
                  <th className="pb-2 pr-3 font-medium">Min</th>
                  <th className="pb-2 pr-3 font-medium">Max</th>
                  <th className="pb-2 pr-3 font-medium">Min Cap %</th>
                  <th className="pb-2 font-medium">Max Cap %</th>
                </tr>
              </thead>
              <tbody>
                {regions.map(([region, rc]) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const r = rc as any;
                  return (
                    <tr key={region} className="border-b border-zinc-800/50">
                      <td className="py-1.5 pr-3 font-medium text-zinc-300">{region}</td>
                      <td className="py-1.5 pr-3 text-zinc-300">{String(r.initialServerCount ?? "—")}</td>
                      <td className="py-1.5 pr-3 text-zinc-300">{String(r.minimumServers ?? "—")}</td>
                      <td className="py-1.5 pr-3 font-semibold text-amber-300">{String(r.maximumServers ?? "—")}</td>
                      <td className="py-1.5 pr-3 text-zinc-300">{String(r.minimumCapacityUtilizationPercentage ?? "—")}%</td>
                      <td className="py-1.5 text-zinc-300">{String(r.maximumCapacityUtilizationPercentage ?? "—")}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Standby Numbers */}
          {regions.some(([, rc]) => rc.standbyNumbers && Object.keys(rc.standbyNumbers as object).length > 0) && (
            <div className="mt-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Standby Servers</p>
              {regions.map(([region, rc]) => {
                const standby = (rc as Record<string, unknown>).standbyNumbers as Record<string, number> | undefined;
                if (!standby || Object.keys(standby).length === 0) return null;
                return (
                  <div key={region} className="mb-1 flex flex-wrap gap-2">
                    <span className="text-xs text-zinc-500">{region}:</span>
                    {Object.entries(standby).map(([phase, count]) => (
                      <span key={phase} className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">
                        {phase}: <span className="font-semibold text-amber-300">{count}</span>
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ── Tab 3: Store & Offers ────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StoreTab({ data, loading, error }: { data: any; loading: boolean; error: string | null }) {
  const [filter, setFilter] = useState<"all" | "consumable" | "durable">("all");

  if (loading && data === undefined) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (data === undefined) return null;

  const storeOffers = data?.result?.storeServerOffers ?? [];
  const entitlements = data?.result?.serverEntitlements ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = [...storeOffers].sort((a: any, b: any) => {
    const pa = a.prices?.[0]?.listPrice ?? 0;
    const pb = b.prices?.[0]?.listPrice ?? 0;
    return pb - pa;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filtered = filter === "all" ? items : items.filter((item: any) => {
    const pt = (item.packType ?? "").toLowerCase();
    if (filter === "consumable") return pt.includes("consumable");
    if (filter === "durable") return pt.includes("durable");
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="flex flex-wrap gap-4">
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">{items.length}</div>
            <div className="text-xs text-zinc-500">Store Offers</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{entitlements.length}</div>
            <div className="text-xs text-zinc-500">Entitlements</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <div className="text-2xl font-bold text-emerald-400">{items.filter((i: any) => !i.hiddenOffer).length}</div>
            <div className="text-xs text-zinc-500">Visible</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <div className="text-2xl font-bold text-zinc-500">{items.filter((i: any) => i.hiddenOffer).length}</div>
            <div className="text-xs text-zinc-500">Hidden</div>
          </div>
        </Card>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2">
        {(["all", "consumable", "durable"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-amber-500/15 text-amber-300"
                : "border border-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {f === "all" ? "All" : f === "consumable" ? "Consumables" : "Durables"}
          </button>
        ))}
      </div>

      {/* Offer cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {filtered.map((item: any, i: number) => (
          <OfferCard key={i} item={item} />
        ))}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OfferCard({ item }: { item: any }) {
  const title = item.titles?.["en-US"] ?? item.titles?.neutral ?? "Untitled";
  const desc = item.descriptions?.["en-US"] ?? "";
  const cleanDesc = desc.replace(/\r\n/g, " ").replace(/\n/g, " ");
  const truncatedDesc = cleanDesc.length > 120 ? cleanDesc.slice(0, 120) + "..." : cleanDesc;
  const price = item.prices?.[0]?.listPrice;
  const thumbnail = item.images?.find((img: { type: string }) => img.type === "Thumbnail");
  const rarity = item.rarity ?? "common";
  const packType = item.packType ?? item.type ?? "";
  const isHidden = item.hiddenOffer;

  const rarityColors: Record<string, string> = {
    legendary: "border-amber-500/50 bg-gradient-to-b from-amber-900/20 to-transparent",
    epic: "border-purple-500/50 bg-gradient-to-b from-purple-900/20 to-transparent",
    rare: "border-blue-500/50 bg-gradient-to-b from-blue-900/20 to-transparent",
    uncommon: "border-emerald-500/50 bg-gradient-to-b from-emerald-900/20 to-transparent",
    common: "border-zinc-700/50",
  };

  return (
    <div className={`rounded-xl border p-4 ${rarityColors[rarity] ?? rarityColors.common}`}>
      <div className="flex gap-3">
        {/* Thumbnail */}
        {thumbnail?.url && (
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbnail.url} alt={title} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#e4e0ed] leading-tight">{title}</h3>
            {isHidden && (
              <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">HIDDEN</span>
            )}
          </div>
          {truncatedDesc && (
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{truncatedDesc}</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {packType && (
            <span className="rounded bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-400">
              {packType.replace("Server", "").replace("Consumable", "Consumable").replace("Durable", "Durable")}
            </span>
          )}
          <RarityBadge rarity={rarity} />
        </div>
        {price != null && (
          <span className="text-sm font-bold text-amber-400">{price.toLocaleString()} MC</span>
        )}
      </div>

      {/* Item references */}
      {item.itemReferences?.length > 0 && (
        <div className="mt-2 text-[10px] text-zinc-600">
          {item.itemReferences.length} entitlement{item.itemReferences.length !== 1 && "s"} granted
        </div>
      )}
    </div>
  );
}

function RarityBadge({ rarity }: { rarity: string }) {
  const colors: Record<string, string> = {
    legendary: "bg-amber-900/40 text-amber-400 border border-amber-500/30",
    epic: "bg-purple-900/40 text-purple-400 border border-purple-500/30",
    rare: "bg-blue-900/40 text-blue-400 border border-blue-500/30",
    uncommon: "bg-emerald-900/40 text-emerald-400 border border-emerald-500/30",
    common: "bg-zinc-800 text-zinc-400",
  };
  const cls = colors[rarity.toLowerCase()] ?? colors.common;
  return <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${cls}`}>{rarity}</span>;
}

/* ── Tab 4: Allowlists ────────────────────────────────────────────── */

function AllowlistsTab({
  devData,
  expData,
  devLoading,
  expLoading,
  devError,
  expError,
}: {
  devData: unknown;
  expData: unknown;
  devLoading: boolean;
  expLoading: boolean;
  devError: string | null;
  expError: string | null;
}) {
  return (
    <div className="space-y-6">
      <AllowlistSection
        title="Dev Allowlist"
        data={devData}
        loading={devLoading}
        error={devError}
      />
      <AllowlistSection
        title="Experience Allowlist"
        data={expData}
        loading={expLoading}
        error={expError}
      />
    </div>
  );
}

function AllowlistSection({
  title,
  data,
  loading,
  error,
}: {
  title: string;
  data: unknown;
  loading: boolean;
  error: string | null;
}) {
  const [search, setSearch] = useState("");

  if (loading && data === undefined) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (data === undefined) return null;

  const raw = (data as { result?: unknown })?.result ?? data;
  const entries: AllowlistEntry[] = Array.isArray(raw) ? raw : [];

  const filtered = search.trim()
    ? entries.filter((e) => {
        const q = search.toLowerCase();
        return (
          (e.gamertag ?? "").toLowerCase().includes(q) ||
          (e.xuid ?? "").toLowerCase().includes(q) ||
          (e.playFabId ?? "").toLowerCase().includes(q)
        );
      })
    : entries;

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          {title}
        </h3>
        <span className="text-xs text-zinc-500">{entries.length} total</span>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
        <input
          type="text"
          placeholder="Search gamertag, XUID, or PlayFab ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-zinc-800 bg-[#0a0a0f] py-2 pl-9 pr-3 text-sm text-[#e4e0ed] placeholder-zinc-600 outline-none transition-colors focus:border-amber-500/50"
        />
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500">No entries found on allowlist.</p>
      ) : (
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#13111a]">
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="pb-3 pr-4 font-medium">#</th>
                <th className="pb-3 pr-4 font-medium">Gamertag</th>
                <th className="pb-3 pr-4 font-medium">XUID</th>
                <th className="pb-3 font-medium">PlayFab ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => (
                <tr key={i} className="border-b border-zinc-800/50">
                  <td className="py-2 pr-4 text-zinc-500">{i + 1}</td>
                  <td className="py-2 pr-4 font-medium text-[#e4e0ed]">
                    {entry.gamertag ?? "\u2014"}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-zinc-400">
                    {entry.xuid ?? "\u2014"}
                  </td>
                  <td className="py-2 font-mono text-xs text-zinc-400">
                    {entry.playFabId ?? "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {search && filtered.length !== entries.length && (
            <p className="mt-2 text-xs text-zinc-600">
              Showing {filtered.length} of {entries.length}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
