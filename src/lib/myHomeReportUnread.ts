/** Flutter `MyHomeReportUnreadService` — localStorage 기반 */

const LAST_SEEN_WEEK_KEY = 'my_home_last_seen_week_key_v1';
const LAST_SEEN_CREATED_AT_MS = 'my_home_last_seen_created_at_ms_v1';

export const MY_HOME_REPORT_SEEN_EVENT = 'my-home-report-seen';

export function loadLastSeenWeekKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_SEEN_WEEK_KEY);
}

export function loadLastSeenCreatedAtMs(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(LAST_SEEN_CREATED_AT_MS) ?? '0', 10) || 0;
}

export function saveLastSeen(weekKey: string, createdAtMs: number): void {
  const key = weekKey.trim();
  if (!key || typeof window === 'undefined') return;
  localStorage.setItem(LAST_SEEN_WEEK_KEY, key);
  localStorage.setItem(LAST_SEEN_CREATED_AT_MS, String(createdAtMs || 0));
  window.dispatchEvent(new Event(MY_HOME_REPORT_SEEN_EVENT));
}

export function hasUnreadReport(latest: {
  weekKey: string;
  createdAtMs: number;
}): boolean {
  const seenAtMs = loadLastSeenCreatedAtMs();
  if (latest.createdAtMs > 0 && seenAtMs > 0) {
    return latest.createdAtMs > seenAtMs;
  }
  const seenKey = loadLastSeenWeekKey();
  return seenKey !== latest.weekKey;
}
