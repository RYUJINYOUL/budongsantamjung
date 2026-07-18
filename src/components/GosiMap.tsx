'use client';

import { useEffect, useRef, useState } from 'react';
import { parseRailwayCoord, RAILWAY_MAP_STYLE } from '../lib/railwayCoords';

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
    [key: string]: any;
  }[];
  initialCenter?: { lat: number; lng: number };
  sigCd?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onMarkerClick?: (marker: any) => void;
}

const ZONE_COLORS: Record<string, { fill: string; stroke: string, label: string }> = {
  zone_urban_development: { fill: '#3B82F6', stroke: '#1D4ED8', label: '도시개발' },
  zone_innovation: { fill: '#8B5CF6', stroke: '#6D28D9', label: '혁신지구' },
  zone_redevelopment: { fill: '#EF4444', stroke: '#B91C1C', label: '재개발' },
  zone_readjustment: { fill: '#F97316', stroke: '#C2410C', label: '재정비' },
  zone_district: { fill: '#10B981', stroke: '#047857', label: '지구단위' },
  zone_maintenance: { fill: '#F59E0B', stroke: '#B45309', label: '정비구역' },
  zone_scheduled_maintenance: { fill: '#FBBF24', stroke: '#D97706', label: '정비예정' },
  zone_tourist: { fill: '#EC4899', stroke: '#BE185D', label: '관광특구' },
  zone_industrial_complex: { fill: '#64748B', stroke: '#334155', label: '산업단지' },
  zone_housing_land: { fill: '#14B8A6', stroke: '#0F766E', label: '택지개발' }
};

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
  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const overlaysRef = useRef<any>({ clusterer: null, items: [] });

  // 공간 데이터 관련 상태
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({
    railway: true, // 철도망은 기본 활성화
    zone_urban_development: true,
    zone_innovation: true,
    zone_redevelopment: true,
    zone_readjustment: true,
    zone_district: true,
    zone_maintenance: true,
    zone_scheduled_maintenance: true,
    zone_tourist: true,
    zone_industrial_complex: true,
    zone_housing_land: true,
  });
  const [isFetching, setIsFetching] = useState(false);
  const [zoneDataVersion, setZoneDataVersion] = useState(0);

  const loadedSigCds = useRef<Set<string>>(new Set());
  const zoneDataCache = useRef<Record<string, any>>({});

  const shpPolygonsRef = useRef<any[]>([]);
  const railwayLinesRef = useRef<any[]>([]);
  const railwayStationsRef = useRef<any[]>([]);
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

  // 인터랙티브 피처 (구역 상세, 미매칭 건, 이력) 관련 상태 및 Ref 추가
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [selectedSigunguName, setSelectedSigunguName] = useState<string>('');
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [gosiHistory, setGosiHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [unmatchedGosiList, setUnmatchedGosiList] = useState<any[]>([]);

  const unmatchedOverlaysRef = useRef<any[]>([]);

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
        // kakaoMap.addOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT);
        setMap(kakaoMap);

        // 철도망 데이터 초기 로드
        fetchRailwayData(kakaoMap);

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
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY}&libraries=services,clusterer&autoload=false`;
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
  }, []);

  // 마커 그리기 (클러스터러 적용)
  useEffect(() => {
    if (!map || !window.kakao || !window.kakao.maps) return;

    // 기존 오버레이/클러스터러 제거
    if (overlaysRef.current) {
      if (overlaysRef.current.clusterer) {
        overlaysRef.current.clusterer.clear();
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

    // 클러스터러 생성 (숫자 표시)
    const clusterer = new window.kakao.maps.MarkerClusterer({
      map: map,
      averageCenter: true,
      minLevel: 3, // 이 레벨 이상일 때 클러스터링 (숫자로 묶임)
      disableClickZoom: false, // 클릭 시 줌인 됨
      styles: [{
        width: '36px', height: '36px',
        background: 'rgba(15, 118, 110, 0.9)', // teal-700
        color: '#fff',
        textAlign: 'center',
        fontWeight: 'bold',
        lineHeight: '36px',
        borderRadius: '50%',
        border: '3px solid rgba(255, 255, 255, 0.8)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        fontSize: '14px'
      }]
    });

    markers.forEach((marker, idx) => {
      if (!marker.lat || !marker.lng) return;

      const position = new window.kakao.maps.LatLng(marker.lat, marker.lng);
      bounds.extend(position);
      hasValidPoints = true;

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

    // 클러스터러에 마커 추가
    clusterer.addMarkers(kakaoMarkers);

    // 정리용으로 저장
    overlaysRef.current = { clusterer, items: customOverlays };

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
              strokeOpacity: 0.8,
              strokeStyle: 'solid',
              fillColor: colors.fill,
              fillOpacity: 0.15,
            });

            window.kakao.maps.event.addListener(polygon, 'mouseover', () => polygon.setOptions({ fillOpacity: 0.4 }));
            window.kakao.maps.event.addListener(polygon, 'mouseout', () => polygon.setOptions({ fillOpacity: 0.15 }));
            window.kakao.maps.event.addListener(polygon, 'click', () => {
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

            const zoneName = feature.properties.name;
            if (zoneName) {
              const centerLatLng = getPolygonCenter(path);
              const labelEl = document.createElement('div');
              labelEl.className = 'zone-label-tag';
              labelEl.style.cssText = `
                padding: 4px 10px;
                background: rgba(31, 41, 55, 0.85);
                color: #FFFFFF;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 6px;
                font-size: 11px;
                font-weight: 800;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                white-space: nowrap;
                pointer-events: none;
                transform: translate(-50%, -50%);
              `;
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

  const fetchRailwayData = async (kakaoMap: any) => {
    try {
      const [projRes, statRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/railway/projects`),
        fetch(`${BACKEND_URL}/api/railway/stations`)
      ]);

      if (!projRes.ok || !statRes.ok) return;

      const projJson = await projRes.json();
      const statJson = await statRes.json();

      const projects = projJson.data || [];
      const stations = statJson.data || [];

      const projectsMap = new Map<number, any>(projects.map((p: any) => [p.id, p]));
      const stationsByProject: Record<number, any[]> = {};

      stations.forEach((s: any) => {
        if (!stationsByProject[s.project_id]) stationsByProject[s.project_id] = [];
        stationsByProject[s.project_id].push(s);
      });

      Object.entries(stationsByProject).forEach(([projectIdStr, projStations]) => {
        const projectId = parseInt(projectIdStr, 10);
        const project = projectsMap.get(projectId);
        const lineName = project?.line_name || '';

        const { lineColor, lineWeight, lineOpacity } = RAILWAY_MAP_STYLE;

        const linePath = projStations
          .sort((a, b) => a.station_order - b.station_order)
          .map((s: any) => parseRailwayCoord(s))
          .filter(Boolean)
          .map((c) => new window.kakao.maps.LatLng(c!.lat, c!.lng));

        if (linePath.length >= 2) {
          const polyline = new window.kakao.maps.Polyline({
            path: linePath, strokeWeight: lineWeight, strokeColor: lineColor, strokeOpacity: lineOpacity, strokeStyle: 'solid'
          });
          polyline.setZIndex(1);
          polyline.setMap(kakaoMap);
          railwayLinesRef.current.push({ overlay: polyline, type: 'line' });

          const midIdx = Math.floor(linePath.length / 2);
          const lineLabelEl = document.createElement('div');
          lineLabelEl.style.cssText = `
            font-size: 10px; font-weight: 800; color: ${lineColor}; background: rgba(255, 255, 255, 0.9);
            border: 1px solid ${lineColor}55; padding: 1px 5px; border-radius: 4px; white-space: nowrap;
          `;
          lineLabelEl.textContent = lineName;

          const lineLabel = new window.kakao.maps.CustomOverlay({
            position: linePath[midIdx], content: lineLabelEl, yAnchor: 1.5, zIndex: 1
          });
          lineLabel.setMap(kakaoMap);
          railwayLinesRef.current.push({ overlay: lineLabel, type: 'label' });
        }
      });

      stations.forEach((station: any) => {
        const coord = parseRailwayCoord(station);
        if (!coord) return;

        const position = new window.kakao.maps.LatLng(coord.lat, coord.lng);
        const stationEl = document.createElement('div');
        stationEl.style.cssText = `
          padding: 3px 8px; background: ${RAILWAY_MAP_STYLE.stationBg}; border: none; border-radius: 4px;
          font-size: 9px; font-weight: 700; color: ${RAILWAY_MAP_STYLE.stationColor}; white-space: nowrap;
          transform: translate(-50%, -50%); box-shadow: 0 1px 3px rgba(0,0,0,0.25);
        `;
        stationEl.textContent = station.station_name;

        const overlay = new window.kakao.maps.CustomOverlay({
          position, content: stationEl, xAnchor: 0.5, yAnchor: 0.5, zIndex: 3
        });
        overlay.setMap(kakaoMap);
        railwayStationsRef.current.push({ overlay, type: 'station' });
      });

      // 초기 렌더링 시 가시성 설정
      updateRailwayVisibility(activeLayers['railway']);
    } catch (err) {
      console.error('Railway fetch error:', err);
    }
  };

  const updateRailwayVisibility = (isVisible: boolean) => {
    if (!map) return;
    railwayLinesRef.current.forEach(item => item.overlay.setMap(isVisible ? map : null));
    railwayStationsRef.current.forEach(item => item.overlay.setMap(isVisible ? map : null));
  };

  // activeLayers 또는 zone 데이터가 바뀔 때마다 다시 그리기
  useEffect(() => {
    if (map) {
      drawZones(map);
      updateRailwayVisibility(!!activeLayers['railway']);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayers, map, zoneDataVersion]);

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

  return (
    <div className={`relative w-full h-full transition-all duration-300 ${isExpanded
        ? 'fixed inset-0 z-[100] bg-white m-0 p-0 rounded-none border-none'
        : 'rounded-xl'
      }`}>
      <div ref={mapContainer} className="w-full h-full" />

      {/* 구역 클릭 시 정보 카드 + 고시 이력 UI */}
      {selectedFeature && (
        <div className="absolute top-14 right-3 z-20 w-[290px] bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl p-4 text-white animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-[13px] text-white break-keep pr-4 leading-snug">
              {selectedFeature.properties.alias || '명칭 미확인'}
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
                        {history.zone_name || '명칭 미확인'}
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

      {/* 크게보기 / 작게보기 버튼 (우측 상단) */}
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-1.5 bg-white/95 backdrop-blur shadow-md border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 transition-colors text-slate-700 font-bold text-[11px]"
        >
          {isExpanded ? (
            <>
              {/* 작게보기 SVG */}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V3m0 6H3m6 0L3 3m12 6h6m-6 0V3m0 6L21 3m-12 12v6m0-6H3m6 0l-6 6m12-6h6m-6 0v6m0-6l6 6" />
              </svg>
              작게보기
            </>
          ) : (
            <>
              {/* 크게보기 SVG */}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
              </svg>
              크게보기
            </>
          )}
        </button>
      </div>

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
            className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500"
          />
          <span className="text-[11px] font-bold text-slate-700">철도망 (GTX 등)</span>
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
}
