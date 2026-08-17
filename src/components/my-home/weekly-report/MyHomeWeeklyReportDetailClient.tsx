'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { fetchMyHomeWeeklyReport } from '../../../lib/myHomeFirestore';
import type { MyHomeWeeklyReport } from '../../../lib/myHomeTypes';
import {
  formatMyHomeWeeklyReportWeekTitle,
  myHomeWeeklyReportComplexLabel,
} from '../../../lib/myHomeWeeklyReportUtils';
import { useMyHomeReportUnread } from '../../../hooks/useMyHomeReportUnread';
import SideNav from '../../SideNav';
import { PAGE_HEADER_TITLE, PAGE_STICKY_HEADER } from '../../analyzePanelFormStyles';
import MyHomeWeeklyAiInsightsSection from './MyHomeWeeklyAiInsightsSection';
import MyHomeWeeklyHighlightsSection from './MyHomeWeeklyHighlightsSection';

type ReportTabKind = 'ai' | 'home' | 'compare';

type ReportTabSpec = {
  label: string;
  kind: ReportTabKind;
  itemIndex?: number;
};

function buildTabSpecs(report: MyHomeWeeklyReport): ReportTabSpec[] {
  const tabs: ReportTabSpec[] = [{ label: 'AI분석', kind: 'ai' }];

  if (report.weeklyHighlights) {
    tabs.push({
      label: myHomeWeeklyReportComplexLabel({
        homeComplexName: report.homeComplexName,
        index: 0,
        isHome: true,
      }),
      kind: 'home',
      itemIndex: 0,
    });

    const compareCount = report.compareComplexNames.length;
    if (compareCount >= 1) {
      tabs.push({
        label: myHomeWeeklyReportComplexLabel({
          compareComplexNames: report.compareComplexNames,
          index: 1,
          isHome: false,
        }),
        kind: 'compare',
        itemIndex: 1,
      });
    }
    if (compareCount >= 2) {
      tabs.push({
        label: myHomeWeeklyReportComplexLabel({
          compareComplexNames: report.compareComplexNames,
          index: 2,
          isHome: false,
        }),
        kind: 'compare',
        itemIndex: 2,
      });
    }
  }

  return tabs;
}

function MessageBox({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex-1 flex items-center justify-center px-8 py-12">
      <div className="text-center space-y-2">
        <p className="text-base font-black text-slate-900">{title}</p>
        <p className="text-[13px] text-slate-500 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function TabbedBody({ report }: { report: MyHomeWeeklyReport }) {
  const tabs = useMemo(() => buildTabSpecs(report), [report]);
  const [activeTab, setActiveTab] = useState(0);

  const activeSpec = tabs[activeTab] ?? tabs[0];

  const tabContent = (() => {
    if (!activeSpec) return null;

    if (activeSpec.kind === 'ai') {
      return (
        <MyHomeWeeklyAiInsightsSection
          weeklyHighlights={report.weeklyHighlights}
          homeComplexName={report.homeComplexName}
          compareComplexNames={report.compareComplexNames}
          summaryLines={report.summaryLines}
          skippedAi={report.skippedAi}
        />
      );
    }

    if (!report.weeklyHighlights || activeSpec.itemIndex == null) {
      return (
        <p className="text-center text-[13px] font-semibold text-slate-500 py-12">
          표시할 데이터가 없어요
        </p>
      );
    }

    return (
      <MyHomeWeeklyHighlightsSection
        weeklyHighlights={report.weeklyHighlights}
        homeComplexName={report.homeComplexName}
        compareComplexNames={report.compareComplexNames}
        itemIndex={activeSpec.itemIndex}
      />
    );
  })();

  if (tabs.length === 1) {
    return <div className="px-4 lg:px-6 pb-10">{tabContent}</div>;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 lg:px-6 pt-2 shrink-0">
        <div
          className={`rounded-xl border border-slate-200 bg-white p-1 flex gap-1 ${
            tabs.length > 3 ? 'overflow-x-auto' : ''
          }`}
        >
          {tabs.map((tab, i) => (
            <button
              key={`${tab.kind}-${tab.itemIndex ?? 'ai'}`}
              type="button"
              onClick={() => setActiveTab(i)}
              className={`h-9 rounded-lg text-[13px] font-bold transition-colors whitespace-nowrap ${
                tabs.length > 3 ? 'px-3 shrink-0' : 'flex-1'
              } ${
                activeTab === i
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-3 pb-10">{tabContent}</div>
    </div>
  );
}

export default function MyHomeWeeklyReportDetailClient({ weekKey }: { weekKey: string }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [report, setReport] = useState<MyHomeWeeklyReport | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) router.replace(`/login?redirect=/my-home/reports/${encodeURIComponent(weekKey)}`);
    });
    return () => unsub();
  }, [router, weekKey]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    void (async () => {
      setError(null);
      setReport(undefined);
      try {
        const data = await fetchMyHomeWeeklyReport(user.uid, weekKey);
        if (!cancelled) setReport(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '불러오기 실패');
          setReport(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, weekKey]);

  const { markSeen } = useMyHomeReportUnread(user?.uid);

  useEffect(() => {
    if (!report || report === null) return;
    void markSeen(report.weekKey, report.createdAtMs);
  }, [report, markSeen]);

  const appBarTitle =
    report && report !== null ? formatMyHomeWeeklyReportWeekTitle(report) : '주간 리포트';

  if (authLoading || report === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="detective-bg min-h-screen text-slate-900 relative">
      <SideNav />

      <div className="relative z-10 w-full min-h-screen lg:pl-16 flex flex-col">
        <header className={PAGE_STICKY_HEADER}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 shrink-0 lg:hidden" aria-hidden="true" />
            <Link
              href="/my-home"
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="우리집으로 돌아가기"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </Link>
            <h1 className={`${PAGE_HEADER_TITLE} truncate flex-1 min-w-0`}>{appBarTitle}</h1>
          </div>
        </header>

        {error ? (
          <MessageBox title="불러오기 실패" body={error} />
        ) : report === null ? (
          <MessageBox title="리포트를 찾을 수 없어요" body={`주차 키: ${weekKey}`} />
        ) : (
          <TabbedBody report={report} />
        )}
      </div>
    </div>
  );
}
