"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const POLL_INTERVAL = 10_000; // 10s

export interface OnlinePlayer {
  pfid: string;
  name: string | null;
}

export function useOnlineCount() {
  const [online, setOnline] = useState<number | null>(null);
  const [players, setPlayers] = useState<OnlinePlayer[]>([]);
  const [flash, setFlash] = useState(false);
  const prevRef = useRef<number | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/online-count");
      if (!res.ok) return;
      const json = await res.json();
      const count = json.online ?? 0;

      if (prevRef.current !== null && count !== prevRef.current) {
        setFlash(true);
        setTimeout(() => setFlash(false), 1500);
      }
      prevRef.current = count;
      setOnline(count);
      setPlayers(json.players ?? []);
    } catch {
      // Silent — will retry next poll
    }
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetch_]);

  return { online, players, flash };
}
