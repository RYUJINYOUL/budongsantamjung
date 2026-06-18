'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createMarkerElement,
  hasValidCoords,
  LEGEND_ITEMS,
  type MapMarkerProperty,
} from '../lib/mapMarkers';
import { GeolocationError, getCurrentPosition } from '../lib/geolocation';

declare global {
  interface Window {
    kakao: any;
  }
}

export type { MapMarkerProperty };

interface SearchResult {
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
}

interface KakaoMapProps {
  properties: MapMarkerProperty[];
  selectedProperty?: MapMarkerProperty | null;
  onPropertySelect?: (property: MapMarkerProperty) => void;
  onBoundsChanged?: (bounds: { neLat: number; neLng: number; swLat: number; swLng: number } | null) => void;
  /** 지도 idle 시 중심·줌 (타임라인 API geo 쿼리용, 앱과 동일) */
  onMapIdle?: (position: { lat: number; lng: number; zoomLevel: number }) => void;
  onMapDrag?: () => void;
  initialCenter?: { lat: number; lng: number } | null;
  isAnalyzeMode?: boolean;
  primaryPolygon?: { lat: number; lng: number }[] | null;
  additionalPolygons?: { lat: number; lng: number }[][];
  onMapClick?: (lat: number, lng: number) => void;
  isBenefitMode?: boolean;
  benefitParcels?: any[];
  selectedBenefitParcel?: any;
  onBenefitParcelSelect?: (parcel: any) => void;
  /** 검색·내 위치 이동 시 줌 (카카오: 숫자↑=축소). 기본 4 */
  navigationZoomLevel?: number;
}

// 전역 스크립트 로딩 상태 관리
let isScriptLoading = false;
let isScriptLoaded = false;
const scriptCallbacks: (() => void)[] = [];

export default function KakaoMap({
  properties,
  selectedProperty,
  onPropertySelect,
  onBoundsChanged,
  onMapIdle,
  onMapDrag,
  initialCenter,
  isAnalyzeMode,
  primaryPolygon,
  additionalPolygons,
  onMapClick,
  isBenefitMode,
  benefitParcels,
  selectedBenefitParcel,
  onBenefitParcelSelect,
  navigationZoomLevel = 4,
}: KakaoMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [map, setMap] = useState<any>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polygonsRef = useRef<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [zoomLevel, setZoomLevel] = useState(8);
  const [markerCount, setMarkerCount] = useState(0);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const initialCenterRef = useRef(initialCenter);

  const onBoundsChangedRef = useRef(onBoundsChanged);
  useEffect(() => {
    onBoundsChangedRef.current = onBoundsChanged;
  }, [onBoundsChanged]);

  const onMapIdleRef = useRef(onMapIdle);
  useEffect(() => {
    onMapIdleRef.current = onMapIdle;
  }, [onMapIdle]);

  const onMapDragRef = useRef(onMapDrag);
  useEffect(() => {
    onMapDragRef.current = onMapDrag;
  }, [onMapDrag]);

  const onPropertySelectRef = useRef(onPropertySelect);
  useEffect(() => {
    onPropertySelectRef.current = onPropertySelect;
  }, [onPropertySelect]);

  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  const initializeMap = () => {
    console.log('지도 초기화 시작...');

    if (!mapContainer.current) {
      console.error('지도 컨테이너 없음 - 초기화 중단');
      setLoadError('지도 컨테이너를 찾을 수 없습니다.');
      setIsLoading(false);
      return;
    }

    try {
      // 우선순위: sessionStorage (지도 이동 이력) > initialCenter prop > 기본값 (서울시청)
      let startLat = 37.5665;
      let startLng = 126.9780;
      let startLevel = 8;

      const saved = sessionStorage.getItem('kakaomap_center');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          startLat = parsed.lat;
          startLng = parsed.lng;
          startLevel = parsed.level || 6;
        } catch { }
      } else if (initialCenterRef.current) {
        startLat = initialCenterRef.current.lat;
        startLng = initialCenterRef.current.lng;
        startLevel = 6;
      }

      const options = {
        center: new window.kakao.maps.LatLng(startLat, startLng),
        level: startLevel,
      };

      console.log('카카오맵 생성 중...');
      const kakaoMap = new window.kakao.maps.Map(mapContainer.current, options);
      mapRef.current = kakaoMap;

      const updateBounds = () => {
        const c = kakaoMap.getCenter();
        const zoomLevel = kakaoMap.getLevel();

        if (onBoundsChangedRef.current) {
          const kakaoBounds = kakaoMap.getBounds();
          onBoundsChangedRef.current({
            neLat: kakaoBounds.getNorthEast().getLat(),
            neLng: kakaoBounds.getNorthEast().getLng(),
            swLat: kakaoBounds.getSouthWest().getLat(),
            swLng: kakaoBounds.getSouthWest().getLng()
          });
        }

        if (onMapIdleRef.current) {
          onMapIdleRef.current({
            lat: c.getLat(),
            lng: c.getLng(),
            zoomLevel,
          });
        }

        setZoomLevel(zoomLevel);

        sessionStorage.setItem('kakaomap_center', JSON.stringify({
          lat: c.getLat(),
          lng: c.getLng(),
          level: zoomLevel,
        }));
      };

      // idle 이벤트: 지도 이동/확대축소가 끝났을 때 발생
      window.kakao.maps.event.addListener(kakaoMap, 'idle', updateBounds);

      // dragstart 이벤트: 사용자가 직접 지도를 드래그할 때 발생
      window.kakao.maps.event.addListener(kakaoMap, 'dragstart', () => {
        if (onMapDragRef.current) onMapDragRef.current();
      });

      // click 이벤트: 지도를 클릭했을 때 좌표 기반 동작
      window.kakao.maps.event.addListener(kakaoMap, 'click', (mouseEvent: any) => {
        if (onMapClickRef.current) {
          onMapClickRef.current(mouseEvent.latLng.getLat(), mouseEvent.latLng.getLng());
        }
      });

      setMap(kakaoMap);
      setIsLoading(false);
      console.log('카카오맵 초기화 완료!');

      // 초기 렌더링 후 바운드 전송 + relayout (뒤로가기 복귀 시 크기 재계산)
      setTimeout(() => {
        kakaoMap.relayout();
        updateBounds();
      }, 300);
    } catch (error) {
      console.error('지도 초기화 실패:', error);
      setLoadError('지도 초기화에 실패했습니다.');
      setIsLoading(false);
    }
  };

  const loadKakaoScript = () => {
    if (isScriptLoaded) {
      initializeMap();
      return;
    }

    if (isScriptLoading) {
      scriptCallbacks.push(initializeMap);
      return;
    }

    isScriptLoading = true;
    const apiKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;
    console.log('카카오맵 스크립트 로딩 시작...');

    const script = document.createElement('script');
    script.async = true;
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services,clusterer&autoload=false`;
    script.onload = () => {
      console.log('카카오맵 스크립트 로드 완료');
      window.kakao.maps.load(() => {
        console.log('카카오맵 라이브러리 로드 완료');
        isScriptLoaded = true;
        isScriptLoading = false;

        // 모든 대기 중인 콜백 실행
        initializeMap();
        scriptCallbacks.forEach(callback => callback());
        scriptCallbacks.length = 0;
      });
    };
    script.onerror = (e) => {
      console.error('카카오맵 스크립트 로딩 실패:', e);
      setLoadError('카카오맵 스크립트 로딩에 실패했습니다.');
      setIsLoading(false);
      isScriptLoading = false;
    };
    document.head.appendChild(script);
  };

  useEffect(() => {
    // DOM이 완전히 준비될 때까지 잠시 대기
    const timer = setTimeout(() => {
      if (window.kakao && window.kakao.maps) {
        console.log('카카오맵 이미 로드됨');
        initializeMap();
      } else {
        loadKakaoScript();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // ResizeObserver: 컨테이너가 다시 보일 때(뒤로가기/탭 전환) relayout() 호출
  useEffect(() => {
    if (!mapContainer.current) return;

    const observer = new ResizeObserver(() => {
      if (mapRef.current && mapContainer.current) {
        const { offsetWidth, offsetHeight } = mapContainer.current;
        if (offsetWidth > 0 && offsetHeight > 0) {
          mapRef.current.relayout();
        }
      }
    });

    observer.observe(mapContainer.current);
    return () => observer.disconnect();
  }, []);

  // 마커 생성 및 업데이트
  useEffect(() => {
    if (!map) return;

    if (markersRef.current.length > 0) {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    }

    if (isBenefitMode && benefitParcels) {
      const newMarkers = benefitParcels.map((parcel) => {
        const isSelected = selectedBenefitParcel?.pnu === parcel.pnu;
        const markerElement = document.createElement('div');
        markerElement.className = 'benefit-parcel-marker';
        const tier = parcel.tier || 'weak';
        const color = tier === 'direct' ? '#EF4444' : tier === 'indirect' ? '#F97316' : '#3B82F6';
        
        markerElement.style.cssText = `
          position:relative;display:flex;flex-direction:column;align-items:center;
          cursor:pointer;user-select:none;transform:scale(${isSelected ? 1.25 : 1});
          transition:transform 0.2s ease, filter 0.2s ease;
          filter:drop-shadow(0 ${isSelected ? '6px 14px' : '3px 8px'} ${color}55);
          z-index:${isSelected ? 30 : 10};
        `;
        
        const body = document.createElement('div');
        body.style.cssText = `
          width:${isSelected ? '32px' : '24px'};height:${isSelected ? '32px' : '24px'};
          border-radius:50%;background:${color};border:2px solid #fff;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 8px rgba(0,0,0,0.2);
        `;
        
        const text = document.createElement('span');
        text.style.cssText = `color:#fff;font-size:${isSelected ? '11px' : '9px'};font-weight:900;`;
        text.textContent = tier === 'direct' ? '직' : tier === 'indirect' ? '간' : '약';
        
        body.appendChild(text);
        markerElement.appendChild(body);
        
        const tail = document.createElement('div');
        tail.style.cssText = `width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${color};margin-top:-1px;`;
        markerElement.appendChild(tail);
        
        const customOverlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(Number(parcel.lat), Number(parcel.lng)),
          content: markerElement,
          yAnchor: 1.1,
          zIndex: isSelected ? 30 : 10,
        });
        
        customOverlay.setMap(map);
        
        markerElement.addEventListener('click', (e) => {
          e.stopPropagation();
          onBenefitParcelSelect?.(parcel);
        });
        
        return customOverlay;
      });
      
      markersRef.current = newMarkers;
      setMarkerCount(newMarkers.length);
      return;
    }

    if (isAnalyzeMode) {
      // 분석 모드: 핀 아이콘 대신 필지 폴리곤만 표시
      setMarkerCount(0);
      return;
    }

    const validProperties = (properties || []).filter(hasValidCoords);

    const newMarkers = validProperties.map((property) => {
      const isSelected = selectedProperty?.id === property.id;
      const markerElement = createMarkerElement(property, {
        selected: isSelected,
        zoomLevel,
        isAnalyzePin: property.id === '__analyze_pin__',
      });

      const customOverlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(property.lat!, property.lng!),
        content: markerElement,
        yAnchor: 1.1,
        zIndex: isSelected ? 30 : 10,
      });

      customOverlay.setMap(map);

      markerElement.addEventListener('click', (e) => {
        e.stopPropagation();
        onPropertySelectRef.current?.(property);
      });

      return customOverlay;
    });

    markersRef.current = newMarkers;
    setMarkerCount(newMarkers.length);
  }, [map, properties, isAnalyzeMode, selectedProperty?.id, zoomLevel, isBenefitMode, benefitParcels, selectedBenefitParcel, onBenefitParcelSelect]);

  // 분석 지적도 폴리곤 다각형 생성 및 업데이트
  useEffect(() => {
    if (!map) return;

    // 기존 그려져 있던 모든 폴리곤을 완벽히 지우기
    if (polygonsRef.current.length > 0) {
      polygonsRef.current.forEach(polygon => polygon.setMap(null));
      polygonsRef.current = [];
    }

    if (!isAnalyzeMode) return;

    const newPolygons: any[] = [];

    // 1. 대표 필지(Primary Polygon) 그리기 - 세련된 하늘색 네온 광원
    if (primaryPolygon && primaryPolygon.length >= 3) {
      const kakaoPolygon = new window.kakao.maps.Polygon({
        path: primaryPolygon.map(p => new window.kakao.maps.LatLng(p.lat, p.lng)),
        strokeWeight: 2.5,
        strokeColor: '#0EA5E9',
        strokeOpacity: 0.95,
        strokeStyle: 'solid',
        fillColor: '#0EA5E9',
        fillOpacity: 0.16
      });
      
      kakaoPolygon.setMap(map);
      newPolygons.push(kakaoPolygon);
    }

    // 2. 추가 합필 필지(Additional Polygons) 그리기 - 틸/에메랄드색 네온 광원
    if (additionalPolygons && additionalPolygons.length > 0) {
      additionalPolygons.forEach((polyPoints) => {
        if (polyPoints.length >= 3) {
          const kakaoPolygon = new window.kakao.maps.Polygon({
            path: polyPoints.map(p => new window.kakao.maps.LatLng(p.lat, p.lng)),
            strokeWeight: 2.5,
            strokeColor: '#10B981',
            strokeOpacity: 0.95,
            strokeStyle: 'solid',
            fillColor: '#10B981',
            fillOpacity: 0.16
          });
          
          kakaoPolygon.setMap(map);
          newPolygons.push(kakaoPolygon);
        }
      });
    }

    polygonsRef.current = newPolygons;
  }, [map, isAnalyzeMode, primaryPolygon, additionalPolygons]);

  const prevSelectedRef = useRef<{ id: string; lat: number; lng: number; polygonKey: number } | null>(null);

  // 선택된 매물/분석 위치로 지도 이동
  useEffect(() => {
    if (!map || !selectedProperty) {
      prevSelectedRef.current = null;
      return;
    }

    const lat = selectedProperty.lat ?? 37.5665;
    const lng = selectedProperty.lng ?? 126.9780;
    const polygonKey = primaryPolygon?.length ?? 0;
    const prev = prevSelectedRef.current;
    if (prev && prev.id === selectedProperty.id && prev.lat === lat && prev.lng === lng && prev.polygonKey === polygonKey) return;
    prevSelectedRef.current = { id: selectedProperty.id, lat, lng, polygonKey };

    if (isAnalyzeMode && primaryPolygon && primaryPolygon.length >= 3) {
      const bounds = new window.kakao.maps.LatLngBounds();
      primaryPolygon.forEach(p => bounds.extend(new window.kakao.maps.LatLng(p.lat, p.lng)));
      map.setBounds(bounds);
    } else {
      const position = new window.kakao.maps.LatLng(lat, lng);
      map.setCenter(position);
      if (isAnalyzeMode) {
        map.setLevel(3);
      }
    }
  }, [map, selectedProperty, isAnalyzeMode, primaryPolygon]);

  // 선택된 수혜 필지 위치로 지도 이동
  useEffect(() => {
    if (!map || !isBenefitMode || !selectedBenefitParcel) return;
    const lat = Number(selectedBenefitParcel.lat);
    const lng = Number(selectedBenefitParcel.lng);
    if (lat && lng && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      const position = new window.kakao.maps.LatLng(lat, lng);
      map.setCenter(position);
      map.setLevel(4);
    }
  }, [map, isBenefitMode, selectedBenefitParcel]);

  // 주소 검색 처리 핸들러
  const handleSearch = () => {
    if (!map || !window.kakao?.maps?.services) {
      alert('지도 검색 서비스가 아직 로드 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    const query = searchInput.trim();
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const { kakao } = window;
    const geocoder = new kakao.maps.services.Geocoder();

    // 1. 먼저 주소 검색 시도
    geocoder.addressSearch(query, (result: any, status: any) => {
      if (status === kakao.maps.services.Status.OK && result.length > 0) {
        setIsSearching(false);
        setSearchResults(result.slice(0, 5).map((p: any) => ({
          place_name: p.address_name || p.road_address?.address_name,
          address_name: p.address_name,
          road_address_name: p.road_address?.address_name || '',
          x: p.x,
          y: p.y
        })));
      } else {
        // 2. 주소 검색 실패하면 키워드 검색
        const ps = new kakao.maps.services.Places();
        ps.keywordSearch(query, (data: any, status: any) => {
          setIsSearching(false);
          if (status === kakao.maps.services.Status.OK) {
            setSearchResults(data.slice(0, 5).map((p: any) => ({
              place_name: p.place_name,
              address_name: p.address_name,
              road_address_name: p.road_address_name,
              x: p.x,
              y: p.y
            })));
          } else {
            setSearchResults([]);
          }
        });
      }
    });
  };

  const selectSearchResult = (result: SearchResult) => {
    if (!map) return;
    const y = parseFloat(result.y);
    const x = parseFloat(result.x);
    const coords = new window.kakao.maps.LatLng(y, x);
    map.setCenter(coords);
    map.setLevel(navigationZoomLevel);
    setSearchInput(result.place_name || result.address_name);
    setSearchResults([]);
  };

  const moveToMyLocation = async () => {
    if (isLocating || !map) return;
    setIsLocating(true);
    setLocationError(null);
    try {
      const { lat, lng } = await getCurrentPosition();
      const coords = new window.kakao.maps.LatLng(lat, lng);
      map.setCenter(coords);
      map.setLevel(navigationZoomLevel);
    } catch (err) {
      const message =
        err instanceof GeolocationError
          ? err.message
          : err instanceof Error
            ? err.message
            : '현재 위치를 가져올 수 없습니다.';
      setLocationError(message);
    } finally {
      setIsLocating(false);
    }
  };

  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center p-4">
          <div className="text-red-500 mb-2">⚠️</div>
          <div className="text-sm text-gray-600">{loadError}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative w-full">
      {/* 지도 내장 검색 바 (Floating) - 더 깔끔한 디자인 */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col max-w-md mx-auto gap-2">
        <div className="flex w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="flex items-center pl-4 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="주소나 아파트 입력 후 엔터"
            className="flex-1 text-sm px-3 py-2.5 bg-transparent focus:outline-none placeholder-gray-400 text-gray-700"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
                // 엔터 후 포커스 해제 (모바일 키보드 숨김)
                if (searchInputRef.current) {
                  // searchInputRef.current.blur();
                }
              }
            }}
          />
          <button
            onClick={() => {
              handleSearch();
            }}
            className="bg-gradient-to-r from-emerald-400 to-emerald-500 text-white px-5 font-medium hover:from-emerald-400 hover:to-emerald-500 transition-all duration-200 active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 2a10 10 0 100 20 10 10 0 000-20zm4 6l-2 6-6 2 2-6 6-2z" />
            </svg>
          </button>
        </div>

        {/* 검색 결과 목록 */}
        {searchResults.length > 0 && (
          <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="max-h-[300px] overflow-y-auto">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => selectSearchResult(result)}
                  className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors border-b border-gray-100 last:border-0 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex-shrink-0">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800 group-hover:text-emerald-600 transition-colors">
                        {result.place_name}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 mt-1 leading-relaxed">
                        {result.road_address_name || result.address_name}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {locationError && (
          <p className="text-[11px] font-semibold text-rose-600 bg-white/95 backdrop-blur-md rounded-xl px-3 py-2 shadow-md border border-rose-100">
            {locationError}
          </p>
        )}
      </div>

      {/* 내 위치 */}
      {!isLoading && (
        <button
          type="button"
          onClick={moveToMyLocation}
          disabled={isLocating}
          aria-label="내 위치로 이동"
          className={`absolute bottom-24 right-4 lg:bottom-6 z-20 w-9 h-9 rounded-full border border-slate-200/80 shadow-lg flex items-center justify-center transition-all active:scale-95 ${
            isLocating ? 'bg-emerald-500' : 'bg-white/95 backdrop-blur-md hover:bg-white'
          }`}
        >
          {isLocating ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 2v2m0 16v2M2 12h2m16 0h2" />
              <circle cx="12" cy="12" r="4" strokeWidth={2.5} />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          )}
        </button>
      )}

      {/* 영역 매물 수 (모바일·PC) + 범례 (PC만) */}
      {!isAnalyzeMode && !isLoading && (
        <div className="absolute bottom-20 lg:bottom-4 left-4 z-20 flex flex-col gap-2 max-w-[200px]">
          {markerCount > 0 && (
            <div className="bg-white/95 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg border border-slate-200/80 text-[11px] font-bold text-slate-700">
              반경 <span className="text-emerald-600">{markerCount}</span>건
            </div>
          )}
          <div className="hidden lg:block bg-white/95 backdrop-blur-md rounded-xl px-3 py-2.5 shadow-lg border border-slate-200/80">
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              {LEGEND_ITEMS.map(item => (
                <span key={item.label} className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600">
                  <img src={item.icon} alt="" className="w-4 h-4 rounded-full shrink-0 object-cover border border-white shadow-sm" />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <div className="text-sm text-gray-600">카카오맵 로딩 중...</div>
          </div>
        </div>
      )}
    </div>
  );
}