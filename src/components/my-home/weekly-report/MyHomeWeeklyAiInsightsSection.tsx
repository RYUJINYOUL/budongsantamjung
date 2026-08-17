'use client';

import type { MyHomeWeeklyHighlights } from '../../../lib/myHomeTypes';
import {
  aiBriefLatestJeonseText,
  aiBriefLatestSaleText,
  aiBriefNewTradesText,
  aiBriefPriceChangeText,
  aiBriefRebLines,
} from '../../../lib/myHomeWeeklyAiBrief';
import {
  myHomeWeeklyReportComplexLabel,
  orderedWeeklyHighlightItems,
  sharedWeeklyHighlights,
} from '../../../lib/myHomeWeeklyReportUtils';
import MyHomeWeeklyReportCard from './MyHomeWeeklyReportCard';

type Props = {
  weeklyHighlights?: MyHomeWeeklyHighlights | null;
  homeComplexName?: string | null;
  compareComplexNames?: string[];
  summaryLines?: string[];
  skippedAi?: boolean;
};

function InsightBlock({ title, lines }: { title: string; lines: { label: string; body: string }[] }) {
  return (
    <MyHomeWeeklyReportCard>
      <h3 className="text-sm font-black text-slate-900">{title}</h3>
      <div className="mt-2.5 space-y-2">
        {lines.map((line, i) => (
          <div key={`${title}-${i}`} className="flex gap-3 items-start">
            {line.label ? (
              <span className="w-[88px] shrink-0 text-xs font-extrabold text-slate-500 leading-snug">
                {line.label}
              </span>
            ) : null}
            <p className="text-[13px] font-semibold text-slate-900 leading-relaxed flex-1">{line.body}</p>
          </div>
        ))}
      </div>
    </MyHomeWeeklyReportCard>
  );
}

function LegacyFallback({ summaryLines, skippedAi }: { summaryLines: string[]; skippedAi: boolean }) {
  if (summaryLines.length === 0) {
    return (
      <MyHomeWeeklyReportCard>
        <p className="text-sm font-semibold text-slate-500 leading-relaxed">
          {skippedAi ? '이번 주 변동이 없어요.' : '표시할 분석 데이터가 없어요.'}
        </p>
      </MyHomeWeeklyReportCard>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-[11px] font-extrabold text-slate-500 tracking-wide">AI 핵심 요약</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      <MyHomeWeeklyReportCard accent className="border-emerald-300/50">
        <div className="space-y-3">
          {summaryLines.map((line, i) => (
            <div
              key={i}
              className="flex gap-2.5 items-start rounded-xl border border-emerald-100 bg-white/80 px-3 py-2.5"
            >
              <span className="w-[22px] h-[22px] shrink-0 rounded-md bg-emerald-100 text-emerald-600 text-xs font-black flex items-center justify-center">
                {i + 1}
              </span>
              <p className="text-sm font-semibold text-slate-900 leading-relaxed">{line}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
          가격·전세·상승률은 부동산원·공공데이터 기준으로 매주 갱신됩니다.
        </p>
      </MyHomeWeeklyReportCard>
    </div>
  );
}

export default function MyHomeWeeklyAiInsightsSection({
  weeklyHighlights,
  homeComplexName,
  compareComplexNames = [],
  summaryLines = [],
  skippedAi = false,
}: Props) {
  if (!weeklyHighlights) {
    return <LegacyFallback summaryLines={summaryLines} skippedAi={skippedAi} />;
  }

  const items = orderedWeeklyHighlightItems(weeklyHighlights);
  if (items.length === 0) {
    return <LegacyFallback summaryLines={summaryLines} skippedAi={skippedAi} />;
  }

  const shared = sharedWeeklyHighlights(weeklyHighlights);
  const rows = items.map((item, i) => ({
    label: myHomeWeeklyReportComplexLabel({
      complexName: item.complexName?.toString(),
      homeComplexName,
      compareComplexNames,
      index: i,
      isHome: item.role?.toString() === 'myHome',
    }),
    item,
  }));

  const rebLines = aiBriefRebLines(shared);

  return (
    <div className="space-y-3">
      <InsightBlock
        title="1. 최근 거래"
        lines={rows.map((row) => ({ label: row.label, body: aiBriefLatestSaleText(row.item) }))}
      />
      <InsightBlock
        title="2. 최근 전세"
        lines={rows.map((row) => ({ label: row.label, body: aiBriefLatestJeonseText(row.item) }))}
      />
      <InsightBlock
        title="3. 매매 변동"
        lines={rows.map((row) => ({ label: row.label, body: aiBriefPriceChangeText(row.item) }))}
      />
      <InsightBlock
        title="4. 이번 주 거래"
        lines={rows.map((row) => ({ label: row.label, body: aiBriefNewTradesText(row.item) }))}
      />
      <InsightBlock
        title="5. 부동산원"
        lines={rebLines.map((body) => ({ label: '', body }))}
      />
    </div>
  );
}
