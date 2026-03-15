"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Database, Clock } from "lucide-react";

const COOLDOWN_SECONDS = 60;

export function DataStatus({
  onRefresh,
  refreshing,
  cachedAt,
}: {
  onRefresh: () => void;
  refreshing: boolean;
  cachedAt?: number;
}) {
  const [cooldown, setCooldown] = useState(0);
  const [, setTick] = useState(0);
  const [flash, setFlash] = useState(false);
  const prevCachedAt = useRef(cachedAt);

  // Auto-tick to keep "ago" labels fresh
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(timer);
  }, []);

  // Start cooldown timer after a refresh completes
  useEffect(() => {
    if (!cachedAt) return;
    const age = Math.floor((Date.now() - cachedAt) / 1000);
    if (age < 5) {
      setCooldown(COOLDOWN_SECONDS);
    }
  }, [cachedAt]);

  // Flash when cachedAt changes (new data arrived)
  useEffect(() => {
    if (cachedAt && prevCachedAt.current && cachedAt !== prevCachedAt.current) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 1200);
      return () => clearTimeout(timer);
    }
    prevCachedAt.current = cachedAt;
  }, [cachedAt]);

  useEffect(() => {
    prevCachedAt.current = cachedAt;
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
    onRefresh();
  };

  return (
    <div className={`flex items-center gap-3 rounded-lg border bg-[#13111a]/80 px-3 py-2 transition-all duration-700 ${flash ? "border-amber-500/50 shadow-[0_0_12px_rgba(217,119,6,0.15)]" : "border-[#2d2640]"}`}>
      <div className="flex items-center gap-2 text-xs text-[#9892a6]">
        <Database className={`h-3.5 w-3.5 transition-colors duration-700 ${flash ? "text-amber-400" : "text-[#6b6480]"}`} />
        <span className={flash ? "data-flash" : ""}>Data synced</span>
        {cachedAt ? (
          <span className="flex items-center gap-1 text-[#e4e0ed]">
            <Clock className="h-3 w-3 text-[#6b6480]" />
            {formatAge(cachedAt)}
          </span>
        ) : (
          <span className="text-[#6b6480]">never</span>
        )}
      </div>
      <button
        onClick={handleClick}
        disabled={disabled}
        className="btn-enchanted inline-flex items-center gap-1.5 rounded-lg border border-[#2d2640] bg-[#0a0a0f] px-2.5 py-1 text-xs font-medium text-[#9892a6] transition-all hover:border-amber-500/40 hover:text-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw
          className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
        />
        {refreshing
          ? "Syncing..."
          : cooldown > 0
            ? `${cooldown}s`
            : "Sync now"}
      </button>
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
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
