"use client";

import { useState } from "react";
import { Search, Bug, MessageCircle, List } from "lucide-react";

interface FeedbackItem {
  id: string;
  feedback: string;
  playerName: string;
  timestamp: number | null;
}

export function FeedbackTabs({
  bugReports,
  generalFeedback,
}: {
  bugReports: FeedbackItem[];
  generalFeedback: FeedbackItem[];
}) {
  const [tab, setTab] = useState<"all" | "bugs" | "feedback">("all");
  const [search, setSearch] = useState("");

  const sortNewestFirst = <T extends { timestamp: number | null }>(items: T[]) =>
    [...items].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));

  const sortedBugReports = sortNewestFirst(bugReports);
  const sortedGeneralFeedback = sortNewestFirst(generalFeedback);
  const all = sortNewestFirst([
    ...sortedBugReports.map((b) => ({ ...b, type: "BUG_REPORT" as const })),
    ...sortedGeneralFeedback.map((f) => ({ ...f, type: "FEEDBACK" as const })),
  ]);

  const sourceMap = {
    all,
    bugs: sortedBugReports.map((b) => ({ ...b, type: "BUG_REPORT" as const })),
    feedback: sortedGeneralFeedback.map((f) => ({ ...f, type: "FEEDBACK" as const })),
  };

  const filtered = sourceMap[tab].filter(
    (item) =>
      !search ||
      item.feedback.toLowerCase().includes(search.toLowerCase()) ||
      item.playerName.toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { key: "all" as const, label: `All (${all.length})`, icon: List },
    { key: "bugs" as const, label: `Bugs (${bugReports.length})`, icon: Bug },
    { key: "feedback" as const, label: `Feedback (${generalFeedback.length})`, icon: MessageCircle },
  ];

  return (
    <div className="flex h-full flex-col rounded-xl border border-[#2d2640] bg-[#13111a]/70 backdrop-blur-sm">
      {/* Tab bar + search */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[#2d2640] px-4 py-3">
        <div className="flex gap-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-sm font-medium transition-all ${
                tab === key
                  ? "bg-amber-500/15 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                  : "text-[#9892a6] hover:bg-[#1a1625] hover:text-[#e4e0ed]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b6480]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="rounded-lg border border-[#2d2640] bg-[#0a0a0f] pl-8 pr-3 py-1 text-sm text-[#e4e0ed] placeholder-[#6b6480] outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: "600px" }}>
        {filtered.length === 0 ? (
          <p className="text-sm text-[#6b6480]">No results.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 rounded-lg border px-3 py-2 transition-colors ${
                  item.type === "BUG_REPORT"
                    ? "border-red-900/30 bg-red-950/10 hover:bg-red-950/20"
                    : "border-[#2d2640]/50 bg-[#1a1625]/30 hover:bg-[#1a1625]/60"
                }`}
              >
                <span
                  className={`mt-0.5 shrink-0 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                    item.type === "BUG_REPORT"
                      ? "bg-red-900/40 text-red-400"
                      : "bg-amber-500/15 text-amber-400"
                  }`}
                >
                  {item.type === "BUG_REPORT" ? (
                    <><Bug className="h-2.5 w-2.5" /> Bug</>
                  ) : (
                    <><MessageCircle className="h-2.5 w-2.5" /> FB</>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#e4e0ed] break-words">
                    {item.feedback}
                  </p>
                  <p className="mt-0.5 text-xs text-[#6b6480]">
                    {item.playerName}
                    {item.timestamp && (
                      <span className="ml-2 text-[#4a4460]">
                        {formatTimestamp(item.timestamp)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#2d2640] px-4 py-2 text-xs text-[#6b6480]">
        Showing {filtered.length} of {all.length} entries
      </div>
    </div>
  );
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
