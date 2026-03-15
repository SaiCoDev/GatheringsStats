"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, StatCard } from "@/components/Card";
import { ErrorBox } from "@/components/ErrorBox";
import { Server, Users, Cpu, Globe } from "lucide-react";
import { DataStatus } from "@/components/DataStatus";

const POLL_INTERVAL = 30_000; // 30s — read latest snapshot from Supabase

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

interface Snapshot {
  id: string;
  captured_at: string;
  total_servers: number;
  total_players: number;
  max_capacity: number;
  entries: AllocationEntry[];
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
        <div>
          <h1 className="text-3xl font-bold">Servers</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Auto-refreshes every 30s
          </p>
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

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Servers"
          value={totalServers}
          icon={<Server className="h-5 w-5" />}
        />
        <StatCard
          label="Total Players"
          value={totalPlayers}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Max Capacity"
          value={maxCapacity}
          icon={<Cpu className="h-5 w-5" />}
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
                      <td className="py-3 pr-4">{e.servers}</td>
                      <td className="py-3 pr-4">{e.playerCount}</td>
                      <td className="py-3 pr-4">{e.maxCapacity}</td>
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
                return (
                  <Card key={region}>
                    <p className="text-sm font-medium text-zinc-400">{region}</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-semibold text-white">
                        {data.playerCount}
                      </span>
                      <span className="text-sm text-zinc-500">
                        / {data.maxCapacity} players
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {data.servers} server{data.servers !== 1 ? "s" : ""}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-zinc-800">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{ width: `${Math.min(usage, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400">
                        {usage.toFixed(0)}%
                      </span>
                    </div>
                  </Card>
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="pb-3 pr-4 font-medium">Time</th>
                  <th className="pb-3 pr-4 font-medium">Servers</th>
                  <th className="pb-3 pr-4 font-medium">Players</th>
                  <th className="pb-3 pr-4 font-medium">Capacity</th>
                  <th className="pb-3 font-medium">Usage</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 20).map((s) => {
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
