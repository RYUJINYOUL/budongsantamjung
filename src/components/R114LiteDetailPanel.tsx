'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { makeAnalyzeSlug } from '../lib/slug';
import {
  fetchR114LiteComplexWithTrades,
  fetchR114LiteTradesPage,
  formatExclusiveRange,
  formatMoveIn,
  formatPriceMan,
  formatSupplyRange,
  formatWolse,
  LITE_LOAD_MORE_TRADE_LIMIT,
} from '../lib/r114LiteApi';
import type {
  R114LiteDetailResponse,
  R114LitePyeongAreaStats,
  R114LitePyeongType,
  R114LiteTrade,
  R114TradeType,
} from '../lib/r114LiteTypes';
import type { ApartmentDealMode } from '../lib/apartmentDiscoverFilters';
import {
  buildLiteDetailStatsDisplay,
  isLiteModeSparse,
} from '../lib/r114LiteCardDisplay';
import {
  buildTradeChartSeries,
  computeJeonseRatioPct,
  filterTradesByPyeong,
  formatAvgPrice1mEok,
  formatContractDateShort,
  formatJeonseRatioPct,
  formatRiseRate6m,
  moveInAgeYears,
} from '../lib/r114LiteTrades';
import R114LiteTradeChart from './R114LiteTradeChart';
import MacroContextCharts from './MacroContextCharts';
import { liteMacroSectionBadge, parseMoveInYear, resolveLiteRepresentativeAreaM2 } from '@/lib/r114LiteTrades';
import ApartmentAreaPickModal, { type ApartmentComparePickPayload } from './ApartmentAreaPickModal';
import { R114LiteRegionSection, R114LiteSchoolCard } from './R114LiteContextSection';
import { useR114LiteContext } from '../hooks/useR114LiteContext';
import ListingRequestSheet, { ListingRequestTrigger } from './ListingRequestSheet';
import { formatBudgetManLabel, type ListingRequestContext } from '../lib/listingRequest';

const TRADE_TABS: { key: R114TradeType; label: string }[] = [
  { key: 'sale', label: '매매' },
  { key: 'jeonse', label: '전세' },
  { key: 'wolse', label: '월세' },
];

const TRADE_PREVIEW = 5;

export type R114LitePanelActions = {
  analyzeLabel: string;
  analyzeHref?: string;
  onAnalyze?: () => void;
  onCompare: () => void;
};

const outlineActionBtnClass = (theme: Theme) =>
  theme === 'light'
    ? 'flex-1 py-2.5 rounded-xl border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-bold text-sm transition-colors text-center'
    : 'flex-1 py-2.5 rounded-xl border-2 border-emerald-500/70 text-emerald-400 hover:bg-emerald-500/10 font-bold text-sm transition-colors text-center';

export function R114LitePanelActionButtons({
  actions,
  theme = 'light',
  className = '',
}: {
  actions: R114LitePanelActions;
  theme?: Theme;
  className?: string;
}) {
  const outlineBtn = outlineActionBtnClass(theme);
  return (
    <div className={`flex min-w-0 flex-1 gap-2 ${className}`}>
      {actions.analyzeHref ? (
        <Link href={actions.analyzeHref} className={outlineBtn}>
          {actions.analyzeLabel}
        </Link>
      ) : (
        <button type="button" onClick={actions.onAnalyze} className={outlineBtn}>
          {actions.analyzeLabel}
        </button>
      )}
      <button type="button" onClick={actions.onCompare} className={outlineBtn}>
        비교하기
      </button>
    </div>
  );
}

function AiAnalysisPromptBanner({
  hasReport,
  analyzeHref,
  onAnalyze,
  theme = 'light',
}: {
  hasReport: boolean;
  analyzeHref?: string;
  onAnalyze?: () => void;
  theme?: Theme;
}) {
  const message = hasReport
    ? 'AI가 분석한 리포트를 꼭 확인하세요'
    : '지금 AI로 분석해 보시겠어요?';

  const boxClass =
    theme === 'light'
      ? 'bg-emerald-100 border-emerald-300 text-emerald-900 hover:bg-emerald-50'
      : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-100 hover:bg-emerald-500/20';

  const content = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/AI/gpt.png"
        alt=""
        className="w-9 h-9 shrink-0 object-contain"
      />
      <span className="flex-1 text-sm font-black leading-snug">{message}</span>
      <ChevronRight className="w-4 h-4 shrink-0 opacity-60" aria-hidden />
    </>
  );

  const className = `flex w-full items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${boxClass}`;

  if (hasReport && analyzeHref) {
    return (
      <Link href={analyzeHref} className={className}>
        {content}
      </Link>
    );
  }

  if (onAnalyze) {
    return (
      <button type="button" onClick={onAnalyze} className={className}>
        {content}
      </button>
    );
  }

  if (analyzeHref) {
    return (
      <Link href={analyzeHref} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

export type R114LiteComplexChrome = {
  title: string;
  subtitle: string;
  address: string;
  meta: string;
};

function emptyTrades(): Record<R114TradeType, R114LiteTrade[]> {
  return { sale: [], jeonse: [], wolse: [] };
}

function mergeTradePages(
  prev: Record<R114TradeType, R114LiteTrade[]>,
  incoming: Record<R114TradeType, R114LiteTrade[]>,
): Record<R114TradeType, R114LiteTrade[]> {
  const next = { ...prev };
  for (const key of ['sale', 'jeonse', 'wolse'] as R114TradeType[]) {
    const seen = new Set(
      prev[key].map((t) => `${t.contractDate}|${t.priceMan}|${t.depositMan}|${t.monthlyRentMan}|${t.supplyArea}`),
    );
    const appended = [...prev[key]];
    for (const row of incoming[key] || []) {
      const sig = `${row.contractDate}|${row.priceMan}|${row.depositMan}|${row.monthlyRentMan}|${row.supplyArea}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      appended.push(row);
    }
    next[key] = appended;
  }
  return next;
}

type Theme = 'light' | 'dark';

function themeClasses(theme: Theme) {
  if (theme === 'light') {
    return {
      text: 'text-slate-900',
      muted: 'text-slate-500',
      border: 'border-slate-200',
      section: 'bg-white border border-slate-200',
      tabBg: 'bg-slate-100',
      tabInactive: 'text-slate-500 hover:text-slate-800',
      tableHead: 'bg-slate-50 text-slate-500',
      tableRow: 'border-t border-slate-100',
      pyeongIdle: 'border-slate-200 bg-white hover:border-emerald-300',
      pyeongActive: 'border-emerald-500 bg-emerald-50',
      empty: 'border-dashed border-slate-200 text-slate-400',
      badgeSparse: 'bg-amber-50 text-amber-800 border-amber-200',
      statsGrid: 'bg-slate-50 border-slate-200',
      riseUp: 'text-red-600',
      riseDown: 'text-blue-600',
      riseFlat: 'text-slate-600',
    };
  }
  return {
    text: 'text-white',
    muted: 'text-zinc-500',
    border: 'border-white/10',
    section: 'bg-white/[0.02] border border-white/10',
    tabBg: 'bg-white/5',
    tabInactive: 'text-zinc-400 hover:text-white',
    tableHead: 'bg-white/5 text-zinc-400',
    tableRow: 'border-t border-white/5',
    pyeongIdle: 'border-white/10 bg-white/[0.03] hover:border-white/20',
    pyeongActive: 'border-emerald-500/60 bg-emerald-500/10',
    empty: 'border-dashed border-white/10 text-zinc-500',
    badgeSparse: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    statsGrid: 'bg-white/[0.03] border-white/10',
    riseUp: 'text-red-400',
    riseDown: 'text-blue-400',
    riseFlat: 'text-zinc-300',
  };
}

function InfoRow({
  label,
  value,
  theme,
}: {
  label: string;
  value: React.ReactNode;
  theme: Theme;
}) {
  const t = themeClasses(theme);
  if (value == null || value === '' || value === '-') return null;
  return (
    <div className={`flex justify-between gap-4 py-2 border-b ${t.border} text-sm last:border-0`}>
      <span className={`${t.muted} shrink-0`}>{label}</span>
      <span className={`${t.text} text-right`}>{value}</span>
    </div>
  );
}

function pyeongExclusiveCenterM2(p: R114LitePyeongType): number | null {
  const min = p.exclusiveAreaMin;
  const max = p.exclusiveAreaMax;
  if (min > 0 && max > 0) return Math.round(((min + max) / 2) * 100) / 100;
  if (min > 0) return Math.round(min * 100) / 100;
  if (max > 0) return Math.round(max * 100) / 100;
  return null;
}

function sparseBadgeLabel(dealMode: ApartmentDealMode, selectedPyeong: number | null): string {
  const modeLabel = dealMode === 'jeonse' ? '전세' : dealMode === 'wolse' ? '월세' : '매매';
  if (selectedPyeong != null) return `이 평형 · 최근 6개월 ${modeLabel} 없음`;
  return `최근 6개월 · ${modeLabel} 없음`;
}

function CardStatsRow({
  dealMode,
  statsSource,
  theme,
}: {
  dealMode: ApartmentDealMode;
  statsSource: Parameters<typeof buildLiteDetailStatsDisplay>[1];
  theme: Theme;
}) {
  const t = themeClasses(theme);
  const display = buildLiteDetailStatsDisplay(dealMode, statsSource);

  return (
    <div className={`grid grid-cols-3 gap-2 rounded-xl border p-3 ${t.statsGrid}`}>
      <div className="text-center">
        <p className={`text-[10px] font-bold ${t.muted}`}>{display.col1Label}</p>
        <p className={`text-sm font-black mt-0.5 ${display.col1ValueClassName}`}>
          {display.col1Value}
        </p>
      </div>
      <div className="text-center border-x border-inherit">
        <p className={`text-[10px] font-bold ${t.muted}`}>{display.col2Label}</p>
        <p className={`text-sm font-black mt-0.5 ${t.text}`}>{display.col2Value}</p>
      </div>
      <div className="text-center">
        <p className={`text-[10px] font-bold ${t.muted}`}>{display.col3Label}</p>
        <p className={`text-sm font-black mt-0.5 ${t.text}`}>{display.col3Value}</p>
      </div>
    </div>
  );
}

function PyeongCard({
  p,
  stats,
  selected,
  onSelect,
  theme,
}: {
  p: R114LitePyeongType;
  stats?: R114LitePyeongAreaStats;
  selected: boolean;
  onSelect: () => void;
  theme: Theme;
}) {
  const t = themeClasses(theme);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-xl px-4 py-3 text-left border transition-colors min-w-[120px] shrink-0 ${
        selected ? t.pyeongActive : t.pyeongIdle
      }`}
    >
      <div className={`text-base font-bold ${t.text}`}>{p.pyeongApprox}평</div>
      <div className={`text-[11px] ${t.muted} mt-1`}>{p.households.toLocaleString()}세대</div>
      <div className={`text-[10px] ${t.muted} mt-0.5 leading-snug`}>
        공급 {formatSupplyRange(p.supplyMin, p.supplyMax)}
      </div>
      <div className={`text-[10px] ${t.muted} leading-snug`}>
        전용 {formatExclusiveRange(p.exclusiveAreaMin, p.exclusiveAreaMax)}
      </div>
      {stats && stats.saleCount6m > 0 && (
        <div className={`text-[9px] ${t.muted} mt-1`}>
          6mo {formatRiseRate6m(stats.riseRate6m)} · {formatAvgPrice1mEok(stats.avgPrice1m)}
        </div>
      )}
    </button>
  );
}

export default function R114LiteDetailPanel({
  r114PropId,
  theme = 'light',
  compactHeader = false,
  initialDealMode = 'sale',
  onAnalyzeClick,
  onCompareClick,
  latestReportId,
  reportTitle,
  onComplexLoaded,
  floatingChrome = false,
  onFloatingActionsChange,
}: {
  r114PropId: string;
  theme?: Theme;
  compactHeader?: boolean;
  initialDealMode?: ApartmentDealMode;
  onAnalyzeClick?: () => void;
  onCompareClick?: (payload: ApartmentComparePickPayload) => void;
  latestReportId?: string | null;
  reportTitle?: string | null;
  onComplexLoaded?: (complex: R114LiteComplexChrome, propId: string) => void;
  /** FloatingPanel 모바일 — 액션은 패널 chrome, 본문 footer 숨김 */
  floatingChrome?: boolean;
  onFloatingActionsChange?: (actions: R114LitePanelActions | null) => void;
}) {
  const t = themeClasses(theme);
  const [data, setData] = useState<R114LiteDetailResponse | null>(null);
  const [tradePages, setTradePages] = useState<Record<R114TradeType, R114LiteTrade[]>>(emptyTrades);
  const [loading, setLoading] = useState(true);
  const [tradeLoadingMore, setTradeLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPyeong, setSelectedPyeong] = useState<number | null>(null);
  const [tradeTab, setTradeTab] = useState<R114TradeType>('sale');
  const [tradeVisibleCount, setTradeVisibleCount] = useState(TRADE_PREVIEW);
  const [comparePickPending, setComparePickPending] = useState<ApartmentComparePickPayload | null>(null);
  const [listingSheetOpen, setListingSheetOpen] = useState(false);

  const load = useCallback(async (requestPropId: string, cancelled: () => boolean) => {
    setLoading(true);
    setError(null);
    setData(null);
    setTradePages(emptyTrades());
    try {
      const res = await fetchR114LiteComplexWithTrades(requestPropId);
      if (cancelled()) return;
      if (!res.success || !res.data) {
        setError(res.message || '단지 정보를 불러오지 못했습니다.');
        setData(null);
        setTradePages(emptyTrades());
        return;
      }
      setData(res);
      setTradePages(res.data.trades ?? emptyTrades());
      const c = res.data.complex;
      const moveInLabel = formatMoveIn(c.moveIn);
      const age = moveInAgeYears(c.moveIn);
      const addressLine =
        c.address || `${c.city || ''} ${c.gu || ''} ${c.dong || ''}`.trim();
      const metaParts = [
        c.householdCount != null ? `${c.householdCount.toLocaleString()}세대` : null,
        moveInLabel
          ? age != null
            ? `${moveInLabel}(${age}년차)`
            : moveInLabel
          : null,
      ].filter(Boolean);
      const metaLine = metaParts.join(' · ');
      onComplexLoaded?.({
        title: c.title,
        subtitle: metaLine || addressLine,
        address: addressLine,
        meta: metaLine,
      }, requestPropId);
    } catch {
      if (cancelled()) return;
      setError('네트워크 오류가 발생했습니다.');
      setData(null);
    } finally {
      if (!cancelled()) setLoading(false);
    }
  }, [onComplexLoaded]);

  useEffect(() => {
    setSelectedPyeong(null);
    setTradeTab(initialDealMode);
    setTradeVisibleCount(TRADE_PREVIEW);
    let cancelled = false;
    void load(r114PropId, () => cancelled);
    return () => { cancelled = true; };
  }, [r114PropId, initialDealMode, load]);

  useEffect(() => {
    setTradeVisibleCount(TRADE_PREVIEW);
  }, [selectedPyeong, tradeTab]);

  const complex = data?.data?.complex;
  const contextState = useR114LiteContext(r114PropId, complex?.lat, complex?.lng);
  const pyeongTypes = data?.data?.pyeongTypes ?? [];
  const pyeongAreaStats = data?.data?.pyeongAreaStats ?? [];
  const stats = data?.data?.stats;
  const trades = tradePages;
  const resolvedReportId = latestReportId ?? data?.latestReportId ?? null;
  const hasLiteReport = !!resolvedReportId;

  const liteRepresentativeAreaM2 = useMemo(
    () => resolveLiteRepresentativeAreaM2(stats?.exclusiveAreaM2, pyeongTypes),
    [stats?.exclusiveAreaM2, pyeongTypes],
  );

  const statsByPyeong = useMemo(
    () => new Map(pyeongAreaStats.map((s) => [s.pyeongApprox, s])),
    [pyeongAreaStats],
  );

  const selectedPyeongType = useMemo(
    () => pyeongTypes.find((p) => p.pyeongApprox === selectedPyeong) ?? null,
    [pyeongTypes, selectedPyeong],
  );

  const activeCardStats = useMemo(() => {
    const baseFromComplex = {
      riseRate6m: stats?.riseRate6m,
      avgPrice1m: stats?.avgPrice1m,
      exclusiveAreaM2: stats?.exclusiveAreaM2,
      saleCount6m: stats?.saleCount6m,
      jeonseCount6m: stats?.jeonseCount6m,
      wolseCount6m: stats?.wolseCount6m,
      jeonseRiseRate6m: stats?.jeonseRiseRate6m,
      avgJeonseDeposit1m: stats?.avgJeonseDeposit1m,
      wolseRiseRate6m: stats?.wolseRiseRate6m,
      avgWolseMonthlyRent1m: stats?.avgWolseMonthlyRent1m,
      tradeSparse: stats?.tradeSparse,
    };

    if (selectedPyeong != null) {
      const ps = statsByPyeong.get(selectedPyeong);
      const pyeongExcl = selectedPyeongType
        ? pyeongExclusiveCenterM2(selectedPyeongType)
        : null;
      if (ps) {
        return {
          ...baseFromComplex,
          riseRate6m: ps.riseRate6m,
          avgPrice1m: ps.avgPrice1m,
          exclusiveAreaM2: ps.exclusiveAreaM2 ?? pyeongExcl,
          saleCount6m: ps.saleCount6m,
          jeonseCount6m: ps.jeonseCount6m,
          wolseCount6m: ps.wolseCount6m,
          jeonseRiseRate6m: ps.jeonseRiseRate6m,
          avgJeonseDeposit1m: ps.avgJeonseDeposit1m,
          wolseRiseRate6m: ps.wolseRiseRate6m,
          avgWolseMonthlyRent1m: ps.avgWolseMonthlyRent1m,
          tradeSparse: ps.tradeSparse,
        };
      }
      return {
        ...baseFromComplex,
        riseRate6m: null,
        avgPrice1m: null,
        exclusiveAreaM2: pyeongExcl,
        saleCount6m: 0,
        jeonseCount6m: 0,
        wolseCount6m: 0,
        jeonseRiseRate6m: null,
        avgJeonseDeposit1m: null,
        wolseRiseRate6m: null,
        avgWolseMonthlyRent1m: null,
        tradeSparse: true,
      };
    }
    return baseFromComplex;
  }, [selectedPyeong, selectedPyeongType, stats, statsByPyeong]);

  const modeSparse = isLiteModeSparse(tradeTab, activeCardStats);

  const filteredTrades = useMemo(() => {
    const list = trades?.[tradeTab] ?? [];
    return filterTradesByPyeong(list, selectedPyeongType);
  }, [trades, tradeTab, selectedPyeongType]);

  const chartSeries = useMemo(
    () => buildTradeChartSeries(filteredTrades, tradeTab),
    [filteredTrades, tradeTab],
  );

  const jeonseRatioPct = useMemo(
    () => computeJeonseRatioPct(activeCardStats.avgPrice1m, activeCardStats.avgJeonseDeposit1m),
    [activeCardStats.avgPrice1m, activeCardStats.avgJeonseDeposit1m],
  );

  const headerMetaParts = useMemo(() => {
    const moveInLabel = formatMoveIn(complex?.moveIn ?? null);
    const age = moveInAgeYears(complex?.moveIn ?? null);
    return [
      complex?.householdCount != null ? `${complex.householdCount.toLocaleString()}세대` : null,
      moveInLabel
        ? age != null
          ? `${moveInLabel}(${age}년차)`
          : moveInLabel
        : null,
    ].filter(Boolean);
  }, [complex?.householdCount, complex?.moveIn]);

  const visibleTrades = filteredTrades.slice(0, tradeVisibleCount);

  const serverTabTotals = useMemo(() => ({
    sale: stats?.saleTotal ?? trades.sale.length,
    jeonse: stats?.jeonseTotal ?? trades.jeonse.length,
    wolse: stats?.wolseTotal ?? trades.wolse.length,
  }), [stats, trades]);

  const tabCounts = useMemo(() => {
    if (selectedPyeongType) {
      return {
        sale: filterTradesByPyeong(trades.sale, selectedPyeongType).length,
        jeonse: filterTradesByPyeong(trades.jeonse, selectedPyeongType).length,
        wolse: filterTradesByPyeong(trades.wolse, selectedPyeongType).length,
      };
    }
    return serverTabTotals;
  }, [trades, selectedPyeongType, serverTabTotals]);

  const hasMoreTrades = useMemo(() => {
    if (tradeVisibleCount < filteredTrades.length) return true;
    if (selectedPyeong != null) return false;
    return trades[tradeTab].length < serverTabTotals[tradeTab];
  }, [
    tradeVisibleCount,
    filteredTrades.length,
    selectedPyeong,
    trades,
    tradeTab,
    serverTabTotals,
  ]);

  const loadMoreTrades = useCallback(async () => {
    if (tradeVisibleCount + TRADE_PREVIEW <= filteredTrades.length) {
      setTradeVisibleCount((v) => v + TRADE_PREVIEW);
      return;
    }
    if (selectedPyeong != null || tradeLoadingMore) return;

    const loaded = trades[tradeTab].length;
    const total = serverTabTotals[tradeTab];
    if (loaded >= total) {
      setTradeVisibleCount((v) => v + TRADE_PREVIEW);
      return;
    }

    setTradeLoadingMore(true);
    try {
      const res = await fetchR114LiteTradesPage(r114PropId, {
        tradeType: tradeTab,
        tradeOffset: loaded,
        tradeLimit: LITE_LOAD_MORE_TRADE_LIMIT,
      });
      if (res.success && res.data?.trades) {
        setTradePages((prev) => mergeTradePages(prev, res.data!.trades));
        setTradeVisibleCount((v) => v + TRADE_PREVIEW);
      }
    } finally {
      setTradeLoadingMore(false);
    }
  }, [
    tradeVisibleCount,
    filteredTrades.length,
    selectedPyeong,
    tradeLoadingMore,
    trades,
    tradeTab,
    serverTabTotals,
    r114PropId,
  ]);

  const comparePayload = useMemo<ApartmentComparePickPayload | null>(() => {
    if (!complex) return null;
    const pyeongExcl = selectedPyeongType ? pyeongExclusiveCenterM2(selectedPyeongType) : null;
    const suggestedAreaM2 = activeCardStats.exclusiveAreaM2 ?? pyeongExcl;
    return {
      r114PropId,
      complexName: complex.title,
      suggestedAreaM2: suggestedAreaM2 != null && Number.isFinite(suggestedAreaM2) ? suggestedAreaM2 : null,
    };
  }, [complex, selectedPyeongType, activeCardStats.exclusiveAreaM2, r114PropId]);

  const handleCompareClick = useCallback(() => {
    if (!comparePayload) return;
    if (onCompareClick) {
      onCompareClick(comparePayload);
      return;
    }
    setComparePickPending(comparePayload);
  }, [comparePayload, onCompareClick]);

  const floatingActions = useMemo<R114LitePanelActions | null>(() => {
    if (!complex || !comparePayload) return null;
    if (resolvedReportId) {
      return {
        analyzeLabel: 'AI 리포트',
        analyzeHref: `/analyze/${makeAnalyzeSlug(resolvedReportId, reportTitle || complex.title)}`,
        onCompare: handleCompareClick,
      };
    }
    if (onAnalyzeClick) {
      return {
        analyzeLabel: 'AI 분석',
        onAnalyze: onAnalyzeClick,
        onCompare: handleCompareClick,
      };
    }
    return {
      analyzeLabel: 'AI 분석',
      analyzeHref: `/?panel=analyze&r114PropId=${encodeURIComponent(r114PropId)}`,
      onCompare: handleCompareClick,
    };
  }, [
    complex,
    comparePayload,
    resolvedReportId,
    reportTitle,
    r114PropId,
    onAnalyzeClick,
    handleCompareClick,
  ]);

  useEffect(() => {
    if (!floatingChrome || !onFloatingActionsChange) return;
    if (loading || error || !floatingActions) {
      onFloatingActionsChange(null);
      return;
    }
    onFloatingActionsChange(floatingActions);
    return () => onFloatingActionsChange(null);
  }, [floatingChrome, onFloatingActionsChange, loading, error, floatingActions]);

  const listingContext = useMemo<ListingRequestContext>(() => {
    const c = data?.data?.complex;
    const addressLine = c
      ? (c.address || `${c.city || ''} ${c.gu || ''} ${c.dong || ''}`.trim())
      : '';
    const avgHint = activeCardStats.avgPrice1m
      ? `최근 시세 참고: ${formatAvgPrice1mEok(activeCardStats.avgPrice1m)} (제시가 없음 · 직접 입력)`
      : '희망 예산을 직접 입력해 주세요';
    return {
      category: 'apartment',
      sourceType: 'r114_lite',
      sourceId: r114PropId,
      complexName: c?.title ?? '',
      address: addressLine,
      defaultPyeong: selectedPyeong ?? undefined,
      defaultBudgetMan: null,
      referencePriceHint: avgHint,
      showPyeong: true,
      showMoveIn: true,
    };
  }, [activeCardStats.avgPrice1m, data?.data?.complex, r114PropId, selectedPyeong]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error || !complex) {
    return (
      <div className={`px-4 py-8 text-center ${t.text}`}>
        <p className="text-red-500 text-sm">{error || '단지를 찾을 수 없습니다.'}</p>
      </div>
    );
  }

  const outlineBtn = outlineActionBtnClass(theme);

  const actionButton = resolvedReportId ? (
    <Link href={`/analyze/${makeAnalyzeSlug(resolvedReportId, reportTitle || complex.title)}`} className={outlineBtn}>
      AI 리포트
    </Link>
  ) : onAnalyzeClick ? (
    <button type="button" onClick={onAnalyzeClick} className={outlineBtn}>
      AI 분석
    </button>
  ) : (
    <Link href={`/?panel=analyze&r114PropId=${encodeURIComponent(r114PropId)}`} className={outlineBtn}>
      AI 분석
    </Link>
  );

  const compareButtonClass = outlineBtn;

  const stickyFooterClass =
    theme === 'light'
      ? 'border-slate-200/90 bg-white/95 supports-[backdrop-filter]:bg-white/90'
      : 'border-white/10 bg-[#0a0a0c]/95 supports-[backdrop-filter]:bg-[#0a0a0c]/90';

  const contentBottomPad = floatingChrome
    ? 'pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:pb-24'
    : 'pb-24';

  const analyzeHref = resolvedReportId
    ? `/analyze/${makeAnalyzeSlug(resolvedReportId, reportTitle || complex.title)}`
    : `/?panel=analyze&r114PropId=${encodeURIComponent(r114PropId)}`;

  return (
    <div className={`${t.text} flex min-h-full flex-col`}>
      {!compactHeader && (
        <div className="px-4 pt-1 pb-2">
          <h1 className="font-bold text-lg leading-tight">{complex.title}</h1>
          <p className={`text-xs ${t.muted} mt-0.5 truncate`}>
            {complex.address || `${complex.city || ''} ${complex.gu || ''} ${complex.dong || ''}`.trim()}
          </p>
          {headerMetaParts.length > 0 && (
            <p className={`text-[11px] ${t.muted} mt-1`}>{headerMetaParts.join(' · ')}</p>
          )}
        </div>
      )}

      <div className="px-4 pb-3">
        <AiAnalysisPromptBanner
          hasReport={hasLiteReport}
          analyzeHref={analyzeHref}
          onAnalyze={!resolvedReportId ? onAnalyzeClick : undefined}
          theme={theme}
        />
      </div>

      <div className={`flex-1 px-4 space-y-5 ${contentBottomPad}`}>
        {modeSparse && (
          <div className="flex flex-wrap gap-1.5">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${t.badgeSparse}`}>
              {sparseBadgeLabel(tradeTab, selectedPyeong)}
            </span>
          </div>
        )}

        <CardStatsRow theme={theme} dealMode={tradeTab} statsSource={activeCardStats} />

        {jeonseRatioPct != null && (
          <div className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${t.statsGrid}`}>
            <div>
              <p className={`text-[10px] font-bold ${t.muted}`}>전세가율</p>
              <p className="text-xs font-medium mt-0.5">최근 1개월 평균 기준</p>
            </div>
            <p className="text-lg font-black text-emerald-600">{formatJeonseRatioPct(jeonseRatioPct)}</p>
          </div>
        )}

        {pyeongTypes.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold">실거래 · 평형</h2>
              {selectedPyeong != null && (
                <button
                  type="button"
                  onClick={() => setSelectedPyeong(null)}
                  className="text-[11px] text-emerald-600 font-bold hover:underline"
                >
                  전체
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {pyeongTypes.map((p) => (
                <PyeongCard
                  key={p.pyeongApprox}
                  p={p}
                  stats={statsByPyeong.get(p.pyeongApprox)}
                  theme={theme}
                  selected={selectedPyeong === p.pyeongApprox}
                  onSelect={() => setSelectedPyeong(
                    selectedPyeong === p.pyeongApprox ? null : p.pyeongApprox,
                  )}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold">실거래</h2>
          </div>
          <div className={`flex gap-1 mb-3 p-1 rounded-xl ${t.tabBg}`}>
            {TRADE_TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTradeTab(key)}
                className={`flex-1 py-1.5 text-xs rounded-lg font-bold transition-colors ${
                  tradeTab === key
                    ? 'bg-emerald-500 text-white'
                    : t.tabInactive
                }`}
              >
                {label}
                <span className="ml-0.5 opacity-70">({tabCounts[key]})</span>
              </button>
            ))}
          </div>

          {filteredTrades.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className={`text-[11px] font-bold ${t.muted}`}>
                  {tradeTab === 'jeonse' ? '전세' : tradeTab === 'wolse' ? '월세' : '매매'} 시세 추이
                  {selectedPyeong != null ? ` · ${selectedPyeong}평` : ''}
                </p>
                <span className={`text-[10px] ${t.muted}`}>최근 {chartSeries.length}건</span>
              </div>
              <R114LiteTradeChart data={chartSeries} kind={tradeTab} theme={theme} />
            </div>
          )}

          {filteredTrades.length === 0 ? (
            <p className={`text-xs py-6 text-center rounded-xl border ${t.empty}`}>
              {modeSparse
                ? `최근 6개월 ${tradeTab === 'jeonse' ? '전세' : tradeTab === 'wolse' ? '월세' : '매매'} 없음`
                : '표시할 거래가 없습니다.'}
            </p>
          ) : (
            <>
              <div className={`rounded-xl border overflow-hidden ${t.border}`}>
                <table className="w-full text-xs">
                  <thead>
                    <tr className={t.tableHead}>
                      <th className="px-2.5 py-2 font-bold text-left">계약일</th>
                      <th className="px-2.5 py-2 font-bold text-left">층</th>
                      <th className="px-2.5 py-2 font-bold text-left">전용㎡</th>
                      <th className="px-2.5 py-2 font-bold text-right">가격</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTrades.map((row, i) => (
                      <tr key={`${row.contractDate}-${i}`} className={t.tableRow}>
                        <td className="px-2.5 py-2">{formatContractDateShort(row.contractDate)}</td>
                        <td className={`px-2.5 py-2 ${t.muted}`}>
                          {row.floor ? `${row.floor}층` : '—'}
                        </td>
                        <td className={`px-2.5 py-2 ${t.muted}`}>
                          {row.exclusiveArea != null
                            ? row.exclusiveArea.toFixed(2)
                            : row.supplyArea != null
                              ? `${row.supplyArea.toFixed(2)} (공급)`
                              : '—'}
                        </td>
                        <td className="px-2.5 py-2 text-right font-bold">
                          {tradeTab === 'sale' && formatPriceMan(row.priceMan)}
                          {tradeTab === 'jeonse' && formatPriceMan(row.depositMan)}
                          {tradeTab === 'wolse' && formatWolse(row.depositMan, row.monthlyRentMan)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasMoreTrades && (
                <button
                  type="button"
                  onClick={() => void loadMoreTrades()}
                  disabled={tradeLoadingMore}
                  className={`mt-2 w-full py-2 text-xs font-bold rounded-xl border ${t.border} ${t.muted} hover:text-emerald-600 flex items-center justify-center gap-1 disabled:opacity-60`}
                >
                  {tradeLoadingMore ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {`더보기 (${Math.min(TRADE_PREVIEW, Math.max(filteredTrades.length - tradeVisibleCount, 1))}건)`}
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </section>

        {contextState.sigunguCd && (
          <MacroContextCharts
            sigunguCd={contextState.sigunguCd}
            sigunguLabel={contextState.sigunguName}
            theme={theme}
            useDefaultAxis
            layoutMode="yearlyBars"
            sectionBadge={liteMacroSectionBadge(complex?.moveIn)}
            axisNote=""
            aptSeq={complex?.rtmsAptSeq ?? undefined}
            r114PropId={r114PropId}
            minDisplayYear={parseMoveInYear(complex?.moveIn)}
            representativeAreaM2={liteRepresentativeAreaM2}
          />
        )}

        <section className={`rounded-2xl p-3.5 ${t.section}`}>
          <p className={`text-xs ${t.muted} mb-3 leading-relaxed`}>
            조건에 맞는 실매물을 찾아드립니다. 평형·예산·입주 시기를 남겨 주세요.
          </p>
          <ListingRequestTrigger
            label="이 집, 구해드릴까요?"
            onClick={() => setListingSheetOpen(true)}
            variant={theme === 'dark' ? 'dark' : 'primary'}
          />
        </section>

        <R114LiteSchoolCard ctx={contextState} theme={theme} />

        <section className={`rounded-2xl p-3.5 ${t.section}`}>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-bold">단지정보</h2>
          </div>
          <InfoRow theme={theme} label="세대수" value={complex.householdCount?.toLocaleString()} />
          <InfoRow theme={theme} label="입주" value={formatMoveIn(complex.moveIn)} />
          <InfoRow theme={theme} label="주차" value={complex.parkingTotal != null ? `${complex.parkingTotal.toLocaleString()}대` : null} />
          <InfoRow theme={theme} label="용적률" value={complex.floorAreaRatio != null ? `${complex.floorAreaRatio}%` : null} />
          <InfoRow theme={theme} label="난방" value={complex.heatingSystem} />
        </section>

        <R114LiteRegionSection ctx={contextState} theme={theme} />
      </div>

      <div
        className={`sticky bottom-0 z-10 mt-auto shrink-0 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t backdrop-blur-md shadow-[0_-8px_24px_rgba(0,0,0,0.08)] ${stickyFooterClass} ${floatingChrome ? 'max-lg:hidden' : ''}`}
      >
        <div className="flex flex-col gap-2">
          <ListingRequestTrigger
            label="이 집, 구해드릴까요?"
            onClick={() => setListingSheetOpen(true)}
            variant={theme === 'dark' ? 'dark' : 'primary'}
          />
          <div className="flex gap-2">
            {actionButton}
            <button type="button" onClick={handleCompareClick} className={compareButtonClass}>
              비교하기
            </button>
          </div>
        </div>
      </div>

      <ListingRequestSheet
        open={listingSheetOpen}
        onClose={() => setListingSheetOpen(false)}
        context={listingContext}
      />

      {!onCompareClick && (
        <ApartmentAreaPickModal
          pending={comparePickPending}
          onClose={() => setComparePickPending(null)}
        />
      )}
    </div>
  );
}
