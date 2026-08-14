'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { defaultApartmentDiscoverFilters } from '../../lib/apartmentDiscoverFilters';
import { fetchApartmentDiscover, type ApartmentDiscoverItem } from '../../lib/fetchApartmentDiscover';
import {
  discoverItemToMapMarker,
  registrationToMapMarker,
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
import MyHomeInsightSheet from './MyHomeInsightSheet';
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
};

export default function MyHomeMapPanel({
  pickMode,
  registration,
  compareSlots = [],
  compareResults = [],
  workplace = {},
  onPick,
  onPickModeClear,
}: Props) {
  const [mapCenter, setMapCenter] = useState(() => ({
    lat: registration?.lat ?? DEFAULT_MAP_POSITION.lat,
    lng: registration?.lng ?? DEFAULT_MAP_POSITION.lng,
    zoomLevel: registration ? 5 : DEFAULT_MAP_POSITION.zoomLevel,
  }));
  const [discoverItems, setDiscoverItems] = useState<ApartmentDiscoverItem[]>([]);
  const [loadingDiscover, setLoadingDiscover] = useState(false);
  const [pickPending, setPickPending] = useState<ApartmentComparePickPayload | null>(null);
  const [pickedReportId, setPickedReportId] = useState<string | null>(null);
  const [pickedCoords, setPickedCoords] = useState<{ lat?: number | null; lng?: number | null }>({});
  const [selectedInsight, setSelectedInsight] = useState<MyHomeInsightItem | null>(null);
  const itemByIdRef = useRef<Map<string, ApartmentDiscoverItem>>(new Map());
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

  const loadDiscover = useCallback(async (lat: number, lng: number, zoomLevel: number) => {
    setLoadingDiscover(true);
    try {
      const radiusKm = Math.min(zoomLevelToRadiusKm(zoomLevel), 2.5);
      const res = await fetchApartmentDiscover(
        defaultApartmentDiscoverFilters(),
        { lat, lng, radiusKm },
        undefined,
        { analyzedOnly: false },
      );
      setDiscoverItems(res.items);
      const m = new Map<string, ApartmentDiscoverItem>();
      for (const item of res.items) m.set(item.id, item);
      itemByIdRef.current = m;
    } catch {
      setDiscoverItems([]);
      itemByIdRef.current = new Map();
    } finally {
      setLoadingDiscover(false);
    }
  }, []);

  /** 등록·추가 모드 진입/해제 시 discover 상태 초기화 */
  useEffect(() => {
    if (!pickMode) {
      setDiscoverItems([]);
      itemByIdRef.current = new Map();
      return;
    }
    void loadDiscover(mapCenter.lat, mapCenter.lng, mapCenter.zoomLevel);
    // pickMode 전환 시 1회만 — 이후 이동은 handleMapIdle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickMode]);

  const handleMapIdle = useCallback(
    (pos: { lat: number; lng: number; zoomLevel: number }) => {
      setMapCenter(pos);
      if (pickMode) {
        void loadDiscover(pos.lat, pos.lng, pos.zoomLevel);
      }
    },
    [loadDiscover, pickMode],
  );

  const savedMarkers = useMemo(() => {
    const markers: MapMarkerProperty[] = [];
    const homeMarker = registration ? registrationToMapMarker(registration, 'home') : null;
    if (homeMarker) markers.push(homeMarker);
    compareSlots.forEach((slot, i) => {
      const m = registrationToMapMarker(slot, `cmp-${i}`);
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

  const mapProperties = useMemo(() => {
    if (pickMode) {
      const markers: MapMarkerProperty[] = [];
      for (const item of discoverItems) {
        if (item.lat == null || item.lng == null) continue;
        markers.push(discoverItemToMapMarker(item));
      }
      return markers;
    }
    return [...savedMarkers, ...insightMarkers];
  }, [pickMode, discoverItems, savedMarkers, insightMarkers]);

  const handlePropertySelect = useCallback(
    (property: MapMarkerProperty) => {
      if (pickMode) {
        const item = itemByIdRef.current.get(property.id);
        if (!item) return;
        setPickedCoords({ lat: item.lat, lng: item.lng });
        setPickedReportId(item.latestReportId ?? item.id ?? null);
        setPickPending({
          masterId: item.masterId ?? undefined,
          rtmsAptSeq: item.rtmsAptSeq ?? item.aptSeq ?? undefined,
          r114PropId: item.r114PropId ?? undefined,
          complexName: item.propertyTitle,
          suggestedAreaM2: item.exclusiveArea ?? item.centerM2 ?? item.area,
        });
        return;
      }

      const insightKey = parseInsightMarkerId(property.id);
      if (insightKey) {
        const insight = insightByIdRef.current.get(insightKey);
        setSelectedInsight(insight ?? null);
      }
    },
    [pickMode],
  );

  const pickLabel =
    pickMode === 'home' ? '우리집 · 평형 선택' : pickMode === 'compare' ? '비교 단지 · 평형 선택' : '';

  return (
    <div className="relative w-full h-full min-h-[280px]">
      <KakaoMap
        properties={mapProperties}
        compactUi={false}
        disableRegionMarkers
        hideMarkerStats
        searchBarTopClass="top-14 left-4 right-4 lg:top-4"
        initialCenter={{ lat: mapCenter.lat, lng: mapCenter.lng }}
        navigationZoomLevel={mapCenter.zoomLevel}
        onMapIdle={handleMapIdle}
        onPropertySelect={handlePropertySelect}
        fitAllPropertiesOnChange={false}
      />

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

      {pickMode && loadingDiscover && (
        <div className="absolute bottom-20 right-4 z-30 bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
          단지 불러오는 중
        </div>
      )}

      {!pickMode && insightItems.length > 0 && !selectedInsight && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur border border-emerald-200 text-[10px] font-bold text-emerald-700 shadow-sm">
            녹색 점 · 동네 호재 · 탭하여 보기
          </div>
        </div>
      )}

      <MyHomeInsightSheet item={selectedInsight} onClose={() => setSelectedInsight(null)} />

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
