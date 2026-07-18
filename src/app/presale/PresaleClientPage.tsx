'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import SideNav from '../../components/SideNav';
import {
  PAGE_HEADER_TITLE,
  PAGE_STICKY_HEADER,
  PANEL_CARD,
  PANEL_SECTION_DESC,
} from '../../components/analyzePanelFormStyles';
import {
  fetchPresaleList,
  encodePresaleId,
  getPresaleItemHref,
  type PresaleListItem,
  type PresaleListSectionGroup,
  type PresaleTab,
} from '../../lib/presaleApi';
import { PRESALE_AREA_FILTERS, PRESALE_PRICE_FILTERS } from '../../lib/presaleFilters';
import { PRESALE_REGIONS, PRESALE_REGION_CHIP_LABEL, PRESALE_TABS } from '../../lib/presaleRegions';
import { Building2, ChevronRight, MapPin } from 'lucide-react';

type PresaleFilterCategory = 'region' | 'area' | 'price';

function PresaleRegionChips({
  region,
  onRegionChange,
}: {
  region: string;
  onRegionChange: (r: string) => void;
}) {
  const chipClass = (active: boolean) =>
    [
      'shrink-0 snap-start px-3 py-1.5 rounded-full text-xs font-extrabold border transition-all whitespace-nowrap',
      active
        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20'
        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700',
    ].join(' ');

  return (
    <div className="flex gap-1.5 overflow-x-auto mb-4 pb-1 scrollbar-hide snap-x snap-mandatory">
      {PRESALE_REGIONS.map((r) => (
        <button key={r} type="button" onClick={() => onRegionChange(r)} className={chipClass(region === r)}>
          {PRESALE_REGION_CHIP_LABEL[r]}
        </button>
      ))}
    </div>
  );
}

function PresaleFilterBar({
  region,
  areaFilter,
  priceFilter,
  onRegionChange,
  onAreaChange,
  onPriceChange,
}: {
  region: string;
  areaFilter: string;
  priceFilter: string;
  onRegionChange: (r: string) => void;
  onAreaChange: (id: string) => void;
  onPriceChange: (id: string) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<PresaleFilterCategory>('region');

  const categories: { id: PresaleFilterCategory; label: string }[] = [
    { id: 'region', label: '지역' },
    { id: 'area', label: '면적' },
    { id: 'price', label: '분양가' },
  ];

  const chipClass = (active: boolean) =>
    [
      'shrink-0 snap-start px-3 py-1.5 rounded-full text-xs font-extrabold border transition-all whitespace-nowrap',
      active
        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20'
        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700',
    ].join(' ');

  const tabClass = (active: boolean) =>
    [
      'px-4 py-2 rounded-lg text-xs font-extrabold transition-all',
      active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100',
    ].join(' ');

  return (
    <div className="mb-4">
      <div className="flex gap-1 p-0.5 rounded-xl bg-slate-100/90 w-fit">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveCategory(c.id)}
            className={tabClass(activeCategory === c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 overflow-x-auto mt-2.5 pb-1 scrollbar-hide snap-x snap-mandatory">
        {activeCategory === 'region' &&
          PRESALE_REGIONS.map((r) => (
            <button key={r} type="button" onClick={() => onRegionChange(r)} className={chipClass(region === r)}>
              {PRESALE_REGION_CHIP_LABEL[r]}
            </button>
          ))}
        {activeCategory === 'area' &&
          PRESALE_AREA_FILTERS.map((f) => (
            <button key={f.id} type="button" onClick={() => onAreaChange(f.id)} className={chipClass(areaFilter === f.id)}>
              {f.label}
            </button>
          ))}
        {activeCategory === 'price' &&
          PRESALE_PRICE_FILTERS.map((f) => (
            <button key={f.id} type="button" onClick={() => onPriceChange(f.id)} className={chipClass(priceFilter === f.id)}>
              {f.label}
            </button>
          ))}
      </div>
    </div>
  );
}

function ActivePresaleCard({ item }: { item: PresaleListItem }) {
  const isRedev = item.itemKind === 'redev';

  return (
    <Link
      href={getPresaleItemHref(item)}
      className="block p-4 hover:bg-emerald-50/50 transition-colors group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-bold text-slate-900 truncate group-hover:text-emerald-700">{item.houseName}</h2>
            {isRedev && item.projectType && (
              <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                {item.projectType}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            {item.address}
          </p>
          <p className="text-xs font-semibold text-emerald-700 mt-2">{item.status?.statusText || '분양'}</p>
          {isRedev && item.salePriceLabel && (
            <p className="text-[11px] text-slate-500 mt-1">예상 분양가 {item.salePriceLabel}</p>
          )}
          {isRedev && item.status?.statusText === '분양예정' && (
            <p className="text-[10px] text-slate-400 mt-0.5">청약홈 공고 전 · 발견 탭 5단계</p>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300 shrink-0 mt-1 group-hover:text-emerald-500" />
      </div>
    </Link>
  );
}

function ResultsPresaleCard({ item }: { item: PresaleListItem }) {
  const typeLabel = item.representativeType;
  const title = typeLabel ? `${item.houseName} / ${typeLabel}` : item.houseName;
  const summary = item.resultSummary;
  const priceText = item.priceLabelFull || item.priceLabel;
  const rateText = summary?.competitionRate ? `경쟁률 ${summary.competitionRate}` : summary?.rateLabel?.replace(/^1순위\s*/, '') || null;

  return (
    <Link
      href={getPresaleItemHref(item)}
      className={`${PANEL_CARD} block p-4 hover:border-emerald-300/80 transition-colors group`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-slate-900 truncate group-hover:text-emerald-700">{title}</h2>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            {item.address}
          </p>
          {(priceText || rateText) && (
            <p className="text-xs font-semibold mt-2">
              {priceText ? <span className="text-slate-800">분양가 {priceText}</span> : null}
              {priceText && rateText ? <span className="text-slate-300 mx-1.5">|</span> : null}
              {rateText ? (
                <span className={summary?.undersubscribed ? 'text-sky-600' : 'text-emerald-700'}>{rateText}</span>
              ) : null}
            </p>
          )}
          {item.announceLabel && (
            <p className="text-[11px] text-slate-400 mt-1">{item.announceLabel}</p>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300 shrink-0 mt-2 group-hover:text-emerald-500" />
      </div>
    </Link>
  );
}

function SectionBlock({ section }: { section: PresaleListSectionGroup }) {
  return (
    <section className="mb-6">
      <div className="flex items-center gap-3 mb-2 px-1">
        <h2 className="text-sm font-black text-slate-800">{section.title}</h2>
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-[10px] font-bold text-slate-400">{section.items.length}건</span>
      </div>
      <div className={`${PANEL_CARD} overflow-hidden divide-y divide-slate-100`}>
        {section.items.map((item) => (
          <ActivePresaleCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function PresalePageInner() {
  const [tab, setTab] = useState<PresaleTab>('private');
  const [region, setRegion] = useState<string>('전국');
  const [page, setPage] = useState(1);
  const [areaFilter, setAreaFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [items, setItems] = useState<PresaleListItem[]>([]);
  const [sections, setSections] = useState<PresaleListSectionGroup[]>([]);
  const [listMode, setListMode] = useState<'sections' | 'results' | 'flat'>('flat');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiMessage, setApiMessage] = useState<string | null>(null);
  const [listHint, setListHint] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setApiMessage(null);
    try {
      const data = await fetchPresaleList({
        tab,
        region,
        page,
        limit: 30,
        areaFilter: tab === 'results' ? areaFilter : undefined,
        priceFilter: tab === 'results' ? priceFilter : undefined,
      });
      if (data.message && !data.items?.length && !data.sections?.length) {
        setApiMessage(data.message);
      }
      setItems(data.items || []);
      setSections(data.sections || []);
      setListMode(data.listMode || 'flat');
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setListHint(data.listHint || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '목록 조회 실패');
      setItems([]);
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [tab, region, page, areaFilter, priceFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const onTabChange = (next: PresaleTab) => {
    setTab(next);
    setPage(1);
  };

  const onRegionChange = (next: string) => {
    setRegion(next);
    setPage(1);
  };

  const isResults = tab === 'results';
  const isSectionMode = listMode === 'sections' && sections.length > 0;

  return (
    <div className="detective-bg min-h-screen text-slate-800 flex font-noto-sans-kr">
      <SideNav />

      <main className="flex-1 lg:ml-16 min-h-screen flex flex-col">
        <header className={PAGE_STICKY_HEADER}>
          <div className="max-w-3xl mx-auto px-4 py-4">
            <h1 className={PAGE_HEADER_TITLE}>분양</h1>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mt-1">
              <p className="text-xs text-slate-500">청약홈 공공데이터 · 민간·공공·분양결과</p>
              <Link
                href="/discover?filter=all&stage=4"
                className="text-xs font-extrabold text-violet-700 hover:text-violet-900 whitespace-nowrap"
              >
                관리처분인가 투자하기 →
              </Link>
            </div>
          </div>
        </header>

        <div className="max-w-3xl mx-auto w-full px-4 pb-24 flex-1">
          <div className="flex gap-1 p-1 bg-slate-200/80 rounded-xl mb-4">
            {PRESALE_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                  tab === t.id
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-600 hover:bg-white/50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {!isResults && (
            <PresaleRegionChips region={region} onRegionChange={onRegionChange} />
          )}

          {isResults && (
            <PresaleFilterBar
              region={region}
              areaFilter={areaFilter}
              priceFilter={priceFilter}
              onRegionChange={onRegionChange}
              onAreaChange={(id) => { setAreaFilter(id); setPage(1); }}
              onPriceChange={(id) => { setPriceFilter(id); setPage(1); }}
            />
          )}

          <p className={`${PANEL_SECTION_DESC} mb-3`}>
            {loading
              ? (isResults ? '분양결과·경쟁률 불러오는 중…' : '불러오는 중…')
              : `총 ${total.toLocaleString()}건`}
            {!loading && listHint ? (
              <span className="block mt-1 text-[11px] text-slate-400">{listHint}</span>
            ) : null}
          </p>

          {error && (
            <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {error}
            </div>
          )}

          {apiMessage && (
            <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              {apiMessage}
            </div>
          )}

          {!loading && isSectionMode && (
            <div>
              {sections.map((section) => (
                <SectionBlock key={section.key} section={section} />
              ))}
            </div>
          )}

          {!loading && isResults && (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id}>
                  <ResultsPresaleCard item={item} />
                </li>
              ))}
            </ul>
          )}

          {!loading && !isSectionMode && !isResults && (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id}>
                  <ActivePresaleCard item={item} />
                </li>
              ))}
            </ul>
          )}

          {!loading && !isSectionMode && items.length === 0 && sections.length === 0 && !error && (
            <div className={`${PANEL_CARD} p-10 text-center text-slate-500`}>
              <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-semibold">해당 조건의 분양 정보가 없습니다.</p>
            </div>
          )}

          {isResults && totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold disabled:opacity-40"
              >
                이전
              </button>
              <span className="px-3 py-2 text-sm text-slate-600">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold disabled:opacity-40"
              >
                다음
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function PresaleClientPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-500 font-semibold">
          분양 정보 로딩 중…
        </div>
      }
    >
      <PresalePageInner />
    </Suspense>
  );
}
