'use client';

import { ExternalLink, Search } from 'lucide-react';
import type { MyHomeWeeklyHighlights } from '../../../lib/myHomeTypes';
import {
  formatPolicyNews,
  hasHosaeScopeFallback,
  humanLatestJeonseText,
  humanLatestSaleText,
  humanMortgageText,
  humanNewTradesText,
  humanPriceChangeText,
  humanRebHasScopeFallback,
  humanRebText,
  isScopeFallbackText,
  parseHosaeItems,
  type HosaeDisplayItem,
} from '../../../lib/myHomeWeeklyHumanSummary';
import {
  myHomeWeeklyReportComplexLabel,
  orderedWeeklyHighlightItems,
  sharedWeeklyHighlights,
} from '../../../lib/myHomeWeeklyReportUtils';
import MyHomeWeeklyReportCard from './MyHomeWeeklyReportCard';

type Props = {
  weeklyHighlights: MyHomeWeeklyHighlights;
  homeComplexName?: string | null;
  compareComplexNames?: string[];
  itemIndex?: number;
};

type WeeklyMetric = {
  label: string;
  value?: string;
  scopeFallback?: boolean;
  hosaeItems?: HosaeDisplayItem[];
  hosaeScopeHeader?: string | null;
  hosaeExtraCount?: number;
};

function metricIsEmpty(metric: WeeklyMetric): boolean {
  if (metric.hosaeItems) return metric.hosaeItems.length === 0;
  const text = metric.value ?? '—';
  if (isScopeFallbackText(text)) return false;
  if (text.includes('대비 변동 없')) return false;
  if (
    text.startsWith('최근 거래는') ||
    text.startsWith('최근 전세는') ||
    text.startsWith('매매 변동은') ||
    text.startsWith('이번 주 거래는') ||
    text.startsWith('부동산원') ||
    text.startsWith('시세 ') ||
    text.startsWith('해당 주택은')
  ) {
    return false;
  }
  return (
    text === '—' ||
    text === '0건' ||
    text === '데이터 없음' ||
    text === '이번 주 신규 매매 없음' ||
    text === '이번 주 신규 전세 없음' ||
    text === '이번 주 발표 없음' ||
    text === '직전 대비 변동 없음'
  );
}

function hosaeSearchUrl(item: Record<string, unknown>): string {
  const title =
    item.canonicalName?.toString().trim() ||
    item.title?.toString().trim() ||
    item.ui_label?.toString().trim() ||
    '부동산 호재';
  return `https://www.google.com/search?q=${encodeURIComponent(title)}`;
}

function hosaeDirectUrl(item: Record<string, unknown>): string | null {
  const url = item.url?.toString().trim() || item.link?.toString().trim();
  return url || null;
}

function HosaeTile({ item }: { item: HosaeDisplayItem }) {
  const directUrl = hosaeDirectUrl(item.source);
  const href = directUrl || hosaeSearchUrl(item.source);
  const isDirect = !!directUrl;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-emerald-200/60 bg-slate-50 px-2.5 py-2 hover:bg-emerald-50/50 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-extrabold text-emerald-600">{item.typeLabel}</span>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
          {isDirect ? <ExternalLink className="w-3 h-3" /> : <Search className="w-3 h-3" />}
          {isDirect ? '기사 보기' : '검색으로 보기'}
        </span>
      </div>
      {item.metaLine ? (
        <p className="mt-1.5 text-xs font-semibold text-slate-500 leading-snug">{item.metaLine}</p>
      ) : null}
      <p className="mt-1.5 text-sm font-bold text-slate-900 leading-snug underline decoration-emerald-300/60">
        {item.titleLine}
      </p>
    </a>
  );
}

function MetricCard({
  metric,
  isHome,
}: {
  metric: WeeklyMetric;
  isHome: boolean;
}) {
  const empty = metricIsEmpty(metric);
  const highlight = !empty;
  const isFallback =
    metric.scopeFallback ||
    (metric.value != null && isScopeFallbackText(metric.value));

  return (
    <MyHomeWeeklyReportCard
      className={`p-3.5 ${
        highlight && isHome
          ? 'bg-emerald-50/30'
          : highlight && !isHome
            ? 'bg-slate-50'
            : isFallback
              ? 'bg-slate-50'
              : ''
      }`}
    >
      <p className={`text-xs font-extrabold ${isHome ? 'text-emerald-600' : 'text-slate-500'}`}>
        {metric.label}
      </p>
      <div className="mt-1.5">
        {metric.hosaeItems ? (
          metric.hosaeItems.length === 0 ? (
            <p className="text-sm font-medium text-slate-400">이번 주 신규 없음</p>
          ) : (
            <div className="space-y-2">
              {metric.hosaeScopeHeader ? (
                <p className="text-[13px] font-bold text-slate-500">{metric.hosaeScopeHeader}</p>
              ) : null}
              {metric.hosaeItems.map((item, i) => (
                <HosaeTile key={i} item={item} />
              ))}
              {(metric.hosaeExtraCount ?? 0) > 0 ? (
                <p className="text-[13px] font-semibold text-slate-500">
                  외 {metric.hosaeExtraCount}건
                </p>
              ) : null}
            </div>
          )
        ) : (
          <p
            className={`text-sm leading-relaxed whitespace-pre-line ${
              empty ? 'font-medium text-slate-400' : 'font-bold text-slate-900'
            }`}
          >
            {metric.value ?? '—'}
          </p>
        )}
      </div>
    </MyHomeWeeklyReportCard>
  );
}

function metricsForItem(
  item: Record<string, unknown>,
  shared: Record<string, unknown>,
): WeeklyMetric[] {
  const hosaeParsed = parseHosaeItems(shared);

  return [
    { label: '최근 거래', value: humanLatestSaleText(item) },
    { label: '최근 전세', value: humanLatestJeonseText(item) },
    { label: '매매 변동', value: humanPriceChangeText(item) },
    { label: '이번 주 거래', value: humanNewTradesText(item) },
    {
      label: '부동산원',
      value: humanRebText(item, shared),
      scopeFallback: humanRebHasScopeFallback(shared),
    },
    { label: '금리·대출', value: humanMortgageText(item, shared) },
    {
      label: '신규 호재',
      hosaeItems: hosaeParsed.items,
      hosaeScopeHeader: hosaeParsed.scopeHeader,
      hosaeExtraCount: hosaeParsed.extraCount,
      scopeFallback: hasHosaeScopeFallback(shared),
    },
    { label: '정책 뉴스', value: formatPolicyNews(shared) },
  ];
}

export default function MyHomeWeeklyHighlightsSection({
  weeklyHighlights,
  homeComplexName,
  compareComplexNames = [],
  itemIndex,
}: Props) {
  const items = orderedWeeklyHighlightItems(weeklyHighlights);
  if (items.length === 0) return null;

  const shared = sharedWeeklyHighlights(weeklyHighlights);
  const indices =
    itemIndex != null ? [itemIndex] : items.map((_, i) => i);

  return (
    <div className="space-y-4">
      {indices.map((idx, n) => {
        if (idx < 0 || idx >= items.length) return null;
        const item = items[idx];
        const isHome = item.role?.toString() === 'myHome';
        const title = myHomeWeeklyReportComplexLabel({
          complexName: item.complexName?.toString(),
          homeComplexName,
          compareComplexNames,
          index: idx,
          isHome,
        });
        const metrics = metricsForItem(item, shared);

        return (
          <div key={idx} className={n > 0 ? 'pt-2' : ''}>
            <MyHomeWeeklyReportCard accent={isHome} className="mb-2">
              <div className="flex items-center gap-3">
                <span
                  className={`w-7 h-7 shrink-0 rounded-lg text-white text-[13px] font-black flex items-center justify-center shadow-sm ${
                    isHome ? 'bg-emerald-500' : 'bg-slate-600'
                  }`}
                >
                  {idx + 1}
                </span>
                <h2 className="flex-1 text-lg font-black text-slate-900 tracking-tight leading-tight">
                  {title}
                </h2>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black border ${
                    isHome
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {isHome ? '우리집' : '비교 아파트'}
                </span>
              </div>
            </MyHomeWeeklyReportCard>

            <div className="space-y-2">
              {metrics.map((metric) => (
                <MetricCard key={metric.label} metric={metric} isHome={isHome} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
