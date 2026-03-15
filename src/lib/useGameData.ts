"use client";

import { useCallback, useEffect, useState } from "react";
import type { GameData } from "./cache";

export function useGameData() {
  const [data, setData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/game-data");
      if (!res.ok) throw new Error("Failed to fetch data");
      const json: GameData = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh: trigger a new snapshot capture, then reload data
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const snapRes = await fetch("/api/game-data-snapshot", { method: "POST" });
      if (!snapRes.ok) throw new Error("Failed to sync data from game server");
      // Now fetch the freshly saved snapshot
      const res = await fetch("/api/game-data?refresh=1");
      if (!res.ok) throw new Error("Failed to fetch data");
      const json: GameData = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setRefreshing(false);
    }
  }, []);

  return { data, loading, refreshing, error, refresh };
}
