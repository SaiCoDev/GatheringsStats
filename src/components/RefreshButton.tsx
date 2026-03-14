"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const COOLDOWN_SECONDS = 60;

export function RefreshButton({
  onClick,
  refreshing,
  cachedAt,
}: {
  onClick: () => void;
  refreshing: boolean;
  cachedAt?: number;
}) {
  const [cooldown, setCooldown] = useState(0);

  // Start cooldown timer after a refresh completes
  useEffect(() => {
    if (!cachedAt) return;
    // Calculate how old the cache is — if just refreshed, start cooldown
    const age = Math.floor((Date.now() - cachedAt) / 1000);
    if (age < 5) {
      setCooldown(COOLDOWN_SECONDS);
    }
  }, [cachedAt]);

  // Tick down the cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const disabled = refreshing || cooldown > 0;

  const handleClick = () => {
    if (disabled) return;
    setCooldown(COOLDOWN_SECONDS);
    onClick();
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        {cachedAt && (
          <span className="text-xs text-[#6b6480]">
            Cached {formatAge(cachedAt)}
          </span>
        )}
        <button
          onClick={handleClick}
          disabled={disabled}
          className="btn-enchanted inline-flex items-center gap-1.5 rounded-lg border border-[#2d2640] bg-[#13111a] px-3 py-1.5 text-sm font-medium text-[#9892a6] transition-all hover:border-amber-500/40 hover:text-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing
            ? "Refreshing..."
            : cooldown > 0
              ? `Wait ${cooldown}s`
              : "Refresh"}
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
