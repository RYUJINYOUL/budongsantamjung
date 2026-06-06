'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Building2, ExternalLink, Gavel, Hammer, Lightbulb, MapPin, Newspaper, Scale,
} from 'lucide-react';

function SupplyStatCard({
  label,
  value,
  unit,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  accent: 'sky' | 'purple' | 'rose' | 'amber' | 'teal';
}) {
  const styles = {
    sky: 'bg-sky-50 border-sky-100',
    purple: 'bg-violet-50 border-violet-100',
    rose: 'bg-rose-50 border-rose-100',
    amber: 'bg-amber-50 border-amber-100',
    teal: 'bg-teal-50 border-teal-100',
  };
  const labelStyles = {
    sky: 'text-sky-700',
    purple: 'text-violet-700',
    rose: 'text-rose-600',
    amber: 'text-amber-700',
    teal: 'text-teal-700',
  };
  return (
    <div className={`p-4 rounded-xl border text-center ${styles[accent]}`}>
      <p className={`text-[10px] font-bold mb-1.5 ${labelStyles[accent]}`}>{label}</p>
      <p className="text-lg font-black text-slate-900 tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {unit && <span className="text-[10px] text-slate-400 font-normal ml-0.5">{unit}</span>}
      </p>
      {sub && <p className="text-[10px] text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function EmptyBlock({
  icon: Icon,
  title,
  desc,
}: {
  icon: LucideIcon;
  title: string;
  desc?: string;
}) {
  return (
    <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
      <Icon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
      <p className="text-sm font-bold text-slate-600">{title}</p>
      {desc && <p className="text-xs text-slate-400 mt-1">{desc}</p>}
    </div>
  );
}

function formatNewsDate(date: string) {
  if (!date || date === '-') return '';
  try {
    const d = new Date(date);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString('ko-KR');
  } catch { /* ignore */ }
  return String(date).slice(0, 10);
}

export default function AdditionalInfoPanel({
  housingSupply,
  dynamicNews,
  ordinance,
}: {
  housingSupply?: Record<string, any>;
  dynamicNews?: Record<string, any>;
  ordinance?: Record<string, any>;
}) {
  const hs = housingSupply || {};
  const hasHousing = hs && Object.keys(hs).length > 0;
  const nextYears = hs.nextYears || {};
  const planned = Number(nextYears.planned?.count ?? 0);
  const moveIn = Number(nextYears.moveIn?.count ?? 0);
  const unsold = Number(hs.unsold?.current ?? 0);
  const unsoldTrend = hs.unsold?.trend ?? '';
  const permits = Number(hs.permits?.last12months ?? 0);
  const glutScore = Number(hs.glutScore ?? 0);
  const plannedDetails: any[] = hs.plannedDetails || [];

  const newsItems: any[] = dynamicNews?.items || [];
  const ord = ordinance || {};
  let ordinanceList: any[] = ord.ordinances || [];
  if (ordinanceList.length === 0 && ord.core && typeof ord.core === 'object') {
    ordinanceList = ord.core.ordinances || [];
  }

  const hasAnyData = hasHousing || newsItems.length > 0 || ordinanceList.length > 0;

  if (!hasAnyData) {
    return (
      <section className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
        <Scale className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-600">조례 · 동향 · 공급 데이터 없음</p>
        <p className="text-xs text-slate-400 mt-1">해당 지역의 조례, 개발 동향, 주택 공급 정보가 제공되지 않았습니다.</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-teal-700" />
              <h3 className="font-black text-slate-900 text-lg tracking-tight">조례 · 동향 · 공급</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">지자체 조례, 개발 뉴스, 주택 공급 물량 분석</p>
          </div>
          <span className="shrink-0 text-[10px] font-black text-violet-700 bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-full uppercase tracking-wide">
            지역정보
          </span>
        </div>
      </section>

      {/* 주택 공급 */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-600" />
            <h4 className="font-black text-slate-900 text-sm">주택 공급 현황</h4>
          </div>
        </div>
        <div className="p-5">
          {hasHousing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <SupplyStatCard accent="sky" label="향후 분양 예정" value={planned} unit="세대" />
                <SupplyStatCard accent="purple" label="입주 예정 물량" value={moveIn} unit="세대" />
                <SupplyStatCard
                  accent="rose"
                  label="현재 미분양"
                  value={unsold}
                  unit="세대"
                  sub={unsoldTrend || undefined}
                />
                <SupplyStatCard accent="amber" label="건축허가 (12개월)" value={permits} unit="동" />
              </div>

              {glutScore > 0 && (
                <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/80">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Hammer className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-xs font-bold text-amber-800">공급 과잉 지수</span>
                    </div>
                    <span className="text-sm font-black text-amber-700 tabular-nums">{glutScore} / 100</span>
                  </div>
                  <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, glutScore)}%` }}
                    />
                  </div>
                </div>
              )}

              {plannedDetails.length > 0 && (
                <div>
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-3">
                    예정 분양 · 공급 사업지
                  </p>
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {plannedDetails.map((detail: any, i: number) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/80 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-xs font-black text-sky-700 truncate flex-1">
                            {detail.name || '공급 사업'}
                          </p>
                          <span className="shrink-0 text-[10px] font-bold text-slate-500 tabular-nums">
                            {detail.count?.toLocaleString?.() ?? detail.count ?? 0} 세대
                          </span>
                        </div>
                        {detail.address && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <p className="text-[10px] text-slate-500 truncate">{detail.address}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyBlock
              icon={Building2}
              title="주택 공급 데이터 없음"
              desc="해당 지역의 분양·입주·미분양 정보가 제공되지 않았습니다."
            />
          )}
        </div>
      </section>

      {/* 동적 호재 및 큐레이션 */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-emerald-600" />
            <h4 className="font-black text-slate-900 text-sm">동적 호재 및 큐레이션</h4>
          </div>
          {newsItems.length > 0 && (
            <span className="shrink-0 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
              {newsItems.length}건
            </span>
          )}
        </div>
        <div className="p-5">
          {newsItems.length > 0 ? (
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {newsItems.map((n: any, i: number) => {
                const isHigh = n.confidence === 'high';
                const mag = n.impact?.magnitude;
                const source = n.source || '';
                const hasLink = source.startsWith('http://') || source.startsWith('https://');
                const type = n.type || '호재';
                const dateStr = formatNewsDate(n.date || n.news_date);

                const card = (
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/80 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                          {type}
                        </span>
                        {isHigh && (
                          <span className="text-[10px] font-black text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-md">
                            확실
                          </span>
                        )}
                      </div>
                      {dateStr && <span className="shrink-0 text-[10px] text-slate-400">{dateStr}</span>}
                    </div>
                    <p className="font-bold text-sm text-slate-900 leading-snug mb-1.5 line-clamp-2">{n.title}</p>
                    {n.impact?.description && (
                      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 mb-2">
                        {n.impact.description}
                      </p>
                    )}
                    {n.impact?.area && (
                      <p className="text-[10px] text-teal-700 font-bold mb-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {n.impact.area}
                      </p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {source && !hasLink && (
                        <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded font-bold">
                          {source}
                        </span>
                      )}
                      {mag && (
                        <span className="text-[10px] text-slate-500 font-bold">영향: {mag}</span>
                      )}
                      {hasLink && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                          <ExternalLink className="w-3 h-3" />
                          원문 보기
                        </span>
                      )}
                    </div>
                  </div>
                );

                if (hasLink) {
                  return (
                    <a key={i} href={source} target="_blank" rel="noopener noreferrer" className="block">
                      {card}
                    </a>
                  );
                }
                return <div key={i}>{card}</div>;
              })}
            </div>
          ) : (
            <EmptyBlock
              icon={Lightbulb}
              title="동적 호재 데이터 없음"
              desc="해당 지역의 동적 호재 및 큐레이션 뉴스가 수집되지 않았습니다."
            />
          )}
        </div>
      </section>

      {/* 시군구 조례 */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gavel className="w-4 h-4 text-violet-600" />
            <h4 className="font-black text-slate-900 text-sm">시군구 조례</h4>
          </div>
          {ordinanceList.length > 0 && (
            <span className="shrink-0 text-[10px] font-black text-violet-700 bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-full">
              {ordinanceList.length}건
            </span>
          )}
        </div>
        <div className="p-5">
          {ordinanceList.length > 0 ? (
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {ordinanceList.map((o: any, i: number) => {
                const title = o.title || o.name || '조례 항목';
                const summary = o.summary || o.content;
                return (
                  <div
                    key={i}
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50/80"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <p className="font-black text-sm text-violet-700">{title}</p>
                    </div>
                    {summary ? (
                      <p className="text-[11px] text-slate-600 leading-relaxed pl-3.5">{summary}</p>
                    ) : o.date ? (
                      <p className="text-[10px] text-slate-400 pl-3.5">{o.date}</p>
                    ) : null}
                    {summary && o.date && (
                      <p className="text-[10px] text-slate-400 mt-2 pl-3.5">{o.date}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyBlock
              icon={Gavel}
              title="조례 데이터 없음"
              desc="해당 지역의 시군구 조례 정보가 제공되지 않았습니다."
            />
          )}
        </div>
      </section>
    </div>
  );
}
