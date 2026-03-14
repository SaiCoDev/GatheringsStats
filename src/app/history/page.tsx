"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, StatCard } from "@/components/Card";
import { ErrorBox } from "@/components/ErrorBox";

type Snapshot = {
  id: string;
  captured_at: string;
  data: Record<string, unknown>;
};

export default function HistoryPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selected, setSelected] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [snapshotting, setSnapshotting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/history?limit=50");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch history");
      setSnapshots(json.snapshots ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  async function takeSnapshot() {
    setSnapshotting(true);
    setError(null);
    try {
      const res = await fetch("/api/snapshot", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Snapshot failed");
      await fetchHistory();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSnapshotting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Optics History</h1>
          <p className="mt-1 text-zinc-400">
            Snapshots are captured automatically every 15 minutes
          </p>
        </div>
        <button
          onClick={takeSnapshot}
          disabled={snapshotting}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {snapshotting ? "Capturing..." : "Capture Now"}
        </button>
      </div>

      {error && <ErrorBox message={error} />}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Snapshots" value={snapshots.length} />
        <StatCard
          label="Oldest"
          value={
            snapshots.length > 0
              ? new Date(snapshots[snapshots.length - 1].captured_at).toLocaleDateString()
              : "—"
          }
        />
        <StatCard
          label="Latest"
          value={
            snapshots.length > 0
              ? new Date(snapshots[0].captured_at).toLocaleTimeString()
              : "—"
          }
          sub={
            snapshots.length > 0
              ? new Date(snapshots[0].captured_at).toLocaleDateString()
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Snapshot list */}
        <div className="lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Snapshots
          </h2>
          {loading ? (
            <p className="text-sm text-zinc-500">Loading...</p>
          ) : snapshots.length === 0 ? (
            <Card>
              <p className="text-sm text-zinc-400">
                No snapshots yet. Click &quot;Capture Now&quot; to take the first one.
              </p>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {snapshots.map((snap) => (
                <button
                  key={snap.id}
                  onClick={() => setSelected(snap)}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                    selected?.id === snap.id
                      ? "border-emerald-600 bg-emerald-900/20"
                      : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"
                  }`}
                >
                  <div className="text-sm font-medium text-white">
                    {new Date(snap.captured_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-400">
                    {new Date(snap.captured_at).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Snapshot detail */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            {selected
              ? `Snapshot — ${new Date(selected.captured_at).toLocaleString("en-US")}`
              : "Detail"}
          </h2>
          {selected ? (
            <pre className="max-h-[70vh] overflow-auto rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-xs text-emerald-400">
              {JSON.stringify(selected.data, null, 2)}
            </pre>
          ) : (
            <Card>
              <p className="text-sm text-zinc-400">
                Select a snapshot from the list to view its data.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
