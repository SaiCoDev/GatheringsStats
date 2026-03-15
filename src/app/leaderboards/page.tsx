"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { DataStatus } from "@/components/DataStatus";
import { Trophy, ChevronDown, Crown, Globe, Mountain } from "lucide-react";
import type { LeaderboardEntry } from "@/lib/queries";

const PER_BOARD_LIMIT = 100;

interface BoardInfo {
  id: string;
  count: number;
}

interface BoardData {
  entries: LeaderboardEntry[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
}

export default function LeaderboardsPage() {
  const [boards, setBoards] = useState<BoardInfo[]>([]);
  const [boardData, setBoardData] = useState<Record<string, BoardData>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cachedAt, setCachedAt] = useState<number>(0);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const fetchBoardList = useCallback(async (refresh = false) => {
    const qs = refresh ? "&refresh=1" : "";
    const res = await fetch(`/api/leaderboards?action=list${qs}`);
    const { boards: b } = (await res.json()) as { boards: BoardInfo[] };
    setBoards(b);

    const initial: Record<string, BoardData> = {};
    for (const board of b) {
      initial[board.id] = { entries: [], total: board.count, loading: true, loadingMore: false };
    }
    setBoardData(initial);
    setCachedAt(Date.now());
    setLoading(false);
    setRefreshing(false);

    const BATCH = 10;
    for (let i = 0; i < b.length; i += BATCH) {
      const batch = b.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(async (board) => {
          const r = await fetch(
            `/api/leaderboards?board=${encodeURIComponent(board.id)}&limit=${PER_BOARD_LIMIT}`
          );
          return { id: board.id, ...(await r.json()) as { entries: LeaderboardEntry[]; total: number } };
        })
      );
      setBoardData((prev) => {
        const next = { ...prev };
        for (const { id, entries, total } of results) {
          next[id] = { entries, total, loading: false, loadingMore: false };
        }
        return next;
      });
    }
  }, []);

  useEffect(() => {
    fetchBoardList();
  }, [fetchBoardList]);

  const loadMore = async (boardId: string) => {
    const current = boardData[boardId];
    if (!current) return;
    setBoardData((prev) => ({
      ...prev,
      [boardId]: { ...prev[boardId], loadingMore: true },
    }));

    const offset = current.entries.length;
    const res = await fetch(
      `/api/leaderboards?board=${encodeURIComponent(boardId)}&offset=${offset}&limit=${PER_BOARD_LIMIT}`
    );
    const { entries: more } = await res.json();

    setBoardData((prev) => ({
      ...prev,
      [boardId]: {
        ...prev[boardId],
        entries: [...prev[boardId].entries, ...more],
        loadingMore: false,
      },
    }));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setLoading(true);
    // Trigger a fresh snapshot from the game server
    await fetch("/api/game-data-snapshot", { method: "POST" });
    fetchBoardList(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 spinner-enchanted" />
      </div>
    );
  }

  const categories: Record<string, BoardInfo[]> = {};
  for (const b of boards) {
    const parts = b.id.split("-");
    const mineIdx = parts.indexOf("mine");
    const globalIdx = parts.indexOf("global");
    const cutIdx = mineIdx !== -1 ? mineIdx : globalIdx !== -1 ? globalIdx : parts.length;
    const cat = parts.slice(0, cutIdx).join("-");
    (categories[cat] ??= []).push(b);
  }

  for (const cat of Object.keys(categories)) {
    categories[cat].sort((a, b) => {
      const aIsGlobal = a.id.endsWith("-global");
      const bIsGlobal = b.id.endsWith("-global");
      if (aIsGlobal && !bIsGlobal) return -1;
      if (!aIsGlobal && bIsGlobal) return 1;
      const aNum = parseInt(a.id.match(/mine-(\d+)$/)?.[1] ?? "0", 10);
      const bNum = parseInt(b.id.match(/mine-(\d+)$/)?.[1] ?? "0", 10);
      return aNum - bNum;
    });
  }

  const categoryNames = Object.keys(categories).sort();
  const totalEntries = boards.reduce((s, b) => s + b.count, 0);
  const visibleCategories =
    activeCategory === "all" ? categoryNames : [activeCategory];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-7 w-7 text-amber-400" />
            <h1 className="text-3xl font-bold text-white">Leaderboards</h1>
          </div>
          <p className="mt-1 text-[#9892a6]">
            {boards.length} boards &middot; {totalEntries.toLocaleString()} total entries
          </p>
        </div>
        <DataStatus onRefresh={handleRefresh} refreshing={refreshing} cachedAt={cachedAt || undefined} />
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => setActiveCategory("all")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
            activeCategory === "all"
              ? "bg-amber-500/15 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
              : "text-[#9892a6] hover:bg-[#1a1625] hover:text-[#e4e0ed]"
          }`}
        >
          All ({boards.length})
        </button>
        {categoryNames.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              activeCategory === cat
                ? "bg-amber-500/15 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                : "text-[#9892a6] hover:bg-[#1a1625] hover:text-[#e4e0ed]"
            }`}
          >
            {formatCategoryName(cat)} ({categories[cat].length})
          </button>
        ))}
      </div>

      {/* Boards */}
      {visibleCategories.map((cat) => (
        <div key={cat}>
          <h2 className="mb-4 text-xl font-semibold text-white">
            {formatCategoryName(cat)}
          </h2>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {categories[cat].map((board) => (
              <LeaderboardCard
                key={board.id}
                board={board}
                data={boardData[board.id]}
                onLoadMore={() => loadMore(board.id)}
              />
            ))}
          </div>
        </div>
      ))}

      {boards.length === 0 && (
        <Card>
          <p className="text-[#9892a6]">No leaderboard data yet.</p>
        </Card>
      )}
    </div>
  );
}

function LeaderboardCard({
  board,
  data,
  onLoadMore,
}: {
  board: BoardInfo;
  data?: BoardData;
  onLoadMore: () => void;
}) {
  const hasMore = data ? data.total > data.entries.length : false;
  const isGlobal = board.id.endsWith("-global");

  return (
    <Card className={isGlobal ? "border-amber-500/30" : ""}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isGlobal ? (
            <Globe className="h-4 w-4 text-amber-400" />
          ) : (
            <Mountain className="h-4 w-4 text-[#6b6480]" />
          )}
          <h3 className="text-sm font-semibold text-white">
            {formatBoardName(board.id)}
          </h3>
        </div>
        <span className="text-xs text-[#6b6480]">
          {data && !data.loading ? `${data.entries.length} / ${data.total}` : `${board.count}`}
        </span>
      </div>

      {!data || data.loading ? (
        <div className="flex justify-center py-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 spinner-enchanted" />
        </div>
      ) : (
        <>
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#13111a]/95">
                <tr className="border-b border-[#2d2640] text-[#9892a6]">
                  <th className="pb-1.5 text-left text-xs font-medium w-8">#</th>
                  <th className="pb-1.5 text-left text-xs font-medium">Player</th>
                  <th className="pb-1.5 text-right text-xs font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry, i) => (
                  <tr key={entry._id} className="border-b border-[#2d2640]/20 hover:bg-amber-500/5">
                    <td className="py-1 text-xs text-[#6b6480]">
                      {i === 0 ? (
                        <Crown className="h-4 w-4 text-amber-400" />
                      ) : i === 1 ? (
                        <Crown className="h-4 w-4 text-zinc-400" />
                      ) : i === 2 ? (
                        <Crown className="h-4 w-4 text-amber-700" />
                      ) : (
                        i + 1
                      )}
                    </td>
                    <td className="py-1 text-xs text-[#e4e0ed]">{entry.playerName}</td>
                    <td className="py-1 text-right font-mono text-xs text-amber-400">
                      {entry.score.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <button
              onClick={onLoadMore}
              disabled={data.loadingMore}
              className="btn-enchanted mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#2d2640] bg-[#0a0a0f] py-1.5 text-xs text-[#9892a6] transition-all hover:border-amber-500/40 hover:text-amber-300 disabled:opacity-50"
            >
              <ChevronDown className="h-3 w-3" />
              {data.loadingMore
                ? "Loading..."
                : `Load more (${data.total - data.entries.length} remaining)`}
            </button>
          )}
        </>
      )}
    </Card>
  );
}

function formatBoardName(id: string): string {
  if (id.endsWith("-global")) return "Global";
  const match = id.match(/mine-(\d+)$/);
  if (match) return `Mine ${match[1]}`;
  return id.replace(/-/g, " ");
}

function formatCategoryName(cat: string): string {
  return cat
    .replace(/^top-/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
