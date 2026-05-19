'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    kakao: any;
  }
}

interface Property {
  id: string;
  address: string;
  riskScore: number;
  lat?: number;
  lng?: number;
}

interface SearchResult {
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
}

interface KakaoMapProps {
  properties: Property[];
  selectedProperty?: Property | null;
  onPropertySelect?: (property: Property) => void;
  onBoundsChanged?: (bounds: { neLat: number; neLng: number; swLat: number; swLng: number } | null) => void;
  onMapDrag?: () => void;
  initialCenter?: { lat: number; lng: number } | null;
}

// 전역 스크립트 로딩 상태 관리
let isScriptLoading = false;
let isScriptLoaded = false;
const scriptCallbacks: (() => void)[] = [];

export default function KakaoMap({ properties, selectedProperty, onPropertySelect, onBoundsChanged, onMapDrag, initialCenter }: KakaoMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [map, setMap] = useState<any>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const initialCenterRef = useRef(initialCenter);

  const onBoundsChangedRef = useRef(onBoundsChanged);
  useEffect(() => {
    onBoundsChangedRef.current = onBoundsChanged;
  }, [onBoundsChanged]);

  const onMapDragRef = useRef(onMapDrag);
  useEffect(() => {
    onMapDragRef.current = onMapDrag;
  }, [onMapDrag]);

  const onPropertySelectRef = useRef(onPropertySelect);
  useEffect(() => {
    onPropertySelectRef.current = onPropertySelect;
  }, [onPropertySelect]);

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
        if (onBoundsChangedRef.current) {
          const kakaoBounds = kakaoMap.getBounds();
          onBoundsChangedRef.current({
            neLat: kakaoBounds.getNorthEast().getLat(),
            neLng: kakaoBounds.getNorthEast().getLng(),
            swLat: kakaoBounds.getSouthWest().getLat(),
            swLng: kakaoBounds.getSouthWest().getLng()
          });
        }
        // 지도 중심점 sessionStorage에 저장
        const c = kakaoMap.getCenter();
        sessionStorage.setItem('kakaomap_center', JSON.stringify({
          lat: c.getLat(),
          lng: c.getLng(),
          level: kakaoMap.getLevel()
        }));
      };

      // idle 이벤트: 지도 이동/확대축소가 끝났을 때 발생
      window.kakao.maps.event.addListener(kakaoMap, 'idle', updateBounds);

      // dragstart 이벤트: 사용자가 직접 지도를 드래그할 때 발생
      window.kakao.maps.event.addListener(kakaoMap, 'dragstart', () => {
        if (onMapDragRef.current) onMapDragRef.current();
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

    // 기존 마커 확실히 제거 (배열이 비어 있어도 무조건 기존 마커 지움)
    if (markersRef.current.length > 0) {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    }

    if (!properties || properties.length === 0) {
      return;
    }

    const newMarkers = properties.map((property) => {
      const position = new window.kakao.maps.LatLng(
        property.lat || 37.5665 + Math.random() * 0.01,
        property.lng || 126.9780 + Math.random() * 0.01
      );

      // 리스크 점수에 따른 마커 색상 (연한 파스텔 톤)
      const getRiskColor = (score: number) => {
        if (score >= 80) return '#ef4444'; // 빨간색 (높은 위험)
        if (score >= 60) return '#f59e0b'; // 주황색 (중간 위험)
        return '#10b981'; // 초록색 (낮은 위험)/ 연한 초록색 (낮은 위험)
      };

      // 커스텀 마커 DOM 엘리먼트 생성 (더 자연스러운 디자인)
      const markerElement = document.createElement('div');
      markerElement.style.background = getRiskColor(property.riskScore);
      markerElement.style.color = 'white';
      markerElement.style.padding = '6px 10px';
      markerElement.style.borderRadius = '16px';
      markerElement.style.fontSize = '13px';
      markerElement.style.fontWeight = '600';
      markerElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)';
      markerElement.style.border = '2px solid rgba(255,255,255,0.9)';
      markerElement.style.minWidth = '32px';
      markerElement.style.textAlign = 'center';
      markerElement.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      markerElement.style.backdropFilter = 'blur(8px)';
      markerElement.innerText = property.riskScore.toString();

      const customOverlay = new window.kakao.maps.CustomOverlay({
        position: position,
        content: markerElement,
        yAnchor: 1
      });

      customOverlay.setMap(map);

      // 클릭 이벤트
      markerElement.addEventListener('click', () => {
        if (onPropertySelectRef.current) {
          onPropertySelectRef.current(property);
        }
      });

      // 호버 효과 (더 부드러운 애니메이션)
      markerElement.addEventListener('mouseenter', () => {
        markerElement.style.transform = 'scale(1.15) translateY(-2px)';
        markerElement.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.15)';
        markerElement.style.cursor = 'pointer';
      });

      markerElement.addEventListener('mouseleave', () => {
        markerElement.style.transform = 'scale(1) translateY(0px)';
        markerElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)';
      });

      return customOverlay;
    });

    markersRef.current = newMarkers;
  }, [map, properties]);

  const prevSelectedId = useRef<string | null>(null);

  // 선택된 매물로 지도 이동
  useEffect(() => {
    if (!map || !selectedProperty) {
      prevSelectedId.current = null;
      return;
    }

    // 이미 같은 매물로 이동했으면 무시 (무한 펜 포커스/스냅백 방지)
    if (prevSelectedId.current === selectedProperty.id) return;
    prevSelectedId.current = selectedProperty.id;

    const position = new window.kakao.maps.LatLng(
      selectedProperty.lat || 37.5665,
      selectedProperty.lng || 126.9780
    );

    map.setCenter(position);
    map.setLevel(5);
  }, [map, selectedProperty]);

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
    map.setLevel(4);
    setSearchInput(result.place_name || result.address_name);
    setSearchResults([]);
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
      </div>

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