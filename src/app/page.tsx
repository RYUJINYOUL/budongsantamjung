'use client';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import KakaoMap from '../components/KakaoMap';
import SideNav from '../components/SideNav';
import AnalyzePanel from '../components/AnalyzePanel';
import RankingPanel from '../components/RankingPanel';
import { makeAnalyzeSlug } from '../lib/slug';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  DEFAULT_MAP_POSITION,
  TIMELINE_LIMIT,
  zoomLevelToRadiusKm,
  type MapPosition,
} from '../lib/timelineGeo';
import { getScoreColors } from '../lib/mapMarkers';
import { parseParcelPolygonFromVworldResponse } from '../lib/parcelGeometry';
import {
  PANEL_INPUT,
  PANEL_INPUT_WRAP,
  PAGE_HEADER_TITLE,
  PAGE_STICKY_HEADER,
} from '../components/analyzePanelFormStyles';

interface Analysis {
  id: string;
  category: string;
  propertyTitle?: string;
  location?: { name: string; address: string };
  detectiveNote?: string;
  propertyGrade?: { overall: string; reason: string; riskScore: string };
  warningFlags?: { falseListing: boolean; unrealisticYield: boolean; hiddenFlaws: boolean };
  createdAt: string;
  lat?: number;
  lng?: number;
  likes?: string[];
}

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activePanel = searchParams.get('panel'); // 'analyze' | null

  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(20);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMap, setShowMobileMap] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Analysis | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [mapBounds, setMapBounds] = useState<{ neLat: number; neLng: number; swLat: number; swLng: number } | null>(null);
  const [mapPosition, setMapPosition] = useState<MapPosition>(DEFAULT_MAP_POSITION);
  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTimelineLoadedRef = useRef(false);
  const [user, setUser] = useState<User | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  // 분석 패널에서 선택한 위치 → 지도 이동 + 마커 표시
  const [analyzeLocation, setAnalyzeLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);

  // 랭킹 패널 결과 → 지도 마커 표시
  const [rankingProperties, setRankingProperties] = useState<any[]>([]);
  const [rankingGosiPoints, setRankingGosiPoints] = useState<any[]>([]);
  const [selectedRankingApt, setSelectedRankingApt] = useState<any | null>(null);

  const fetchAbortControllerRef = useRef<AbortController | null>(null);

  // 분석 모드 전용 필지 폴리곤 상태들
  const [primaryPolygon, setPrimaryPolygon] = useState<{ lat: number; lng: number }[] | null>(null);
  const [additionalPolygons, setAdditionalPolygons] = useState<{ lat: number; lng: number }[][]>([]);
  const [externalClickParcel, setExternalClickParcel] = useState<{
    lat: number;
    lng: number;
    address: string;
    pnu: string | null;
    polygon: { lat: number; lng: number }[] | null;
    timestamp: number;
  } | null>(null);

  const handleMapClickInAnalyze = async (latVal: number, lngVal: number) => {
    if (activePanel !== 'analyze') return;
    if (typeof window === 'undefined' || !window.kakao?.maps?.services) return;

    const { kakao } = window;
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.coord2Address(lngVal, latVal, async (result: any, status: any) => {
      if (status === kakao.maps.services.Status.OK) {
        const addr = result[0].road_address?.address_name || result[0].address.address_name;

        try {
          const res = await fetch(`/api/vworld?lat=${latVal}&lng=${lngVal}`);
          if (!res.ok) {
            setExternalClickParcel({ lat: latVal, lng: lngVal, address: addr, pnu: null, polygon: null, timestamp: Date.now() });
            return;
          }
          const data = await res.json();
          const pnu = data?.response?.result?.featureCollection?.features?.[0]?.properties?.pnu?.toString() || null;
          const polygon = parseParcelPolygonFromVworldResponse(data);

          setExternalClickParcel({ lat: latVal, lng: lngVal, address: addr, pnu, polygon, timestamp: Date.now() });
        } catch {
          setExternalClickParcel({ lat: latVal, lng: lngVal, address: addr, pnu: null, polygon: null, timestamp: Date.now() });
        }
      }
    });
  };

  // 앱 다운로드 홍보 배너 상태
  const [showBanner, setShowBanner] = useState(false);
  const [showMobileWarning, setShowMobileWarning] = useState(false);

  useEffect(() => {
    const dismissedUntil = localStorage.getItem('app-banner-dismissed-until');
    if (!dismissedUntil || Date.now() > parseInt(dismissedUntil)) {
      setShowBanner(true);
    }
  }, []);

  const dismissBanner = () => {
    localStorage.setItem('app-banner-dismissed-until', (Date.now() + 24 * 60 * 60 * 1000).toString());
    setShowBanner(false);
  };

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setDisplayCount(mobile ? 15 : 20);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => { window.removeEventListener('resize', checkMobile); unsubscribe(); };
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const category = searchParams.get('category');
    const panel = searchParams.get('panel');

    if (panel === 'analyze' || panel === 'ranking') {
      setShowMobileMap(false);
    } else if (tab === 'list') {
      setShowMobileMap(false);
    } else {
      setShowMobileMap(true);
    }

    if (lat && lng) setMapCenter({ lat: parseFloat(lat), lng: parseFloat(lng) });
    if (category) setSelectedCategory(category);
  }, [searchParams]);

  const fetchAnalyses = useCallback(async (lat: number, lng: number, radius: number, silent = false) => {
    if (fetchAbortControllerRef.current) {
      fetchAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    fetchAbortControllerRef.current = abortController;

    try {
      if (!silent && !hasTimelineLoadedRef.current) setLoading(true);
      setError(null);
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const headers: Record<string, string> = {};
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

      const params = new URLSearchParams({
        limit: String(TIMELINE_LIMIT),
        lat: String(lat),
        lng: String(lng),
        radius: String(radius),
      });
      const response = await fetch(`/api/land/detective/timeline?${params}`, { 
        headers,
        signal: abortController.signal
      });
      if (!response.ok) throw new Error('데이터를 불러오는데 실패했습니다');
      const data = await response.json();
      const list = (data.analyses || []).map((item: any) => ({
        ...item,
        id: item.id || item._id || item.reportId || item.report_id || '',
      }));
      setAnalyses(list);
      hasTimelineLoadedRef.current = true;
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message);
    } finally {
      if (fetchAbortControllerRef.current === abortController) {
        setLoading(false);
      }
    }
  }, []);

  /** 앱 timelineProvider와 동일: 지도 이동·줌 후 300ms 디바운스 재요청 */
  useEffect(() => {
    if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    fetchDebounceRef.current = setTimeout(() => {
      const radius = zoomLevelToRadiusKm(mapPosition.zoomLevel);
      fetchAnalyses(mapPosition.lat, mapPosition.lng, radius, hasTimelineLoadedRef.current);
    }, 300);
    return () => {
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    };
  }, [mapPosition, fetchAnalyses]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  };

  const getCategoryDisplay = (category?: string) => {
    if (!category) return null;
    const c = category.toLowerCase();
    if (c.includes('apartment') || category.includes('아파트')) return '아파트';
    if (c.includes('land') || category.includes('토지')) return '토지';
    if (c.includes('house') || category.includes('주택')) return '주택';
    if (c.includes('store') || category.includes('상가')) return '상가';
    if (c.includes('building') || category.includes('빌딩')) return '빌딩';
    return category;
  };

  const toggleLike = async (e: React.MouseEvent, analysisId: string) => {
    e.stopPropagation();
    if (!user) { alert('로그인이 필요합니다.'); return; }
    setAnalyses(prev => prev.map(a => {
      if (a.id !== analysisId) return a;
      const isLiked = a.likes?.includes(user.uid);
      return { ...a, likes: isLiked ? a.likes?.filter(u => u !== user.uid) || [] : [...(a.likes || []), user.uid] };
    }));
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/land/detective/reports/${analysisId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (data.success && data.likes) {
        setAnalyses(prev => prev.map(a => a.id === analysisId ? { ...a, likes: data.likes } : a));
      }
    } catch { /* ignore */ }
  };

  const navigateToDetail = (analysisId: string) => {
    const params = new URLSearchParams();
    params.set('tab', showMobileMap ? 'map' : 'list');
    if (mapCenter) { params.set('lat', mapCenter.lat.toString()); params.set('lng', mapCenter.lng.toString()); }
    else if (mapBounds) {
      params.set('lat', ((mapBounds.neLat + mapBounds.swLat) / 2).toString());
      params.set('lng', ((mapBounds.neLng + mapBounds.swLng) / 2).toString());
    }
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    router.push(`/analyze/${analysisId}?return=${encodeURIComponent(params.toString())}`);
  };

  const categoryMappings: Record<string, string[]> = {
    '아파트': ['apartment', '아파트'],
    '토지': ['land', '토지'],
    '주택': ['house', '주택', '단독주택', '공동주택'],
    '상가': ['store', '상가', '상업용', '상업', 'shop', 'commercial'],
    '빌딩': ['building', '빌딩', '상업용빌딩'],
  };

  const filteredAnalyses = analyses.filter(a => {
    if (selectedCategory === 'all') return true;
    if (!a.category) return false;

    const allowedValues = categoryMappings[selectedCategory] || [selectedCategory];
    const categoryLower = a.category.toLowerCase().trim();

    return allowedValues.some(val =>
      categoryLower.includes(val.toLowerCase()) ||
      val.toLowerCase().includes(categoryLower)
    );
  });
  const mapProperties = useMemo(() => {
    if (activePanel === 'ranking') {
      // 카테고리별 마커 색상: apartment=분홍, land=보라, building=초록
      const rankCategoryForMarker = (searchParams.get('rankingType') || 'apartment') as string;
      const rankMarkers = rankingProperties.filter(a => a.lat && a.lng).map(a => ({
        id: a.reportId,
        address: a.address || a.pnu || '주소 없음',
        propertyTitle: `${a.rank}위: ${a.bldNm || a.address || ''}`,
        category: rankCategoryForMarker,
        riskScore: 0,
        lat: a.lat,
        lng: a.lng,
      }));
      const uniqueGosi = Array.from(
        new Map(rankingGosiPoints.filter(g => g.lat && g.lng).map(g => [g.title || `${g.lat}-${g.lng}`, g])).values()
      );
      const gosiMarkers = uniqueGosi.map((g, i) => {
        const truncatedTitle = (g.title || '').length > 8 ? (g.title || '').slice(0, 8) + '...' : g.title;
        return {
          id: `gosi-${i}`,
          address: g.address || '개발호재 위치',
          propertyTitle: truncatedTitle || '직접 수혜 범위',
          category: 'gosi',
          riskScore: 0,
          lat: g.lat,
          lng: g.lng,
        };
      });
      return [...rankMarkers, ...gosiMarkers];
    }
    return filteredAnalyses
      .filter(a => a.lat != null && a.lng != null)
      .map(a => ({
        id: a.id,
        address: a.location?.address || '주소 없음',
        propertyTitle: a.propertyTitle,
        category: a.category,
        riskScore: parseFloat(a.propertyGrade?.riskScore || '0'),
        lat: a.lat,
        lng: a.lng,
      }));
  }, [filteredAnalyses, activePanel, rankingProperties, rankingGosiPoints, searchParams]);

  const selectedMapProperty = useMemo(() => {
    // 분석 패널에서 위치 선택 시 해당 위치로 지도 이동
    if (activePanel === 'analyze' && analyzeLocation) {
      return {
        id: '__analyze_pin__',
        address: analyzeLocation.address,
        propertyTitle: analyzeLocation.address,
        category: 'pin',
        riskScore: 0,
        lat: analyzeLocation.lat,
        lng: analyzeLocation.lng,
      };
    }
    if (!selectedProperty) return null;
    return {
      id: selectedProperty.id,
      address: selectedProperty.location?.address || '주소 없음',
      propertyTitle: selectedProperty.propertyTitle,
      category: selectedProperty.category,
      riskScore: parseFloat(selectedProperty.propertyGrade?.riskScore || '0'),
      lat: selectedProperty.lat,
      lng: selectedProperty.lng,
    };
  }, [selectedProperty, analyzeLocation, activePanel]);

  const CATEGORIES = ['all', '토지', '주택', '아파트', '상가', '빌딩'];
  const CATEGORY_LABELS: Record<string, string> = { all: '전체', '토지': '토지', '주택': '주택', '아파트': '아파트', '상가': '상가', '빌딩': '빌딩' };
  const [listSearchQuery, setListSearchQuery] = useState('');

  const searchFilteredAnalyses = useMemo(() => {
    const q = listSearchQuery.trim().toLowerCase();
    if (!q) return filteredAnalyses;
    return filteredAnalyses.filter(a =>
      (a.propertyTitle || '').toLowerCase().includes(q) ||
      (a.location?.name || '').toLowerCase().includes(q) ||
      (a.location?.address || '').toLowerCase().includes(q) ||
      (a.detectiveNote || '').toLowerCase().includes(q)
    );
  }, [filteredAnalyses, listSearchQuery]);

  return (
    <div className="detective-bg min-h-screen text-slate-900 relative">
      <div className="noise-overlay" />
      <div className="scanline" />

      <SideNav />

      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,25%)_minmax(0,75%)] h-screen relative z-10 w-full overflow-hidden lg:pl-16">

        {/* ── 왼쪽 패널 (3) ── */}
        <div className={`w-full flex flex-col bg-gradient-to-b from-white to-slate-50/30 min-w-0 z-20 overflow-hidden lg:h-full lg:min-h-0 transition-all duration-300 ${activePanel === 'analyze' ? 'flex-1 min-h-0' : showMobileMap ? 'max-lg:shrink-0 max-lg:h-auto border-b lg:border-b-0 border-slate-200/50 shadow-sm lg:shadow-none' : 'flex-1 min-h-0'}`}>

          {/* 헤더 */}
          <header className={PAGE_STICKY_HEADER}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 lg:hidden" />
                <h1 className={PAGE_HEADER_TITLE}>
                  {activePanel === 'analyze' ? '매물분석' : activePanel === 'ranking' ? '아파트 랭킹' : '부동산탐정'}
                </h1>
              </div>
              {(activePanel === 'analyze' || activePanel === 'ranking') ? (
                <a href="/" className="lg:hidden bg-emerald-400 hover:bg-emerald-500 text-white px-3 py-1 rounded-xl font-bold text-xs tracking-wide shadow-sm transition-all active:scale-95">
                  지도
                </a>
              ) : (
                <a href="/?panel=analyze" className="lg:hidden bg-emerald-400 hover:bg-emerald-500 text-white px-3 py-1 rounded-xl font-bold text-xs tracking-wide shadow-sm transition-all active:scale-95">
                  분석
                </a>
              )}
            </div>
          </header>

          {/* 모바일 뷰 토글 */}
          {(activePanel !== 'analyze' && activePanel !== 'ranking') && (
            <div className="lg:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] flex bg-white/80 backdrop-blur-md rounded-2xl p-1 shadow-xl border border-slate-200">
              <button onClick={() => setShowMobileMap(true)} className={`flex flex-1 items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${showMobileMap ? 'bg-emerald-400 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                지도
              </button>
              <button onClick={() => setShowMobileMap(false)} className={`flex flex-1 items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${!showMobileMap ? 'bg-emerald-400 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                {activePanel === 'analyze' ? '매물분석' : '목록'}
              </button>
            </div>
          )}



          {/* ── 패널 콘텐츠: 분석 폼 or 매물 리스트 ── */}
          {activePanel === 'analyze' ? (
            <div className={`relative flex-1 min-h-0 ${activePanel === 'analyze' ? 'flex flex-col' : (showMobileMap ? 'hidden lg:flex lg:flex-col' : 'flex flex-col')}`}>
              <AnalyzePanel
                onLocationSelect={(lat, lng, address, polygon) => {
                  setAnalyzeLocation({ lat, lng, address });
                  setMapCenter({ lat, lng });
                  setPrimaryPolygon(polygon || null);
                }}
                onLocationClear={() => {
                  setAnalyzeLocation(null);
                  setPrimaryPolygon(null);
                  setAdditionalPolygons([]);
                }}
                onAdditionalParcelsChange={(parcels) => {
                  const polys = parcels.map(p => p.polygon).filter((p): p is { lat: number; lng: number }[] => !!p);
                  setAdditionalPolygons(polys);
                }}
                externalClickParcel={externalClickParcel}
                onMobileButtonClick={() => setShowMobileWarning(true)}
              />
            </div>
          ) : activePanel === 'ranking' ? (
            <div className={`relative flex-1 min-h-0 ${activePanel === 'ranking' ? 'flex flex-col' : (showMobileMap ? 'hidden lg:flex lg:flex-col' : 'flex flex-col')}`}>
              <RankingPanel
                onResultsChange={(results, gosiPoints) => {
                  setRankingProperties(results);
                  setRankingGosiPoints(gosiPoints || []);
                  if (results.length > 0 && results[0].lat && results[0].lng) {
                    setMapCenter({ lat: results[0].lat, lng: results[0].lng });
                  }
                }}
                urlPrefill={{
                  sigunguCd: searchParams.get('sigunguCd') || '',
                  sigunguName: searchParams.get('sigunguName') || '',
                  minPrice: Number(searchParams.get('minPrice')) || 0,
                  maxPrice: Number(searchParams.get('maxPrice')) || 0,
                  rankingType: searchParams.get('rankingType') || 'apartment',
                }}

              />
            </div>
          ) : (
            <div className={`flex-1 min-h-0 overflow-y-auto px-4 lg:px-6 py-4 pb-24 ${showMobileMap ? 'hidden lg:block' : 'block'}`}>
              <div className="flex flex-col gap-3 mb-4">
                <h2 className="text-sm font-bold text-slate-800">최근 분석</h2>

                <div className={PANEL_INPUT_WRAP}>
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="매물명, 지역, 키워드 검색..."
                    value={listSearchQuery}
                    onChange={e => setListSearchQuery(e.target.value)}
                    className={PANEL_INPUT}
                  />
                  {listSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setListSearchQuery('')}
                      className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label="검색어 지우기"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => { setSelectedCategory(cat); setDisplayCount(isMobile ? 15 : 20); }}
                        className={`shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-all ${selectedCategory === cat ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/15' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-700'}`}
                      >
                        {CATEGORY_LABELS[cat]}
                      </button>
                    ))}
                  </div>
                  <span className="hidden lg:inline-block text-[10px] text-slate-400 font-extrabold shrink-0 tabular-nums">
                    {searchFilteredAnalyses.length}건
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="relative w-10 h-10">
                    <div className="absolute inset-0 rounded-full border-2 border-emerald-100" />
                    <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500 animate-spin" />
                  </div>
                  <p className="mono text-xs font-bold text-emerald-600 tracking-widest">LOADING...</p>
                </div>
              ) : error ? (
                <div className="text-center py-16">
                  <p className="text-red-500 font-bold mono text-xs mb-3">{error}</p>
                  <button
                    onClick={() => fetchAnalyses(mapPosition.lat, mapPosition.lng, zoomLevelToRadiusKm(mapPosition.zoomLevel))}
                    className="px-4 py-1.5 load-btn font-bold text-xs rounded-lg mono"
                  >
                    RETRY
                  </button>
                </div>
              ) : searchFilteredAnalyses.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-slate-800 font-bold mono text-sm mb-1">
                    {listSearchQuery ? '검색 결과 없음' : '매물 없음'}
                  </p>
                  <p className="text-slate-500 font-medium text-xs">
                    {listSearchQuery ? '조건에 맞는 분석 내역이 없습니다.' : '지도 영역 내 매물이 없습니다.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchFilteredAnalyses.slice(0, displayCount).map(analysis => {
                    const categoryLabel = getCategoryDisplay(analysis.category);
                    return (
                      <div key={analysis.id}
                        className={`group relative bg-white border rounded-2xl p-4 cursor-pointer transition-all hover:border-emerald-300 hover:shadow-md ${selectedProperty?.id === analysis.id ? 'border-emerald-400 ring-1 ring-emerald-400 shadow-sm' : 'border-slate-100'}`}
                        onClick={() => navigateToDetail(analysis.id)}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[15px] font-bold text-slate-900 tracking-tight truncate leading-tight group-hover:text-emerald-600 transition-colors">
                              {analysis.propertyTitle || '부동산탐정 판독'}
                            </h3>
                            {analysis.location?.name && (
                              <p className="text-xs text-slate-400 truncate font-medium mt-1">{analysis.location.name}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <div className="flex items-center gap-1 flex-wrap justify-end">
                              {categoryLabel && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-bold border border-slate-200/60">
                                  {categoryLabel}
                                </span>
                              )}
                              <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg font-bold border border-emerald-100/50">분석완료</span>
                            </div>
                            {analysis.propertyGrade?.riskScore && (() => {
                              const scoreColors = getScoreColors(parseFloat(analysis.propertyGrade.riskScore));
                              return (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-slate-300 font-bold uppercase tracking-tighter">AI평가</span>
                                  <span
                                    className="text-[11px] font-black px-1.5 py-0.5 rounded-md border border-white/30 shadow-sm"
                                    style={{ backgroundColor: scoreColors.bg, color: '#000000' }}
                                  >
                                    {analysis.propertyGrade.riskScore}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        {analysis.detectiveNote && (
                          <div className="bg-slate-50 border border-slate-100/50 rounded-xl p-2.5 mb-2.5">
                            <p className="text-[12px] text-slate-600 font-medium line-clamp-2 leading-relaxed">{analysis.detectiveNote}</p>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-auto">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-300 font-medium">{formatDate(analysis.createdAt)}</span>
                            <button onClick={e => toggleLike(e, analysis.id)}
                              className={`flex items-center gap-1 text-sm transition-all focus:outline-none ml-1 ${analysis.likes?.includes(user?.uid || '') ? 'text-rose-500 hover:text-rose-600' : 'text-slate-300 hover:text-rose-400'}`}>
                              <span className={analysis.likes?.includes(user?.uid || '') ? 'animate-pulse' : ''}>♥</span>
                              <span className="text-[10px] font-bold mt-0.5">{analysis.likes?.length || 0}</span>
                            </button>
                          </div>
                          <span className="text-[10px] text-emerald-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">자세히 보기 →</span>
                        </div>
                      </div>
                    );
                  })}

                  {displayCount < searchFilteredAnalyses.length && (
                    <div className="flex flex-col items-center mt-6 gap-2">
                      <button onClick={() => setDisplayCount(p => p + (isMobile ? 15 : 20))}
                        className="bg-white border border-slate-200 text-slate-600 font-bold px-8 py-2.5 rounded-2xl text-[13px] flex items-center gap-2 hover:bg-slate-50 hover:border-emerald-200 transition-all shadow-sm active:scale-95">
                        <span>리스트 더보기</span>
                        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <span className="text-[10px] font-medium text-slate-400">{displayCount} / {searchFilteredAnalyses.length}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 오른쪽: 지도 (7) ── */}
        <div className={`w-full bg-gradient-to-br from-slate-50 to-slate-100 border-l border-slate-200/50 flex-1 lg:flex-none relative flex-col min-w-0 ${(activePanel === 'analyze' || activePanel === 'ranking') ? 'hidden lg:flex' : (showMobileMap ? 'flex' : 'hidden lg:flex')}`}>
          <div className="h-full flex flex-col w-full">
            <div className="flex-1 relative">

              {/* 지도 내 카테고리 필터 (분석/랭킹 탭 제외 — 좌측 패널에서 선택) */}
              {(activePanel !== 'analyze' && activePanel !== 'ranking') && (
                <div className="absolute top-20 lg:top-1/2 lg:-translate-y-1/2 right-4 z-20 flex flex-col gap-1.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-xl shadow-md border border-slate-200">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-sm text-center ${selectedCategory === cat ? 'bg-emerald-400 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              )}

              <KakaoMap
                properties={mapProperties}
                selectedProperty={selectedMapProperty}
                navigationZoomLevel={2}
                initialCenter={mapCenter}
                onPropertySelect={property => {
                  if (activePanel === 'ranking') {
                    const apt = rankingProperties.find(a => a.reportId === property.id);
                    if (apt) setSelectedRankingApt(apt);
                    return;
                  }
                  const analysis = analyses.find(a => a.id === property.id);
                  if (analysis) setSelectedProperty(analysis);
                }}
                onBoundsChanged={bounds => setMapBounds(bounds)}
                onMapIdle={pos => setMapPosition(pos)}
                onMapDrag={() => setSelectedProperty(null)}
                isAnalyzeMode={activePanel === 'analyze'}
                primaryPolygon={primaryPolygon}
                additionalPolygons={additionalPolygons}
                onMapClick={handleMapClickInAnalyze}
              />

              {/* 선택 매물 팝업 — 일반 */}
              {(selectedProperty && activePanel !== 'ranking') && (
                <div className="absolute bottom-24 lg:bottom-6 left-4 right-4 lg:left-6 lg:right-6 z-30 bg-white/95 backdrop-blur-md rounded-xl p-3 shadow-xl border border-emerald-200 cursor-pointer hover:bg-emerald-50/30 transition-all hover:scale-[1.01]"
                  onClick={() => navigateToDetail(selectedProperty.id)}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5 mb-0.5">
                        <span className="text-emerald-700 text-xs">●</span>선택된 매물
                      </h4>
                      <p className="text-sm text-slate-700 font-semibold truncate">{selectedProperty.propertyTitle}</p>
                      <p className="text-xs text-slate-500 truncate">{selectedProperty.location?.name}</p>
                    </div>
                    {selectedProperty.propertyGrade?.riskScore && (() => {
                      const scoreColors = getScoreColors(parseFloat(selectedProperty.propertyGrade.riskScore));
                      return (
                        <span
                          className="text-xs font-bold px-2 py-1 rounded-lg shrink-0 border border-white/30 shadow-sm"
                          style={{ backgroundColor: scoreColors.bg, color: scoreColors.text }}
                        >
                          {selectedProperty.propertyGrade.riskScore}
                        </span>
                      );
                    })()}
                  </div>
                  {selectedProperty.detectiveNote && (
                    <div className="p-2 bg-emerald-50/50 border border-emerald-100/50 rounded-lg">
                      <p className="text-xs text-emerald-800 font-semibold line-clamp-2">{selectedProperty.detectiveNote}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 선택 매물 팝업 — 랭킹 */}
              {(selectedRankingApt && activePanel === 'ranking') && (() => {
                const apt = selectedRankingApt;
                const n = Number(apt.estimatedTotalPrice || 0);
                const manwon = Math.floor(n / 10000);
                const estimatedStr = manwon >= 10000
                  ? (() => { const eok = Math.floor(manwon / 10000); const rest = manwon % 10000; return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만` : `${eok}억`; })()
                  : manwon > 0 ? `${manwon.toLocaleString()}만` : null;
                const trend = apt.priceTrendPercent;
                const rankColors = [null, '#f59e0b', '#94a3b8', '#b45309'];
                const rankColor = rankColors[apt.rank] || '#64748b';
                return (
                  <div
                    className="absolute bottom-6 left-6 right-6 z-30 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-pink-100 cursor-pointer hover:scale-[1.01] transition-all"
                    onClick={() => {
                      const params = new URLSearchParams();
                      params.set('panel', 'ranking');
                      if (searchParams.get('sigunguCd')) params.set('sigunguCd', searchParams.get('sigunguCd')!);
                      if (searchParams.get('sigunguName')) params.set('sigunguName', searchParams.get('sigunguName')!);
                      if (searchParams.get('minPrice')) params.set('minPrice', searchParams.get('minPrice')!);
                      if (searchParams.get('maxPrice')) params.set('maxPrice', searchParams.get('maxPrice')!);
                      const slug = makeAnalyzeSlug(apt.reportId, apt.bldNm);
                      router.push(`/analyze/${slug}?return=${encodeURIComponent('?' + params.toString())}`);
                    }}
                  >
                    {/* 닫기 */}
                    <button
                      className="absolute top-2.5 right-3 text-slate-300 hover:text-slate-500 text-lg leading-none"
                      onClick={e => { e.stopPropagation(); setSelectedRankingApt(null); }}
                    >✕</button>

                    <div className="p-3">
                      <div className="flex items-start gap-3">
                        {/* 순위 배지 */}
                        <div className="shrink-0 flex flex-col items-center justify-center w-9 h-9 rounded-xl border-2"
                          style={{ borderColor: rankColor, backgroundColor: `${rankColor}18` }}>
                          <span className="text-[11px] font-black" style={{ color: rankColor }}>{apt.rank}위</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-emerald-600 text-[10px] font-black">● 선택된 매물</span>
                          </div>
                          <p className="text-[15px] font-black text-slate-900 truncate">{apt.bldNm}</p>
                          {apt.targetArea > 0 && (
                            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{apt.targetArea}㎡</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {estimatedStr && (
                          <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                            추정가 {estimatedStr}
                          </span>
                        )}
                        {trend !== null && trend !== undefined && (
                          <span className={`text-[11px] font-bold px-2 py-1 rounded-lg border ${
                            trend > 0 ? 'bg-rose-50 text-rose-600 border-rose-100' :
                            trend < 0 ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            'bg-slate-50 text-slate-500 border-slate-100'
                          }`}>
                            6개월 {trend > 0 ? '+' : ''}{trend.toFixed(1)}% {trend > 0 ? '↑' : trend < 0 ? '↓' : '-'}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 font-semibold">매매 {apt.saleCount}건</span>
                      </div>

                      <p className="text-[10px] text-emerald-500 font-bold text-right mt-2">리포트 보기 →</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
      {/* 앱 다운로드 안내 배너 팝업 (PC 전용) */}
      {!isMobile && activePanel === 'analyze' && showBanner && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-sm w-[calc(100vw-48px)] bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 shadow-xl shadow-slate-200/50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">

                <h4 className="text-xs font-black text-slate-900 tracking-tight">부동산탐정 공식 앱</h4>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                구글 플레이스토어와 애플 앱스토어에서 <span className="text-emerald-600 font-extrabold">부동산탐정</span> 앱을 설치하셔서 더 원활하고 추가된 기능들을 만나보세요!
              </p>
            </div>
            <button
              onClick={dismissBanner}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-colors shrink-0"
              aria-label="하루 동안 닫기"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 모바일 매물 분석 페이지 접속 시 하단 알림 */}
      {isMobile && activePanel === 'analyze' && showMobileWarning && (
        <div className="fixed bottom-6 left-6 right-6 z-[150] bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-col gap-3 text-white">
            <div className="flex justify-between items-start">
              <p className="text-[12px] text-slate-355 font-semibold leading-relaxed animate-pulse">
                매물 분석은 <strong className="text-emerald-400 font-extrabold">앱</strong>과 <strong className="text-emerald-400 font-extrabold">PC</strong>에서만 지원합니다
              </p>
              <button
                type="button"
                onClick={() => setShowMobileWarning(false)}
                className="text-slate-400 hover:text-white transition-colors p-1"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <div className="h-px bg-white/10 my-0.5" />
            <div className="flex flex-col gap-2.5">
              <a
                href="https://www.tamjung.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between text-xs bg-white/10 hover:bg-white/15 active:scale-[0.98] px-4 py-3 rounded-xl border border-white/10 transition-all text-white font-bold"
              >
                <div className="flex items-center gap-2">

                  <span>PC : 구글 네이버 부동산탐정 검색</span>
                </div>
                <span className="text-emerald-400 text-[11px] font-extrabold">tamjung.me</span>
              </a>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href="https://play.google.com/store/apps/details?id=com.yongcar.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-[11px] bg-white/10 hover:bg-white/15 active:scale-[0.98] py-2.5 rounded-xl border border-white/10 transition-all text-white font-bold"
                >
                  <span>구글플레이</span>
                </a>
                <a
                  href="https://apps.apple.com/kr/app/%EB%B6%80%EB%8F%99%EC%82%B0%ED%83%90%EC%A0%95/id6762132537"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-[11px] bg-white/10 hover:bg-white/15 active:scale-[0.98] py-2.5 rounded-xl border border-white/10 transition-all text-white font-bold"
                >
                  <span>앱스토어</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <HomePageContent />
    </Suspense>
  );
}