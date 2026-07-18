'use client';

import { useEffect, useRef, useState } from 'react';
import { parseRailwayCoord, RAILWAY_MAP_STYLE } from '../lib/railwayCoords';

declare global {
  interface Window {
    kakao: any;
  }
}

interface InteractiveGosiMapProps {
  initialLat?: number;
  initialLng?: number;
  initialSigunguCd?: string;
  zoomLevel?: number;
}

// 각 공간 데이터 레이어별 색상 정의 (지적도와 조화롭게 매칭)
const ZONE_COLORS: Record<string, { fill: string; stroke: string }> = {
  zone_urban_development: { fill: '#3B82F6', stroke: '#1D4ED8' }, // 도시개발 (파랑)
  zone_innovation: { fill: '#8B5CF6', stroke: '#6D28D9' }, // 혁신지구 (보라)
  zone_redevelopment: { fill: '#EF4444', stroke: '#B91C1C' }, // 재개발 (빨강)
  zone_readjustment: { fill: '#F97316', stroke: '#C2410C' }, // 재정비 (주황)
  zone_district: { fill: '#10B981', stroke: '#047857' }, // 지구단위 (초록)
  zone_maintenance: { fill: '#F59E0B', stroke: '#B45309' }, // 정비구역 (황토)
  zone_scheduled_maintenance: { fill: '#FBBF24', stroke: '#D97706' }, // 정비예정 (연주황)
  zone_tourist: { fill: '#EC4899', stroke: '#BE185D' }, // 관광특구 (분홍)
  zone_industrial_complex: { fill: '#64748B', stroke: '#334155' }, // 산업단지 (슬레이트)
  zone_housing_land: { fill: '#14B8A6', stroke: '#0F766E' } // 택지개발 (틸)
};

// 폴리곤의 중심 좌표 구하기 (라벨 오버레이 위치용)
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

// 날짜 포맷 (다양한 길이/형식 대응)
const formatDate = (d: string) => {
  if (!d) return '-';
  const clean = String(d).replace(/[^0-9]/g, '');
  if (clean.length >= 8) {
    return `${clean.substring(0,4)}.${clean.substring(4,6)}.${clean.substring(6,8)}`;
  }
  return d; // 파싱 불가 시 원본 표시
};

export default function InteractiveGosiMap({
  initialLat = 37.6439, // 고양시/대곡역 중심 디폴트값으로 조율
  initialLng = 126.8111,
  initialSigunguCd,
  zoomLevel = 6
}: InteractiveGosiMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [selectedSigunguName, setSelectedSigunguName] = useState<string>('');
  
  // History states
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [gosiHistory, setGosiHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const loadedSigCds = useRef<Set<string>>(new Set());
  const polygonsRef = useRef<any[]>([]);
  const railwayLinesRef = useRef<any[]>([]);
  const railwayStationsRef = useRef<any[]>([]);

  useEffect(() => {
    const loadKakaoScript = () => {
      const apiKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;
      if (!apiKey || window.kakao?.maps) {
        if (window.kakao?.maps) initializeMap();
        return;
      }
      const script = document.createElement('script');
      script.async = true;
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services,clusterer&autoload=false`;
      script.onload = () => {
        window.kakao.maps.load(() => {
          initializeMap();
        });
      };
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (!mapContainer.current) return;

      const options = {
        center: new window.kakao.maps.LatLng(initialLat, initialLng),
        level: zoomLevel,
      };
      const kakaoMap = new window.kakao.maps.Map(mapContainer.current, options);

      // 카카오 지적도(USE_DISTRICT) 레이어 활성화
      // kakaoMap.addOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT);

      setMap(kakaoMap);
      setIsLoading(false);

      fetchRailwayData(kakaoMap);

      window.kakao.maps.event.addListener(kakaoMap, 'idle', () => handleMapIdle(kakaoMap));
      handleMapIdle(kakaoMap);
    };

    loadKakaoScript();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMapIdle = (kakaoMap: any) => {
    const level = kakaoMap.getLevel();
    if (level > 8) return;

    const center = kakaoMap.getCenter();
    const geocoder = new window.kakao.maps.services.Geocoder();

    geocoder.coord2RegionCode(center.getLng(), center.getLat(), (result: any, status: any) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const regionCode = result[0]?.code?.substring(0, 5);
        if (regionCode && !loadedSigCds.current.has(regionCode)) {
          loadedSigCds.current.add(regionCode);
          fetchZoneData(kakaoMap, regionCode);
        }
      }
    });
  };

  const fetchZoneData = async (kakaoMap: any, sigCd: string) => {
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      
      const [zonesRes, unmatchedRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/zones?sig_cd=${sigCd}`),
        fetch(`${BACKEND_URL}/api/zones/unmatched?sig_cd=${sigCd}`)
      ]);

      if (zonesRes.ok) {
        const json = await zonesRes.json();
        if (json.success && json.data) {
          Object.entries(json.data).forEach(([layerName, collection]: [string, any]) => {
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
                  path: path,
                  strokeWeight: 2.5,
                  strokeColor: colors.stroke,
                  strokeOpacity: 0.8,
                  strokeStyle: 'solid',
                  fillColor: colors.fill,
                  fillOpacity: 0.15
                });

                window.kakao.maps.event.addListener(polygon, 'mouseover', () => polygon.setOptions({ fillOpacity: 0.4 }));
                window.kakao.maps.event.addListener(polygon, 'mouseout', () => polygon.setOptions({ fillOpacity: 0.15 }));
                window.kakao.maps.event.addListener(polygon, 'click', () => {
                  setSelectedFeature(feature);
                  setSelectedSigunguName(''); // reset
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
                polygonsRef.current.push(polygon);

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
                    zIndex: 2
                  });
                  labelOverlay.setMap(kakaoMap);
                  polygonsRef.current.push(labelOverlay);
                }
              });
            });
          });
        }
      }

      // Render unmatched markers
      if (unmatchedRes.ok) {
        const uJson = await unmatchedRes.json();
        if (uJson.success && uJson.data) {
          uJson.data.forEach((item: any) => {
            if (!item.regions) return;
            let regionsData = [];
            try {
              regionsData = typeof item.regions === 'string' ? JSON.parse(item.regions) : item.regions;
            } catch(e) {}
            
            const firstCoord = regionsData.find((r: any) => r.lat && r.lng);
            if (!firstCoord) return;

            const position = new window.kakao.maps.LatLng(Number(firstCoord.lat), Number(firstCoord.lng));
            
            // Create marker wrapper
            const wrapperEl = document.createElement('div');
            wrapperEl.style.cssText = `
              position: relative;
              transform: translate(-50%, -50%);
              cursor: pointer;
            `;

            // Create dot
            const dotEl = document.createElement('div');
            dotEl.style.cssText = `
              width: 14px;
              height: 14px;
              background-color: #64748B;
              border: 2px solid #FFFFFF;
              border-radius: 50%;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            `;
            
            // Create label
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
            
            // Create tooltip popup (hidden by default)
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

            // Toggle popup on click
            let isPopupOpen = false;
            wrapperEl.onclick = (e) => {
              e.stopPropagation();
              isPopupOpen = !isPopupOpen;
              popupEl.style.display = isPopupOpen ? 'block' : 'none';
              // Hide other popups (optional, but keep it simple for now)
            };

            const overlay = new window.kakao.maps.CustomOverlay({
              position,
              content: wrapperEl,
              zIndex: 3
            });
            overlay.setMap(kakaoMap);
            polygonsRef.current.push(overlay);
          });
        }
      }

    } catch (err) {
      console.error('Zone fetch error:', err);
    }
  };



  const fetchRailwayData = async (kakaoMap: any) => {
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

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
      stations.forEach((station: any) => {
        const pId = station.project_id;
        if (!stationsByProject[pId]) {
          stationsByProject[pId] = [];
        }
        stationsByProject[pId].push(station);
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
            path: linePath,
            strokeWeight: lineWeight,
            strokeColor: lineColor,
            strokeOpacity: lineOpacity,
            strokeStyle: 'solid'
          });
          polyline.setMap(kakaoMap);
          railwayLinesRef.current.push(polyline);

          const midIdx = Math.floor(linePath.length / 2);
          const lineLabelEl = document.createElement('div');
          lineLabelEl.style.cssText = `
            font-size: 10px;
            font-weight: 800;
            color: ${lineColor};
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid ${lineColor}55;
            padding: 1px 5px;
            border-radius: 4px;
            white-space: nowrap;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          `;
          lineLabelEl.textContent = lineName;

          const lineLabel = new window.kakao.maps.CustomOverlay({
            position: linePath[midIdx],
            content: lineLabelEl,
            yAnchor: 1.5,
            zIndex: 1
          });
          lineLabel.setMap(kakaoMap);
          railwayLinesRef.current.push(lineLabel);
        }
      });

      stations.forEach((station: any) => {
        const coord = parseRailwayCoord(station);
        if (!coord) return;

        const position = new window.kakao.maps.LatLng(coord.lat, coord.lng);
        const stationEl = document.createElement('div');
        stationEl.className = 'railway-station-tag';
        stationEl.style.cssText = `
          padding: 3px 8px;
          background: ${RAILWAY_MAP_STYLE.stationBg};
          border: none;
          border-radius: 4px;
          font-size: 10.5px;
          font-weight: 700;
          color: ${RAILWAY_MAP_STYLE.stationColor};
          box-shadow: 0 1px 3px rgba(0,0,0,0.25);
          white-space: nowrap;
          transform: translate(-50%, -50%);
        `;
        stationEl.textContent = station.station_name;

        const overlay = new window.kakao.maps.CustomOverlay({
          position,
          content: stationEl,
          xAnchor: 0.5,
          yAnchor: 0.5,
          zIndex: 3
        });
        overlay.setMap(kakaoMap);
        railwayStationsRef.current.push(overlay);
      });

    } catch (err) {
      console.error('Railway fetch error:', err);
    }
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
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
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

  return (
    <div className="relative w-full h-[550px] bg-slate-100 rounded-3xl overflow-hidden border border-slate-200 shadow-md mt-6 mb-6">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/80 backdrop-blur-sm">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-sm font-bold text-slate-600">지적도 및 철도 노선망을 그리는 중...</p>
        </div>
      )}

      {selectedFeature && (
        <div className="absolute top-4 right-4 z-[200] w-[320px] bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl p-5 text-white">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-bold text-[15px] text-white break-keep pr-4">
              {selectedFeature.properties.alias || '명칭 미확인'}
            </h3>
            <button 
              onClick={() => setSelectedFeature(null)}
              className="text-slate-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="text-[12px] text-slate-400 mb-4 flex items-center gap-1.5 font-medium">
            <span className="px-2 py-0.5 bg-slate-800 rounded-md text-slate-300 border border-slate-700">
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
            <span>{selectedSigunguName || selectedFeature.properties.sig_cd}</span>
          </div>

          <div className="space-y-2 text-[13px] text-slate-300 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
            <div className="flex justify-between">
              <span className="text-slate-500">최초 지정</span>
              <span className="font-semibold text-slate-200">
                {formatDate(selectedFeature.properties.ntf_date)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">최종 고시</span>
              <span className="font-semibold text-slate-200">
                {selectedFeature.properties.gosi_date || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">면적</span>
              <span className="font-semibold text-slate-200">
                {(selectedFeature.properties.dgm_ar || selectedFeature.properties.computed_area) 
                  ? `${Number(selectedFeature.properties.dgm_ar || selectedFeature.properties.computed_area).toLocaleString(undefined, { maximumFractionDigits: 0 })}㎡` 
                  : '-'}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <button 
              onClick={toggleHistory}
              className="w-full flex items-center justify-between text-[13px] font-semibold text-teal-400 bg-teal-400/10 hover:bg-teal-400/20 px-3 py-2.5 rounded-xl border border-teal-400/20 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span>📋</span>
                고시 이력
              </span>
              <svg className={`w-4 h-4 transition-transform ${isHistoryExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isHistoryExpanded && (
              <div className="mt-2 space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                {isHistoryLoading ? (
                  <div className="text-center py-4">
                    <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                    <span className="text-[11px] text-slate-500">이력 조회 중...</span>
                  </div>
                ) : gosiHistory.length === 0 ? (
                  <div className="text-center py-4 text-[12px] text-slate-500 bg-slate-800/30 rounded-xl border border-slate-700/30">
                    등록된 고시 이력이 없습니다.
                  </div>
                ) : (
                  gosiHistory.map((history, idx) => (
                    <div key={idx} className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700 hover:border-teal-500/30 transition-colors group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-teal-300 px-1.5 py-0.5 bg-teal-500/10 rounded">
                          {history.gosi_date ? `${history.gosi_date.substring(0,4)}.${history.gosi_date.substring(5,7)}.${history.gosi_date.substring(8,10)}` : '-'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {history.gosi_number || '번호 없음'}
                          {history.match_status === 'review' && (
                            <span className="ml-1.5 px-1.5 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-md text-[9px] font-bold">
                              ⚠️ 주의
                            </span>
                          )}
                        </span>
                      </div>
                      <p className="text-[12px] text-slate-200 font-medium leading-snug line-clamp-2 mb-1.5">
                        {history.zone_name || '명칭 미확인'}
                      </p>
                      {history.url && (
                        <a 
                          href={history.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-teal-400/80 hover:text-teal-400 group-hover:underline"
                        >
                          관보 원문 보기
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

          <div className="mt-5 pt-3 border-t border-slate-700/50 text-[11px] text-slate-500 flex flex-col gap-1">
            <div className="flex justify-between">
              <span>데이터 기준</span>
              <span>{selectedFeature.properties.updated_at ? new Date(selectedFeature.properties.updated_at).toLocaleDateString() : '-'} 업데이트</span>
            </div>
            <div className="flex justify-between">
              <span>출처</span>
              <span>브이월드 + 관보 고시</span>
            </div>
          </div>
        </div>
      )}

      <div ref={mapContainer} className="w-full h-full" />

      <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200/80 shadow-lg flex flex-col gap-1.5 pointer-events-none max-h-[300px] overflow-y-auto">
        <h4 className="text-[10px] font-black text-slate-500 mb-1 border-b border-slate-100 pb-1">공간 데이터 레이어</h4>
        {Object.entries(ZONE_COLORS).map(([key, colors]) => (
          <div key={key} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm border" style={{ backgroundColor: colors.fill, borderColor: colors.stroke }} />
            <span className="text-[10px] font-bold text-slate-700">
              {key === 'zone_urban_development' ? '도시개발' :
                key === 'zone_innovation' ? '혁신지구' :
                  key === 'zone_redevelopment' ? '재개발' :
                    key === 'zone_readjustment' ? '재정비' :
                      key === 'zone_district' ? '지구단위' :
                        key === 'zone_maintenance' ? '정비구역' :
                          key === 'zone_scheduled_maintenance' ? '정비예정' :
                            key === 'zone_tourist' ? '관광특구' :
                              key === 'zone_industrial_complex' ? '산업단지' :
                                key === 'zone_housing_land' ? '택지개발' : key}
            </span>
          </div>
        ))}
        <div className="h-px bg-slate-100 my-1" />
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-[#ef4444]" />
          <span className="text-[10px] font-bold text-slate-700">GTX 광역철도</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-[#2563eb]" />
          <span className="text-[10px] font-bold text-slate-700">도시/일반철도</span>
        </div>
      </div>
    </div>
  );
}
