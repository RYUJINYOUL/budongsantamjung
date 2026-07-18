'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, MapPin, Loader2 } from 'lucide-react';
import { buildRedevPortalLink } from '../lib/redevSourceLinks';

declare global {
  interface Window {
    kakao: any;
  }
}

const ZONE_STYLE: Record<string, { fill: string; stroke: string }> = {
  zone_redevelopment: { fill: '#EF4444', stroke: '#B91C1C' },
  zone_maintenance: { fill: '#F59E0B', stroke: '#B45309' },
  zone_readjustment: { fill: '#F97316', stroke: '#C2410C' },
  zone_scheduled_maintenance: { fill: '#FBBF24', stroke: '#D97706' },
};

const DEFAULT_ZONE_STYLE = { fill: '#8B5CF6', stroke: '#6D28D9' };

function loadKakaoSdk(callback: () => void) {
  const invoke = () => {
    if (!window.kakao?.maps?.services) {
      throw new Error('카카오 지도 서비스를 불러오지 못했습니다.');
    }
    callback();
  };

  if (window.kakao?.maps) {
    window.kakao.maps.load(invoke);
    return;
  }

  const existing = document.getElementById('kakao-maps-sdk');
  if (existing) {
    if (window.kakao?.maps) {
      window.kakao.maps.load(invoke);
    } else {
      existing.addEventListener('load', () => window.kakao.maps.load(invoke), { once: true });
    }
    return;
  }

  const script = document.createElement('script');
  script.id = 'kakao-maps-sdk';
  script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY}&libraries=services&autoload=false`;
  script.onload = () => window.kakao.maps.load(invoke);
  document.head.appendChild(script);
}

function geocodeSingle(query: string): Promise<{ lat: number; lng: number }> {
  const services = window.kakao?.maps?.services;
  if (!services?.Geocoder) {
    return Promise.reject(new Error('지도 서비스가 준비되지 않았습니다.'));
  }

  return new Promise((resolve, reject) => {
    const geocoder = new services.Geocoder();
    geocoder.addressSearch(query, (result: any[], status: string) => {
      if (status === services.Status.OK && result?.[0]) {
        resolve({ lat: Number(result[0].y), lng: Number(result[0].x) });
        return;
      }
      reject(new Error('not found'));
    });
  });
}

function keywordSearchSingle(query: string): Promise<{ lat: number; lng: number }> {
  const services = window.kakao?.maps?.services;
  if (!services?.Places) {
    return Promise.reject(new Error('not found'));
  }

  return new Promise((resolve, reject) => {
    const places = new services.Places();
    places.keywordSearch(query, (data: any[], placeStatus: string) => {
      if (placeStatus === services.Status.OK && data?.[0]) {
        resolve({ lat: Number(data[0].y), lng: Number(data[0].x) });
        return;
      }
      reject(new Error('not found'));
    });
  });
}

async function geocodeWithCandidates(queries: string[]): Promise<{ lat: number; lng: number }> {
  const unique = [...new Set(queries.map((q) => q.trim()).filter((q) => q.length >= 2))];
  let lastError: Error | null = null;

  for (const query of unique) {
    try {
      return await geocodeSingle(query);
    } catch {
      /* try keyword next */
    }
    try {
      return await keywordSearchSingle(query);
    } catch (e) {
      lastError = e as Error;
    }
  }

  throw lastError || new Error('MAP_GEOCODE_MISS');
}

const MAP_MISS_MESSAGE =
  '이 구역은 지도에 바로 표시하기 어렵습니다. 아래 링크에서 주소를 직접 확인해 주세요.';

function buildMapSearchLinks(query: string) {
  const q = encodeURIComponent(query);
  return {
    kakao: `https://map.kakao.com/?q=${q}`,
    naver: `https://map.naver.com/v5/search/${q}`,
  };
}

function MapExternalLinks({ query, compact = false }: { query: string; compact?: boolean }) {
  if (!query.trim()) return null;
  const links = buildMapSearchLinks(query);

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? '' : 'justify-center'}`}>
      <a
        href={links.kakao}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FEE500] text-[10px] font-extrabold text-[#3B1E1E] hover:opacity-90"
      >
        카카오맵에서 확인 →
      </a>
      <a
        href={links.naver}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#03C75A] text-[10px] font-extrabold text-white hover:opacity-90"
      >
        네이버지도에서 확인 →
      </a>
    </div>
  );
}

interface LocationData {
  displayType: 'polygon' | 'point';
  geometry?: { type: string; coordinates: number[][][] | number[][][][] };
  layer?: string;
  zoneName?: string | null;
  districtName?: string | null;
  source?: string | null;
  center?: { lat: number; lng: number } | null;
  address?: string;
  geocodeQuery?: string;
  geocodeQueries?: string[];
  matchScore?: number;
  cleanupCafeUrl?: string | null;
}

function SourcePortalLink({ link }: { link: { label: string; url: string } }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-[10px] font-extrabold text-white hover:bg-slate-700"
    >
      {link.label}
    </a>
  );
}

function PortalLinkHint({ link }: { link: { hint?: string | null } }) {
  if (!link.hint) return null;
  return (
    <p className="text-[9px] text-slate-400 font-semibold text-center max-w-[280px] leading-relaxed">
      {link.hint}
    </p>
  );
}

interface RedevLocationModalProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  title: string;
  address?: string | null;
  source?: string | null;
}

export default function RedevLocationModal({
  open,
  onClose,
  projectId,
  title,
  address,
  source,
}: RedevLocationModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationInfo, setLocationInfo] = useState<LocationData | null>(null);

  const clearOverlays = useCallback(() => {
    overlaysRef.current.forEach((ov) => ov?.setMap?.(null));
    overlaysRef.current = [];
  }, []);

  const drawOnMap = useCallback(async (data: LocationData) => {
    if (!mapContainerRef.current || !window.kakao?.maps) return;

    clearOverlays();

    let center = data.center;
    if ((!center || !Number.isFinite(center.lat)) && data.displayType === 'point') {
      const queries = data.geocodeQueries?.length
        ? data.geocodeQueries
        : [data.geocodeQuery || data.address].filter(Boolean) as string[];
      if (!queries.length) throw new Error('표시할 주소가 없습니다.');
      center = await geocodeWithCandidates(queries);
    }
    if (!center || !Number.isFinite(center.lat) || !Number.isFinite(center.lng)) {
      throw new Error('표시할 좌표가 없습니다.');
    }

    const kakao = window.kakao;
    const position = new kakao.maps.LatLng(center.lat, center.lng);

    if (!mapRef.current) {
      mapRef.current = new kakao.maps.Map(mapContainerRef.current, {
        center: position,
        level: data.displayType === 'polygon' ? 5 : 3,
      });
    } else {
      mapRef.current.setCenter(position);
      mapRef.current.setLevel(data.displayType === 'polygon' ? 5 : 3);
    }

    if (data.displayType === 'polygon' && data.geometry) {
      const colors = ZONE_STYLE[data.layer || ''] || DEFAULT_ZONE_STYLE;
      const geom = data.geometry;
      const polygonSets: number[][][] =
        geom.type === 'MultiPolygon'
          ? (geom.coordinates as number[][][][]).map((poly) => poly[0])
          : geom.type === 'Polygon'
            ? [geom.coordinates[0] as number[][]]
            : [];

      const bounds = new kakao.maps.LatLngBounds();

      for (const ring of polygonSets) {
        const path = ring.map((coord) => new kakao.maps.LatLng(coord[1], coord[0]));
        path.forEach((p: any) => bounds.extend(p));

        const polygon = new kakao.maps.Polygon({
          path,
          strokeWeight: 2.5,
          strokeColor: colors.stroke,
          strokeOpacity: 0.9,
          fillColor: colors.fill,
          fillOpacity: 0.25,
        });
        polygon.setMap(mapRef.current);
        overlaysRef.current.push(polygon);
      }

      if (!bounds.isEmpty()) {
        mapRef.current.setBounds(bounds, 40, 40, 40, 40);
      }
    } else {
      const markerContent = document.createElement('div');
      markerContent.style.cssText = `
        width: 14px; height: 14px; background: #7c3aed; border: 2px solid #fff;
        border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        transform: translate(-50%, -50%);
      `;
      const overlay = new kakao.maps.CustomOverlay({
        position,
        content: markerContent,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: 3,
      });
      overlay.setMap(mapRef.current);
      overlaysRef.current.push(overlay);
    }

    setTimeout(() => mapRef.current?.relayout(), 80);
  }, [clearOverlays]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setLocationInfo(null);
      clearOverlays();
      mapRef.current = null;
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = () => {
      fetch(`/api/discover/redev/${projectId}/location`)
        .then((res) => res.json())
        .then(async (json) => {
          if (cancelled) return;
          if (!json.success) throw new Error(json.message || '위치 정보를 불러올 수 없습니다.');
          const data = json.data as LocationData;
          setLocationInfo(data);
          await drawOnMap(data);
        })
        .catch((e: Error) => {
          if (!cancelled) {
            const msg = e.message === 'MAP_GEOCODE_MISS' || e.message === 'not found'
              ? MAP_MISS_MESSAGE
              : (e.message || '위치를 불러올 수 없습니다.');
            setError(msg);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    try {
      loadKakaoSdk(load);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [open, projectId, drawOnMap, clearOverlays]);

  const displayAddress = locationInfo?.address || address || '';
  const mapSearchQuery =
    locationInfo?.geocodeQueries?.[0]
    || locationInfo?.geocodeQuery
    || displayAddress
    || title;
  const portalLink = open
    ? buildRedevPortalLink({
      source: locationInfo?.source || source,
      districtName: locationInfo?.districtName || title,
      zoneName: locationInfo?.zoneName,
      title,
      address: displayAddress,
      cleanupCafeUrl: locationInfo?.cleanupCafeUrl,
    })
    : null;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="redev-location-title"
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100">
          <div className="min-w-0">
            <p id="redev-location-title" className="text-sm font-extrabold text-slate-900 line-clamp-2">
              {title}
            </p>
            {displayAddress && (
              <p className="text-[10px] text-slate-500 mt-1 flex items-start gap-1">
                <MapPin className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{displayAddress}</span>
              </p>
            )}
            {locationInfo?.displayType === 'polygon' && (
              <p className="text-[9px] text-violet-600 font-bold mt-1">
                정비구역 폴리곤
                {locationInfo.zoneName ? ` · ${locationInfo.zoneName}` : ''}
              </p>
            )}
            {locationInfo?.displayType === 'point' && !loading && !error && (
              <p className="text-[9px] text-slate-400 font-semibold mt-1">주소 기준 위치 (점)</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative h-[52vh] sm:h-[360px] bg-slate-100">
          <div ref={mapContainerRef} className="absolute inset-0" />
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 z-10">
              <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
              <p className="text-xs font-bold text-slate-600">위치 불러오는 중...</p>
            </div>
          )}
          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 bg-white/95 z-10">
              <p className="text-xs font-bold text-slate-600 text-center leading-relaxed max-w-[280px]">
                {error}
              </p>
              <MapExternalLinks query={mapSearchQuery} />
              {portalLink && (
                <div className="flex flex-col items-center gap-1">
                  <SourcePortalLink link={portalLink} />
                  <PortalLinkHint link={portalLink} />
                </div>
              )}
            </div>
          )}
        </div>

        {!loading && (mapSearchQuery || portalLink) && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 space-y-3">
            {mapSearchQuery && !error && (
              <div>
                <p className="text-[9px] text-slate-400 font-semibold mb-2 text-center">지도에서 직접 확인</p>
                <MapExternalLinks query={mapSearchQuery} compact />
              </div>
            )}
            {portalLink && (
              <div>
                <p className="text-[9px] text-slate-400 font-semibold mb-2 text-center">공식 포털에서 확인</p>
                <div className="flex flex-col items-center gap-1">
                  <SourcePortalLink link={portalLink} />
                  <PortalLinkHint link={portalLink} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
