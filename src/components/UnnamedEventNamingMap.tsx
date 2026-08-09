'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { reverseGeocodeKakao } from '../lib/geolocation';
import { kakaoMapsSdkUrl } from '../lib/loadKakaoMapsSdk';

declare global {
  interface Window {
    kakao: any;
  }
}

export type UnnamedEventProperties = {
  eventId: number;
  canonical_name: string;
  name_source?: string;
  event_category?: string;
  progress_status?: string;
  phase0_bucket?: string;
  sig_cd?: string;
  region_name?: string | null;
  center_lat?: number | null;
  center_lng?: number | null;
  zone_table?: string;
  zone_id?: number;
  zone_alias?: string | null;
  zone_remark?: string | null;
  hgn_id?: string | null;
  hgn_name?: string | null;
  ntf_date?: string | null;
  notes?: string | null;
  is_unnamed?: boolean;
};

type GeoFeature = {
  type: 'Feature';
  properties: UnnamedEventProperties;
  geometry: { type: string; coordinates: unknown };
};

const FILL = '#F97316';
const STROKE = '#C2410C';
const SELECTED_FILL = '#EF4444';
const SELECTED_STROKE = '#991B1B';

function geojsonToKakaoPaths(geometry: GeoFeature['geometry']): any[][] {
  if (!geometry || !window.kakao?.maps) return [];
  const { LatLng } = window.kakao.maps;

  const ringToPath = (ring: number[][]) =>
    ring.map((coord) => new LatLng(coord[1], coord[0]));

  if (geometry.type === 'Polygon') {
    const coords = geometry.coordinates as number[][][];
    return coords.map((ring) => ringToPath(ring));
  }
  if (geometry.type === 'MultiPolygon') {
    const coords = geometry.coordinates as number[][][][];
    const paths: any[][] = [];
    for (const poly of coords) {
      for (const ring of poly) {
        paths.push(ringToPath(ring));
      }
    }
    return paths;
  }
  return [];
}

function googleMapsUrl(lat?: number | null, lng?: number | null) {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}&z=17`;
}

function kakaoMapsUrl(lat?: number | null, lng?: number | null) {
  if (lat == null || lng == null) return null;
  return `https://map.kakao.com/link/map/위치,${lat},${lng}`;
}

function fitMapToFeatures(map: any, list: GeoFeature[]) {
  if (!map || !window.kakao?.maps || list.length === 0) return;
  const { LatLngBounds, LatLng } = window.kakao.maps;
  const bounds = new LatLngBounds();
  let hasPoint = false;

  for (const feature of list) {
    const lat = feature.properties.center_lat;
    const lng = feature.properties.center_lng;
    if (lat != null && lng != null) {
      bounds.extend(new LatLng(lat, lng));
      hasPoint = true;
    }
  }

  if (hasPoint) {
    map.setBounds(bounds, 80, 80, 80, 380);
  }
}

export default function UnnamedEventNamingMap({
  initialLat = 36.4,
  initialLng = 127.8,
  initialLevel = 8,
}: {
  initialLat?: number;
  initialLng?: number;
  initialLevel?: number;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const polygonsRef = useRef<Map<number, any[]>>(new Map());
  const featuresRef = useRef<GeoFeature[]>([]);

  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [selected, setSelected] = useState<GeoFeature | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [addressLabel, setAddressLabel] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);

  const highlightPolygon = useCallback((eventId: number | null) => {
    polygonsRef.current.forEach((polys, id) => {
      const isSel = id === eventId;
      for (const polygon of polys) {
        polygon.setOptions({
          fillColor: isSel ? SELECTED_FILL : FILL,
          strokeColor: isSel ? SELECTED_STROKE : STROKE,
          fillOpacity: isSel ? 0.45 : 0.28,
          strokeWeight: isSel ? 3 : 2,
        });
      }
    });
  }, []);

  const selectFeature = useCallback(
    (feature: GeoFeature) => {
      setSelected(feature);
      setNameInput('');
      setNotesInput(feature.properties.notes || '');
      highlightPolygon(feature.properties.eventId);
      const lat = feature.properties.center_lat;
      const lng = feature.properties.center_lng;
      if (mapRef.current && lat != null && lng != null) {
        mapRef.current.panTo(new window.kakao.maps.LatLng(lat, lng));
      }
    },
    [highlightPolygon],
  );

  const clearPolygons = useCallback(() => {
    polygonsRef.current.forEach((polys) => {
      for (const p of polys) p.setMap(null);
    });
    polygonsRef.current.clear();
  }, []);

  const drawFeatures = useCallback(
    (list: GeoFeature[]) => {
      const map = mapRef.current;
      if (!map || !window.kakao?.maps) return;
      clearPolygons();
      featuresRef.current = list;

      for (const feature of list) {
        const eventId = feature.properties.eventId;
        if (savedIds.has(eventId)) continue;

        const paths = geojsonToKakaoPaths(feature.geometry);
        const polys: any[] = [];
        for (const path of paths) {
          const polygon = new window.kakao.maps.Polygon({
            map,
            path,
            strokeWeight: 2,
            strokeColor: STROKE,
            strokeOpacity: 0.9,
            fillColor: FILL,
            fillOpacity: 0.28,
          });
          window.kakao.maps.event.addListener(polygon, 'click', () => selectFeature(feature));
          polys.push(polygon);
        }
        if (polys.length) polygonsRef.current.set(eventId, polys);
      }
    },
    [clearPolygons, savedIds, selectFeature],
  );

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/development-events/unnamed-map?unnamed_only=1&limit=2500');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'load failed');
      }
      const list: GeoFeature[] = json.data?.features || [];
      setFeatures(list);
      setSelected(null);
      setNameInput('');
      drawFeatures(list);
      if (mapRef.current) fitMapToFeatures(mapRef.current, list);
      if (list.length === 0) {
        setError('polygon 연결된 미명칭 이벤트가 없습니다.');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '로드 실패');
      setFeatures([]);
      clearPolygons();
    } finally {
      setLoading(false);
    }
  }, [clearPolygons, drawFeatures]);

  const handleSave = async () => {
    if (!selected || !nameInput.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/development-events/${selected.properties.eventId}/name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canonical_name: nameInput.trim(),
          notes: notesInput.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'save failed');
      }
      const id = selected.properties.eventId;
      const polys = polygonsRef.current.get(id);
      if (polys) {
        for (const poly of polys) poly.setMap(null);
        polygonsRef.current.delete(id);
      }
      setSavedIds((prev) => new Set(prev).add(id));
      setFeatures((prev) => prev.filter((f) => f.properties.eventId !== id));
      setSelected(null);
      setNameInput('');
      setNotesInput('');
      highlightPolygon(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const goSibling = (dir: -1 | 1) => {
    if (!selected || features.length === 0) return;
    const idx = features.findIndex((f) => f.properties.eventId === selected.properties.eventId);
    const next = features[(idx + dir + features.length) % features.length];
    if (next) selectFeature(next);
  };

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;
    if (!apiKey) {
      setError('NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY 없음');
      return;
    }

    const init = () => {
      if (!mapContainerRef.current || !window.kakao?.maps) return;
      const map = new window.kakao.maps.Map(mapContainerRef.current, {
        center: new window.kakao.maps.LatLng(initialLat, initialLng),
        level: initialLevel,
      });
      mapRef.current = map;
      setMapReady(true);
      loadEvents();
    };

    if (window.kakao?.maps) {
      window.kakao.maps.load(init);
      return;
    }

    const script = document.createElement('script');
    script.async = true;
        script.src = kakaoMapsSdkUrl(apiKey);
    script.onload = () => window.kakao.maps.load(init);
    document.head.appendChild(script);
  }, [initialLat, initialLng, initialLevel, loadEvents]);

  useEffect(() => {
    if (mapReady) drawFeatures(features);
  }, [features, mapReady, drawFeatures]);

  useEffect(() => {
    if (!selected) {
      setAddressLabel(null);
      setAddressLoading(false);
      return;
    }
    const lat = selected.properties.center_lat;
    const lng = selected.properties.center_lng;
    if (lat == null || lng == null || !mapReady) {
      setAddressLabel(null);
      return;
    }

    let cancelled = false;
    setAddressLoading(true);
    setAddressLabel(null);

    reverseGeocodeKakao(lat, lng)
      .then((addr) => {
        if (!cancelled) setAddressLabel(addr);
      })
      .catch(() => {
        if (!cancelled) setAddressLabel(null);
      })
      .finally(() => {
        if (!cancelled) setAddressLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected, mapReady]);

  const pendingCount = features.length;
  const p = selected?.properties;
  const gUrl = p ? googleMapsUrl(p.center_lat, p.center_lng) : null;
  const kUrl = p ? kakaoMapsUrl(p.center_lat, p.center_lng) : null;

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-950 text-white">
      <header className="shrink-0 z-20 flex flex-wrap items-center gap-3 px-4 py-3 border-b border-white/10 bg-slate-900/95 backdrop-blur">
        <h1 className="text-sm font-black tracking-tight">미명칭 호재 명칭 입력</h1>
        <span className="text-xs text-slate-400">전국 미명칭 · polygon 연결</span>
        <span className="text-xs text-slate-400 ml-auto">
          {loading ? '불러오는 중…' : `남은 ${pendingCount}건 · 저장 ${savedIds.size}건`}
        </span>
      </header>

      <div className="flex-1 relative min-h-0">
        <div ref={mapContainerRef} className="absolute inset-0" />

        <div className="absolute top-3 left-3 z-10 max-w-xs rounded-xl bg-slate-900/90 border border-white/10 p-3 text-[11px] text-slate-300 leading-relaxed shadow-xl">
          <p className="font-bold text-white mb-1">사용법</p>
          <p>주황 polygon 클릭 → 명칭 입력 → 저장</p>
          <p className="mt-2 text-slate-500">
            Google 검색: <strong className="text-slate-300">좌표</strong>가 유리 (PNU는 필지용, 구역엔 보통 없음)
          </p>
        </div>

        {selected && p && (
          <aside className="absolute top-3 right-3 bottom-3 z-10 w-[min(100%,380px)] flex flex-col rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-bold text-orange-400">event #{p.eventId}</p>
                <button
                  type="button"
                  className="text-slate-500 hover:text-white text-xs"
                  onClick={() => {
                    setSelected(null);
                    highlightPolygon(null);
                  }}
                >
                  닫기
                </button>
              </div>
              <p className="text-sm font-bold break-all">{p.canonical_name || '(명칭 없음)'}</p>
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                {(p.region_name || p.sig_cd) && (
                  <span className="px-1.5 py-0.5 rounded bg-white/10">
                    {p.region_name || p.sig_cd}
                  </span>
                )}
                <span className="px-1.5 py-0.5 rounded bg-white/10">{p.event_category}</span>
                <span className="px-1.5 py-0.5 rounded bg-white/10">{p.phase0_bucket}</span>
                {p.zone_alias && (
                  <span className="px-1.5 py-0.5 rounded bg-white/10">SHP: {p.zone_alias}</span>
                )}
                {p.zone_remark && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200">
                    REMARK: {p.zone_remark}
                  </span>
                )}
              </div>
              <div className="text-[11px] leading-snug">
                {addressLoading && (
                  <p className="text-slate-500">주소 조회 중…</p>
                )}
                {!addressLoading && addressLabel && (
                  <p className="text-slate-200 font-bold">{addressLabel}</p>
                )}
                {!addressLoading && !addressLabel && p.center_lat != null && (
                  <p className="text-slate-500">주소 미조회 — Google Maps 참고</p>
                )}
              </div>
              {p.center_lat != null && p.center_lng != null && (
                <p className="text-[10px] font-mono text-slate-400">
                  {p.center_lat.toFixed(6)}, {p.center_lng.toFixed(6)}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                {gUrl && (
                  <a
                    href={gUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-blue-400 hover:underline"
                  >
                    Google Maps
                  </a>
                )}
                {kUrl && (
                  <a
                    href={kUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-yellow-400 hover:underline"
                  >
                    카카오맵
                  </a>
                )}
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col gap-3 overflow-y-auto">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">새 명칭</label>
                <input
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm font-bold focus:border-orange-500 outline-none"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="예: 용산국제업무지구, ○○ 재개발구역"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && nameInput.trim()) handleSave();
                  }}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">메모 (선택)</label>
                <textarea
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs min-h-[72px] resize-none outline-none focus:border-orange-500"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="출처, 고시번호 등"
                />
              </div>
              {p.hgn_name && (
                <p className="text-[10px] text-slate-500">HGN 참고: {p.hgn_name}</p>
              )}
            </div>

            <div className="p-4 border-t border-white/10 flex gap-2">
              <button
                type="button"
                onClick={() => goSibling(-1)}
                className="px-3 py-2 rounded-lg bg-white/10 text-xs font-bold"
              >
                ← 이전
              </button>
              <button
                type="button"
                onClick={() => goSibling(1)}
                className="px-3 py-2 rounded-lg bg-white/10 text-xs font-bold"
              >
                다음 →
              </button>
              <button
                type="button"
                disabled={saving || !nameInput.trim()}
                onClick={handleSave}
                className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-sm font-black"
              >
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
          </aside>
        )}

        {error && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-xl bg-red-950/90 border border-red-500/40 text-xs text-red-200">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
