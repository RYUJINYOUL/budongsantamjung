'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';
import { defaultApartmentDiscoverFilters } from '../../lib/apartmentDiscoverFilters';
import { fetchApartmentDiscover, type ApartmentDiscoverItem } from '../../lib/fetchApartmentDiscover';
import { DEFAULT_MAP_POSITION } from '../../lib/timelineGeo';
import ApartmentAreaPickModal, { type ApartmentComparePickPayload } from '../ApartmentAreaPickModal';

type PickMode = 'home' | 'compare';

type Props = {
  mode: PickMode;
  centerLat?: number | null;
  centerLng?: number | null;
  onRegistered: (payload: {
    masterId?: string;
    rtmsAptSeq?: string;
    r114PropId?: string;
    exclusiveAreaM2: number;
    complexName: string;
    lat?: number | null;
    lng?: number | null;
  }) => void;
  onCancel?: () => void;
};

export default function MyHomeRegisterPanel({
  mode,
  centerLat,
  centerLng,
  onRegistered,
  onCancel,
}: Props) {
  const [lat, setLat] = useState(centerLat ?? DEFAULT_MAP_POSITION.lat);
  const [lng, setLng] = useState(centerLng ?? DEFAULT_MAP_POSITION.lng);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ApartmentDiscoverItem[]>([]);
  const [query, setQuery] = useState('');
  const [pickPending, setPickPending] = useState<ApartmentComparePickPayload | null>(null);
  const [pickedCoords, setPickedCoords] = useState<{ lat?: number | null; lng?: number | null }>({});

  const loadDiscover = useCallback(async (la: number, ln: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApartmentDiscover(
        defaultApartmentDiscoverFilters(),
        { lat: la, lng: ln, radiusKm: 2 },
        undefined,
        { analyzedOnly: false },
      );
      setItems(res.items);
      if (res.items.length === 0) setError('근처 아파트 단지를 찾지 못했습니다.');
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (centerLat != null && centerLng != null) {
      setLat(centerLat);
      setLng(centerLng);
    }
  }, [centerLat, centerLng]);

  useEffect(() => {
    void loadDiscover(lat, lng);
  }, [lat, lng, loadDiscover]);

  useEffect(() => {
    if (centerLat != null && centerLng != null) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, [centerLat, centerLng]);

  const filtered = items.filter((item) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      item.propertyTitle.toLowerCase().includes(q) ||
      (item.address || '').toLowerCase().includes(q) ||
      (item.locationName || '').toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              {mode === 'home' ? '우리집 단지 선택' : '비교 단지 추가'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              근처 단지 목록에서 선택 후 평형을 고릅니다.
            </p>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-600 shrink-0"
            >
              취소
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="단지명 검색"
            className="flex-1 bg-transparent text-xs font-semibold outline-none placeholder:text-slate-400"
          />
        </div>

        <p className="text-[10px] text-slate-400 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          반경 2km · 주변 아파트
        </p>

        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
          </div>
        )}

        {!loading && error && filtered.length === 0 && (
          <p className="text-xs text-center text-slate-400 py-8 border border-dashed border-slate-200 rounded-xl">
            {error}
          </p>
        )}

        {!loading && filtered.length > 0 && (
          <ul className="max-h-[320px] overflow-y-auto space-y-2 pr-0.5">
            {filtered.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPickedCoords({ lat: item.lat, lng: item.lng });
                    setPickPending({
                      masterId: item.masterId ?? undefined,
                      rtmsAptSeq: item.rtmsAptSeq ?? item.aptSeq ?? undefined,
                      r114PropId: item.r114PropId ?? undefined,
                      complexName: item.propertyTitle,
                      suggestedAreaM2: item.exclusiveArea ?? item.centerM2 ?? item.area,
                    });
                  }}
                  className="w-full text-left rounded-xl border border-slate-200 bg-slate-50/80 hover:border-sky-300 hover:bg-sky-50/50 px-3 py-2.5 transition-colors"
                >
                  <p className="text-xs font-bold text-slate-900">{item.propertyTitle}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                    {item.address || item.locationName || '주소 정보 없음'}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ApartmentAreaPickModal
        pending={pickPending}
        onClose={() => setPickPending(null)}
        pickLabel={mode === 'home' ? '우리집 · 평형 선택' : '비교 단지 · 평형 선택'}
        onPick={(meta) => {
          onRegistered({
            ...meta,
            complexName: meta.complexName ?? pickPending?.complexName ?? '',
            lat: pickedCoords.lat,
            lng: pickedCoords.lng,
          });
        }}
      />
    </>
  );
}
