"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`card-glow rounded-xl border border-[#2d2640] bg-[#13111a]/70 p-5 backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Flash triggers when:
 * - `value` changes (amber flash for value change)
 * - `refreshKey` changes but `value` stays the same (subtle pulse to show data was checked)
 */
export function StatCard({
  label,
  value,
  sub,
  icon,
  refreshKey,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  refreshKey?: string | number;
}) {
  const prevValue = useRef(value);
  const prevRefreshKey = useRef(refreshKey);
  const [flash, setFlash] = useState<"value" | "refresh" | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      prevValue.current = value;
      prevRefreshKey.current = refreshKey;
      return;
    }

    if (prevValue.current !== value) {
      // Value actually changed — strong amber flash
      setFlash("value");
      const timer = setTimeout(() => setFlash(null), 1200);
      prevValue.current = value;
      prevRefreshKey.current = refreshKey;
      return () => clearTimeout(timer);
    }

    if (refreshKey !== undefined && prevRefreshKey.current !== refreshKey) {
      // Same value but new data arrived — subtle pulse
      setFlash("refresh");
      const timer = setTimeout(() => setFlash(null), 800);
      prevRefreshKey.current = refreshKey;
      return () => clearTimeout(timer);
    }
  }, [value, refreshKey]);

  return (
    <div
      className={`stat-glow card-glow rounded-xl border bg-[#13111a]/70 p-5 backdrop-blur-sm transition-all ${
        flash === "value"
          ? "card-flash border-[#2d2640]"
          : flash === "refresh"
            ? "card-pulse border-[#2d2640]"
            : "border-[#2d2640]"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#9892a6]">{label}</p>
          <p
            className={`mt-1 text-2xl font-semibold text-white ${
              flash === "value" ? "data-flash" : ""
            }`}
          >
            {value}
          </p>
          {sub && <p className="mt-0.5 text-xs text-[#6b6480]">{sub}</p>}
        </div>
        {icon && (
          <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

/** Wrap any inline value to flash amber when it changes. */
export function FlashValue({
  value,
  children,
  className = "",
}: {
  value: string | number;
  children: ReactNode;
  className?: string;
}) {
  const prevValue = useRef(value);
  const [flash, setFlash] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      prevValue.current = value;
      return;
    }
    if (prevValue.current !== value) {
      setFlash(true);
      prevValue.current = value;
      const timer = setTimeout(() => setFlash(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <span className={`${flash ? "data-flash" : ""} ${className}`}>
      {children}
    </span>
  );
}
