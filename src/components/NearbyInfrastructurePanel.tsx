'use client';

import { useMemo, useState } from 'react';
import type { InfraCategory } from '../lib/infrastructureMap';
import { formatInfraDistanceLabel } from '../lib/infraDisplay';

export interface NearbyInfrastructureItem {
  id: number;
  name: string;
  category: InfraCategory;
  distanceM: number;
  walkMin?: number | null;
  distanceMode?: 'walk' | 'straight';
  walkable?: boolean;
  nearestLabel?: string;
  displayTitle?: string;
  progress_score?: number | null;
  eventId?: number;
}

export interface NearbyInfrastructureData {
  radiusKm?: number;
  items?: NearbyInfrastructureItem[];
  byCategory?: Partial<Record<InfraCategory, NearbyInfrastructureItem[]>>;
}

const TAB_CONFIG: { id: InfraCategory; label: string }[] = [
  { id: 'railway', label: '철도' },
  { id: 'road', label: '도로' },
  { id: 'construction', label: '건설' },
];

interface Props {
  data?: NearbyInfrastructureData | null;
  variant?: 'dark' | 'light';
  /** Lite 패널 등 임베드: 중복 헤더·큰 패딩 없이 컴팩트 UI */
  layout?: 'default' | 'compact';
  className?: string;
}

export default function NearbyInfrastructurePanel({
  data,
  variant = 'dark',
  layout = 'default',
  className = '',
}: Props) {
  const [activeTab, setActiveTab] = useState<InfraCategory>('railway');

  const byCategory = useMemo(() => {
    const base: Record<InfraCategory, NearbyInfrastructureItem[]> = {
      railway: [],
      road: [],
      construction: [],
    };
    if (!data) return base;
    if (data.byCategory) {
      for (const tab of TAB_CONFIG) {
        base[tab.id] = data.byCategory[tab.id] || [];
      }
      return base;
    }
    for (const item of data.items || []) {
      if (base[item.category]) base[item.category].push(item);
    }
    return base;
  }, [data]);

  const radiusKm = data?.radiusKm ?? 1.5;
  const list = byCategory[activeTab] || [];
  const totalCount = TAB_CONFIG.reduce((n, t) => n + (byCategory[t.id]?.length || 0), 0);
  if (totalCount === 0) return null;

  const isDark = variant === 'dark';
  const isCompact = layout === 'compact';

  const tabButtons = TAB_CONFIG.map((tab) => {
    const count = byCategory[tab.id]?.length || 0;
    const active = activeTab === tab.id;

    if (isCompact) {
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => setActiveTab(tab.id)}
          className={`flex-1 min-w-[3rem] py-1.5 px-1 text-[10px] rounded-lg font-bold transition-colors whitespace-nowrap ${
            active
              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
              : isDark
                ? 'text-zinc-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          {tab.label}
          {count > 0 ? ` (${count})` : ''}
        </button>
      );
    }

    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => setActiveTab(tab.id)}
        className={`pb-2 text-sm font-bold transition-colors ${
          active
            ? isDark
              ? 'text-white border-b-2 border-white'
              : 'text-slate-900 border-b-2 border-slate-900'
            : isDark
              ? 'text-slate-500 hover:text-slate-300'
              : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        {tab.label}
        {count > 0 ? ` (${count})` : ''}
      </button>
    );
  });

  const listContent =
    list.length === 0 ? (
      <p
        className={`text-center ${
          isCompact
            ? `text-xs py-4 rounded-xl border border-dashed ${isDark ? 'border-white/10 text-zinc-500' : 'border-slate-200 text-slate-400'}`
            : `text-sm py-8 ${isDark ? 'text-slate-500' : 'text-slate-400'}`
        }`}
      >
        반경 내 {TAB_CONFIG.find((t) => t.id === activeTab)?.label} 호재가 없습니다.
      </p>
    ) : (
      <ul className={isCompact ? 'space-y-2' : 'space-y-3'}>
        {list.map((item) => (
          <li
            key={`${item.category}-${item.id}`}
            className={
              isCompact
                ? `flex items-start justify-between gap-2 rounded-xl border px-3 py-2.5 ${
                    isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'
                  }`
                : `flex items-center justify-between gap-3 rounded-2xl px-4 py-3 border ${
                    isDark ? 'bg-white/[0.03] border-white/5' : 'bg-slate-50 border-slate-100'
                  }`
            }
          >
            <span
              className={`font-bold leading-snug min-w-0 ${
                isCompact
                  ? `text-xs ${isDark ? 'text-white' : 'text-slate-900'}`
                  : `text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`
              }`}
            >
              {item.displayTitle || item.name}
            </span>
            <div className="shrink-0 text-right">
              {isCompact ? (
                <span
                  className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                    isDark
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {formatInfraDistanceLabel(item)}
                </span>
              ) : (
                <span className={`block text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {formatInfraDistanceLabel(item)}
                </span>
              )}
              {item.progress_score != null && (
                <span
                  className={`block text-[10px] font-bold mt-0.5 ${isDark ? 'text-teal-400/90' : 'text-teal-700'}`}
                >
                  전망점수 {item.progress_score}
                  {!isCompact && (
                    <span className={isDark ? ' text-slate-500' : ' text-slate-400'}> (진행·호재 강도)</span>
                  )}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    );

  if (isCompact) {
    return (
      <div className={className}>
        <p className={`text-[10px] font-medium mb-2 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
          반경 {radiusKm}km · 도로·건설은 직선거리
        </p>
        <div
          className={`flex gap-1 p-1 rounded-xl mb-3 overflow-x-auto ${
            isDark ? 'bg-white/5' : 'bg-slate-100'
          }`}
        >
          {tabButtons}
        </div>
        {listContent}
      </div>
    );
  }

  return (
    <section
      className={`rounded-[28px] border p-6 ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-200'} ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <h4 className={`text-base font-black ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          주변 개발호재
        </h4>
        <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          반경 {radiusKm}km · 도로·건설은 직선거리
        </span>
      </div>

      <div className={`flex gap-4 border-b mb-4 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        {tabButtons}
      </div>

      {listContent}
    </section>
  );
}
