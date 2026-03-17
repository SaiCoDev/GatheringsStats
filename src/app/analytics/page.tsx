"use client";

import React, { useCallback, useRef, useState } from "react";
import { useGameData } from "@/lib/useGameData";
import { Card, StatCard } from "@/components/Card";
import { DataStatus } from "@/components/DataStatus";
import { OnlineBanner } from "@/components/OnlineBanner";
import { BarChart3, TrendingUp, Clock, Users, Target } from "lucide-react";

export default function AnalyticsPage() {
  const { data, loading, refreshing, refresh } = useGameData(["players"]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 spinner-enchanted" />
      </div>
    );
  if (!data) return null;

  const { players } = data;
  const activePlayers = players.filter((p) => p.gameplay_time > 0);
  const totalPlayers = activePlayers.length;
  const avgTime = totalPlayers
    ? Math.round(activePlayers.reduce((s, p) => s + p.gameplay_time, 0) / totalPlayers)
    : 0;
  const avgLevel = totalPlayers
    ? (activePlayers.reduce((s, p) => s + p.level_reached, 0) / totalPlayers).toFixed(1)
    : "0";
  const maxLevel = Math.max(...activePlayers.map((p) => p.level_reached), 0);
  const medianTime = (() => {
    const sorted = activePlayers.map((p) => p.gameplay_time).sort((a, b) => a - b);
    if (sorted.length === 0) return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  })();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <p className="mt-1 text-[#9892a6]">Player progression and engagement analysis</p>
        </div>
        <DataStatus onRefresh={refresh} refreshing={refreshing} cachedAt={data.cachedAt} />
      </div>

      <OnlineBanner />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Players" value={totalPlayers.toLocaleString()} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Avg Playtime" value={`${avgTime} min`} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Median Playtime" value={`${medianTime} min`} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Avg Level" value={avgLevel} icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">Gameplay Time vs Level Reached</h2>
        </div>
        <p className="mb-4 text-sm text-[#6b6480]">
          Each dot represents a player. Gold curve = average level per 15-min bucket.
          Max level: <span className="text-amber-400 font-medium">Lv{maxLevel}</span>
        </p>
        <div className="h-[420px]">
          <GameplayLevelChart players={activePlayers} />
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">Players by Gameplay Duration</h2>
        </div>
        <p className="mb-4 text-sm text-[#6b6480]">
          Player count per 15-minute bracket. Color = avg level (amber → green).
        </p>
        <div className="h-[420px]">
          <GameplayBucketChart players={activePlayers} />
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">Level Distribution</h2>
        </div>
        <p className="mb-4 text-sm text-[#6b6480]">
          How many players reached each level. Shows where players stop progressing.
        </p>
        <div className="h-[420px]">
          <LevelDistributionChart players={activePlayers} />
        </div>
      </Card>
    </div>
  );
}

// ── Shared ────────────────────────────────────────────────────────────

const W = 800;
const H = 360;
const PX = 55;
const PY = 24;
const PR = W - 16;
const PB = H - 32;

interface Player {
  gameplay_time: number;
  level_reached: number;
}

/** Convert mouse event to SVG-space x coordinate using getScreenCTM */
function svgX(e: React.MouseEvent<SVGSVGElement>, svgEl: SVGSVGElement | null): number {
  if (!svgEl) return 0;
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return 0;
  return (e.clientX - ctm.e) / ctm.a;
}

function svgY(e: React.MouseEvent<SVGSVGElement>, svgEl: SVGSVGElement | null): number {
  if (!svgEl) return 0;
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return 0;
  return (e.clientY - ctm.f) / ctm.d;
}

function ScaleToggle({ useLog, setUseLog }: { useLog: boolean; setUseLog: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-[#6b6480]">Scale:</span>
      <button
        onClick={() => setUseLog(false)}
        className={`rounded px-2 py-0.5 transition ${!useLog ? "bg-amber-500/20 text-amber-300" : "text-[#6b6480] hover:text-[#e4e0ed]"}`}
      >
        Linear
      </button>
      <button
        onClick={() => setUseLog(true)}
        className={`rounded px-2 py-0.5 transition ${useLog ? "bg-amber-500/20 text-amber-300" : "text-[#6b6480] hover:text-[#e4e0ed]"}`}
      >
        Log
      </button>
    </div>
  );
}

/** Map a value to Y position, supporting log scale */
function valToY(val: number, maxVal: number, useLog: boolean): number {
  if (useLog) {
    const logMax = Math.log10(maxVal + 1);
    const logVal = Math.log10(val + 1);
    return PY + (1 - logVal / logMax) * (PB - PY);
  }
  return PY + (1 - val / maxVal) * (PB - PY);
}

function yAxisLabels(maxVal: number, useLog: boolean): number[] {
  if (useLog) {
    const labels: number[] = [0];
    let v = 1;
    while (v <= maxVal) {
      labels.push(v);
      v *= 10;
    }
    if (labels[labels.length - 1] < maxVal) labels.push(maxVal);
    return labels;
  }
  return [0, Math.round(maxVal / 4), Math.round(maxVal / 2), Math.round((maxVal * 3) / 4), maxVal];
}

// ── Gameplay Time vs Level ───────────────────────────────────────────

function GameplayLevelChart({ players }: { players: Player[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (players.length < 2)
    return <div className="flex h-full items-center justify-center text-sm text-zinc-500">Not enough data.</div>;

  const maxTime = Math.max(...players.map((p) => p.gameplay_time));
  const maxLevel = Math.max(...players.map((p) => p.level_reached), 1);

  const bucketSize = 15;
  const bucketCount = Math.ceil(maxTime / bucketSize) + 1;
  const buckets: { sum: number; count: number }[] = Array.from({ length: bucketCount }, () => ({ sum: 0, count: 0 }));
  for (const p of players) {
    const idx = Math.min(Math.floor(p.gameplay_time / bucketSize), bucketCount - 1);
    buckets[idx].sum += p.level_reached;
    buckets[idx].count++;
  }

  const avgPoints: { x: number; y: number; avgLevel: number; time: number; count: number }[] = [];
  for (let i = 0; i < buckets.length; i++) {
    if (buckets[i].count === 0) continue;
    const avg = buckets[i].sum / buckets[i].count;
    const time = i * bucketSize + bucketSize / 2;
    avgPoints.push({
      x: PX + (time / maxTime) * (PR - PX),
      y: PY + (1 - avg / maxLevel) * (PB - PY),
      avgLevel: avg,
      time: i * bucketSize,
      count: buckets[i].count,
    });
  }

  const curvePath = avgPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const yLabels = [0, Math.round(maxLevel / 4), Math.round(maxLevel / 2), Math.round((maxLevel * 3) / 4), maxLevel];
  const xLabels = [0, Math.round(maxTime / 4), Math.round(maxTime / 2), Math.round((maxTime * 3) / 4), maxTime];

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (avgPoints.length === 0) return;
      const mx = svgX(e, svgRef.current);
      let closest = 0;
      let closestD = Infinity;
      for (let i = 0; i < avgPoints.length; i++) {
        const d = Math.abs(mx - avgPoints[i].x);
        if (d < closestD) { closestD = d; closest = i; }
      }
      setHoverIdx(closest);
    },
    [avgPoints]
  );

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="none" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIdx(null)} style={{ cursor: "crosshair" }}>
      {yLabels.map((val) => {
        const y = PY + (1 - val / maxLevel) * (PB - PY);
        return (
          <g key={val}>
            <line x1={PX} y1={y} x2={PR} y2={y} stroke="#27272a" strokeWidth={1} />
            <text x={PX - 6} y={y + 4} textAnchor="end" fill="#71717a" fontSize={10}>Lv{val}</text>
          </g>
        );
      })}
      {xLabels.map((val) => {
        const x = PX + (val / maxTime) * (PR - PX);
        return <text key={val} x={x} y={H - 4} textAnchor="middle" fill="#71717a" fontSize={10}>{val}m</text>;
      })}
      {players.map((p, i) => {
        const x = PX + (p.gameplay_time / maxTime) * (PR - PX);
        const y = PY + (1 - p.level_reached / maxLevel) * (PB - PY);
        return <circle key={i} cx={x} cy={y} r={2.5} fill="#f59e0b" opacity={0.12} />;
      })}
      <path d={curvePath} fill="none" stroke="#f59e0b" strokeWidth={3} />
      {avgPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={4} fill="#f59e0b" />)}
      {hoverIdx !== null && avgPoints[hoverIdx] && (() => {
        const hp = avgPoints[hoverIdx];
        const left = hp.x > W * 0.65;
        const tx = left ? hp.x - 155 : hp.x + 14;
        return (
          <g>
            <line x1={hp.x} y1={PY} x2={hp.x} y2={PB} stroke="#71717a" strokeWidth={1} strokeDasharray="3 2" opacity={0.5} />
            <circle cx={hp.x} cy={hp.y} r={7} fill="#f59e0b" opacity={0.3} />
            <circle cx={hp.x} cy={hp.y} r={4.5} fill="#f59e0b" />
            <rect x={tx} y={hp.y - 38} width={140} height={54} rx={4} fill="#1a1625" stroke="#2d2640" opacity={0.95} />
            <text x={tx + 8} y={hp.y - 20} fill="#9892a6" fontSize={10} fontWeight={600}>
              {hp.time}–{hp.time + bucketSize} min
            </text>
            <text x={tx + 8} y={hp.y - 4} fill="#e4e0ed" fontSize={11}>
              Avg Lv {hp.avgLevel.toFixed(1)} ({hp.count} players)
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

// ── Gameplay Duration Bar Chart ──────────────────────────────────────

function GameplayBucketChart({ players }: { players: Player[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [useLog, setUseLog] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);

  if (players.length < 2)
    return <div className="flex h-full items-center justify-center text-sm text-zinc-500">Not enough data.</div>;

  const bucketSize = 15;
  const maxTime = Math.max(...players.map((p) => p.gameplay_time));
  const bucketCount = Math.ceil(maxTime / bucketSize) + 1;
  const buckets: number[] = Array(bucketCount).fill(0);
  for (const p of players) {
    const idx = Math.min(Math.floor(p.gameplay_time / bucketSize), bucketCount - 1);
    buckets[idx]++;
  }

  let lastNonZero = buckets.length - 1;
  while (lastNonZero > 0 && buckets[lastNonZero] === 0) lastNonZero--;
  const shown = buckets.slice(0, lastNonZero + 1);
  const maxCount = Math.max(...shown, 1);

  const barW = Math.min((PR - PX) / shown.length - 1, 16);
  const totalW = shown.length * (barW + 1);
  const startX = PX + ((PR - PX) - totalW) / 2;

  const bucketLevelSum: number[] = Array(shown.length).fill(0);
  const bucketLevelCount: number[] = Array(shown.length).fill(0);
  for (const p of players) {
    const idx = Math.min(Math.floor(p.gameplay_time / bucketSize), shown.length - 1);
    if (idx < shown.length) {
      bucketLevelSum[idx] += p.level_reached;
      bucketLevelCount[idx]++;
    }
  }
  const maxLevel = Math.max(...players.map((p) => p.level_reached), 1);
  const bucketAvgLevel = bucketLevelSum.map((sum, i) => (bucketLevelCount[i] > 0 ? sum / bucketLevelCount[i] : 0));
  const yLabels = yAxisLabels(maxCount, useLog);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const mx = svgX(e, svgRef.current);
      const idx = Math.floor((mx - startX) / (barW + 1));
      if (idx >= 0 && idx < shown.length) setHoverIdx(idx);
      else setHoverIdx(null);
    },
    [shown.length, startX, barW]
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-end mb-2">
        <ScaleToggle useLog={useLog} setUseLog={setUseLog} />
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="flex-1 w-full" preserveAspectRatio="none" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIdx(null)} style={{ cursor: "crosshair" }}>
        {yLabels.map((val) => {
          const y = valToY(val, maxCount, useLog);
          return (
            <g key={val}>
              <line x1={PX} y1={y} x2={PR} y2={y} stroke="#27272a" strokeWidth={1} />
              <text x={PX - 6} y={y + 4} textAnchor="end" fill="#71717a" fontSize={10}>{val}</text>
            </g>
          );
        })}
        {shown.map((count, i) => {
          const x = startX + i * (barW + 1);
          const yTop = valToY(count, maxCount, useLog);
          const yBot = valToY(0, maxCount, useLog);
          const h = yBot - yTop;
          const levelPct = bucketAvgLevel[i] / maxLevel;
          const r = Math.round(245 - levelPct * 100);
          const g = Math.round(158 + levelPct * 90);
          const b = Math.round(11 + levelPct * 100);
          const isHovered = hoverIdx === i;
          return (
            <g key={i}>
              <rect x={x} y={yTop} width={barW} height={Math.max(h, 0)} rx={2} fill={`rgb(${r},${g},${b})`} opacity={isHovered ? 1 : 0.7} />
              {isHovered && <rect x={x} y={yTop} width={barW} height={Math.max(h, 0)} rx={2} fill="none" stroke="#fff" strokeWidth={1.5} />}
            </g>
          );
        })}
        {shown.map((_, i) => {
          const step = shown.length > 40 ? 4 : shown.length > 20 ? 2 : 1;
          if (i % step !== 0) return null;
          const x = startX + i * (barW + 1) + barW / 2;
          return <text key={i} x={x} y={H - 4} textAnchor="middle" fill="#71717a" fontSize={9}>{i * bucketSize}m</text>;
        })}
        {hoverIdx !== null && hoverIdx < shown.length && (() => {
          const cx = startX + hoverIdx * (barW + 1) + barW / 2;
          const left = hoverIdx > shown.length * 0.7;
          const tx = left ? cx - 155 : cx + 14;
          return (
            <g>
              <rect x={tx} y={PY + 4} width={145} height={54} rx={4} fill="#1a1625" stroke="#2d2640" opacity={0.95} />
              <text x={tx + 8} y={PY + 22} fill="#9892a6" fontSize={10} fontWeight={600}>
                {hoverIdx * bucketSize}–{(hoverIdx + 1) * bucketSize} min
              </text>
              <text x={tx + 8} y={PY + 40} fill="#e4e0ed" fontSize={11}>
                {shown[hoverIdx]} players (Avg Lv {bucketAvgLevel[hoverIdx].toFixed(1)})
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

// ── Level Distribution ───────────────────────────────────────────────

function LevelDistributionChart({ players }: { players: Player[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [useLog, setUseLog] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);

  if (players.length < 2)
    return <div className="flex h-full items-center justify-center text-sm text-zinc-500">Not enough data.</div>;

  const maxLevel = Math.max(...players.map((p) => p.level_reached));
  const levelCounts: number[] = Array(maxLevel + 1).fill(0);
  for (const p of players) levelCounts[p.level_reached]++;
  const maxCount = Math.max(...levelCounts, 1);

  const barW = Math.min((PR - PX) / levelCounts.length - 0.5, 14);
  const totalW = levelCounts.length * (barW + 0.5);
  const startX = PX + ((PR - PX) - totalW) / 2;
  const yLabels = yAxisLabels(maxCount, useLog);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const mx = svgX(e, svgRef.current);
      const idx = Math.floor((mx - startX) / (barW + 0.5));
      if (idx >= 0 && idx < levelCounts.length) setHoverIdx(idx);
      else setHoverIdx(null);
    },
    [levelCounts.length, startX, barW]
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-end mb-2">
        <ScaleToggle useLog={useLog} setUseLog={setUseLog} />
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="flex-1 w-full" preserveAspectRatio="none" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIdx(null)} style={{ cursor: "crosshair" }}>
        {yLabels.map((val) => {
          const y = valToY(val, maxCount, useLog);
          return (
            <g key={val}>
              <line x1={PX} y1={y} x2={PR} y2={y} stroke="#27272a" strokeWidth={1} />
              <text x={PX - 6} y={y + 4} textAnchor="end" fill="#71717a" fontSize={10}>{val}</text>
            </g>
          );
        })}
        {levelCounts.map((count, i) => {
          const x = startX + i * (barW + 0.5);
          const yTop = valToY(count, maxCount, useLog);
          const yBot = valToY(0, maxCount, useLog);
          const h = yBot - yTop;
          const pct = i / Math.max(maxLevel, 1);
          const r = Math.round(139 + (1 - pct) * 50);
          const g = Math.round(92 - pct * 40);
          const b = 246;
          const isHovered = hoverIdx === i;
          return (
            <g key={i}>
              <rect x={x} y={yTop} width={barW} height={Math.max(h, 0)} rx={1.5} fill={`rgb(${r},${g},${b})`} opacity={isHovered ? 1 : 0.65} />
              {isHovered && <rect x={x} y={yTop} width={barW} height={Math.max(h, 0)} rx={1.5} fill="none" stroke="#fff" strokeWidth={1.5} />}
            </g>
          );
        })}
        {levelCounts.map((_, i) => {
          const step = levelCounts.length > 50 ? 10 : levelCounts.length > 25 ? 5 : levelCounts.length > 10 ? 2 : 1;
          if (i % step !== 0) return null;
          const x = startX + i * (barW + 0.5) + barW / 2;
          return <text key={i} x={x} y={H - 4} textAnchor="middle" fill="#71717a" fontSize={9}>Lv{i}</text>;
        })}
        {hoverIdx !== null && hoverIdx < levelCounts.length && (() => {
          const cx = startX + hoverIdx * (barW + 0.5) + barW / 2;
          const left = hoverIdx > levelCounts.length * 0.7;
          const tx = left ? cx - 140 : cx + 14;
          const pct = players.length > 0 ? ((levelCounts[hoverIdx] / players.length) * 100).toFixed(1) : "0";
          return (
            <g>
              <rect x={tx} y={PY + 4} width={130} height={54} rx={4} fill="#1a1625" stroke="#2d2640" opacity={0.95} />
              <text x={tx + 8} y={PY + 22} fill="#9892a6" fontSize={10} fontWeight={600}>
                Level {hoverIdx}
              </text>
              <text x={tx + 8} y={PY + 40} fill="#e4e0ed" fontSize={11}>
                {levelCounts[hoverIdx]} players ({pct}%)
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
