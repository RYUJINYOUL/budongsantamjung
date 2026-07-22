'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  PAGE_HEADER_TITLE,
  PAGE_STICKY_HEADER,
  PAGE_SUBHEADER,
  PANEL_CARD,
} from '../../components/analyzePanelFormStyles';
import {
  fetchPresaleList,
  getPresaleItemHref,
  type PresaleListItem,
  type PresaleListSectionGroup,
  type PresaleTab,
} from '../../lib/presaleApi';
import { PRESALE_AREA_FILTERS, PRESALE_PRICE_FILTERS } from '../../lib/presaleFilters';
import {
  buildPresaleListQueryString,
  parsePresaleListQuery,
  type PresaleListQuery,
} from '../../lib/presaleListQuery';
import { PRESALE_REGIONS, PRESALE_REGION_CHIP_LABEL, PRESALE_TABS } from '../../lib/presaleRegions';
import { geocodePresaleItems } from '../../lib/presaleGeocode';
import { collectPresaleListItems } from '../../lib/presaleMap';
import { usePresaleShell } from './PresaleShellLayout';
import { Building2, ChevronRight, MapPin } from 'lucide-react';

type PresaleFilterCategory = 'region' | 'area' | 'price';

/** 상단 3탭(민간/공공/분양결과) 제외 — 리스트 UI 약 10% 확대 */
const PRESALE_CHIP =
  'shrink-0 snap-start px-3 py-1.5 rounded-full text-[11px] font-extrabold border transition-all whitespace-nowrap';
const PRESALE_FILTER_CAT =
  'px-3.5 py-2 rounded-lg text-[11px] font-extrabold transition-all';

const PRESALE_LIST_CARD =
  'block rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/40 p-4 shadow-[0_1px_3px_rgba(16,185,129,0.06)] hover:border-emerald-300/90 hover:shadow-md hover:shadow-emerald-500/10 transition-all group';

function statusTone(statusText: string | undefined) {
  const t = statusText || '';
  if (t.includes('특별') || t.includes('청약') || t.includes('접수')) {
    return 'bg-emerald-600 text-white border-emerald-600';
  }
  if (t.includes('예정')) return 'bg-amber-50 text-amber-800 border-amber-200';
  if (t.includes('마감') || t.includes('종료') || t.includes('결과')) {
    return 'bg-slate-100 text-slate-600 border-slate-200';
  }
  return 'bg-emerald-50 text-emerald-800 border-emerald-200';
}

function filterChipClass(active: boolean) {
  return [
    PRESALE_CHIP,
    active
      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20'
      : 'bg-white text-slate-600 border-emerald-100 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50/50',
  ].join(' ');
}

function filterTabClass(active: boolean) {
  return [
    PRESALE_FILTER_CAT,
    active
      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
      : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50/60',
  ].join(' ');
}

const PRESALE_TAB_TAGLINE: Record<PresaleTab, string> = {
  private: '민간분양 · 청약 일정·분양가',
  public: 'LH분양 · 접수 중 공고',
  results: '분양결과 · 마감 단지 요약',
};

function resolvePresaleTabNote(tab: PresaleTab, listHint: string | null): string | null {
  if (tab === 'results') {
    if (listHint?.includes('필터')) return '평형·분양가 필터 적용 중';
    return '대표 평형·분양가·경쟁률';
  }
  if (tab === 'private') {
    if (listHint?.includes('재건축')) return '재건축·재개발(5단계) 포함 · 마감→분양결과 탭';
    return '청약 접수 중 · 마감→분양결과 탭';
  }
  if (tab === 'public') return '접수 중만 표시 · 마감→분양결과 탭';
  return null;
}

function PresaleTabSummary({
  tab,
  total,
  loading,
  listHint,
}: {
  tab: PresaleTab;
  total: number;
  loading: boolean;
  listHint: string | null;
}) {
  const note = resolvePresaleTabNote(tab, listHint);

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1 flex items-center gap-2 rounded-xl border border-emerald-100/70 bg-white/90 px-2.5 py-2">
        <span className="inline-flex shrink-0 items-center justify-center min-w-[3.25rem] rounded-md bg-emerald-600 px-1.5 py-1 text-[10px] font-extrabold text-white tabular-nums leading-none">
          {loading ? '…' : `${total.toLocaleString()}건`}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-emerald-950 leading-tight truncate">{PRESALE_TAB_TAGLINE[tab]}</p>
          {note && <p className="text-[10px] text-slate-400 font-medium leading-snug mt-0.5 line-clamp-2">{note}</p>}
        </div>
      </div>
      <Link
        href="/discover?filter=all&stage=4"
        className="shrink-0 text-[10px] font-extrabold text-emerald-700 hover:text-emerald-900 px-2 py-1.5 rounded-lg border border-emerald-200/70 bg-white hover:bg-emerald-50 transition-colors leading-none"
      >
        관리처분
      </Link>
    </div>
  );
}

function PresaleRegionChips({
  region,
  onRegionChange,
}: {
  region: string;
  onRegionChange: (r: string) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory">
      {PRESALE_REGIONS.map((r) => (
        <button key={r} type="button" onClick={() => onRegionChange(r)} className={filterChipClass(region === r)}>
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

  return (
    <div>
      <div className="flex gap-1 p-0.5 rounded-xl bg-emerald-50/80 border border-emerald-100/80 w-fit">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveCategory(c.id)}
            className={filterTabClass(activeCategory === c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 overflow-x-auto mt-2.5 pb-1 scrollbar-hide snap-x snap-mandatory">
        {activeCategory === 'region' &&
          PRESALE_REGIONS.map((r) => (
            <button key={r} type="button" onClick={() => onRegionChange(r)} className={filterChipClass(region === r)}>
              {PRESALE_REGION_CHIP_LABEL[r]}
            </button>
          ))}
        {activeCategory === 'area' &&
          PRESALE_AREA_FILTERS.map((f) => (
            <button key={f.id} type="button" onClick={() => onAreaChange(f.id)} className={filterChipClass(areaFilter === f.id)}>
              {f.label}
            </button>
          ))}
        {activeCategory === 'price' &&
          PRESALE_PRICE_FILTERS.map((f) => (
            <button key={f.id} type="button" onClick={() => onPriceChange(f.id)} className={filterChipClass(priceFilter === f.id)}>
              {f.label}
            </button>
          ))}
      </div>
    </div>
  );
}

function ActivePresaleCard({
  item,
  listQuery,
  selected,
  onSelect,
}: {
  item: PresaleListItem;
  listQuery: string;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const isRedev = item.itemKind === 'redev';
  const statusText = item.status?.statusText || '분양';

  if (isRedev) {
    return (
      <Link href={getPresaleItemHref(item, listQuery)} className={PRESALE_LIST_CARD}>
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border ${statusTone(statusText)}`}>
                {statusText}
              </span>
              {item.projectType && (
                <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-lg font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                  {item.projectType}
                </span>
              )}
            </div>
            <h2 className="text-[14px] font-black text-slate-900 truncate group-hover:text-emerald-800 leading-snug tracking-tight">
              {item.houseName}
            </h2>
            <p className="text-[11px] text-slate-600 mt-2 flex items-start gap-1.5 line-clamp-2 leading-relaxed">
              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
              {item.address}
            </p>
            {item.salePriceLabel && (
              <p className="text-[11px] mt-2.5 px-2.5 py-1.5 rounded-lg bg-emerald-50/80 border border-emerald-100 text-emerald-800 font-bold inline-block">
                예상 {item.salePriceLabel}
              </p>
            )}
          </div>
          <ChevronRight className="w-[18px] h-[18px] text-emerald-300 shrink-0 mt-1 group-hover:text-emerald-600 transition-colors" />
        </div>
      </Link>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className={`${PRESALE_LIST_CARD} cursor-pointer ${selected ? 'ring-2 ring-emerald-500 border-emerald-400' : ''}`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border ${statusTone(statusText)}`}>
              {statusText}
            </span>
            {item.status?.dDay != null && item.status.dDay >= 0 && (
              <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                D-{item.status.dDay}
              </span>
            )}
          </div>

          <h2 className="text-[14px] font-black text-slate-900 truncate group-hover:text-emerald-800 leading-snug tracking-tight">
            {item.houseName}
          </h2>

          <p className="text-[11px] text-slate-600 mt-2 flex items-start gap-1.5 line-clamp-2 leading-relaxed">
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
            {item.address}
          </p>
        </div>
        <Link
          href={getPresaleItemHref(item, listQuery)}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 p-1 -mr-1 rounded-lg hover:bg-emerald-50 transition-colors"
          aria-label={`${item.houseName} 상세보기`}
        >
          <ChevronRight className="w-[18px] h-[18px] text-emerald-300 group-hover:text-emerald-600 transition-colors" />
        </Link>
      </div>
    </div>
  );
}

function ResultsPresaleCard({
  item,
  listQuery,
  selected,
  onSelect,
}: {
  item: PresaleListItem;
  listQuery: string;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const typeLabel = item.representativeType;
  const title = typeLabel ? `${item.houseName} / ${typeLabel}` : item.houseName;
  const summary = item.resultSummary;
  const priceText = item.priceLabelFull || item.priceLabel;
  const rateText = summary?.competitionRate
    ? `경쟁률 ${summary.competitionRate}`
    : summary?.rateLabel?.replace(/^1순위\s*/, '') || null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className={`${PRESALE_LIST_CARD} cursor-pointer ${selected ? 'ring-2 ring-emerald-500 border-emerald-400' : ''}`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-black text-slate-900 truncate group-hover:text-emerald-800 leading-snug tracking-tight">
            {title}
          </h2>

          <p className="text-[11px] text-slate-600 mt-2 flex items-start gap-1.5 line-clamp-2 leading-relaxed">
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
            {item.address}
          </p>

          {(priceText || rateText) && (
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              {priceText ? (
                <span className="text-[11px] font-bold text-emerald-800 px-2.5 py-1 rounded-lg bg-white border border-emerald-100">
                  분양가 {priceText}
                </span>
              ) : null}
              {rateText ? (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-lg font-extrabold border ${
                    summary?.undersubscribed
                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                      : 'bg-emerald-600 text-white border-emerald-600'
                  }`}
                >
                  {rateText}
                </span>
              ) : null}
            </div>
          )}

          {item.announceLabel && (
            <p className="text-[10px] text-emerald-700/60 font-semibold mt-2">{item.announceLabel}</p>
          )}
        </div>
        <Link
          href={getPresaleItemHref(item, listQuery)}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 p-1 -mr-1 rounded-lg hover:bg-emerald-50 transition-colors"
          aria-label={`${title} 상세보기`}
        >
          <ChevronRight className="w-[18px] h-[18px] text-emerald-300 group-hover:text-emerald-600 transition-colors" />
        </Link>
      </div>
    </div>
  );
}

function SectionBlock({
  section,
  listQuery,
  selectedId,
  onSelectItem,
}: {
  section: PresaleListSectionGroup;
  listQuery: string;
  selectedId: string | null;
  onSelectItem: (item: PresaleListItem) => void;
}) {
  return (
    <section className="mb-5">
      <div className="flex items-center gap-2 mb-2.5 px-0.5">
        <span className="w-1 h-4 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
        <h2 className="text-[13px] font-extrabold text-emerald-950 tracking-tight">{section.title}</h2>
        <div className="flex-1 h-px bg-emerald-100" />
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 tabular-nums">
          {section.items.length}건
        </span>
      </div>
      <ul className="space-y-2.5">
        {section.items.map((item) => (
          <li key={item.id}>
            <ActivePresaleCard
              item={item}
              listQuery={listQuery}
              selected={selectedId === item.id}
              onSelect={() => onSelectItem(item)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function PresalePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    isMobile,
    showMobileMap,
    setShowMobileMap,
    leftPanelBodyClass,
    selectedPresaleId,
    registerListMarkers,
    registerDetailMarker,
  } = usePresaleShell();

  const listQuery = parsePresaleListQuery(searchParams);
  const { tab, region, page, areaFilter, priceFilter } = listQuery;
  const listQueryString = useMemo(() => buildPresaleListQueryString(listQuery), [listQuery]);

  const [items, setItems] = useState<PresaleListItem[]>([]);
  const [sections, setSections] = useState<PresaleListSectionGroup[]>([]);
  const [listMode, setListMode] = useState<'sections' | 'results' | 'flat'>('flat');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiMessage, setApiMessage] = useState<string | null>(null);
  const [listHint, setListHint] = useState<string | null>(null);

  const patchListQuery = useCallback(
    (patch: Partial<PresaleListQuery>) => {
      const next = { ...listQuery, ...patch };
      const qs = buildPresaleListQueryString(next);
      router.replace(`/presale?${qs}`, { scroll: false });
    },
    [listQuery, router],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setApiMessage(null);
    try {
      const data = await fetchPresaleList({
        tab,
        region,
        page,
        limit: 20,
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

  useEffect(() => {
    registerDetailMarker(null);
  }, [registerDetailMarker]);

  const isSectionModeForGeo = listMode === 'sections' && sections.length > 0;

  useEffect(() => {
    if (loading) return;
    const allListItems = collectPresaleListItems(items, sections, isSectionModeForGeo);
    if (allListItems.length === 0) {
      registerListMarkers([], {});
      return;
    }

    let cancelled = false;
    (async () => {
      const coordsById = await geocodePresaleItems(allListItems, (partial) => {
        if (!cancelled) registerListMarkers(allListItems, partial);
      });
      if (!cancelled) registerListMarkers(allListItems, coordsById);
    })();

    return () => {
      cancelled = true;
    };
  }, [items, sections, isSectionModeForGeo, loading, registerListMarkers]);

  const handleSelectItem = useCallback(
    (item: PresaleListItem) => {
      if (item.itemKind === 'redev') return;
      router.push(getPresaleItemHref(item, listQueryString));
    },
    [router, listQueryString],
  );

  const onTabChange = (next: PresaleTab) => {
    patchListQuery({ tab: next, page: 1 });
    if (isMobile) setShowMobileMap(false);
  };

  const isResults = tab === 'results';
  const isSectionMode = listMode === 'sections' && sections.length > 0;

  return (
    <>
      <header className={PAGE_STICKY_HEADER}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 lg:hidden" aria-hidden="true" />
            <h1 className={PAGE_HEADER_TITLE}>분양</h1>
          </div>
          {isMobile && (
            <button
              type="button"
              onClick={() => setShowMobileMap((v) => !v)}
              className="bg-emerald-400 hover:bg-emerald-500 text-white px-3 py-1 rounded-xl font-bold text-xs tracking-wide shadow-sm transition-all active:scale-95"
            >
              {showMobileMap ? '목록보기' : '지도보기'}
            </button>
          )}
        </div>
      </header>

      <div className={`${PAGE_SUBHEADER} py-3 border-b border-emerald-100/80 bg-gradient-to-b from-emerald-50/25 to-white`}>
        <div className="flex w-full mb-3 bg-emerald-50/60 p-0.5 rounded-xl border border-emerald-100/80">
          {PRESALE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              className={`flex-1 py-1.5 rounded-[10px] transition-all text-[13px] ${
                tab === t.id
                  ? 'font-extrabold text-white bg-emerald-600 shadow-sm shadow-emerald-600/20'
                  : 'font-bold text-slate-600 hover:text-emerald-800 hover:bg-white/70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {!isResults ? (
          <div className="mb-3">
            <PresaleRegionChips region={region} onRegionChange={(r) => patchListQuery({ region: r, page: 1 })} />
          </div>
        ) : (
          <div className="mb-3">
            <PresaleFilterBar
              region={region}
              areaFilter={areaFilter}
              priceFilter={priceFilter}
              onRegionChange={(r) => patchListQuery({ region: r, page: 1 })}
              onAreaChange={(id) => patchListQuery({ areaFilter: id, page: 1 })}
              onPriceChange={(id) => patchListQuery({ priceFilter: id, page: 1 })}
            />
          </div>
        )}

        <PresaleTabSummary tab={tab} total={total} loading={loading} listHint={listHint} />
      </div>

      <div className={`flex-1 min-h-0 overflow-y-auto px-4 lg:px-5 py-3.5 pb-6 ${leftPanelBodyClass}`}>
        {error && (
          <div className="mb-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[13px] font-semibold">
            {error}
          </div>
        )}

        {apiMessage && (
          <div className="mb-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[13px] font-semibold">
            {apiMessage}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-9 h-9 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-[13px] font-bold text-slate-400">
              {isResults ? '분양결과 불러오는 중…' : '분양 목록 불러오는 중…'}
            </p>
          </div>
        )}

        {!loading && isSectionMode && (
          <div>
            {sections.map((section) => (
              <SectionBlock
                key={section.key}
                section={section}
                listQuery={listQueryString}
                selectedId={selectedPresaleId}
                onSelectItem={handleSelectItem}
              />
            ))}
          </div>
        )}

        {!loading && isResults && (
          <ul className="space-y-2.5">
            {items.map((item) => (
              <li key={item.id}>
                <ResultsPresaleCard
                  item={item}
                  listQuery={listQueryString}
                  selected={selectedPresaleId === item.id}
                  onSelect={() => handleSelectItem(item)}
                />
              </li>
            ))}
          </ul>
        )}

        {!loading && !isSectionMode && !isResults && (
          <ul className="space-y-2.5">
            {items.map((item) => (
              <li key={item.id}>
                <ActivePresaleCard
                  item={item}
                  listQuery={listQueryString}
                  selected={selectedPresaleId === item.id}
                  onSelect={() => handleSelectItem(item)}
                />
              </li>
            ))}
          </ul>
        )}

        {!loading && !isSectionMode && items.length === 0 && sections.length === 0 && !error && (
          <div className={`${PANEL_CARD} p-9 text-center border-emerald-100 bg-gradient-to-br from-emerald-50/40 to-white`}>
            <Building2 className="w-10 h-10 mx-auto mb-3 text-emerald-300" />
            <p className="text-[15px] font-semibold text-emerald-900/80">해당 조건의 분양 정보가 없습니다.</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2.5 mt-5 pt-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => patchListQuery({ page: Math.max(1, page - 1) })}
              className="px-3.5 py-2 rounded-xl border border-emerald-200 text-[13px] font-bold text-emerald-800 disabled:opacity-40 hover:bg-emerald-50 transition-colors"
            >
              이전
            </button>
            <span className="text-[13px] text-emerald-700 font-bold tabular-nums px-2">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => patchListQuery({ page: page + 1 })}
              className="px-3.5 py-2 rounded-xl border border-emerald-200 text-[13px] font-bold text-emerald-800 disabled:opacity-40 hover:bg-emerald-50 transition-colors"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default function PresaleClientPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col flex-1 min-h-0 items-center justify-center text-slate-500 font-semibold text-sm">
          분양 정보 로딩 중…
        </div>
      }
    >
      <PresalePageInner />
    </Suspense>
  );
}
