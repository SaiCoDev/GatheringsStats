"use client";

import { useCallback, useEffect, useState } from "react";
import type { GameData } from "./cache";

type GameDataField = "players" | "market" | "ratings" | "feedback" | "cycles" | "leaderboards";

/**
 * Fetch game data from the snapshot API.
 * Pass `fields` to only fetch specific data (reduces payload size).
 */
export function useGameData(fields?: GameDataField[]) {
  const [data, setData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fieldsQuery = fields ? `?fields=${fields.join(",")}` : "";

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/game-data${fieldsQuery}`);
      if (!res.ok) throw new Error("Failed to fetch data");
      const json: GameData = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [fieldsQuery]);

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
      const refreshQuery = fieldsQuery ? `${fieldsQuery}&refresh=1` : "?refresh=1";
      const res = await fetch(`/api/game-data${refreshQuery}`);
      if (!res.ok) throw new Error("Failed to fetch data");
      const json: GameData = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setRefreshing(false);
    }
  }, [fieldsQuery]);

  return { data, loading, refreshing, error, refresh };
}
