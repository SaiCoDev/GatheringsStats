"use client";

import { useGameData } from "@/lib/useGameData";
import { Card, StatCard } from "@/components/Card";
import { DataStatus } from "@/components/DataStatus";
import { FeedbackTabs } from "./FeedbackTabs";
import { MessageSquare, Star, BarChart3, Bug, MessageCircle, Users } from "lucide-react";

export default function FeedbackPage() {
  const { data, loading, refreshing, refresh } = useGameData(["ratings", "feedback"]);

  if (loading) return <Loading />;
  if (!data) return null;

  const { ratings, feedback } = data;

  const byQuestion: Record<string, number[]> = {};
  for (const r of ratings) {
    const question = r.id.split("_").slice(1).join("_") || r.id;
    (byQuestion[question] ??= []).push(r.rating);
  }

  const questionStats = Object.entries(byQuestion).map(([q, vals]) => ({
    question: q.replace(/^On a scale of 1 to 5, /, ""),
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    count: vals.length,
    distribution: [1, 2, 3, 4, 5].map(
      (n) => vals.filter((v) => v === n).length
    ),
  }));

  const globalDist = [1, 2, 3, 4, 5].map(
    (n) => ratings.filter((r) => r.rating === n).length
  );
  const maxDist = Math.max(...globalDist, 1);

  const bugReports = feedback.filter((f) => f.type === "BUG_REPORT");
  const generalFeedback = feedback.filter((f) => f.type === "FEEDBACK");
  const uniqueRaters = new Set(ratings.map((r) => r.playerPfid)).size;
  const uniqueWriters = new Set(feedback.map((f) => f.player_pfid)).size;
  const avgOverall = ratings.length
    ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
    : "\u2014";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-amber-400" />
            <h1 className="text-3xl font-bold text-white">Feedback</h1>
          </div>
          <p className="mt-1 text-[#9892a6]">
            {ratings.length} ratings from {uniqueRaters} players &middot;{" "}
            {feedback.length} messages from {uniqueWriters} players
          </p>
        </div>
        <DataStatus onRefresh={refresh} refreshing={refreshing} cachedAt={data.cachedAt} />
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <StatCard label="Avg Rating" value={`${avgOverall} / 5`} icon={<Star className="h-5 w-5" />} />
        <StatCard label="Total Ratings" value={ratings.length} icon={<BarChart3 className="h-5 w-5" />} />
        <StatCard label="Bug Reports" value={bugReports.length} icon={<Bug className="h-5 w-5" />} />
        <StatCard label="Feedback" value={generalFeedback.length} icon={<MessageCircle className="h-5 w-5" />} />
        <StatCard label="Unique Players" value={uniqueRaters + uniqueWriters} icon={<Users className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          {/* Rating distribution */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#9892a6]">
                Rating Distribution
              </h2>
            </div>
            <div className="flex items-end gap-2 h-24">
              {globalDist.map((count, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t transition-all"
                    style={{
                      height: `${(count / maxDist) * 100}%`,
                      minHeight: count > 0 ? "4px" : "0",
                      background: "linear-gradient(180deg, #b45309, #d97706, #fbbf24)",
                    }}
                  />
                  <span className="text-xs text-[#9892a6]">{i + 1}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-[#6b6480]">
              <span>{ratings.length} total</span>
              <span>avg {avgOverall}</span>
            </div>
          </Card>

          {/* Per-question */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#9892a6]">
                By Question
              </h2>
            </div>
            <div className="space-y-3">
              {questionStats.map(({ question, avg, count, distribution }) => (
                <div key={question}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm text-[#e4e0ed] capitalize leading-tight">
                      {question}
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-amber-400">
                      {avg.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <div className="flex-1 h-1.5 rounded-full bg-[#1a1625]">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${(avg / 5) * 100}%`,
                          background: "linear-gradient(90deg, #b45309, #d97706, #fbbf24)",
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-[#6b6480] w-6 text-right">
                      {count}
                    </span>
                  </div>
                  <div className="mt-1 flex gap-0.5">
                    {distribution.map((c, j) => (
                      <div
                        key={j}
                        className="flex-1 text-center text-[10px] text-[#6b6480]"
                        title={`${j + 1} star: ${c} votes`}
                      >
                        {c > 0 ? c : "\u00B7"}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <FeedbackTabs
            bugReports={bugReports.map((b) => ({
              id: b.id,
              feedback: b.feedback,
              playerName: b.player_name,
              timestamp: extractTimestamp(b.id),
            }))}
            generalFeedback={generalFeedback.map((f) => ({
              id: f.id,
              feedback: f.feedback,
              playerName: f.player_name,
              timestamp: extractTimestamp(f.id),
            }))}
          />
        </div>
      </div>
    </div>
  );
}

function extractTimestamp(id: string): number | null {
  const parts = id.split("_");
  if (parts.length < 2) return null;
  const ts = parseInt(parts[parts.length - 1], 10);
  return isNaN(ts) ? null : ts;
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 animate-spin rounded-full border-2 spinner-enchanted" />
    </div>
  );
}
