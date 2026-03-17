"use client";

import { useGameData } from "@/lib/useGameData";
import { StatCard, Card } from "@/components/Card";
import { DataStatus } from "@/components/DataStatus";
import { OnlineBanner } from "@/components/OnlineBanner";
import { Users, Clock, TrendingUp, Coins, ShoppingCart, Star, Bug, MessageCircle, Calendar, Pickaxe } from "lucide-react";

export default function DashboardPage() {
  const { data, loading, refreshing, refresh } = useGameData(["players", "market", "ratings", "feedback", "cycles"]);

  if (loading) return <Loading />;
  if (!data) return null;

  const { players, market, ratings, feedback, cycles } = data;

  const totalPlayers = players.length;
  const totalBlocks = players.reduce((s, p) => s + p.blocks_broken, 0);
  const totalCoinsEarnt = players.reduce((s, p) => s + p.coins_earnt, 0);
  const totalCoinsSpent = players.reduce((s, p) => s + p.coins_spent, 0);
  const avgPlaytime = totalPlayers
    ? Math.round(players.reduce((s, p) => s + p.gameplay_time, 0) / totalPlayers)
    : 0;
  const avgLevel = totalPlayers
    ? (players.reduce((s, p) => s + p.level_reached, 0) / totalPlayers).toFixed(1)
    : "0";
  const avgRating = ratings.length
    ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
    : "—";
  const bugReports = feedback.filter((f) => f.type === "BUG_REPORT").length;
  // Date range from cycles (sorted desc, so first = latest, last = earliest)
  const latestCycle = cycles[0];
  const earliestCycle = cycles[cycles.length - 1];
  const dateRange =
    earliestCycle && latestCycle
      ? `${formatDate(earliestCycle.created_at)} — ${formatDate(latestCycle.created_at)}`
      : null;

  const toolCounts: Record<string, number> = {};
  for (const p of players) {
    const tool = p.tool_material_on_quit ?? "Unknown";
    toolCounts[tool] = (toolCounts[tool] ?? 0) + 1;
  }
  const toolEntries = Object.entries(toolCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 inline-flex items-center gap-1.5 text-[#9892a6]">
            <Calendar className="h-3.5 w-3.5 text-[#6b6480]" />
            {dateRange ?? "Loading..."}
          </p>
        </div>
        <DataStatus onRefresh={refresh} refreshing={refreshing} cachedAt={data.cachedAt} />
      </div>

      <OnlineBanner />

      {/* Player & game stats with activity icons */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Players" value={totalPlayers.toLocaleString()} icon={<Users className="h-5 w-5" />} />
        <StatCard
          label="Blocks Broken"
          value={totalBlocks.toLocaleString()}
          icon={<Pickaxe className="h-5 w-5" />}
        />
        <StatCard label="Avg Playtime" value={`${avgPlaytime} min`} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Avg Level" value={avgLevel} icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Coins Earned" value={totalCoinsEarnt.toLocaleString()} icon={<Coins className="h-5 w-5" />} />
        <StatCard label="Coins Spent" value={totalCoinsSpent.toLocaleString()} icon={<Coins className="h-5 w-5" />} />
        <StatCard label="Market Listings" value={market.length.toLocaleString()} icon={<ShoppingCart className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Avg Feedback Rating" value={`${avgRating} / 5`} icon={<Star className="h-5 w-5" />} />
        <StatCard label="Bug Reports" value={bugReports.toLocaleString()} icon={<Bug className="h-5 w-5" />} />
        <StatCard label="Written Feedback" value={feedback.length.toLocaleString()} icon={<MessageCircle className="h-5 w-5" />} />
      </div>

      {/* Tool distribution */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Pickaxe className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">Tool Material on Quit</h2>
        </div>
        <div className="space-y-2">
          {toolEntries.map(([tool, count]) => {
            const pct = totalPlayers ? (count / totalPlayers) * 100 : 0;
            return (
              <div key={tool}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-[#e4e0ed]">{tool}</span>
                  <span className="text-[#6b6480]">
                    {count} ({pct.toFixed(0)}%)
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-[#1a1625]">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, #b45309, #d97706, #fbbf24)`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Recent market listings */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <ShoppingCart className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">Recent Market Listings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#2d2640] text-[#9892a6]">
                <th className="pb-2 font-medium">Item</th>
                <th className="pb-2 font-medium">Seller</th>
                <th className="pb-2 font-medium text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              {market.slice(0, 5).map((item) => (
                <tr key={item.id} className="border-b border-[#2d2640]/50 hover:bg-amber-500/5">
                  <td className="py-2 text-[#e4e0ed]">
                    {formatItemName(item.itemData)}
                  </td>
                  <td className="py-2 text-[#9892a6]">{item.sellerName}</td>
                  <td className="py-2 text-right font-mono text-amber-400">
                    {item.buyPrice.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 animate-spin rounded-full border-2 spinner-enchanted" />
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatItemName(data: Record<string, unknown>): string {
  if (data.typeId) return String(data.typeId).replace("enchanted:", "").replaceAll("_", " ");
  if (data.petType) return String(data.petType).replace("enchanted:", "").replaceAll("_", " ");
  return "Unknown Item";
}

