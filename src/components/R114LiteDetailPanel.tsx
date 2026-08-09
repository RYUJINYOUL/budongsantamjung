'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, ChevronDown, Loader2 } from 'lucide-react';
import { makeAnalyzeSlug } from '../lib/slug';
import {
  fetchR114LiteComplex,
  formatExclusiveRange,
  formatMoveIn,
  formatPriceMan,
  formatSupplyRange,
  formatWolse,
} from '../lib/r114LiteApi';
import type {
  R114LiteDetailResponse,
  R114LitePyeongAreaStats,
  R114LitePyeongType,
  R114TradeType,
} from '../lib/r114LiteTypes';
import type { ApartmentDealMode } from '../lib/apartmentDiscoverFilters';
import {
  buildLiteDetailStatsDisplay,
  isLiteModeSparse,
} from '../lib/r114LiteCardDisplay';
import {
  filterTradesByPyeong,
  formatAvgPrice1mEok,
  formatRiseRate6m,
} from '../lib/r114LiteTrades';

const TRADE_TABS: { key: R114TradeType; label: string }[] = [
  { key: 'sale', label: '매매' },
  { key: 'jeonse', label: '전세' },
  { key: 'wolse', label: '월세' },
];

const TRADE_PREVIEW = 5;

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
      badgeLite: 'bg-slate-100 text-slate-600 border-slate-200',
      badgeVerified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
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
    badgeLite: 'bg-white/5 text-zinc-400 border-white/10',
    badgeVerified: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
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
  if (selectedPyeong != null) return `이 평형 6mo ${modeLabel} 없음`;
  return `거래 빈약 · ${modeLabel}`;
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
  latestReportId,
  reportTitle,
  onComplexLoaded,
}: {
  r114PropId: string;
  theme?: Theme;
  compactHeader?: boolean;
  initialDealMode?: ApartmentDealMode;
  onAnalyzeClick?: () => void;
  latestReportId?: string | null;
  reportTitle?: string | null;
  onComplexLoaded?: (complex: { title: string; subtitle: string }) => void;
}) {
  const t = themeClasses(theme);
  const [data, setData] = useState<R114LiteDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPyeong, setSelectedPyeong] = useState<number | null>(null);
  const [tradeTab, setTradeTab] = useState<R114TradeType>('sale');
  const [tradeVisibleCount, setTradeVisibleCount] = useState(TRADE_PREVIEW);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchR114LiteComplex(r114PropId, { tradeLimit: 500 });
      if (!res.success || !res.data) {
        setError(res.message || '단지 정보를 불러오지 못했습니다.');
        setData(null);
        return;
      }
      setData(res);
      const c = res.data.complex;
      onComplexLoaded?.({
        title: c.title,
        subtitle: c.address || [c.gu, c.dong].filter(Boolean).join(' '),
      });
    } catch {
      setError('네트워크 오류가 발생했습니다.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [r114PropId, onComplexLoaded]);

  useEffect(() => {
    setSelectedPyeong(null);
    setTradeTab(initialDealMode);
    setTradeVisibleCount(TRADE_PREVIEW);
    void load();
  }, [r114PropId, initialDealMode, load]);

  useEffect(() => {
    setTradeVisibleCount(TRADE_PREVIEW);
  }, [selectedPyeong, tradeTab]);

  const complex = data?.data?.complex;
  const pyeongTypes = data?.data?.pyeongTypes ?? [];
  const pyeongAreaStats = data?.data?.pyeongAreaStats ?? [];
  const stats = data?.data?.stats;
  const trades = data?.data?.trades;
  const resolvedReportId = latestReportId ?? null;
  const hasLiteReport = !!resolvedReportId;

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

  const visibleTrades = filteredTrades.slice(0, tradeVisibleCount);
  const hasMoreTrades = filteredTrades.length > tradeVisibleCount;

  const tabCounts = useMemo(() => {
    const base = selectedPyeongType
      ? {
        sale: filterTradesByPyeong(trades?.sale ?? [], selectedPyeongType),
        jeonse: filterTradesByPyeong(trades?.jeonse ?? [], selectedPyeongType),
        wolse: filterTradesByPyeong(trades?.wolse ?? [], selectedPyeongType),
      }
      : {
        sale: trades?.sale ?? [],
        jeonse: trades?.jeonse ?? [],
        wolse: trades?.wolse ?? [],
      };
    return {
      sale: base.sale.length,
      jeonse: base.jeonse.length,
      wolse: base.wolse.length,
    };
  }, [trades, selectedPyeongType]);

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

  return (
    <div className={`${t.text} pb-6`}>
      {!compactHeader && (
        <div className="px-4 pt-1 pb-3">
          <h1 className="font-bold text-lg leading-tight">{complex.title}</h1>
          <p className={`text-xs ${t.muted} mt-0.5 truncate`}>
            {complex.address || `${complex.city || ''} ${complex.gu || ''} ${complex.dong || ''}`.trim()}
          </p>
        </div>
      )}

      <div className="px-4 space-y-5">
        <div className="flex flex-wrap gap-1.5">
          {modeSparse && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${t.badgeSparse}`}>
              {sparseBadgeLabel(tradeTab, selectedPyeong)}
            </span>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${t.badgeLite}`}>
            Lite
          </span>
          {hasLiteReport && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${theme === 'light' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'}`}>
              분석완료
            </span>
          )}
          {complex.rtmsVerifiedAt && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${t.badgeVerified}`}>
              RTMS verified
            </span>
          )}
        </div>

        <CardStatsRow theme={theme} dealMode={tradeTab} statsSource={activeCardStats} />

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
                      <th className="px-2.5 py-2 font-bold text-left">전용㎡</th>
                      <th className="px-2.5 py-2 font-bold text-right">가격</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTrades.map((row, i) => (
                      <tr key={`${row.contractDate}-${i}`} className={t.tableRow}>
                        <td className="px-2.5 py-2">{row.contractDate?.replace(/-/g, '.')}</td>
                        <td className={`px-2.5 py-2 ${t.muted}`}>
                          {(row.exclusiveArea ?? row.supplyArea)?.toFixed(2) ?? '—'}
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
                  onClick={() => setTradeVisibleCount((v) => v + TRADE_PREVIEW)}
                  className={`mt-2 w-full py-2 text-xs font-bold rounded-xl border ${t.border} ${t.muted} hover:text-emerald-600 flex items-center justify-center gap-1`}
                >
                  {`더보기 (${Math.min(TRADE_PREVIEW, filteredTrades.length - tradeVisibleCount)}건)`}
                  <ChevronDown className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </section>

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

        {resolvedReportId ? (
          <Link
            href={`/analyze/${makeAnalyzeSlug(resolvedReportId, reportTitle || complex?.title)}`}
            className="block w-full text-center py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm transition-colors"
          >
            AI 분석 리포트 보기
          </Link>
        ) : onAnalyzeClick ? (
          <button
            type="button"
            onClick={onAnalyzeClick}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm transition-colors"
          >
            분석하기
          </button>
        ) : (
          <Link
            href={`/?panel=analyze&r114PropId=${encodeURIComponent(r114PropId)}`}
            className="block w-full text-center py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm transition-colors"
          >
            분석하기
          </Link>
        )}
      </div>
    </div>
  );
}
