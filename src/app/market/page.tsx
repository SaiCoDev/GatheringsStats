"use client";

import { useGameData } from "@/lib/useGameData";
import { Card, StatCard } from "@/components/Card";
import { DataStatus } from "@/components/DataStatus";
import { Store, Coins, TrendingUp, Users, Tag, Clock } from "lucide-react";

export default function MarketPage() {
  const { data, loading, refreshing, refresh } = useGameData();

  if (loading) return <Loading />;
  if (!data) return null;

  const { market: listings } = data;

  const totalValue = listings.reduce((s, l) => s + l.buyPrice, 0);
  const avgPrice = listings.length
    ? Math.round(totalValue / listings.length)
    : 0;

  const typeCounts: Record<string, number> = {};
  for (const l of listings) {
    typeCounts[l.itemType] = (typeCounts[l.itemType] ?? 0) + 1;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Store className="h-7 w-7 text-amber-400" />
            <h1 className="text-3xl font-bold text-white">Market</h1>
          </div>
          <p className="mt-1 text-[#9892a6]">
            {listings.length} active listings
          </p>
        </div>
        <DataStatus onRefresh={refresh} refreshing={refreshing} cachedAt={data.cachedAt} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Listings" value={listings.length.toLocaleString()} icon={<Store className="h-5 w-5" />} />
        <StatCard label="Total Market Value" value={totalValue.toLocaleString()} icon={<Coins className="h-5 w-5" />} />
        <StatCard label="Avg Price" value={avgPrice.toLocaleString()} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard
          label="Unique Sellers"
          value={new Set(listings.map((l) => l.sellerPfid)).size.toLocaleString()}
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(typeCounts).map(([type, count]) => (
          <span
            key={type}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#2d2640] bg-[#1a1625] px-3 py-1 text-sm text-[#e4e0ed]"
          >
            <Tag className="h-3 w-3 text-amber-400" />
            {type.replaceAll("_", " ")} ({count})
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#2d2640] text-[#9892a6]">
              <th className="px-3 pb-3 font-medium">Item</th>
              <th className="px-3 pb-3 font-medium">Type</th>
              <th className="px-3 pb-3 font-medium">Seller</th>
              <th className="px-3 pb-3 font-medium text-right">Price</th>
              <th className="px-3 pb-3 font-medium">Details</th>
              <th className="px-3 pb-3 font-medium">Expires</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((item) => (
              <tr
                key={item.id}
                className="border-b border-[#2d2640]/50 hover:bg-amber-500/5"
              >
                <td className="px-3 py-2.5 font-medium text-[#e4e0ed]">
                  {formatItemName(item.itemData)}
                </td>
                <td className="px-3 py-2.5">
                  <span className="rounded-full border border-[#2d2640] bg-[#1a1625] px-2 py-0.5 text-xs text-[#9892a6]">
                    {item.itemType.replaceAll("_", " ")}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-[#9892a6]">{item.sellerName}</td>
                <td className="px-3 py-2.5 text-right font-mono text-amber-400">
                  {item.buyPrice.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-xs text-[#6b6480]">
                  {formatItemDetails(item.itemData)}
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1 text-xs text-[#6b6480]">
                    <Clock className="h-3 w-3" />
                    {new Date(item.expiresAt).toLocaleDateString()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {listings.length === 0 && (
        <Card>
          <p className="text-[#9892a6]">No market listings.</p>
        </Card>
      )}
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

function formatItemName(data: Record<string, unknown>): string {
  if (data.typeId) return String(data.typeId).replace("enchanted:", "").replaceAll("_", " ");
  if (data.petType) return String(data.petType).replace("enchanted:", "").replaceAll("_", " ");
  return "Unknown Item";
}

function formatItemDetails(data: Record<string, unknown>): string {
  const parts: string[] = [];
  if (data.type) parts.push(String(data.type));
  if (data.currentDurability !== undefined && data.maxDurability !== undefined)
    parts.push(`${data.currentDurability}/${data.maxDurability} durability`);
  if (data.petType) parts.push("Pet");
  return parts.join(" \u00B7 ") || "\u2014";
}
