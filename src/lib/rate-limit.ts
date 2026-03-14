/** Simple cooldown tracker — prevents Supabase from being hit more than once per window. */

const COOLDOWN_MS = 60_000; // 60 seconds

const lastRefresh: Record<string, number> = {};

/**
 * Returns true if a refresh is allowed, false if still in cooldown.
 * Automatically records the timestamp when allowed.
 */
export function allowRefresh(key: string): boolean {
  const now = Date.now();
  const last = lastRefresh[key] ?? 0;
  if (now - last < COOLDOWN_MS) return false;
  lastRefresh[key] = now;
  return true;
}

/** Returns how many seconds remain in the cooldown, or 0 if ready. */
export function cooldownRemaining(key: string): number {
  const now = Date.now();
  const last = lastRefresh[key] ?? 0;
  const remaining = Math.max(0, COOLDOWN_MS - (now - last));
  return Math.ceil(remaining / 1000);
}
