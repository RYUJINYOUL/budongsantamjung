'use client';

import { useEffect, useState } from 'react';
import { Loader2, MapPin, TrainFront } from 'lucide-react';
import ListingMiniMap from './ListingMiniMap';
import ListingLocationActions from './ListingLocationActions';
import ListingCohortCard from './ListingCohortCard';
import ListingBuildingLiteSections from './ListingBuildingLiteSections';
import {
  fetchListingLiteContext,
  formatPriceEok,
  formatPricePerPyeong,
  type ListingItem,
  type ListingLiteContext,
} from '@/lib/listingInventory';

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
      <span className="text-[11px] text-slate-500 font-semibold shrink-0">{label}</span>
      <span className="text-[13px] font-bold text-slate-900 text-right">{value}</span>
    </div>
  );
}

function formatTradePrice(dealAmount: unknown): string {
  const amt = parseFloat(String(dealAmount || '0').replace(/[^0-9]/g, '')) || 0;
  if (amt >= 10000) {
    const eok = Math.floor(amt / 10000);
    const rest = Math.round(amt % 10000);
    return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만` : `${eok}억`;
  }
  return `${amt.toLocaleString()}만`;
}

function formatDistance(m?: number): string {
  if (m == null || !Number.isFinite(m)) return '';
  if (m >= 1000) return `${(m / 1000).toFixed(1)}km`;
  return `${Math.round(m)}m`;
}

const LAND_LIKE = new Set(['land']);
const COMPOSITE_LITE = new Set(['building', 'store', 'house']);

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException
    ? err.name === 'AbortError'
    : err instanceof Error && err.name === 'AbortError';
}

export default function ListingLitePanel({
  item,
}: {
  item: ListingItem;
}) {
  const meta = item.listingMeta || {};
  const priceLabel = formatPriceEok(item.budgetMan);

  const [liteContext, setLiteContext] = useState<ListingLiteContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [facilitiesOpen, setFacilitiesOpen] = useState(false);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLiteContext(null);
    setContextLoading(true);
    fetchListingLiteContext(item.id, { includeFacilities: false, signal: controller.signal })
      .then((ctx) => {
        if (active) setLiteContext(ctx);
      })
      .catch((err) => {
        if (active && !isAbortError(err)) {
          console.warn('[ListingLitePanel] lite context fetch failed:', err);
        }
      })
      .finally(() => {
        if (active) setContextLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [item.id]);

  useEffect(() => {
    if (!facilitiesOpen || liteContext?.facilities) return;
    let active = true;
    const controller = new AbortController();
    setFacilitiesLoading(true);
    fetchListingLiteContext(item.id, { signal: controller.signal })
      .then((ctx) => {
        if (active && ctx) {
          setLiteContext((prev) => ({ ...(prev || ctx), facilities: ctx.facilities }));
        }
      })
      .catch((err) => {
        if (active && !isAbortError(err)) {
          console.warn('[ListingLitePanel] facilities fetch failed:', err);
        }
      })
      .finally(() => {
        if (active) setFacilitiesLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [facilitiesOpen, item.id, liteContext?.facilities]);

  const landSpec = liteContext?.landSpec;
  const displayPyeong = landSpec?.pyeong ?? item.pyeong;
  const displayAreaM2 = landSpec?.areaM2 ?? item.areaM2;
  const displayJimok = landSpec?.jimok || meta.jimok;
  const displayZoning = landSpec?.zoning || meta.zoning;
  const showLandBlocks = LAND_LIKE.has(item.category);
  const isCompositeLite = COMPOSITE_LITE.has(item.category);
  const nearbyRows = liteContext?.nearbyTrades?.rows || [];

  const statusBadge = item.publishStatus === 'recom'
    ? { text: '추천', className: 'bg-emerald-100 text-emerald-800' }
    : item.hasReport
      ? { text: '분석완료', className: 'bg-blue-100 text-blue-800' }
      : { text: '매매중', className: 'bg-amber-100 text-amber-800' };

  const facilityGroups = liteContext?.facilities || {};
  const facilityCount = Object.values(facilityGroups).reduce((sum, list) => sum + (list?.length || 0), 0);

  return (
    <div className="px-4 pb-4 pt-2 space-y-4">
      <div className="flex flex-wrap gap-1.5">
        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${statusBadge.className}`}>
          {statusBadge.text}
        </span>
        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
          {item.categoryLabel}
        </span>
        {item.aiScore != null && (
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800">
            AI {item.aiScore}점
          </span>
        )}
      </div>

      {item.lat != null && item.lng != null && (
        <div className="space-y-2">
          <ListingMiniMap lat={item.lat} lng={item.lng} label={meta.title || item.propertyTitle} />
          <ListingLocationActions
            address={item.address}
            lat={item.lat}
            lng={item.lng}
            pnu={liteContext?.pnu ?? item.pnu}
          />
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-2xl font-extrabold text-slate-900">{priceLabel}</div>
        {displayZoning && (
          <p className="text-sm text-slate-600 mt-1">&quot;{displayZoning}&quot;</p>
        )}
        {!isCompositeLite && displayPyeong != null && (
          <p className="text-xs text-slate-500 font-semibold mt-2">
            {displayPyeong.toLocaleString()}평
            {displayAreaM2 != null ? ` · ${displayAreaM2.toLocaleString()}㎡` : ''}
            {' · '}
            {formatPricePerPyeong(item.budgetMan, displayPyeong)}
          </p>
        )}
      </section>

      {!isCompositeLite && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-xs font-extrabold text-slate-900 mb-2">매물 정보</h3>
          <div>
            {displayJimok && <SpecRow label="지목" value={displayJimok} />}
            {displayZoning && <SpecRow label="용도지역" value={displayZoning} />}
            {landSpec?.landUse && <SpecRow label="토지이용" value={landSpec.landUse} />}
            {(landSpec?.roadCondition || meta.roadCondition) && (
              <SpecRow label="도로조건" value={landSpec?.roadCondition || meta.roadCondition || '-'} />
            )}
            {meta.buildingUse && <SpecRow label="현재용도" value={meta.buildingUse} />}
            {meta.buildingScale && <SpecRow label="규모" value={meta.buildingScale} />}
            {meta.buildingAge && <SpecRow label="노후" value={meta.buildingAge} />}
            {meta.externalListingId && <SpecRow label="매물번호" value={meta.externalListingId} />}
          </div>
          {meta.description && (
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap mt-3 pt-3 border-t border-slate-100">
              {meta.description}
            </p>
          )}
        </section>
      )}

      {isCompositeLite && meta.description && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-xs font-extrabold text-slate-900 mb-2">매물 설명</h3>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {meta.description}
          </p>
        </section>
      )}

      {contextLoading && (
        <div className="flex items-center justify-center gap-2 py-6 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs font-semibold">시장·주변 정보 불러오는 중…</span>
        </div>
      )}

      {!contextLoading && isCompositeLite && liteContext && (
        <ListingBuildingLiteSections
          variant={
            item.category === 'store'
              ? 'store'
              : item.category === 'house'
                ? 'house'
                : 'building'
          }
          metrics={liteContext.buildingMetrics}
          landSpec={liteContext.landSpec}
          buildingSpec={liteContext.buildingSpec}
          pastTrades={liteContext.buildingPastTrades}
        />
      )}

      {!contextLoading && showLandBlocks && liteContext && (
        <>
          <ListingCohortCard
            cohort={liteContext.cohort}
            nearbyRows={nearbyRows}
          />

          {(liteContext.parcelTrades?.length ?? 0) > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-xs font-extrabold text-slate-900 mb-3">동일 지번 실거래</h3>
              <div className="space-y-2">
                {liteContext.parcelTrades!.slice(0, 5).map((trade, i) => {
                  const year = trade.dealYear;
                  const month = trade.dealMonth;
                  const day = trade.dealDay;
                  const date = year ? `${year}.${month}.${day}` : '-';
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold">{date}</p>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">
                          {String(trade.jimok || '-')} · {String(trade.dealArea || trade.area || '-')}㎡
                        </p>
                      </div>
                      <span className="text-sm font-black text-emerald-600">
                        {formatTradePrice(trade.dealAmount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setFacilitiesOpen((v) => !v)}
          className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-extrabold text-slate-900">주변 시설</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            {facilitiesOpen ? '접기' : '펼치기'}
            {facilityCount > 0 ? ` · ${facilityCount}곳` : ''}
          </span>
        </button>

        {facilitiesOpen && (
          <div className="px-4 pb-4 border-t border-slate-100">
            {facilitiesLoading && (
              <div className="flex items-center justify-center gap-2 py-6 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs font-semibold">주변 시설 검색 중…</span>
              </div>
            )}
            {!facilitiesLoading && facilityCount === 0 && (
              <p className="text-xs text-slate-400 font-semibold py-4 text-center">주변 시설 정보가 없습니다.</p>
            )}
            {!facilitiesLoading && Object.entries(facilityGroups).map(([group, places]) => {
              if (!places?.length) return null;
              return (
                <div key={group} className="mt-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">{group}</p>
                  <div className="space-y-2">
                    {places.map((place, idx) => (
                      <div
                        key={`${group}-${place.id || idx}`}
                        className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{place.name}</p>
                          {place.address && (
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{place.address}</p>
                          )}
                        </div>
                        {place.distance != null && (
                          <span className="text-[10px] font-bold text-emerald-600 shrink-0 flex items-center gap-0.5">
                            <TrainFront className="w-3 h-3" />
                            {formatDistance(place.distance)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {item.hasReport && (item.oneLiner || item.detectiveNote) && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
          <h3 className="text-xs font-extrabold text-emerald-800 mb-2">탐정 요약</h3>
          {item.oneLiner && <p className="text-sm font-bold text-slate-800">{item.oneLiner}</p>}
          {item.detectiveNote && (
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">{item.detectiveNote}</p>
          )}
        </section>
      )}

      {(meta.brokerName || meta.brokerOffice || meta.brokerPhone) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-xs font-extrabold text-slate-900 mb-2">중개사</h3>
          {meta.brokerOffice && (
            <p className="text-sm font-bold text-slate-800">{meta.brokerOffice}</p>
          )}
          {meta.brokerName && (
            <p className="text-xs text-slate-500 mt-0.5">담당 {meta.brokerName}</p>
          )}
          {meta.brokerPhone && (
            <a href={`tel:${meta.brokerPhone}`} className="text-sm font-bold text-emerald-600 mt-2 inline-block">
              {meta.brokerPhone}
            </a>
          )}
        </section>
      )}

      <p className="text-[10px] text-slate-400 leading-relaxed text-center px-1">
        매물 정보는 협력 중개사 제공 자료입니다. 정확한 지번·권리관계는 현장·등기 확인이 필요합니다.
      </p>
    </div>
  );
}
