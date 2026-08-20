'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import InfraRouteMiniMap from './InfraRouteMiniMap';
import { kakaoMapsSdkUrl } from '../lib/loadKakaoMapsSdk';
import {
  INFRA_CATEGORY_LABEL,
  INFRA_FOCUS_LEVEL,
  INFRA_MAP_STYLE,
  INFRA_OVERVIEW_MAX_LEVEL,
  InfrastructureProject,
  getInfraLongestPath,
  getInfraStations,
  getInfraTitle,
  isStationCodeName,
  parseInfraCoord,
  toKakaoPath,
} from '../lib/infrastructureMap';

declare global {
  interface Window {
    kakao: any;
  }
}

interface GosiMapProps {
  markers: {
    lat: number;
    lng: number;
    title: string;
    isProperty?: boolean;
    [key: string]: any;
  }[];
  initialCenter?: { lat: number; lng: number };
  sigCd?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onMarkerClick?: (marker: any) => void;
}

const ZONE_COLORS: Record<string, { fill: string; stroke: string, label: string }> = {
  zone_urban_development: { fill: '#60A5FA', stroke: '#2563EB', label: '도시개발' },
  zone_innovation: { fill: '#A78BFA', stroke: '#7C3AED', label: '혁신지구' },
  zone_redevelopment: { fill: '#F87171', stroke: '#DC2626', label: '재개발' },
  zone_readjustment: { fill: '#FB923C', stroke: '#EA580C', label: '재정비' },
  zone_district: { fill: '#34D399', stroke: '#059669', label: '지구단위' },
  zone_maintenance: { fill: '#FBBF24', stroke: '#D97706', label: '정비구역' },
  zone_scheduled_maintenance: { fill: '#FCD34D', stroke: '#F59E0B', label: '정비예정' },
  zone_tourist: { fill: '#F472B6', stroke: '#DB2777', label: '관광특구' },
  zone_industrial_complex: { fill: '#93C5FD', stroke: '#3B82F6', label: '산업단지' },
  zone_housing_land: { fill: '#60A5FA', stroke: '#2563EB', label: '택지개발' },
  zone_public_housing: { fill: '#3B82F6', stroke: '#1D4ED8', label: '공공주택' }
};

const getZoneLabelStyle = (colors: { fill: string; stroke: string }) => `
  padding: 4px 10px;
  background: ${colors.stroke};
  color: #FFFFFF;
  border: 1.5px solid ${colors.fill};
  border-radius: 6px;
  font-size: 11px;
  font-weight: 800;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  white-space: nowrap;
  pointer-events: none;
  transform: translate(-50%, -50%);
`;

const createPropertyMarkerElement = (title: string) => {
  const root = document.createElement('div');
  root.style.cssText = 'display:flex;flex-direction:column;align-items:center;pointer-events:auto;cursor:pointer;';

  const label = document.createElement('div');
  label.textContent = title;
  label.style.cssText = `
    background:#ea580c;color:#fff;font-size:11px;font-weight:800;
    padding:5px 10px;border-radius:8px;white-space:nowrap;max-width:180px;
    overflow:hidden;text-overflow:ellipsis;
    box-shadow:0 2px 8px rgba(0,0,0,0.25);border:2px solid #fff;margin-bottom:4px;
  `;

  const pin = document.createElement('div');
  pin.style.cssText = `
    width:16px;height:16px;background:#ea580c;border:3px solid #fff;
    border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.35);
  `;

  root.appendChild(label);
  root.appendChild(pin);
  return root;
};

const DEFAULT_ACTIVE_LAYERS: Record<string, boolean> = {
  railway: true,
  road: false,
  zone_urban_development: true,
  zone_innovation: false,
  zone_redevelopment: false,
  zone_readjustment: false,
  zone_district: false,
  zone_maintenance: false,
  zone_scheduled_maintenance: false,
  zone_tourist: false,
  zone_industrial_complex: false,
  zone_housing_land: false,
  zone_public_housing: false,
};

type AnchorRect = { top: number; left: number; width: number; height: number };
const EMPTY_ANCHOR: AnchorRect = { top: 0, left: 0, width: 0, height: 0 };

const getPolygonCenter = (paths: any[]): any => {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  const points = Array.isArray(paths[0]) ? paths[0] : paths;
  points.forEach((pt: any) => {
    if (!pt || typeof pt.getLat !== 'function') return;
    const lat = pt.getLat();
    const lng = pt.getLng();
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  });
  return new window.kakao.maps.LatLng((minLat + maxLat) / 2, (minLng + maxLng) / 2);
};

let isScriptLoading = false;
let isScriptLoaded = false;
const scriptCallbacks: (() => void)[] = [];
export default function GosiMap({ markers, initialCenter, sigCd, isExpanded = false, onToggleExpand, onMarkerClick }: GosiMapProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [anchorRect, setAnchorRect] = useState<AnchorRect>(EMPTY_ANCHOR);
  const overlaysRef = useRef<any>({ clusterer: null, items: [] });

  // 공간 데이터 관련 상태
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({ ...DEFAULT_ACTIVE_LAYERS });
  const [isFetching, setIsFetching] = useState(false);
  const [zoneDataVersion, setZoneDataVersion] = useState(0);

  const loadedSigCds = useRef<Set<string>>(new Set());
  const zoneDataCache = useRef<Record<string, any>>({});

  const shpPolygonsRef = useRef<any[]>([]);
  const infraLinesRef = useRef<{ overlay: any; layerKey: string }[]>([]);
  const infraPointsRef = useRef<{ overlay: any; layerKey: string }[]>([]);
  const infraDataCache = useRef<InfrastructureProject[]>([]);
  const infraFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeLayersRef = useRef(activeLayers);
  activeLayersRef.current = activeLayers;
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

  // 인터랙티브 피처 (구역 상세, 미매칭 건, 이력) 관련 상태 및 Ref 추가
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [selectedSigunguName, setSelectedSigunguName] = useState<string>('');
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [gosiHistory, setGosiHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [unmatchedGosiList, setUnmatchedGosiList] = useState<any[]>([]);
  const [selectedInfra, setSelectedInfra] = useState<InfrastructureProject | null>(null);
  const [selectedInfraStation, setSelectedInfraStation] = useState<string>('전체');
  const [infraLocationName, setInfraLocationName] = useState<string>('');
  const [infraGosiHistory, setInfraGosiHistory] = useState<any[]>([]);
  const [infraGosiMeta, setInfraGosiMeta] = useState<any>(null);
  const [isInfraGosiExpanded, setIsInfraGosiExpanded] = useState(true);
  const [isInfraGosiLoading, setIsInfraGosiLoading] = useState(false);

  const unmatchedOverlaysRef = useRef<any[]>([]);
  const selectedInfraRef = useRef<InfrastructureProject | null>(null);
  selectedInfraRef.current = selectedInfra;
  const selectedInfraStationRef = useRef<string>('전체');
  selectedInfraStationRef.current = selectedInfraStation;

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const syncAnchorRect = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    setAnchorRect((prev) => {
      if (
        prev.top === rect.top &&
        prev.left === rect.left &&
        prev.width === rect.width &&
        prev.height === rect.height
      ) {
        return prev;
      }
      return {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
    });
  }, []);

  useLayoutEffect(() => {
    syncAnchorRect();
    if (isExpanded) return;

    const el = anchorRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => syncAnchorRect());
    ro.observe(el);
    window.addEventListener('resize', syncAnchorRect);
    window.addEventListener('scroll', syncAnchorRect, true);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', syncAnchorRect);
      window.removeEventListener('scroll', syncAnchorRect, true);
    };
  }, [isExpanded, syncAnchorRect]);

  useEffect(() => {
    if (!isExpanded || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isExpanded]);

  useEffect(() => {
    return () => {
      unmatchedOverlaysRef.current.forEach(ov => ov.setMap(null));
    };
  }, []);

  // sigCd가 직접 넘어올 경우 지도가 준비되는 즉시 데이터 로드
  useEffect(() => {
    if (map && sigCd && !loadedSigCds.current.has(sigCd)) {
      loadedSigCds.current.add(sigCd);
      fetchZoneData(map, sigCd);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, sigCd]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (anchorRect.width <= 0 || anchorRect.height <= 0) return;
    if (map) return;

    const initMap = () => {
      if (!window.kakao || !window.kakao.maps) return;

      window.kakao.maps.load(() => {
        if (!mapContainer.current) return;

        const center = initialCenter && !isNaN(initialCenter.lat) && !isNaN(initialCenter.lng)
          ? new window.kakao.maps.LatLng(initialCenter.lat, initialCenter.lng)
          : new window.kakao.maps.LatLng(37.566826, 126.9786567);

        const options = {
          center,
          level: 4,
        };

        const kakaoMap = new window.kakao.maps.Map(mapContainer.current, options);
        setMap(kakaoMap);

        fetchInfrastructureData(kakaoMap);
        window.kakao.maps.event.addListener(kakaoMap, 'idle', () => {
          if (infraFetchTimerRef.current) clearTimeout(infraFetchTimerRef.current);
          infraFetchTimerRef.current = setTimeout(() => fetchInfrastructureData(kakaoMap), 450);
        });
        window.kakao.maps.event.addListener(kakaoMap, 'click', () => {
          setSelectedInfra(null);
          setSelectedInfraStation('전체');
          setInfraLocationName('');
        });

        // 지도 이동 시 현재 시군구 파악 후 데이터 패칭 (sigCd가 고정으로 주어진 상세페이지에서는 패칭하지 않음)
        if (!sigCd) {
          window.kakao.maps.event.addListener(kakaoMap, 'idle', () => {
            if (kakaoMap.getLevel() > 8) return;
            const c = kakaoMap.getCenter();
            const geocoder = new window.kakao.maps.services.Geocoder();
            geocoder.coord2RegionCode(c.getLng(), c.getLat(), (result: any, status: any) => {
              if (status === window.kakao.maps.services.Status.OK) {
                const regionCode = result[0]?.code?.substring(0, 5);
                if (regionCode && !loadedSigCds.current.has(regionCode)) {
                  loadedSigCds.current.add(regionCode);
                  fetchZoneData(kakaoMap, regionCode);
                }
              }
            });
          });
        }
      });
    };

    if (!window.kakao) {
      if (!isScriptLoading) {
        isScriptLoading = true;
        const script = document.createElement('script');
        script.src = kakaoMapsSdkUrl(process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY || '');
        script.onload = () => {
          isScriptLoaded = true;
          scriptCallbacks.forEach(cb => cb());
          scriptCallbacks.length = 0;
          initMap();
        };
        document.head.appendChild(script);
      } else {
        scriptCallbacks.push(initMap);
      }
    } else {
      initMap();
    }
  }, [anchorRect.width, anchorRect.height, map, initialCenter, sigCd]);

  // 마커 그리기 (클러스터러 적용)
  useEffect(() => {
    if (!map || !window.kakao || !window.kakao.maps) return;

    // 기존 오버레이/클러스터러 제거
    if (overlaysRef.current) {
      if (overlaysRef.current.clusterer) {
        overlaysRef.current.clusterer.clear();
      } else if (overlaysRef.current.markers) {
        overlaysRef.current.markers.forEach((m: any) => m.setMap(null));
      }
      if (overlaysRef.current.items) {
        overlaysRef.current.items.forEach((ov: any) => ov.setMap(null));
      }
    }

    if (!markers || markers.length === 0) {
      overlaysRef.current = { clusterer: null, items: [] };
      return;
    }

    const bounds = new window.kakao.maps.LatLngBounds();
    let hasValidPoints = false;

    // 툴팁 관리를 위한 배열
    const customOverlays: any[] = [];
    const kakaoMarkers: any[] = [];

    let activeTooltip: HTMLElement | null = null;

    const MarkerClustererCtor = window.kakao.maps.MarkerClusterer;
    const canCluster = typeof MarkerClustererCtor === 'function';
    let clusterer: any = null;

    if (canCluster) {
      clusterer = new MarkerClustererCtor({
        map: map,
        averageCenter: true,
        minLevel: 3,
        disableClickZoom: false,
        styles: [{
          width: '36px', height: '36px',
          background: 'rgba(15, 118, 110, 0.9)',
          color: '#fff',
          textAlign: 'center',
          fontWeight: 'bold',
          lineHeight: '36px',
          borderRadius: '50%',
          border: '3px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          fontSize: '14px',
        }],
      });
    }

    markers.forEach((marker) => {
      if (!marker.lat || !marker.lng) return;

      const position = new window.kakao.maps.LatLng(marker.lat, marker.lng);
      bounds.extend(position);
      hasValidPoints = true;

      if (marker.isProperty) {
        const propertyEl = createPropertyMarkerElement(marker.title || '분석 매물');
        const propertyOverlay = new window.kakao.maps.CustomOverlay({
          position,
          content: propertyEl,
          yAnchor: 1.2,
          zIndex: 12,
        });
        propertyOverlay.setMap(map);
        customOverlays.push(propertyOverlay);

        propertyEl.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onMarkerClick) onMarkerClick(marker);
        });
        return;
      }

      // 일반 마커 생성 (클러스터링용)
      // CustomOverlay 대신 일반 Marker를 써야 MarkerClusterer가 인식합니다.
      const kMarker = new window.kakao.maps.Marker({
        position: position,
      });

      kakaoMarkers.push(kMarker);

      // 툴팁용 커스텀 오버레이 (클릭 시 표시됨)
      const tooltipContainer = document.createElement('div');
      tooltipContainer.className = 'absolute bottom-[30px] -left-1/2 -ml-[30px] bg-teal-700 text-white text-[11px] font-bold px-3 py-1.5 rounded shadow-lg whitespace-nowrap z-50 transition-opacity duration-200';
      tooltipContainer.style.display = 'none';
      tooltipContainer.innerText = marker.title;

      const tail = document.createElement('div');
      tail.className = 'absolute -bottom-[4px] left-1/2 -ml-[4px] w-2 h-2 bg-teal-700 rotate-45';
      tooltipContainer.appendChild(tail);

      const customOverlay = new window.kakao.maps.CustomOverlay({
        position,
        content: tooltipContainer,
        yAnchor: 1,
        zIndex: 5
      });

      customOverlay.setMap(map);
      customOverlays.push(customOverlay);

      // 마커 클릭 이벤트: 툴팁 토글 및 콜백 호출
      window.kakao.maps.event.addListener(kMarker, 'click', () => {
        if (activeTooltip && activeTooltip !== tooltipContainer) {
          activeTooltip.style.display = 'none';
        }

        if (tooltipContainer.style.display === 'none') {
          tooltipContainer.style.display = 'block';
          activeTooltip = tooltipContainer;
        } else {
          tooltipContainer.style.display = 'none';
          activeTooltip = null;
        }

        if (onMarkerClick) {
          onMarkerClick(marker);
        }
      });
    });

    // 지도 빈 공간 클릭 시 툴팁 닫기
    window.kakao.maps.event.addListener(map, 'click', () => {
      if (activeTooltip) {
        activeTooltip.style.display = 'none';
        activeTooltip = null;
      }
    });

    // 클러스터러 또는 개별 마커 표시
    if (clusterer) {
      clusterer.addMarkers(kakaoMarkers);
    } else {
      kakaoMarkers.forEach((m) => m.setMap(map));
    }

    // 정리용으로 저장
    overlaysRef.current = { clusterer, items: customOverlays, markers: kakaoMarkers };

    if (hasValidPoints) {
      // 마커가 잘 보이도록 패딩 적용하여 bounds 설정
      map.setBounds(bounds, 50, 50, 50, 50);
    }
  }, [map, markers]);

  const fetchZoneData = async (kakaoMap: any, sigCd: string) => {
    try {
      setIsFetching(true);
      const [zonesRes, unmatchedRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/zones?sig_cd=${sigCd}`),
        fetch(`${BACKEND_URL}/api/zones/unmatched?sig_cd=${sigCd}`)
      ]);

      if (zonesRes.ok) {
        const json = await zonesRes.json();
        if (json.success && json.data) {
          zoneDataCache.current[sigCd] = json.data;
          setZoneDataVersion(v => v + 1);
        }
      }

      if (unmatchedRes.ok) {
        const uJson = await unmatchedRes.json();
        if (uJson.success && uJson.data) {
          setUnmatchedGosiList(uJson.data);
          drawUnmatchedMarkers(kakaoMap, uJson.data);
        }
      }
    } catch (err) {
      console.error('Zone fetch error:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const drawUnmatchedMarkers = (kakaoMap: any, list: any[]) => {
    if (!kakaoMap || !window.kakao || !window.kakao.maps) return;

    unmatchedOverlaysRef.current.forEach(ov => ov.setMap(null));
    unmatchedOverlaysRef.current = [];

    list.forEach((item: any) => {
      if (!item.regions) return;
      let regionsData = [];
      try {
        regionsData = typeof item.regions === 'string' ? JSON.parse(item.regions) : item.regions;
      } catch(e) {}
      
      const firstCoord = regionsData.find((r: any) => r.lat && r.lng);
      if (!firstCoord) return;

      const position = new window.kakao.maps.LatLng(Number(firstCoord.lat), Number(firstCoord.lng));
      
      const wrapperEl = document.createElement('div');
      wrapperEl.style.cssText = `
        position: relative;
        transform: translate(-50%, -50%);
        cursor: pointer;
      `;

      const dotEl = document.createElement('div');
      dotEl.style.cssText = `
        width: 14px;
        height: 14px;
        background-color: #64748B;
        border: 2px solid #FFFFFF;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      `;
      
      const labelEl = document.createElement('div');
      labelEl.style.cssText = `
        position: absolute;
        top: -24px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(100, 116, 139, 0.9);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 700;
        white-space: nowrap;
        pointer-events: none;
      `;
      labelEl.textContent = '신규 고시';
      
      const popupEl = document.createElement('div');
      popupEl.style.cssText = `
        display: none;
        position: absolute;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        padding: 8px 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        width: 220px;
        z-index: 10;
        cursor: default;
      `;
      
      const titleEl = document.createElement('div');
      titleEl.style.cssText = 'font-size: 12px; font-weight: 700; color: #1E293B; margin-bottom: 6px; line-height: 1.3; word-break: keep-all;';
      titleEl.textContent = item.title;
      popupEl.appendChild(titleEl);
      
      if (item.url) {
        const linkEl = document.createElement('a');
        linkEl.href = item.url;
        linkEl.target = '_blank';
        linkEl.style.cssText = 'font-size: 11px; color: #0EA5E9; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;';
        linkEl.innerHTML = '원문 보기 <svg style="width:12px;height:12px" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>';
        popupEl.appendChild(linkEl);
      }

      wrapperEl.appendChild(popupEl);
      wrapperEl.appendChild(labelEl);
      wrapperEl.appendChild(dotEl);

      let isPopupOpen = false;
      wrapperEl.onclick = (e) => {
        e.stopPropagation();
        isPopupOpen = !isPopupOpen;
        popupEl.style.display = isPopupOpen ? 'block' : 'none';
      };

      const overlay = new window.kakao.maps.CustomOverlay({
        position,
        content: wrapperEl,
        zIndex: 3
      });
      overlay.setMap(kakaoMap);
      unmatchedOverlaysRef.current.push(overlay);
    });
  };

  const toggleHistory = async () => {
    if (isHistoryExpanded) {
      setIsHistoryExpanded(false);
      return;
    }
    
    setIsHistoryExpanded(true);
    if (!selectedFeature || gosiHistory.length > 0) return;

    setIsHistoryLoading(true);
    try {
      const table = selectedFeature.properties.layer;
      const id = selectedFeature.properties.id;
      
      const res = await fetch(`${BACKEND_URL}/api/zones/${table}/${id}/gosi-history`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.history) {
          setGosiHistory(json.data.history);
        }
      }
    } catch (e) {
      console.error('Failed to fetch gosi history:', e);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const formatGosiDate = (d: string) => {
    if (!d) return '-';
    const clean = String(d).replace(/[^0-9]/g, '');
    if (clean.length >= 8) {
      return `${clean.substring(0,4)}.${clean.substring(4,6)}.${clean.substring(6,8)}`;
    }
    return d;
  };

  const resolveInfraLocation = (lat: number, lng: number) => {
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.coord2RegionCode(lng, lat, (result: any, status: any) => {
      if (status === window.kakao.maps.services.Status.OK && result[0]) {
        const addr = result[0];
        setInfraLocationName(`${addr.region_1depth_name} ${addr.region_2depth_name} ${addr.region_3depth_name || ''}`.trim());
      }
    });
  };

  const selectInfraProject = (
    kakaoMap: any,
    item: InfrastructureProject,
    stationName?: string,
    clickLatLng?: any,
  ) => {
    setSelectedFeature(null);
    setSelectedInfra(item);
    setSelectedInfraStation(stationName || '전체');
    setIsHistoryExpanded(false);
    setGosiHistory([]);

    const stations = getInfraStations(item);
    let targetLat: number | null = null;
    let targetLng: number | null = null;

    if (stationName && stationName !== '전체') {
      const station = stations.find((s) => s.name === stationName);
      const coord = station ? parseInfraCoord(station.lat, station.lng) : null;
      if (coord) {
        targetLat = coord.lat;
        targetLng = coord.lng;
        kakaoMap.setCenter(new window.kakao.maps.LatLng(coord.lat, coord.lng));
        kakaoMap.setLevel(INFRA_FOCUS_LEVEL);
      }
    } else if (clickLatLng) {
      targetLat = clickLatLng.getLat();
      targetLng = clickLatLng.getLng();
      kakaoMap.setCenter(clickLatLng);
      kakaoMap.setLevel(INFRA_FOCUS_LEVEL);
    } else if (stationName === '전체') {
      if (stations.length > 0) {
        const mid = stations[Math.floor(stations.length / 2)];
        const coord = parseInfraCoord(mid.lat, mid.lng);
        if (coord) {
          targetLat = coord.lat;
          targetLng = coord.lng;
          kakaoMap.setCenter(new window.kakao.maps.LatLng(coord.lat, coord.lng));
          if (kakaoMap.getLevel() > INFRA_OVERVIEW_MAX_LEVEL) {
            kakaoMap.setLevel(INFRA_OVERVIEW_MAX_LEVEL);
          }
        }
      }
    } else {
      const path = getInfraLongestPath(window.kakao, item);
      if (path.length > 0) {
        const mid = path[Math.floor(path.length / 2)];
        targetLat = mid.getLat();
        targetLng = mid.getLng();
        kakaoMap.setCenter(mid);
        kakaoMap.setLevel(INFRA_FOCUS_LEVEL);
      } else if (stations.length > 0) {
        const coord = parseInfraCoord(stations[0].lat, stations[0].lng);
        if (coord) {
          targetLat = coord.lat;
          targetLng = coord.lng;
          kakaoMap.setCenter(new window.kakao.maps.LatLng(coord.lat, coord.lng));
          kakaoMap.setLevel(INFRA_FOCUS_LEVEL);
        }
      }
    }

    if (targetLat != null && targetLng != null) {
      resolveInfraLocation(targetLat, targetLng);
    } else {
      setInfraLocationName('');
    }

    renderInfrastructure(kakaoMap, infraDataCache.current, activeLayersRef.current);
  };

  const handleInfraStationTab = (stationName: string) => {
    if (!map || !selectedInfra) return;
    selectInfraProject(map, selectedInfra, stationName);
  };

  useEffect(() => {
    if (!selectedInfra) {
      setInfraGosiHistory([]);
      setInfraGosiMeta(null);
      return;
    }

    let cancelled = false;
    setIsInfraGosiLoading(true);
    const stationParam = selectedInfraStation !== '전체' ? `?station=${encodeURIComponent(selectedInfraStation)}` : '';
    fetch(`${BACKEND_URL}/api/infrastructure/${selectedInfra.id}/gosi-history${stationParam}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success && json.data) {
          setInfraGosiHistory(json.data.history || []);
          setInfraGosiMeta(json.data.meta || null);
        } else {
          setInfraGosiHistory([]);
          setInfraGosiMeta(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInfraGosiHistory([]);
          setInfraGosiMeta(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsInfraGosiLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedInfra, selectedInfraStation, BACKEND_URL]);

  const drawZones = (kakaoMap: any) => {
    if (!kakaoMap || !window.kakao?.maps) return;

    shpPolygonsRef.current.forEach(ov => ov.setMap(null));
    shpPolygonsRef.current = [];

    Object.values(zoneDataCache.current).forEach((dataByLayer: any) => {
      Object.entries(dataByLayer).forEach(([layerName, collection]: [string, any]) => {
        if (!activeLayers[layerName]) return;

        const colors = ZONE_COLORS[layerName] || { fill: '#9CA3AF', stroke: '#6B7280' };

        collection.features.forEach((feature: any) => {
          if (!feature.geometry) return;

          let paths: any[] = [];
          if (feature.geometry.type === 'Polygon') {
            paths = [feature.geometry.coordinates[0].map((coord: number[]) => new window.kakao.maps.LatLng(coord[1], coord[0]))];
          } else if (feature.geometry.type === 'MultiPolygon') {
            paths = feature.geometry.coordinates.map((poly: any) =>
              poly[0].map((coord: number[]) => new window.kakao.maps.LatLng(coord[1], coord[0]))
            );
          }

          paths.forEach((path) => {
            const polygon = new window.kakao.maps.Polygon({
              path,
              strokeWeight: 2.5,
              strokeColor: colors.stroke,
              strokeOpacity: 0.9,
              strokeStyle: 'solid',
              fillColor: colors.fill,
              fillOpacity: 0.32,
            });

            window.kakao.maps.event.addListener(polygon, 'mouseover', () => polygon.setOptions({ fillOpacity: 0.52 }));
            window.kakao.maps.event.addListener(polygon, 'mouseout', () => polygon.setOptions({ fillOpacity: 0.32 }));
            window.kakao.maps.event.addListener(polygon, 'click', () => {
              setSelectedInfra(null);
              setSelectedInfraStation('전체');
              setInfraLocationName('');
              setSelectedFeature(feature);
              setSelectedSigunguName('');
              setIsHistoryExpanded(false);
              setGosiHistory([]);

              const center = getPolygonCenter(path);
              const geocoder = new window.kakao.maps.services.Geocoder();
              geocoder.coord2RegionCode(center.getLng(), center.getLat(), (result: any, status: any) => {
                if (status === window.kakao.maps.services.Status.OK) {
                  const addr = result[0];
                  if (addr) {
                    const name = `${addr.region_1depth_name} ${addr.region_2depth_name}`.trim();
                    setSelectedSigunguName(name);
                  }
                }
              });
            });

            polygon.setMap(kakaoMap);
            shpPolygonsRef.current.push(polygon);

            const zoneName = feature.properties.displayName || feature.properties.alias || feature.properties.name;
            if (zoneName) {
              const centerLatLng = getPolygonCenter(path);
              const labelEl = document.createElement('div');
              labelEl.className = 'zone-label-tag';
              labelEl.style.cssText = getZoneLabelStyle(colors);
              labelEl.textContent = zoneName;

              const labelOverlay = new window.kakao.maps.CustomOverlay({
                position: centerLatLng,
                content: labelEl,
                xAnchor: 0.5,
                yAnchor: 0.5,
                zIndex: 2,
              });
              labelOverlay.setMap(kakaoMap);
              shpPolygonsRef.current.push(labelOverlay);
            }
          });
        });
      });
    });
  };

  const clearInfrastructureOverlays = () => {
    infraLinesRef.current.forEach((item) => item.overlay.setMap(null));
    infraPointsRef.current.forEach((item) => item.overlay.setMap(null));
    infraLinesRef.current = [];
    infraPointsRef.current = [];
  };

  const renderInfrastructure = (kakaoMap: any, items: InfrastructureProject[], layers: Record<string, boolean>) => {
    clearInfrastructureOverlays();
    const highlightedId = selectedInfraRef.current?.id;

    items.forEach((item) => {
      const layerKey = item.category;
      if (layerKey !== 'railway' && layerKey !== 'road') return;
      if (!layers[layerKey]) return;

      const style = INFRA_MAP_STYLE[layerKey];
      const isHighlighted = highlightedId === item.id;
      const lineWeight = isHighlighted ? style.lineWeight + 2 : style.lineWeight;
      const lineOpacity = isHighlighted ? 1 : style.lineOpacity;
      let longestPath: any[] = [];

      const bindInfraClick = (overlay: any, latLng?: any) => {
        window.kakao.maps.event.addListener(overlay, 'click', (mouseEvent: any) => {
          if (mouseEvent?.stopPropagation) mouseEvent.stopPropagation();
          selectInfraProject(kakaoMap, item, undefined, latLng || mouseEvent?.latLng);
        });
        window.kakao.maps.event.addListener(overlay, 'mouseover', () => {
          overlay.setOptions({ strokeWeight: lineWeight + 2, strokeOpacity: 1 });
        });
        window.kakao.maps.event.addListener(overlay, 'mouseout', () => {
          overlay.setOptions({ strokeWeight: lineWeight, strokeOpacity: lineOpacity });
        });
      };

      for (const pl of item.polylines || []) {
        const path = toKakaoPath(window.kakao, pl.coordinates || []);
        if (path.length >= 2) {
          if (path.length > longestPath.length) longestPath = path;

          const hitPolyline = new window.kakao.maps.Polyline({
            path,
            strokeWeight: 14,
            strokeColor: style.lineColor,
            strokeOpacity: 0.01,
            strokeStyle: 'solid',
          });
          hitPolyline.setZIndex(layerKey === 'railway' ? 4 : 3);
          bindInfraClick(hitPolyline);
          hitPolyline.setMap(kakaoMap);
          infraLinesRef.current.push({ overlay: hitPolyline, layerKey });

          const polyline = new window.kakao.maps.Polyline({
            path,
            strokeWeight: lineWeight,
            strokeColor: style.lineColor,
            strokeOpacity: lineOpacity,
            strokeStyle: 'solid',
          });
          polyline.setZIndex(layerKey === 'railway' ? 2 : 1);
          polyline.setMap(kakaoMap);
          infraLinesRef.current.push({ overlay: polyline, layerKey });
        }
      }

      if (longestPath.length === 0 && (item.points?.length || 0) >= 2) {
        const path = (item.points || [])
          .map((p) => parseInfraCoord(p.lat, p.lng))
          .filter(Boolean)
          .map((c) => new window.kakao.maps.LatLng(c!.lat, c!.lng));
        if (path.length >= 2) {
          longestPath = path;
          const hitPolyline = new window.kakao.maps.Polyline({
            path,
            strokeWeight: 14,
            strokeColor: style.lineColor,
            strokeOpacity: 0.01,
            strokeStyle: 'solid',
          });
          hitPolyline.setZIndex(3);
          bindInfraClick(hitPolyline);
          hitPolyline.setMap(kakaoMap);
          infraLinesRef.current.push({ overlay: hitPolyline, layerKey });

          const polyline = new window.kakao.maps.Polyline({
            path,
            strokeWeight: lineWeight,
            strokeColor: style.lineColor,
            strokeOpacity: lineOpacity * 0.7,
            strokeStyle: 'shortdash',
          });
          polyline.setZIndex(1);
          polyline.setMap(kakaoMap);
          infraLinesRef.current.push({ overlay: polyline, layerKey });
        }
      }

      if (longestPath.length >= 2) {
        const midIdx = Math.floor(longestPath.length / 2);
        const lineLabelEl = document.createElement('div');
        lineLabelEl.style.cssText = `
          font-size: 11px; font-weight: 800; color: ${style.lineColor}; background: rgba(255, 255, 255, 0.95);
          border: 1.5px solid ${style.lineColor}; padding: 2px 8px; border-radius: 6px; white-space: nowrap;
          cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.15);
        `;
        lineLabelEl.textContent = item.name;
        lineLabelEl.onclick = (e) => {
          e.stopPropagation();
          selectInfraProject(kakaoMap, item);
        };
        const lineLabel = new window.kakao.maps.CustomOverlay({
          position: longestPath[midIdx],
          content: lineLabelEl,
          yAnchor: 1.5,
          zIndex: 5,
        });
        lineLabel.setMap(kakaoMap);
        infraLinesRef.current.push({ overlay: lineLabel, layerKey });
      }

      (item.points || []).forEach((pt) => {
        const coord = parseInfraCoord(pt.lat, pt.lng);
        if (!coord || isStationCodeName(pt.name)) return;

        const stationEl = document.createElement('div');
        const isActiveStation = isHighlighted && pt.name === selectedInfraStationRef.current;
        stationEl.style.cssText = `
          padding: 4px 10px; background: ${isActiveStation ? style.lineColor : style.pointBg}; border: 2px solid ${style.lineColor};
          border-radius: 999px; font-size: 10px; font-weight: 800; color: ${isActiveStation ? '#fff' : style.pointColor};
          white-space: nowrap; transform: translate(-50%, -50%); box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          cursor: pointer;
        `;
        stationEl.textContent = pt.name || '';
        stationEl.onclick = (e) => {
          e.stopPropagation();
          selectInfraProject(kakaoMap, item, pt.name || undefined);
        };

        const overlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(coord.lat, coord.lng),
          content: stationEl,
          xAnchor: 0.5,
          yAnchor: 0.5,
          zIndex: 6,
        });
        overlay.setMap(kakaoMap);
        infraPointsRef.current.push({ overlay, layerKey });
      });
    });
  };

  const fetchInfrastructureData = async (kakaoMap: any) => {
    try {
      const bounds = kakaoMap.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const params = new URLSearchParams({
        swLat: String(sw.getLat()),
        swLng: String(sw.getLng()),
        neLat: String(ne.getLat()),
        neLng: String(ne.getLng()),
        category: 'railway,road',
      });

      const res = await fetch(`${BACKEND_URL}/api/infrastructure/lines?${params}`);
      if (!res.ok) return;

      const json = await res.json();
      const items: InfrastructureProject[] = json.data || [];
      infraDataCache.current = items;
      renderInfrastructure(kakaoMap, items, activeLayersRef.current);
    } catch (err) {
      console.error('Infrastructure fetch error:', err);
    }
  };

  const updateInfrastructureVisibility = (layers: Record<string, boolean>) => {
    if (!map) return;
    renderInfrastructure(map, infraDataCache.current, layers);
  };

  // activeLayers 또는 zone 데이터가 바뀔 때마다 다시 그리기
  useEffect(() => {
    if (map) {
      drawZones(map);
      updateInfrastructureVisibility(activeLayers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayers, map, zoneDataVersion, selectedInfra, selectedInfraStation]);

  // 지도가 커지거나 작아질 때(크게보기) 카카오맵 리사이즈 트리거
  useEffect(() => {
    if (map) {
      setTimeout(() => map.relayout(), 100);

      // 전체화면 시 마커가 다시 중심에 오도록 bounds 재설정
      if (markers && markers.length > 0) {
        const bounds = new window.kakao.maps.LatLngBounds();
        markers.forEach(m => bounds.extend(new window.kakao.maps.LatLng(m.lat, m.lng)));
        setTimeout(() => map.setBounds(bounds, 50, 50, 50, 50), 150);
      }
    }
  }, [isExpanded, map, markers]);

  const toggleLayer = (layerKey: string) => {
    setActiveLayers(prev => ({
      ...prev,
      [layerKey]: !prev[layerKey]
    }));
  };

  const mapUi = (
    <div className={`relative w-full h-full transition-all duration-300 ${isExpanded ? 'bg-white' : 'rounded-xl'}`}>
      <div ref={mapContainer} className="w-full h-full" />

      {/* 철도·도로 노선 클릭 시 상세 패널 */}
      {selectedInfra && (
        <div className="absolute top-14 left-3 right-3 sm:left-auto sm:right-3 z-20 w-auto sm:w-[320px] max-h-[calc(100%-5rem)] overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 text-slate-900 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex justify-between items-start mb-2 gap-2">
            <h3 className="font-black text-[15px] text-slate-900 break-keep leading-snug">
              {getInfraTitle(selectedInfra, selectedInfraStation)}
            </h3>
            <button
              onClick={() => {
                setSelectedInfra(null);
                setSelectedInfraStation('전체');
                setInfraLocationName('');
                if (map) renderInfrastructure(map, infraDataCache.current, activeLayersRef.current);
              }}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="text-[10px] text-slate-500 mb-3 flex items-center gap-1.5 font-bold">
            <span className={`px-2 py-0.5 rounded-md border ${
              selectedInfra.category === 'railway'
                ? 'bg-green-50 text-green-600 border-green-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              {INFRA_CATEGORY_LABEL[selectedInfra.category as 'railway' | 'road']}
            </span>
            {infraLocationName && <span className="truncate">· {infraLocationName}</span>}
          </div>

          {getInfraStations(selectedInfra).length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 no-scrollbar">
              {['전체', ...getInfraStations(selectedInfra).map((s) => s.name!).filter(Boolean)].map((tab) => {
                const isActive = selectedInfraStation === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => handleInfraStationTab(tab)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mb-3">
            <InfraRouteMiniMap item={selectedInfra} selectedStation={selectedInfraStation} />
          </div>

          {getInfraStations(selectedInfra).length > 0 && (
            <div className="text-[11px] text-slate-500 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 mb-3">
              <span className="font-bold text-slate-700">경유 역·지점</span>
              <span className="mx-1">·</span>
              {getInfraStations(selectedInfra).map((s) => s.name).join(' → ')}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsInfraGosiExpanded((v) => !v)}
              className="w-full flex items-center justify-between text-[11px] font-bold text-indigo-700 py-1"
            >
              <span className="flex items-center gap-1.5">
                <span>📋</span>
                관보 · 고시 이력
              </span>
              <svg className={`w-3.5 h-3.5 transition-transform ${isInfraGosiExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isInfraGosiExpanded && (
              <div className="mt-2 space-y-1.5 max-h-[160px] overflow-y-auto">
                {isInfraGosiLoading ? (
                  <div className="text-center py-4 text-[10px] text-slate-400 font-semibold">고시 조회 중...</div>
                ) : infraGosiHistory.length === 0 ? (
                  <div className="text-center py-3 text-[10px] text-slate-500 bg-slate-50 rounded-xl border border-slate-100 font-semibold">
                    {infraGosiMeta?.gov_notice_no
                      ? `관련 고시: ${infraGosiMeta.gov_notice_no}`
                      : '등록된 관보·고시 이력이 없습니다.'}
                  </div>
                ) : (
                  infraGosiHistory.map((history, idx) => (
                    <div key={history.id || idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 hover:border-indigo-200 transition-colors">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[9px] font-bold text-indigo-600 shrink-0">
                          {history.gosi_date ? new Date(history.gosi_date).toLocaleDateString('ko-KR') : '-'}
                        </span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase truncate">
                          {history.source === 'gwanbo' ? '전자관보' : '고시'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-800 font-bold leading-snug line-clamp-2 mb-1.5">
                        {history.title}
                      </p>
                      {history.url && (
                        <a
                          href={history.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[9px] text-indigo-600 hover:underline font-bold"
                        >
                          {history.source === 'gwanbo' ? '관보 원문 보기' : '고시 원문 보기'}
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 text-[9px] text-slate-400 flex justify-between">
            <span>출처</span>
            <span>국토교통부 · 전자관보</span>
          </div>
        </div>
      )}

      {/* 구역 클릭 시 정보 카드 + 고시 이력 UI */}
      {selectedFeature && (
        <div className="absolute top-14 right-3 z-20 w-[290px] bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl p-4 text-white animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-[13px] text-white break-keep pr-4 leading-snug">
              {selectedFeature.properties.displayName || selectedFeature.properties.alias || selectedFeature.properties.name || '명칭 미확인'}
            </h3>
            <button 
              onClick={() => setSelectedFeature(null)}
              className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="text-[10px] text-slate-400 mb-3 flex items-center gap-1.5 font-medium flex-wrap">
            <span className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 border border-slate-700 font-bold shrink-0">
              {selectedFeature.properties.layer === 'zone_urban_development' ? '도시개발구역' :
               selectedFeature.properties.layer === 'zone_innovation' ? '혁신지구' :
               selectedFeature.properties.layer === 'zone_redevelopment' ? '재개발구역' :
               selectedFeature.properties.layer === 'zone_readjustment' ? '재정비촉진지구' :
               selectedFeature.properties.layer === 'zone_district' ? '지구단위계획구역' :
               selectedFeature.properties.layer === 'zone_maintenance' ? '정비구역' :
               selectedFeature.properties.layer === 'zone_scheduled_maintenance' ? '정비예정구역' :
               selectedFeature.properties.layer === 'zone_tourist' ? '관광특구' :
               selectedFeature.properties.layer === 'zone_industrial_complex' ? '산업단지' :
               selectedFeature.properties.layer === 'zone_housing_land' ? '택지개발지구' :
               selectedFeature.properties.layer === 'zone_public_housing' ? '공공주택지구' :
               selectedFeature.properties.layer}
            </span>
            <span>·</span>
            <span className="truncate">{selectedSigunguName || selectedFeature.properties.sig_cd}</span>
          </div>

          <div className="space-y-1.5 text-[11px] text-slate-300 bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50 mb-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-bold">최초 지정</span>
              <span className="font-semibold text-slate-200">
                {formatGosiDate(selectedFeature.properties.ntf_date)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-bold">최종 고시</span>
              <span className="font-semibold text-slate-200">
                {selectedFeature.properties.gosi_date || '-'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-bold">면적</span>
              <span className="font-semibold text-slate-200">
                {(selectedFeature.properties.dgm_ar || selectedFeature.properties.computed_area) 
                  ? `${Number(selectedFeature.properties.dgm_ar || selectedFeature.properties.computed_area).toLocaleString(undefined, { maximumFractionDigits: 0 })}㎡` 
                  : '-'}
              </span>
            </div>
          </div>

          <div className="mt-3">
            <button 
              onClick={toggleHistory}
              className="w-full flex items-center justify-between text-[11px] font-semibold text-teal-400 bg-teal-400/10 hover:bg-teal-400/20 px-2.5 py-2 rounded-xl border border-teal-400/20 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <span>📋</span>
                고시 이력
              </span>
              <svg className={`w-3.5 h-3.5 transition-transform ${isHistoryExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isHistoryExpanded && (
              <div className="mt-2 space-y-1.5 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
                {isHistoryLoading ? (
                  <div className="text-center py-4">
                    <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                    <span className="text-[10px] text-slate-500 font-medium">이력 조회 중...</span>
                  </div>
                ) : gosiHistory.length === 0 ? (
                  <div className="text-center py-4 text-[10px] text-slate-500 bg-slate-800/30 rounded-xl border border-slate-700/30 font-semibold">
                    등록된 고시 이력이 없습니다.
                  </div>
                ) : (
                  gosiHistory.map((history, idx) => (
                    <div key={idx} className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700 hover:border-teal-500/30 transition-colors group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-bold text-teal-300 px-1.5 py-0.5 bg-teal-500/10 rounded">
                          {history.gosi_date ? `${history.gosi_date.substring(0,4)}.${history.gosi_date.substring(5,7)}.${history.gosi_date.substring(8,10)}` : '-'}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium flex items-center">
                          {history.gosi_number || '번호 없음'}
                          {history.match_status === 'review' && (
                            <span className="ml-1.5 px-1 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded text-[8px] font-black shrink-0">
                              ⚠️ 주의
                            </span>
                          )}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-200 font-bold leading-snug line-clamp-2 mb-1.5">
                        {history.gosi_title || history.zone_name || '명칭 미확인'}
                      </p>
                      {history.url && (
                        <a 
                          href={history.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[9px] text-teal-400/80 hover:text-teal-400 group-hover:underline"
                        >
                          관보 원문 보기
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-700/50 text-[9px] text-slate-500 flex flex-col gap-0.5">
            <div className="flex justify-between items-center">
              <span>데이터 기준</span>
              <span>{selectedFeature.properties.updated_at ? new Date(selectedFeature.properties.updated_at).toLocaleDateString() : '-'} 업데이트</span>
            </div>
            <div className="flex justify-between items-center">
              <span>출처</span>
              <span>브이월드 + 관보 고시</span>
            </div>
          </div>
        </div>
      )}

      {/* 크게보기 / 닫기 버튼 */}
      {onToggleExpand && (
        <div className={`absolute ${isExpanded ? 'top-4 right-4 z-[100]' : 'top-3 right-3 z-10'}`}>
          {isExpanded ? (
            <button
              type="button"
              onClick={onToggleExpand}
              aria-label="지도 닫기"
              className="flex items-center gap-2 bg-slate-900 text-white shadow-2xl border border-slate-700 rounded-xl px-4 py-2.5 hover:bg-slate-800 transition-colors font-black text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              닫기
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleExpand}
              className="flex items-center gap-1.5 bg-white/95 backdrop-blur shadow-md border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 transition-colors text-slate-700 font-bold text-[11px]"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
              </svg>
              크게보기
            </button>
          )}
        </div>
      )}

      {/* 호재 레이어 토글 패널 (왼쪽 하단) */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur shadow-md border border-slate-200 rounded-xl p-2.5 max-h-[80%] overflow-y-auto flex flex-col gap-1.5 w-[140px]">
        <div className="text-[11px] font-black text-slate-800 mb-1 flex items-center justify-between">
          <span>개발 호재 레이어</span>
          {isFetching && <span className="w-2.5 h-2.5 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />}
        </div>

        {/* 철도망 토글 */}
        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded-md transition-colors">
          <input
            type="checkbox"
            checked={!!activeLayers['railway']}
            onChange={() => toggleLayer('railway')}
            className="w-3.5 h-3.5 rounded text-green-500 focus:ring-green-400"
          />
          <span className="text-[11px] font-bold text-slate-700">철도망 (GTX 등)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded-md transition-colors">
          <input
            type="checkbox"
            checked={!!activeLayers['road']}
            onChange={() => toggleLayer('road')}
            className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
          />
          <span className="text-[11px] font-bold text-slate-700">도로망 (고속도로)</span>
        </label>
        <div className="h-px bg-slate-100 my-0.5" />

        {/* 10개 SHP 토글 */}
        {Object.entries(ZONE_COLORS).map(([key, info]) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded-md transition-colors">
            <input
              type="checkbox"
              checked={!!activeLayers[key]}
              onChange={() => toggleLayer(key)}
              className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
            />
            <div className="w-2.5 h-2.5 rounded-sm border" style={{ backgroundColor: info.fill, borderColor: info.stroke }} />
            <span className="text-[11px] font-bold text-slate-700">{info.label}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const showPortaledMap = portalReady && anchorRect.width > 0 && anchorRect.height > 0;

  return (
    <>
      <div ref={anchorRef} className="w-full h-full min-h-0">
        {!showPortaledMap && mapUi}
      </div>
      {showPortaledMap &&
        createPortal(
          <div
            className={
              isExpanded
                ? 'fixed inset-0 z-[9999] bg-white'
                : 'fixed z-[30] overflow-hidden rounded-xl bg-white shadow-sm'
            }
            style={
              isExpanded
                ? undefined
                : {
                    top: `${anchorRect.top}px`,
                    left: `${anchorRect.left}px`,
                    width: `${anchorRect.width}px`,
                    height: `${anchorRect.height}px`,
                  }
            }
            role={isExpanded ? 'dialog' : undefined}
            aria-modal={isExpanded || undefined}
            aria-label={isExpanded ? '고시 위치 지도' : undefined}
          >
            {mapUi}
          </div>,
          document.body,
        )}
    </>
  );
}
