"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { DataStatus } from "@/components/DataStatus";
import { Users, Search, Filter, ChevronDown } from "lucide-react";
import type { PlayerMetric } from "@/lib/queries";

const PLAYER_LIMIT = 250;

type PlayerRow = PlayerMetric & {
  player_name: string | null;
};

interface PlayersResponse {
  players: PlayerRow[];
  total: number;
  limit: number;
  offset: number;
  cachedAt: number;
}

type SortKey =
  | "player_name"
  | "level_reached"
  | "prestige_reached"
  | "gameplay_time"
  | "blocks_broken"
  | "coins_earnt"
  | "coins_spent"
  | "tool_material_on_quit"
  | "upgrades_purchased"
  | "pets_purchased"
  | "sessions";

export default function PlayersPage() {
  const [data, setData] = useState<PlayersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [toolFilter, setToolFilter] = useState("all");
  const [minLevel, setMinLevel] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("gameplay_time");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const fetchPlayers = useCallback(async (offset = 0, refresh = false) => {
    const refreshParam = refresh ? "&refresh=1" : "";
    const res = await fetch(`/api/players?limit=${PLAYER_LIMIT}&offset=${offset}${refreshParam}`);
    if (!res.ok) throw new Error("Failed to fetch players");
    return (await res.json()) as PlayersResponse;
  }, []);

  useEffect(() => {
    fetchPlayers()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [fetchPlayers]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Trigger a fresh snapshot from the game server
      await fetch("/api/game-data-snapshot", { method: "POST" });
      const next = await fetchPlayers(0, true);
      setData(next);
    } finally {
      setRefreshing(false);
    }
  }, [fetchPlayers]);

  const loadMore = useCallback(async () => {
    if (!data || loadingMore || data.players.length >= data.total) return;
    setLoadingMore(true);
    try {
      const next = await fetchPlayers(data.players.length);
      setData((current) => {
        if (!current) return next;
        return {
          ...next,
          players: [...current.players, ...next.players],
        };
      });
    } finally {
      setLoadingMore(false);
    }
  }, [data, fetchPlayers, loadingMore]);

  if (loading) return <Loading />;
  if (!data) return null;

  const { players, total, limit, cachedAt } = data;
  const isLimited = total > players.length;
  const tools = [...new Set(players.map((player) => player.tool_material_on_quit ?? "Unknown"))].sort();

  const filteredPlayers = players.filter((player) => {
    const matchesSearch = (player.player_name ?? "Unknown")
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    const matchesTool =
      toolFilter === "all" ? true : (player.tool_material_on_quit ?? "Unknown") === toolFilter;
    const parsedMinLevel = parseInt(minLevel, 10);
    const matchesMinLevel = Number.isNaN(parsedMinLevel)
      ? true
      : player.level_reached >= parsedMinLevel;

    return matchesSearch && matchesTool && matchesMinLevel;
  });

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    const direction = sortDirection === "asc" ? 1 : -1;

    if (sortKey === "player_name") {
      return (a.player_name ?? "Unknown").localeCompare(b.player_name ?? "Unknown") * direction;
    }

    if (sortKey === "tool_material_on_quit") {
      return ((a.tool_material_on_quit ?? "Unknown").localeCompare(
        b.tool_material_on_quit ?? "Unknown"
      )) * direction;
    }

    if (sortKey === "sessions") {
      return (((a.sessions?.length ?? 0) - (b.sessions?.length ?? 0)) * direction);
    }

    return ((a[sortKey] as number) - (b[sortKey] as number)) * direction;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection(key === "player_name" || key === "tool_material_on_quit" ? "asc" : "desc");
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-7 w-7 text-amber-400" />
            <h1 className="text-3xl font-bold text-white">Players</h1>
          </div>
          <p className="mt-1 text-[#9892a6]">
            {isLimited
              ? `Showing ${players.length.toLocaleString()} of ${total.toLocaleString()} players`
              : `${players.length.toLocaleString()} players tracked`}
          </p>
          <p className="mt-1 text-sm text-[#6b6480]">
            Initial load is capped at {limit.toLocaleString()} players.
          </p>
        </div>
        <DataStatus onRefresh={refresh} refreshing={refreshing} cachedAt={cachedAt} />
      </div>

      {/* Filters */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-[#9892a6]">
          <Filter className="h-4 w-4 text-amber-400" />
          Filters
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b6480]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by username"
              className="w-full rounded-lg border border-[#2d2640] bg-[#0a0a0f] pl-9 pr-3 py-2 text-sm text-[#e4e0ed] outline-none transition-colors placeholder:text-[#6b6480] focus:border-amber-500/50"
            />
          </div>
          <select
            value={toolFilter}
            onChange={(e) => setToolFilter(e.target.value)}
            className="rounded-lg border border-[#2d2640] bg-[#0a0a0f] px-3 py-2 text-sm text-[#e4e0ed] outline-none transition-colors focus:border-amber-500/50"
          >
            <option value="all">All tools</option>
            {tools.map((tool) => (
              <option key={tool} value={tool}>
                {tool}
              </option>
            ))}
          </select>
          <input
            value={minLevel}
            onChange={(e) => setMinLevel(e.target.value)}
            inputMode="numeric"
            placeholder="Minimum level"
            className="rounded-lg border border-[#2d2640] bg-[#0a0a0f] px-3 py-2 text-sm text-[#e4e0ed] outline-none transition-colors placeholder:text-[#6b6480] focus:border-amber-500/50"
          />
        </div>
        <p className="text-sm text-[#6b6480]">
          Showing {sortedPlayers.length.toLocaleString()} filtered players from {players.length.toLocaleString()} loaded.
        </p>
      </Card>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#2d2640] text-[#9892a6]">
              <SortableHeader label="Username" sortKey="player_name" activeKey={sortKey} direction={sortDirection} align="left" onSort={toggleSort} />
              <SortableHeader label="Level" sortKey="level_reached" activeKey={sortKey} direction={sortDirection} align="right" onSort={toggleSort} />
              <SortableHeader label="Prestige" sortKey="prestige_reached" activeKey={sortKey} direction={sortDirection} align="right" onSort={toggleSort} />
              <SortableHeader label="Playtime" sortKey="gameplay_time" activeKey={sortKey} direction={sortDirection} align="right" onSort={toggleSort} />
              <SortableHeader label="Blocks" sortKey="blocks_broken" activeKey={sortKey} direction={sortDirection} align="right" onSort={toggleSort} />
              <SortableHeader label="Coins Earned" sortKey="coins_earnt" activeKey={sortKey} direction={sortDirection} align="right" onSort={toggleSort} />
              <SortableHeader label="Coins Spent" sortKey="coins_spent" activeKey={sortKey} direction={sortDirection} align="right" onSort={toggleSort} />
              <SortableHeader label="Tool" sortKey="tool_material_on_quit" activeKey={sortKey} direction={sortDirection} align="left" onSort={toggleSort} />
              <SortableHeader label="Upgrades" sortKey="upgrades_purchased" activeKey={sortKey} direction={sortDirection} align="right" onSort={toggleSort} />
              <SortableHeader label="Pets" sortKey="pets_purchased" activeKey={sortKey} direction={sortDirection} align="right" onSort={toggleSort} />
              <SortableHeader label="Sessions" sortKey="sessions" activeKey={sortKey} direction={sortDirection} align="right" onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((p) => (
              <tr
                key={p.player_pfid}
                className="border-b border-[#2d2640]/50 hover:bg-amber-500/5"
              >
                <td className="px-3 py-2.5 text-[#e4e0ed]">
                  {p.player_name ?? "Unknown"}
                </td>
                <td className="px-3 py-2.5 text-right text-[#e4e0ed]">
                  {p.level_reached}
                </td>
                <td className="px-3 py-2.5 text-right text-[#e4e0ed]">
                  {p.prestige_reached}
                </td>
                <td className="px-3 py-2.5 text-right text-[#e4e0ed]">
                  {p.gameplay_time} min
                </td>
                <td className="px-3 py-2.5 text-right text-[#e4e0ed]">
                  {p.blocks_broken.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-amber-400">
                  {p.coins_earnt.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-amber-400">
                  {p.coins_spent.toLocaleString()}
                </td>
                <td className="px-3 py-2.5">
                  <ToolBadge material={p.tool_material_on_quit} />
                </td>
                <td className="px-3 py-2.5 text-right text-[#e4e0ed]">
                  {p.upgrades_purchased}
                </td>
                <td className="px-3 py-2.5 text-right text-[#e4e0ed]">
                  {p.pets_purchased}
                </td>
                <td className="px-3 py-2.5 text-right text-[#e4e0ed]">
                  {p.sessions?.length ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {players.length === 0 && (
        <Card>
          <p className="text-[#9892a6]">No player data yet.</p>
        </Card>
      )}

      {players.length > 0 && sortedPlayers.length === 0 && (
        <Card>
          <p className="text-[#9892a6]">No players match the current filters.</p>
        </Card>
      )}

      {isLimited && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="btn-enchanted flex w-full items-center justify-center gap-2 rounded-lg border border-[#2d2640] bg-[#13111a] py-2.5 text-sm text-[#9892a6] transition-all hover:border-amber-500/40 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronDown className="h-4 w-4" />
          {loadingMore
            ? "Loading..."
            : `Load more (${(total - players.length).toLocaleString()} remaining)`}
        </button>
      )}
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  align,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: "asc" | "desc";
  align: "left" | "right";
  onSort: (key: SortKey) => void;
}) {
  const isActive = sortKey === activeKey;

  return (
    <th className={`px-3 pb-3 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 transition-colors hover:text-amber-300 ${
          align === "right" ? "justify-end" : ""
        }`}
      >
        {label}
        <span className={`text-xs ${isActive ? "text-amber-400" : "text-[#6b6480]"}`}>
          {isActive ? (direction === "asc" ? "\u25B2" : "\u25BC") : "\u2195"}
        </span>
      </button>
    </th>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 animate-spin rounded-full border-2 spinner-enchanted" />
    </div>
  );
}

const toolColors: Record<string, string> = {
  Wooden: "bg-amber-900/30 text-amber-400 border-amber-800/30",
  Stone: "bg-zinc-600/30 text-zinc-300 border-zinc-600/30",
  Copper: "bg-orange-800/30 text-orange-400 border-orange-800/30",
  Iron: "bg-zinc-500/30 text-zinc-200 border-zinc-500/30",
  Gold: "bg-yellow-700/30 text-yellow-400 border-yellow-700/30",
  Diamond: "bg-cyan-700/30 text-cyan-400 border-cyan-700/30",
  Netherite: "bg-purple-800/30 text-purple-400 border-purple-800/30",
};

function ToolBadge({ material }: { material: string | null }) {
  const m = material ?? "Unknown";
  const color = toolColors[m] ?? "bg-[#1a1625] text-[#9892a6] border-[#2d2640]";
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${color}`}>
      {m}
    </span>
  );
}
