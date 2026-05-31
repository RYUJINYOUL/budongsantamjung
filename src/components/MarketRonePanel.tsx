'use client';

import { useMemo, useState } from 'react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { generateMarketInsights, sortedSeriesPoints } from '../lib/marketRone';

const CATEGORY_META: Record<string, { title: string; color: string }> = {
  land: { title: '토지 시장 지표', color: '#7c3aed' },
  apartment: { title: '아파트 시장 지표', color: '#0ea5e9' },
  house: { title: '주택 시장 지표', color: '#10b981' },
  building: { title: '오피스 시장 지표', color: '#f59e0b' },
  store: { title: '상가 시장 지표', color: '#ef4444' },
};

const IND_LABELS: Record<string, string> = {
  priceIndex: '가격지수',
  jeonseIndex: '전세지수',
  wolseIndex: '월세지수',
  tradeVolume: '거래량',
  supplyDemand: '수급지수',
  conversionRate: '전월세전환율',
  vacancyRate: '공실률',
  rentAmount: '임대료',
  premiumMoney: '권리금유비율',
  quintile: '5분위배율',
  changeRateByRegion: '지가변동률(지역)',
  changeRateByUse: '지가변동률(용도)',
  saleIndex: '실거래지수',
};

const CHART_OPTIONS_MAP: Record<string, { key: string; label: string; color: string }[]> = {
  land: [
    { key: 'price', label: '지가지수', color: '#8B5CF6' },
    { key: 'change', label: '지가변동률', color: '#A78BFA' },
    { key: 'volume', label: '거래필지수', color: '#10B981' },
  ],
  apartment: [
    { key: 'price', label: '매매지수', color: '#0EA5E9' },
    { key: 'jeonse', label: '전세지수', color: '#F59E0B' },
    { key: 'wolse', label: '월세지수', color: '#FBBF24' },
  ],
  house: [
    { key: 'price', label: '매매지수', color: '#10B981' },
    { key: 'jeonse', label: '전세지수', color: '#F59E0B' },
  ],
  building: [
    { key: 'price', label: '임대가격지수', color: '#F59E0B' },
    { key: 'vacancy', label: '공실률', color: '#F87171' },
    { key: 'rent', label: '임대료', color: '#34D399' },
  ],
  store: [
    { key: 'price', label: '임대가격지수', color: '#EF4444' },
    { key: 'vacancy', label: '공실률', color: '#F87171' },
    { key: 'rent', label: '임대료', color: '#34D399' },
  ],
};

function getSeriesForChart(chartKey: string, indicators: any) {
  if (!indicators) return null;
  switch (chartKey) {
    case 'price': return indicators.priceIndex || indicators.saleIndex || indicators.priceIndexByStatus;
    case 'jeonse': return indicators.jeonseIndex;
    case 'wolse': return indicators.wolseIndex;
    case 'change': return indicators.changeRateByRegion || indicators.changeRateByUse;
    case 'volume': return indicators.tradeVolume || indicators.tradeVolumeByUse;
    case 'vacancy': return indicators.vacancyRate;
    case 'rent': return indicators.rentAmount;
    default: return null;
  }
}

function getChartData(series: any) {
  if (!series) return [];
  let data: any[] | null = null;
  if (Array.isArray(series)) data = series;
  else if (series && typeof series === 'object') data = series.data || null;
  if (!data || data.length === 0) return [];
  return sortedSeriesPoints(data);
}

function getSummary(series: any): any | null {
  if (!series) return null;
  if (series.summary) return series.summary;
  if (Array.isArray(series) && series.length > 0) {
    const last = series[series.length - 1];
    return { latest: last?.value ?? last, trend: '', change: 0 };
  }
  if (series.data && Array.isArray(series.data) && series.data.length > 0) {
    const last = series.data[series.data.length - 1];
    return { latest: last?.value ?? last, trend: '', change: 0 };
  }
  return null;
}

function BuildingYieldTable({ ind, maxRows = 6 }: { ind: any; maxRows?: number }) {
  const yr = ind?.yieldRates;
  if (!yr) return null;

  const inv = yr.invest?.data || [];
  const inc = yr.income?.data || [];
  const cap = yr.capital?.data || [];
  if (inv.length === 0 && inc.length === 0 && cap.length === 0) return null;

  const dates = new Set<string>();
  [...inv, ...inc, ...cap].forEach((p: any) => {
    if (p.date) dates.add(p.date.toString());
  });
  const sortedDates = Array.from(dates).sort();
  if (sortedDates.length === 0) return null;

  const findVal = (list: any[], date: string) => {
    const match = list.find((p) => p.date === date);
    return match ? Number(match.value) : null;
  };

  const rows = sortedDates.length > maxRows ? sortedDates.slice(sortedDates.length - maxRows) : sortedDates;

  const formatYieldDate = (date: string) => {
    const d = date.trim();
    if (d.length >= 7 && d.includes('-')) {
      const parts = d.split('-');
      if (parts.length >= 2) {
        const y = parts[0];
        const yy = y.length >= 4 ? y.substring(y.length - 2) : y;
        return `${yy}-${parts[1].padStart(2, '0')}`;
      }
    }
    if (d.length > 6) return d.substring(d.length - 5);
    return d;
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <h4 className="font-black text-slate-900 text-sm">수익률 분석 (투자 / 소득 / 자본)</h4>
        <p className="text-xs text-slate-500 mt-1">투자수익률 = 소득수익률 + 자본수익률</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-3 font-bold text-slate-500">날짜</th>
              <th className="px-4 py-3 font-bold text-slate-500">투자</th>
              <th className="px-4 py-3 font-bold text-slate-500">소득</th>
              <th className="px-4 py-3 font-bold text-slate-500">자본</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((date, idx) => {
              const i = findVal(inv, date);
              const n = findVal(inc, date);
              const c = findVal(cap, date);
              const capColor = c === null ? 'text-slate-700' : c < 0 ? 'text-rose-600' : 'text-emerald-600';
              return (
                <tr key={idx} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-bold text-slate-500">{formatYieldDate(date)}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{i !== null ? i.toFixed(2) : '-'}</td>
                  <td className="px-4 py-3 font-bold text-emerald-600">{n !== null ? n.toFixed(2) : '-'}</td>
                  <td className={`px-4 py-3 font-bold ${capColor}`}>{c !== null ? c.toFixed(2) : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function MarketRonePanel({
  category,
  indicators,
}: {
  category: string;
  indicators: Record<string, any>;
}) {
  const [selectedChart, setSelectedChart] = useState('price');

  const meta = CATEGORY_META[category] || { title: '시장 지표', color: '#64748B' };
  const chartOptions = CHART_OPTIONS_MAP[category] || [{ key: 'price', label: '가격지수', color: '#0EA5E9' }];
  const activeOption = chartOptions.find((o) => o.key === selectedChart) || chartOptions[0];

  const summaryCards = useMemo(() => {
    const cards: { key: string; label: string; summary: any }[] = [];
    Object.entries(indicators).forEach(([k, v]) => {
      if (['category', 'txType', 'yieldRates', 'supplyDemand', 'region', 'city', 'sido'].includes(k)) return;
      const s = getSummary(v);
      if (s) cards.push({ key: k, label: IND_LABELS[k] || k, summary: s });
    });
    return cards;
  }, [indicators]);

  const chartData = useMemo(() => {
    const series = getSeriesForChart(activeOption.key, indicators);
    return getChartData(series);
  }, [activeOption.key, indicators]);

  const insightItems = useMemo(() => generateMarketInsights(category, indicators), [category, indicators]);

  if (!indicators || Object.keys(indicators).length === 0) {
    return (
      <section className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
        <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-600">공식 시장 동향 지표가 제공되지 않았습니다</p>
        <p className="text-xs text-slate-400 mt-1">한국부동산원(R-ONE) 데이터 없음</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div
          className="px-5 py-4 flex items-center justify-between border-b"
          style={{ backgroundColor: `${meta.color}08`, borderColor: `${meta.color}22` }}
        >
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl" style={{ backgroundColor: `${meta.color}18` }}>
              <TrendingUp className="w-4 h-4" style={{ color: meta.color }} />
            </div>
            <h4 className="font-black text-slate-900 text-sm">{meta.title} 요약</h4>
          </div>
          <span
            className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide"
            style={{ backgroundColor: `${meta.color}14`, color: meta.color, border: `1px solid ${meta.color}33` }}
          >
            R-ONE
          </span>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3">
          {summaryCards.map(({ key, label, summary }) => {
            const isUp = summary.trend === '상승';
            const isDown = summary.trend === '하락';
            const trendColor = isUp ? 'text-rose-600' : isDown ? 'text-sky-600' : 'text-slate-400';
            const latest = typeof summary.latest === 'number' ? summary.latest.toFixed(2) : (summary.latest || '-');
            const change = typeof summary.change === 'number' ? summary.change.toFixed(2) : (summary.change ?? '');
            return (
              <div
                key={key}
                className="p-4 rounded-xl border bg-slate-50/50"
                style={{ borderColor: `${meta.color}22` }}
              >
                <p className="text-[10px] font-bold text-slate-500 mb-2 truncate">{label}</p>
                <p className="text-xl font-black text-slate-900 mb-1 tabular-nums">{latest}</p>
                <span className={`text-[10px] font-bold ${trendColor}`}>
                  {isUp ? '▲' : isDown ? '▼' : '─'} {change}{change ? '%' : summary.trend || ''}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 추이 차트 */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
          <div>
            <h4 className="font-black text-slate-900 text-sm">공식지표 추이 분석</h4>
            <p className="text-xs text-slate-500 mt-0.5">{activeOption.label} 시계열 변화량</p>
          </div>
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-50 border border-slate-100 rounded-2xl">
            {chartOptions.map((opt) => {
              const isSelected = activeOption.key === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSelectedChart(opt.key)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                    isSelected ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  style={{ backgroundColor: isSelected ? opt.color : 'transparent' }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="p-5">
          {chartData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
              <p className="text-slate-400 text-xs font-medium">지표 시계열 데이터가 제공되지 않았습니다</p>
            </div>
          ) : (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`discover-rone-${category}-${activeOption.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={activeOption.color} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={activeOption.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => {
                      if (!val) return '';
                      const clean = val.toString().trim();
                      return clean.length >= 7 ? clean.substring(2) : clean;
                    }}
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                    width={42}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '11px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={activeOption.color}
                    strokeWidth={2.5}
                    fill={`url(#discover-rone-${category}-${activeOption.key})`}
                    dot={{ r: 2.5, stroke: activeOption.color, strokeWidth: 1, fill: '#fff' }}
                    activeDot={{ r: 5, stroke: '#fff', strokeWidth: 1.5, fill: activeOption.color }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* 분석 리포트 */}
      {insightItems.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-center gap-2">
            <div className="w-1 h-5 rounded-full" style={{ backgroundColor: meta.color }} />
            <h4 className="font-black text-slate-900 text-sm">{meta.title.replace('지표', '분석 리포트')}</h4>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            {insightItems.map((item, idx) => {
              const isUp = item.trend === '상승';
              const isDown = item.trend === '하락';
              const trendClass = isUp
                ? 'text-rose-600 bg-rose-50 border-rose-100'
                : isDown
                  ? 'text-sky-600 bg-sky-50 border-sky-100'
                  : 'text-slate-500 bg-slate-50 border-slate-100';
              return (
                <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <h5 className="text-xs font-black text-slate-700 leading-snug">{item.label}</h5>
                    {item.trend && (
                      <span className={`shrink-0 text-[9px] font-black px-2 py-0.5 rounded border ${trendClass}`}>
                        {isUp ? '▲' : isDown ? '▼' : '─'}{' '}
                        {item.changeLabel ? `${item.trend} ${item.changeLabel}` : item.trend}
                      </span>
                    )}
                  </div>
                  {item.headlineValue && (
                    <div>
                      {item.subLine && <p className="text-[10px] text-slate-400 font-semibold mb-0.5">{item.subLine}</p>}
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black tabular-nums" style={{ color: meta.color }}>
                          {item.headlineValue}
                        </span>
                        {item.headlineUnit && <span className="text-[10px] font-bold text-slate-400">{item.headlineUnit}</span>}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(category === 'building' || category === 'store') && <BuildingYieldTable ind={indicators} />}
    </div>
  );
}
