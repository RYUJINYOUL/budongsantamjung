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
  className?: string;
}

export default function NearbyInfrastructurePanel({ data, variant = 'dark', className = '' }: Props) {
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
        {TAB_CONFIG.map((tab) => {
          const count = byCategory[tab.id]?.length || 0;
          const active = activeTab === tab.id;
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
        })}
      </div>

      {list.length === 0 ? (
        <p className={`text-sm py-8 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          반경 내 {TAB_CONFIG.find((t) => t.id === activeTab)?.label} 호재가 없습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {list.map((item) => (
            <li
              key={`${item.category}-${item.id}`}
              className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 border ${
                isDark ? 'bg-white/[0.03] border-white/5' : 'bg-slate-50 border-slate-100'
              }`}
            >
              <span className={`text-sm font-bold leading-snug ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                {item.displayTitle || item.name}
              </span>
              <div className="shrink-0 text-right">
                <span className={`block text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {formatInfraDistanceLabel(item)}
                </span>
                {item.progress_score != null && (
                  <span className={`block text-[10px] font-bold mt-0.5 ${isDark ? 'text-teal-400/90' : 'text-teal-700'}`}>
                    전망점수 {item.progress_score}
                    <span className={isDark ? ' text-slate-500' : ' text-slate-400'}> (진행·호재 강도)</span>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
