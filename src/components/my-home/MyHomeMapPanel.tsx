'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, MapPin, Plus } from 'lucide-react';
import { defaultApartmentDiscoverFilters } from '../../lib/apartmentDiscoverFilters';
import {
  discoverFeedItemToMapMarker,
  fetchMergedApartmentDiscoverFeed,
  registrationToMapMarker,
  type MyHomeDiscoverFeedItem,
  workplaceToMapMarker,
} from '../../lib/myHomeMapUtils';
import type { MapMarkerProperty } from '../../lib/mapMarkers';
import { DEFAULT_MAP_POSITION, zoomLevelToRadiusKm } from '../../lib/timelineGeo';
import {
  buildMyHomeInsightItems,
  insightItemToMapMarker,
  parseInsightMarkerId,
  type MyHomeInsightItem,
} from '../../lib/myHomeInsightMarkers';
import type { MyApartmentRegistration, MyHomeCompareItem, MyHomeCompareSlot, MyHomeWorkplace } from '../../lib/myHomeTypes';
import { MY_HOME_COMPARE_MAX } from '../../lib/myHomeTypes';
import MyHomeInsightSheet from './MyHomeInsightSheet';
import MyHomeMapDiscoverHintSheet from './MyHomeMapDiscoverHintSheet';
import ApartmentAreaPickModal, { type ApartmentComparePickPayload } from '../ApartmentAreaPickModal';

const KakaoMap = dynamic(() => import('../KakaoMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
    </div>
  ),
});

export type MyHomeMapPickMode = 'home' | 'compare' | null;

type Props = {
  pickMode: MyHomeMapPickMode;
  registration?: MyApartmentRegistration | null;
  compareSlots?: MyHomeCompareSlot[];
  compareResults?: MyHomeCompareItem[];
  workplace?: MyHomeWorkplace;
  onPick: (payload: {
    masterId?: string;
    rtmsAptSeq?: string;
    r114PropId?: string;
    exclusiveAreaM2: number;
    complexName: string;
    lat?: number | null;
    lng?: number | null;
    reportId?: string | null;
  }) => void;
  onPickModeClear?: () => void;
  onStartPickHome?: () => void;
  onStartPickCompare?: () => void;
};

export default function MyHomeMapPanel({
  pickMode,
  registration,
  compareSlots = [],
  compareResults = [],
  workplace = {},
  onPick,
  onPickModeClear,
  onStartPickHome,
  onStartPickCompare,
}: Props) {
  const [mapCenter, setMapCenter] = useState(() => ({
    lat: registration?.lat ?? DEFAULT_MAP_POSITION.lat,
    lng: registration?.lng ?? DEFAULT_MAP_POSITION.lng,
    zoomLevel: registration ? 5 : DEFAULT_MAP_POSITION.zoomLevel,
  }));
  const [discoverFeed, setDiscoverFeed] = useState<MyHomeDiscoverFeedItem[]>([]);
  const [loadingDiscover, setLoadingDiscover] = useState(false);
  const discoverDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const discoverAbortRef = useRef<AbortController | null>(null);
  const [pickPending, setPickPending] = useState<ApartmentComparePickPayload | null>(null);
  const [pickedReportId, setPickedReportId] = useState<string | null>(null);
  const [pickedCoords, setPickedCoords] = useState<{ lat?: number | null; lng?: number | null }>({});
  const [selectedInsight, setSelectedInsight] = useState<MyHomeInsightItem | null>(null);
  const [discoverHintName, setDiscoverHintName] = useState<string | null>(null);
  const itemByIdRef = useRef<Map<string, MyHomeDiscoverFeedItem>>(new Map());
  const insightByIdRef = useRef<Map<string, MyHomeInsightItem>>(new Map());

  useEffect(() => {
    if (registration?.lat != null && registration?.lng != null) {
      setMapCenter((prev) => ({
        ...prev,
        lat: registration.lat!,
        lng: registration.lng!,
      }));
    }
  }, [registration?.lat, registration?.lng]);

  /** 우리집 등록 완료 + 선택 모드 아님 → 저장된 마커(우리집·비교·직장)만 표시 */
  const savedOnlyMode = !!registration && pickMode == null;
  /** 우리집·비교 미등록 — discover 마커 탭 시 안내 */
  const showDiscoverHint = !registration && !pickMode;

  useEffect(() => {
    if (!showDiscoverHint) setDiscoverHintName(null);
  }, [showDiscoverHint]);

  useEffect(() => {
    if (pickMode) setDiscoverHintName(null);
  }, [pickMode]);

  const loadDiscoverFeed = useCallback(async (lat: number, lng: number, zoomLevel: number) => {
    if (savedOnlyMode) return;
    if (discoverAbortRef.current) {
      discoverAbortRef.current.abort();
    }
    const abortController = new AbortController();
    discoverAbortRef.current = abortController;

    setLoadingDiscover(true);
    try {
      const radiusKm = zoomLevelToRadiusKm(zoomLevel);
      const items = await fetchMergedApartmentDiscoverFeed(
        defaultApartmentDiscoverFilters(),
        { lat, lng, radiusKm },
        { signal: abortController.signal },
      );
      if (abortController.signal.aborted) return;
      setDiscoverFeed(items);
      const m = new Map<string, MyHomeDiscoverFeedItem>();
      for (const item of items) m.set(item.id, item);
      itemByIdRef.current = m;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setDiscoverFeed([]);
      itemByIdRef.current = new Map();
    } finally {
      if (discoverAbortRef.current === abortController) {
        setLoadingDiscover(false);
      }
    }
  }, [savedOnlyMode]);

  const scheduleDiscoverFeedLoad = useCallback(
    (lat: number, lng: number, zoomLevel: number) => {
      if (savedOnlyMode) return;
      if (discoverDebounceRef.current) clearTimeout(discoverDebounceRef.current);
      discoverDebounceRef.current = setTimeout(() => {
        void loadDiscoverFeed(lat, lng, zoomLevel);
      }, 600);
    },
    [loadDiscoverFeed, savedOnlyMode],
  );

  useEffect(() => {
    if (savedOnlyMode) {
      if (discoverDebounceRef.current) clearTimeout(discoverDebounceRef.current);
      discoverAbortRef.current?.abort();
      setDiscoverFeed([]);
      itemByIdRef.current = new Map();
      setLoadingDiscover(false);
      return;
    }
    scheduleDiscoverFeedLoad(mapCenter.lat, mapCenter.lng, mapCenter.zoomLevel);
    return () => {
      if (discoverDebounceRef.current) clearTimeout(discoverDebounceRef.current);
      discoverAbortRef.current?.abort();
    };
    // savedOnlyMode 전환 시에만 discover 로드/해제 (지도 이동은 handleMapIdle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedOnlyMode, scheduleDiscoverFeedLoad]);

  const handleMapIdle = useCallback(
    (pos: { lat: number; lng: number; zoomLevel: number }) => {
      setMapCenter(pos);
      if (!savedOnlyMode) {
        scheduleDiscoverFeedLoad(pos.lat, pos.lng, pos.zoomLevel);
      }
    },
    [scheduleDiscoverFeedLoad, savedOnlyMode],
  );

  const savedMarkers = useMemo(() => {
    const markers: MapMarkerProperty[] = [];
    const homeMarker = registration ? registrationToMapMarker(registration, 'home', 'home') : null;
    if (homeMarker) markers.push(homeMarker);
    compareSlots.forEach((slot, i) => {
      const m = registrationToMapMarker(slot, 'compare', `cmp-${i}`);
      if (m) markers.push({ ...m, propertyTitle: `[비교] ${slot.complexName}` });
    });
    const workMarker = workplaceToMapMarker(workplace);
    if (workMarker) markers.push(workMarker);
    return markers;
  }, [registration, compareSlots, workplace]);

  const insightItems = useMemo(
    () => buildMyHomeInsightItems(compareResults, registration, compareSlots),
    [compareResults, registration, compareSlots],
  );

  const insightMarkers = useMemo(() => {
    const m = new Map<string, MyHomeInsightItem>();
    const markers: MapMarkerProperty[] = [];
    for (const item of insightItems) {
      m.set(item.id, item);
      markers.push(insightItemToMapMarker(item));
    }
    insightByIdRef.current = m;
    return markers;
  }, [insightItems]);

  const discoverMarkers = useMemo(() => {
    const markers: MapMarkerProperty[] = [];
    for (const item of discoverFeed) {
      const marker = discoverFeedItemToMapMarker(item);
      if (marker) markers.push(marker);
    }
    return markers;
  }, [discoverFeed]);

  const mapProperties = useMemo(() => {
    if (savedOnlyMode) return savedMarkers;
    return [...discoverMarkers, ...savedMarkers, ...insightMarkers];
  }, [savedOnlyMode, discoverMarkers, savedMarkers, insightMarkers]);

  const handlePropertySelect = useCallback(
    (property: MapMarkerProperty) => {
      if (pickMode) {
        const item = itemByIdRef.current.get(property.id);
        if (!item) return;
        setPickedCoords({ lat: item.lat ?? null, lng: item.lng ?? null });
        setPickedReportId(item.hasReport && item.latestReportId ? item.latestReportId : null);
        setPickPending({
          masterId: item.masterId ?? undefined,
          rtmsAptSeq: item.rtmsAptSeq ?? item.aptSeq ?? undefined,
          r114PropId: item.r114PropId ?? undefined,
          complexName: item.propertyTitle,
          suggestedAreaM2: item.exclusiveArea ?? item.centerM2 ?? item.area ?? undefined,
        });
        return;
      }

      const insightKey = parseInsightMarkerId(property.id);
      if (insightKey) {
        const insight = insightByIdRef.current.get(insightKey);
        setSelectedInsight(insight ?? null);
        return;
      }

      if (showDiscoverHint) {
        const item = itemByIdRef.current.get(property.id);
        if (item) {
          setSelectedInsight(null);
          setDiscoverHintName(item.propertyTitle || '아파트');
        }
      }
    },
    [pickMode, showDiscoverHint],
  );

  const pickLabel =
    pickMode === 'home' ? '우리집 · 평형 선택' : pickMode === 'compare' ? '비교 단지 · 평형 선택' : '';

  const canAddCompare = compareSlots.length < MY_HOME_COMPARE_MAX;
  const showMapRegisterCta =
    !pickMode && (!registration ? !!onStartPickHome : canAddCompare && !!onStartPickCompare);

  return (
    <div className="relative w-full h-full min-h-[280px]">
      <KakaoMap
        properties={mapProperties}
        compactUi={false}
        disableRegionMarkers
        hideMarkerStats={savedOnlyMode}
        searchBarTopClass="top-14 left-4 right-4 lg:top-4"
        initialCenter={{ lat: mapCenter.lat, lng: mapCenter.lng }}
        initialZoomLevel={mapCenter.zoomLevel}
        restoreSavedCenter={false}
        navigationZoomLevel={mapCenter.zoomLevel}
        onMapIdle={handleMapIdle}
        onPropertySelect={handlePropertySelect}
        fitAllPropertiesOnChange={savedOnlyMode}
      />

      {showMapRegisterCta && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 max-w-[92%] pointer-events-none">
          {!registration ? (
            <button
              type="button"
              onClick={onStartPickHome}
              className="pointer-events-auto inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-lg shadow-emerald-500/30 transition-colors active:scale-[0.98]"
            >
              <MapPin className="w-4 h-4 shrink-0" />
              우리집 등록
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartPickCompare}
              className="pointer-events-auto inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-lg shadow-emerald-500/30 transition-colors active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 shrink-0" />
              비교 아파트 등록
            </button>
          )}
        </div>
      )}

      {pickMode && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 max-w-[92%] pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-lg shadow-emerald-500/30">
            <span className="text-center leading-snug">
              {pickMode === 'home'
                ? '지도에서 우리집 단지를 선택하세요'
                : '지도에서 비교할 단지를 선택하세요'}
            </span>
            {onPickModeClear && (
              <button
                type="button"
                onClick={onPickModeClear}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-[10px] font-black"
              >
                취소
              </button>
            )}
          </div>
        </div>
      )}

      {loadingDiscover && !savedOnlyMode && (
        <div
          className={`absolute right-4 z-30 bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-500 flex items-center gap-1.5 ${
            pickMode ? 'bottom-20' : 'bottom-6'
          }`}
        >
          <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
          단지 불러오는 중
        </div>
      )}

      {!pickMode && !savedOnlyMode && insightItems.length > 0 && !selectedInsight && !showMapRegisterCta && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur border border-emerald-200 text-[10px] font-bold text-emerald-700 shadow-sm">
            녹색 점 · 동네 호재 · 탭하여 보기
          </div>
        </div>
      )}

      <MyHomeInsightSheet item={selectedInsight} onClose={() => setSelectedInsight(null)} />

      <MyHomeMapDiscoverHintSheet
        complexName={discoverHintName}
        onClose={() => setDiscoverHintName(null)}
        className={showMapRegisterCta ? 'bottom-[4.75rem]' : undefined}
      />

      <ApartmentAreaPickModal
        pending={pickPending}
        onClose={() => setPickPending(null)}
        pickLabel={pickLabel}
        onPick={(meta) => {
          onPick({
            ...meta,
            complexName: meta.complexName ?? pickPending?.complexName ?? '',
            lat: pickedCoords.lat,
            lng: pickedCoords.lng,
            reportId: pickedReportId,
          });
          setPickPending(null);
          setPickedReportId(null);
          onPickModeClear?.();
        }}
      />
    </div>
  );
}
