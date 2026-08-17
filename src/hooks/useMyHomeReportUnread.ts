'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchMyHomeWeeklyReports } from '../lib/myHomeFirestore';
import {
  hasUnreadReport,
  MY_HOME_REPORT_SEEN_EVENT,
  saveLastSeen,
} from '../lib/myHomeReportUnread';

export function useMyHomeReportUnread(uid: string | null | undefined) {
  const [hasUnread, setHasUnread] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!uid) {
      setHasUnread(false);
      return;
    }
    setLoading(true);
    try {
      const reports = await fetchMyHomeWeeklyReports(uid, 1);
      if (reports.length === 0) {
        setHasUnread(false);
        return;
      }
      setHasUnread(hasUnreadReport(reports[0]));
    } catch {
      setHasUnread(false);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  const markSeen = useCallback(async (weekKey: string, createdAtMs?: number) => {
    let atMs = createdAtMs ?? 0;
    if (atMs <= 0 && uid) {
      const report = (await fetchMyHomeWeeklyReports(uid, 12)).find((r) => r.weekKey === weekKey);
      atMs = report?.createdAtMs ?? 0;
    }
    saveLastSeen(weekKey, atMs);
    setHasUnread(false);
  }, [uid]);

  const markLatestSeen = useCallback(async () => {
    if (!uid) return;
    const reports = await fetchMyHomeWeeklyReports(uid, 1);
    if (reports.length === 0) {
      setHasUnread(false);
      return;
    }
    const latest = reports[0];
    saveLastSeen(latest.weekKey, latest.createdAtMs);
    setHasUnread(false);
  }, [uid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onSeen = () => void refresh();
    window.addEventListener(MY_HOME_REPORT_SEEN_EVENT, onSeen);
    return () => window.removeEventListener(MY_HOME_REPORT_SEEN_EVENT, onSeen);
  }, [refresh]);

  return { hasUnread, loading, refresh, markSeen, markLatestSeen };
}
