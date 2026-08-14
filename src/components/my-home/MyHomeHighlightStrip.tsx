'use client';

import type { MyHomeCompareItem } from '../../lib/myHomeTypes';
import { formatMyHomePriceMan, formatMyHomeRise } from '../../lib/myHomeApi';
import { myHomeCompareNewsItems } from '../../lib/myHomeCompareTable';

const EMERALD_BG = 'bg-emerald-500/10 border-emerald-200';

type Props = {
  homeResult?: MyHomeCompareItem | null;
  yoy1y?: number | null;
  cagr3y?: number | null;
  loading?: boolean;
};

function MetricCard({
  label,
  value,
  emphasize,
  valueClass,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  valueClass?: string;
}) {
  return (
    <div
      className={`shrink-0 w-[92px] h-full rounded-xl border px-2.5 flex flex-col items-center justify-center text-center ${
        emphasize ? `${EMERALD_BG} border-emerald-200/80` : 'bg-slate-50 border-slate-200'
      }`}
    >
      <p className={`text-[10px] font-medium leading-tight ${emphasize ? 'text-emerald-600/85' : 'text-slate-400'}`}>
        {label}
      </p>
      <p className={`mt-1 text-sm font-black leading-tight ${valueClass || 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

function riseColor(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return undefined;
  if (v > 0) return 'text-red-500';
  if (v < 0) return 'text-blue-500';
  return undefined;
}

export default function MyHomeHighlightStrip({ homeResult, yoy1y, cagr3y, loading }: Props) {
  const news = myHomeCompareNewsItems(homeResult).slice(0, 5);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <SectionHeader title="우리집 한눈에" />
      <div className="overflow-x-auto overscroll-x-contain touch-pan-x pb-3.5 px-4 scroll-smooth">
        <div className="h-[88px] flex items-stretch">
          {loading ? (
            <div className="flex gap-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-[92px] h-full rounded-xl bg-slate-100 animate-pulse shrink-0" />
              ))}
            </div>
          ) : (
            <div className="flex gap-2.5 w-max min-w-full">
              <MetricCard
                label="최근 평균"
                value={formatMyHomePriceMan(homeResult?.avgPrice1m)}
                emphasize
              />
              <MetricCard
                label="6개월"
                value={formatMyHomeRise(homeResult?.riseRate6m)}
                valueClass={riseColor(homeResult?.riseRate6m)}
              />
              <MetricCard
                label="1년"
                value={formatMyHomeRise(yoy1y)}
                valueClass={riseColor(yoy1y)}
              />
              <MetricCard
                label="3년"
                value={formatMyHomeRise(cagr3y)}
                valueClass={riseColor(cagr3y)}
              />
              <MetricCard
                label="거래량(6개월)"
                value={homeResult?.tradeCount6m != null ? `${homeResult.tradeCount6m}건` : '-'}
              />
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200" />
      <SectionHeader title="우리 동네 호재" top={10} />
      <div className="overflow-x-auto overscroll-x-contain touch-pan-x pb-3.5 px-4 scroll-smooth">
        <div className="h-[96px] flex items-stretch">
          {loading ? (
            <div className="flex gap-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="w-[168px] h-full rounded-xl bg-slate-100 animate-pulse shrink-0" />
              ))}
            </div>
          ) : news.length === 0 ? (
            <NewsCard title="등록된 호재가 없습니다" empty />
          ) : (
            <div className="flex gap-2.5 w-max min-w-full">
              {news.map((item, i) => (
                <NewsCard
                  key={`${item.title}-${i}`}
                  title={item.title}
                  date={item.date || ''}
                  url={item.url}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, top = 14 }: { title: string; top?: number }) {
  return (
    <div className="flex items-center gap-2 px-4" style={{ paddingTop: top, paddingBottom: 8 }}>
      <div className="w-1 h-3.5 rounded-full bg-emerald-500" />
      <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
    </div>
  );
}

function NewsCard({
  title,
  date,
  url,
  empty,
}: {
  title: string;
  date?: string;
  url?: string | null;
  empty?: boolean;
}) {
  const inner = (
    <div
      className={`shrink-0 w-[168px] h-full rounded-xl border px-3.5 py-3 flex flex-col justify-center ${
        empty ? 'bg-slate-50 border-slate-200' : 'bg-emerald-500/5 border-emerald-200/60'
      }`}
    >
      {!empty && date && (
        <p className="text-[10px] text-slate-400 font-medium mb-1 truncate">{date}</p>
      )}
      <p
        className={`text-xs leading-snug line-clamp-2 ${
          empty ? 'text-slate-400 font-medium' : 'text-slate-900 font-semibold underline decoration-emerald-300/50'
        }`}
      >
        {title}
      </p>
    </div>
  );

  if (empty || !url) return inner;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block shrink-0">
      {inner}
    </a>
  );
}
