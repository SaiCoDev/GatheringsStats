"use client";

import { useState, useRef, useEffect } from "react";
import { useOnlineCount } from "@/lib/useOnlineCount";
import { Wifi, ChevronDown } from "lucide-react";

export function OnlineBanner() {
  const { online, players, flash } = useOnlineCount();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`
          flex w-full items-center gap-3 rounded-lg border px-4 py-2.5
          transition-all duration-700 ease-in-out cursor-pointer
          ${flash
            ? "border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
            : "border-[#2d2640] bg-[#1a1625]/60 hover:border-[#3d3650]"
          }
        `}
      >
        {/* Pulsing dot */}
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>

        <Wifi className={`h-4 w-4 transition-colors duration-700 ${flash ? "text-emerald-400" : "text-emerald-500/70"}`} />

        <div className="flex items-baseline gap-2">
          <span
            className={`
              text-xl font-bold tabular-nums transition-all duration-700
              ${flash ? "text-emerald-400 scale-110" : "text-white"}
            `}
          >
            {online !== null ? online.toLocaleString() : "..."}
          </span>
          <span className="text-sm text-zinc-400">players online</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Live</span>
          <ChevronDown
            className={`h-4 w-4 text-zinc-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open && players.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-[#2d2640] bg-[#13111a] shadow-xl">
          <div className="px-3 py-2 border-b border-[#2d2640]">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Online Players ({players.length})
            </span>
          </div>
          <ul className="py-1">
            {players.map((p) => (
              <li
                key={p.pfid}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#1a1625]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-sm text-zinc-200 truncate">
                  {p.name ?? p.pfid}
                </span>
                {p.name && (
                  <span className="ml-auto text-[10px] text-zinc-600 font-mono truncate max-w-[100px]">
                    {p.pfid}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
