"use client";

import { RefreshCw } from "lucide-react";

export function RefreshButton({
  onClick,
  refreshing,
  cachedAt,
}: {
  onClick: () => void;
  refreshing: boolean;
  cachedAt?: number;
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        {cachedAt && (
          <span className="text-xs text-[#6b6480]">
            Cached {formatAge(cachedAt)}
          </span>
        )}
        <button
          onClick={onClick}
          disabled={refreshing}
          className="btn-enchanted inline-flex items-center gap-1.5 rounded-lg border border-[#2d2640] bg-[#13111a] px-3 py-1.5 text-sm font-medium text-[#9892a6] transition-all hover:border-amber-500/40 hover:text-amber-300 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      <span className="text-xs font-medium text-amber-400">don&apos;t spam me</span>
    </div>
  );
}

function formatAge(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
