'use client';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import KakaoMap from '../components/KakaoMap';
import SideNav from '../components/SideNav';
import AnalyzePanel from '../components/AnalyzePanel';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

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
  const [user, setUser] = useState<User | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  // 분석 패널에서 선택한 위치 → 지도 이동 + 마커 표시
  const [analyzeLocation, setAnalyzeLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  
  // 앱 다운로드 홍보 배너 상태
  const [showBanner, setShowBanner] = useState(false);

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
    fetchAnalyses();

    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => { window.removeEventListener('resize', checkMobile); unsubscribe(); };
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const category = searchParams.get('category');
    const panel = searchParams.get('panel');

    if (panel === 'analyze') {
      setShowMobileMap(false);
    } else if (tab === 'list') {
      setShowMobileMap(false);
    } else {
      setShowMobileMap(true);
    }

    if (lat && lng) setMapCenter({ lat: parseFloat(lat), lng: parseFloat(lng) });
    if (category) setSelectedCategory(category);
  }, [searchParams]);

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const headers: Record<string, string> = {};
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      const response = await fetch('/api/land/detective/timeline', { headers });
      if (!response.ok) throw new Error('데이터를 불러오는데 실패했습니다');
      const data = await response.json();
      setAnalyses(data.analyses || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
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

  const boundsFilteredAnalyses = filteredAnalyses.filter(a => {
    if (!mapBounds) return true;
    if (!a.lat || !a.lng) return false;
    return a.lat <= mapBounds.neLat && a.lat >= mapBounds.swLat && a.lng <= mapBounds.neLng && a.lng >= mapBounds.swLng;
  });

  const mapProperties = useMemo(() => {
    const base = filteredAnalyses.map(a => ({
      id: a.id,
      address: a.location?.address || '주소 없음',
      riskScore: parseFloat(a.propertyGrade?.riskScore || '0'),
      lat: a.lat,
      lng: a.lng,
    }));
    // 분석 패널 선택 위치를 마커로 추가
    if (analyzeLocation) {
      base.push({
        id: '__analyze_pin__',
        address: analyzeLocation.address,
        riskScore: 0,
        lat: analyzeLocation.lat,
        lng: analyzeLocation.lng,
      });
    }
    return base;
  }, [filteredAnalyses, analyzeLocation]);

  const selectedMapProperty = useMemo(() => {
    // 분석 패널에서 위치 선택 시 해당 위치로 지도 이동
    if (activePanel === 'analyze' && analyzeLocation) {
      return {
        id: '__analyze_pin__',
        address: analyzeLocation.address,
        riskScore: 0,
        lat: analyzeLocation.lat,
        lng: analyzeLocation.lng,
      };
    }
    if (!selectedProperty) return null;
    return {
      id: selectedProperty.id,
      address: selectedProperty.location?.address || '주소 없음',
      riskScore: parseFloat(selectedProperty.propertyGrade?.riskScore || '0'),
      lat: selectedProperty.lat,
      lng: selectedProperty.lng,
    };
  }, [selectedProperty, analyzeLocation, activePanel]);

  const CATEGORIES = ['all', '토지', '주택', '아파트', '상가', '빌딩'];
  const CATEGORY_LABELS: Record<string, string> = { all: '전체', '토지': '토지', '주택': '주택', '아파트': '아파트', '상가': '상가', '빌딩': '빌딩' };

  return (
    <div className="detective-bg min-h-screen text-slate-900 relative">
      <div className="noise-overlay" />
      <div className="scanline" />

      <SideNav />

      <div className="flex flex-col lg:flex-row h-screen relative z-10 w-full overflow-hidden lg:pl-16">

        {/* ── 왼쪽 패널 ── */}
        <div className={`w-full lg:w-[40%] flex flex-col bg-gradient-to-b from-white to-slate-50/30 lg:h-full shrink-0 z-20 transition-all duration-300 ${activePanel === 'analyze' ? 'flex-1 lg:flex-none min-h-0' : (showMobileMap ? 'h-auto border-b border-slate-200/50 shadow-sm' : 'flex-1 lg:flex-none min-h-0')}`}>

          {/* 헤더 */}
          <header className="px-4 lg:px-6 py-3 border-b border-slate-200/50 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 lg:hidden" />
                <h1 className="text-lg font-black tracking-tighter text-black leading-none">
                  {activePanel === 'analyze' ? '매물 분석' : '부동산탐정'}
                </h1>
              </div>
              {activePanel === 'analyze' ? (
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
          {activePanel !== 'analyze' && (
            <div className="lg:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] flex bg-white/80 backdrop-blur-md rounded-2xl p-1 shadow-xl border border-slate-200">
              <button onClick={() => setShowMobileMap(true)} className={`flex flex-1 items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${showMobileMap ? 'bg-emerald-400 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                지도보기
              </button>
              <button onClick={() => setShowMobileMap(false)} className={`flex flex-1 items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${!showMobileMap ? 'bg-emerald-400 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                {activePanel === 'analyze' ? '매물분석' : '목록보기'}
              </button>
            </div>
          )}



          {/* ── 패널 콘텐츠: 분석 폼 or 매물 리스트 ── */}
          {activePanel === 'analyze' ? (
            <div className={`relative flex-1 min-h-0 ${activePanel === 'analyze' ? 'flex flex-col' : (showMobileMap ? 'hidden lg:flex lg:flex-col' : 'flex flex-col')}`}>
              <AnalyzePanel
                onLocationSelect={(lat, lng, address) => {
                  setAnalyzeLocation({ lat, lng, address });
                  setMapCenter({ lat, lng });
                }}
              />
            </div>
          ) : (
            <div className={`flex-1 overflow-y-auto px-4 lg:px-6 py-4 pb-24 ${showMobileMap ? 'hidden lg:block' : 'block'}`}>

              {/* 헤더 + 카테고리 필터 */}
              <div className="flex flex-col gap-3 mb-4">
                <h2 className="text-sm font-bold text-slate-800">최근 분석</h2>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat}
                      onClick={() => { setSelectedCategory(cat); setDisplayCount(isMobile ? 15 : 20); }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${selectedCategory === cat ? 'bg-emerald-400 border-emerald-400 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600'}`}>
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 로딩 */}
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
                  <button onClick={fetchAnalyses} className="px-4 py-1.5 load-btn font-bold text-xs rounded-lg mono">RETRY</button>
                </div>
              ) : boundsFilteredAnalyses.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-slate-800 font-bold mono text-sm mb-1">매물 없음</p>
                  <p className="text-slate-500 font-medium text-xs">현재 지도 범위나 필터에 해당하는 매물이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {boundsFilteredAnalyses.slice(0, displayCount).map(analysis => (
                    <div key={analysis.id}
                      className={`group relative bg-white border rounded-2xl p-4 cursor-pointer transition-all hover:border-emerald-300 hover:shadow-md ${selectedProperty?.id === analysis.id ? 'border-emerald-400 ring-1 ring-emerald-400 shadow-sm' : 'border-slate-100'}`}
                      onClick={() => { setSelectedProperty(analysis); navigateToDetail(analysis.id); }}>
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
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg font-bold border border-emerald-100/50">판독완료</span>
                          {analysis.propertyGrade?.riskScore && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-300 font-bold uppercase tracking-tighter">RISK</span>
                              <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${parseInt(analysis.propertyGrade.riskScore) > 70 ? 'bg-rose-50 text-rose-600' : parseInt(analysis.propertyGrade.riskScore) > 40 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {analysis.propertyGrade.riskScore}
                              </span>
                            </div>
                          )}
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
                  ))}

                  {displayCount < boundsFilteredAnalyses.length && (
                    <div className="flex flex-col items-center mt-6 gap-2">
                      <button onClick={() => setDisplayCount(p => p + (isMobile ? 15 : 20))}
                        className="bg-white border border-slate-200 text-slate-600 font-bold px-8 py-2.5 rounded-2xl text-[13px] flex items-center gap-2 hover:bg-slate-50 hover:border-emerald-200 transition-all shadow-sm active:scale-95">
                        <span>리스트 더보기</span>
                        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <span className="text-[10px] font-medium text-slate-400">{displayCount} / {boundsFilteredAnalyses.length}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 오른쪽: 지도 ── */}
        <div className={`w-full lg:w-[60%] bg-gradient-to-br from-slate-50 to-slate-100 border-l border-slate-200/50 flex-1 lg:flex-none relative flex-col ${activePanel === 'analyze' ? 'hidden lg:flex' : (showMobileMap ? 'flex' : 'hidden lg:flex')}`}>
          <div className="h-full flex flex-col w-full">
            <div className="flex-1 relative">

              {/* 지도 내 카테고리 필터 */}
              <div className="absolute top-20 lg:top-1/2 lg:-translate-y-1/2 right-4 z-20 flex flex-col gap-1.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-xl shadow-md border border-slate-200">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-sm text-center ${selectedCategory === cat ? 'bg-emerald-400 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>

              <KakaoMap
                properties={mapProperties}
                selectedProperty={selectedMapProperty}
                initialCenter={mapCenter}
                onPropertySelect={property => {
                  const analysis = analyses.find(a => a.id === property.id);
                  if (analysis) setSelectedProperty(analysis);
                }}
                onBoundsChanged={bounds => setMapBounds(bounds)}
                onMapDrag={() => setSelectedProperty(null)}
              />

              {/* 선택 매물 팝업 */}
              {selectedProperty && (
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
                    {selectedProperty.propertyGrade?.riskScore && (
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${parseInt(selectedProperty.propertyGrade.riskScore) > 70 ? 'bg-rose-50 text-rose-700' : parseInt(selectedProperty.propertyGrade.riskScore) > 40 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {selectedProperty.propertyGrade.riskScore}
                      </span>
                    )}
                  </div>
                  {selectedProperty.detectiveNote && (
                    <div className="p-2 bg-emerald-50/50 border border-emerald-100/50 rounded-lg">
                      <p className="text-xs text-emerald-800 font-semibold line-clamp-2">{selectedProperty.detectiveNote}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* 앱 다운로드 안내 배너 팝업 */}
      {activePanel === 'analyze' && showBanner && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-sm w-[calc(100vw-48px)] bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 shadow-xl shadow-slate-200/50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base">📱</span>
                <h4 className="text-xs font-black text-slate-900 tracking-tight">부동산탐정 공식 앱 출시</h4>
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