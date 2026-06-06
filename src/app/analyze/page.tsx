'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

// 카카오맵 타입 정의
declare global {
  interface Window {
    kakao: any;
  }
}

interface SearchResult {
  place_name?: string;
  address_name: string;
  road_address_name?: string;
  x: string; // 경도
  y: string; // 위도
}

export default function UnifiedAnalyzePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  // 정식 경로로 리다이렉트
  useEffect(() => {
    router.replace('/?panel=analyze');
  }, [router]);

  // 1단계: 카테고리 및 위치
  const [selectedCategory, setSelectedCategory] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 1-1단계: 다중 필지 (합필)
  interface AdditionalParcel {
    address: string;
    lat: number;
    lng: number;
    pnu?: string;
    isLoadingPnu: boolean;
  }
  const [isMultiParcel, setIsMultiParcel] = useState(false);
  const [additionalParcels, setAdditionalParcels] = useState<AdditionalParcel[]>([]);
  const [primaryPnu, setPrimaryPnu] = useState<string | null>(null);

  // 추가 필지 검색용
  const [parcelSearchQuery, setParcelSearchQuery] = useState('');
  const [parcelSearchResults, setParcelSearchResults] = useState<SearchResult[]>([]);
  const [isParcelSearching, setIsParcelSearching] = useState(false);

  // 지도/마커 관리
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const kakaoMap = useRef<any>(null);
  const kakaoMarker = useRef<any>(null);

  // 상태 및 제어
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [usageLimit, setUsageLimit] = useState<number>(1);
  const [canAnalyze, setCanAnalyze] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileWarning, setShowMobileWarning] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const apiKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;
  const analysisSteps = [
    { label: '위치 데이터 매칭', desc: '좌표를 기반으로 정확한 필지(PNU)를 식별합니다' },
    { label: '국가 API 연동', desc: '건축물대장 및 토지특성 데이터를 수집합니다' },
    { label: '주변 실거래가 수집', desc: '인근 지역의 최근 거래 정보를 필터링합니다' },
    { label: '공시가격 조회', desc: '연도별 공시지가 및 주택가격을 확인합니다' },
    { label: '인허가/규제 확인', desc: '토지이용계획 및 개발 행위 제한 사항을 검토합니다' },
    { label: '인구/통계 데이터 수집', desc: '지역 인구 이동 및 상권 활성도를 분석합니다' },
    { label: '기초 데이터 조립', desc: '수집된 모든 데이터를 분석용 리포트로 구성합니다' },
    { label: '수집 완료', desc: '데이터 수집이 완료되었습니다. 상세 페이지로 이동합니다' },
  ];
  const stepIcons = [
    '/3d/wich.svg',
    '/3d/api.svg',
    '/3d/sil.svg',
    '/3d/gong.svg',
    '/3d/inhuga.svg',
    '/3d/ingu.svg',
    '/3d/gicho.svg',
    '/3d/suzip.svg'
  ];
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  // 사용자 상태 및 사용량 체크
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) checkUsage(currentUser.uid);
    });
    return () => unsubscribe();
  }, []);

  const checkUsage = async (uid: string) => {
    try {
      const res = await fetch(`/api/user/usage?userId=${uid}`);
      const data = await res.json();
      if (data.count !== undefined) {
        setUsageLimit(data.limit || 1);
        setCanAnalyze(data.canAnalyze ?? true);
      }
    } catch (err) { console.error('Usage check error:', err); }
  };

  // 분석 타이머 및 단계 진행
  useEffect(() => {
    if (!isAnalyzing) return;
    const timer = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);
    const stepTimer = setInterval(() => {
      setAnalysisStep(prev => (prev < analysisSteps.length - 1 ? prev + 1 : prev));
    }, 3000);
    return () => { clearInterval(timer); clearInterval(stepTimer); };
  }, [isAnalyzing]);

  // 카카오맵 초기화
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services&autoload=false`;
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.kakao.maps.load(() => {
        if (!mapContainerRef.current) return;
        const { kakao } = window;
        const container = mapContainerRef.current;
        const options = {
          center: new kakao.maps.LatLng(lat || 33.450701, lng || 126.570667),
          level: 3,
        };
        const mapInstance = new kakao.maps.Map(container, options);
        kakaoMap.current = mapInstance;

        if (lat && lng) {
          const position = new kakao.maps.LatLng(lat, lng);
          const newMarker = new kakao.maps.Marker({ position, map: mapInstance });
          kakaoMarker.current = newMarker;
          mapInstance.setCenter(position);
        }

        kakao.maps.event.addListener(mapInstance, 'click', (mouseEvent: any) => {
          handleMapClick(mouseEvent.latLng.getLat(), mouseEvent.latLng.getLng());
        });
      });
    };

    return () => { if (document.head.contains(script)) document.head.removeChild(script); };
  }, []);

  const getPnuFromCoords = async (latVal: number, lngVal: number): Promise<string | null> => {
    try {
      const response = await fetch(`/api/vworld?lat=${latVal}&lng=${lngVal}`);
      if (!response.ok) return null;
      const data = await response.json();
      const features = data?.response?.result?.featureCollection?.features;
      if (features && features.length > 0) {
        return features[0]?.properties?.pnu?.toString() || null;
      }
      return null;
    } catch (error) {
      console.error('getPnuFromCoords proxy error:', error);
      return null;
    }
  };

  const handleMapClick = (latVal: number, lngVal: number) => {
    const { kakao } = window;
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.coord2Address(lngVal, latVal, async (result: any, status: any) => {
      if (status === kakao.maps.services.Status.OK) {
        const addr = result[0].road_address?.address_name || result[0].address.address_name;
        setAddress(addr);
        setLat(latVal);
        setLng(lngVal);
        updateMarker(latVal, lngVal);
        const pnu = await getPnuFromCoords(latVal, lngVal);
        setPrimaryPnu(pnu);
      }
    });
  };

  const updateMarker = (latVal: number, lngVal: number) => {
    if (!kakaoMap.current) return;
    const { kakao } = window;
    const position = new kakao.maps.LatLng(latVal, lngVal);

    if (kakaoMarker.current) {
      kakaoMarker.current.setPosition(position);
      kakaoMarker.current.setMap(kakaoMap.current);
    } else {
      kakaoMarker.current = new kakao.maps.Marker({ position, map: kakaoMap.current });
    }
    kakaoMap.current.panTo(position);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const { kakao } = window;

    const geocoder = new kakao.maps.services.Geocoder();
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

  const handleParcelSearch = (query: string) => {
    setParcelSearchQuery(query);
    if (!query || query.length < 2) {
      setParcelSearchResults([]);
      return;
    }
    setIsParcelSearching(true);
    const { kakao } = window;

    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.addressSearch(query, (result: any, status: any) => {
      if (status === kakao.maps.services.Status.OK && result.length > 0) {
        setIsParcelSearching(false);
        setParcelSearchResults(result.slice(0, 5).map((p: any) => ({
          place_name: p.address_name || p.road_address?.address_name,
          address_name: p.address_name,
          road_address_name: p.road_address?.address_name || '',
          x: p.x,
          y: p.y
        })));
      } else {
        const ps = new kakao.maps.services.Places();
        ps.keywordSearch(query, (data: any, status: any) => {
          setIsParcelSearching(false);
          if (status === kakao.maps.services.Status.OK) {
            setParcelSearchResults(data.slice(0, 5).map((p: any) => ({
              place_name: p.place_name,
              address_name: p.address_name,
              road_address_name: p.road_address_name,
              x: p.x,
              y: p.y
            })));
          } else {
            setParcelSearchResults([]);
          }
        });
      }
    });
  };

  const selectParcelSearchResult = async (result: SearchResult) => {
    const y = parseFloat(result.y);
    const x = parseFloat(result.x);
    const addr = result.road_address_name || result.address_name;

    setParcelSearchQuery('');
    setParcelSearchResults([]);

    if (additionalParcels.some(p => p.address === addr)) return;

    const newParcel: AdditionalParcel = {
      address: addr,
      lat: y,
      lng: x,
      isLoadingPnu: true
    };

    setAdditionalParcels(prev => [...prev, newParcel]);

    const pnu = await getPnuFromCoords(y, x);

    setAdditionalParcels(prev => prev.map(p =>
      p.address === addr ? { ...p, pnu, isLoadingPnu: false } : p
    ));
  };

  const selectSearchResult = async (result: SearchResult) => {
    const y = parseFloat(result.y);
    const x = parseFloat(result.x);
    setAddress(result.road_address_name || result.address_name);
    setLat(y);
    setLng(x);
    setSearchResults([]);
    setSearchQuery('');
    updateMarker(y, x);
    const pnu = await getPnuFromCoords(y, x);
    setPrimaryPnu(pnu);
  };

  const handleAnalyze = async () => {
    if (!selectedCategory || !address || !lat || !user) return;

    setIsAnalyzing(true);
    setAnalysisStep(0);
    setElapsedSeconds(0);
    setAnalysisError(null);

    try {
      const idToken = await user.getIdToken();

      const allParcels = [
        primaryPnu ? { address, lat, lng, pnu: primaryPnu } : { address, lat, lng }
      ];

      if (isMultiParcel) {
        additionalParcels.forEach(p => {
          if (p.pnu) {
            allParcels.push({ address: p.address, lat: p.lat, lng: p.lng, pnu: p.pnu });
          }
        });
      }

      const pnuList = allParcels.map(p => p.pnu).filter(Boolean);

      const payload: any = {
        category: selectedCategory,
        address: address,
        lat: lat.toString(),
        lng: lng.toString()
      };

      if (pnuList.length > 0) {
        payload.primaryPnu = primaryPnu;
        payload.pnuList = pnuList;
      }

      const response = await fetch('/api/land/detective/analyze-with-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '오류 발생');
      }

      const result = await response.json();
      if (result.success && result.reportId) {
        router.push(`/analyze/${result.reportId}`);
      } else {
        throw new Error('결과 수신 실패');
      }
    } catch (error) {
      console.error('❌ 데이터 수집 에러:', error);
      setAnalysisError(error instanceof Error ? error.message : '데이터 수집 중 오류 발생');
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="detective-bg min-h-screen text-slate-900 relative bg-white">
      <div className="noise-overlay" />
      <div className="scanline" />

      {/* 상태바 */}
      <div className="sticky top-0 z-50 px-6 py-3 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between">
        <div className="text-xs font-extrabold text-emerald-700 flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="tracking-wider uppercase">기초 데이터 수집</span>
          </span>
        </div>
        <div className="text-xs font-bold text-slate-400">부동산탐정 AI PRO</div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <Link href="/" className="relative shrink-0 block hover:opacity-90 transition-opacity">
                <div className="absolute inset-0 rounded-2xl blur-xl bg-emerald-500/10 animate-pulse" />
                <div className="relative w-12 h-12 rounded-2xl bg-emerald-600 p-1 shadow-none">
                  <img src="/logo512.png" alt="부동산탐정 로고" className="w-full h-full rounded-xl object-cover bg-white" />
                </div>
              </Link>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Link href="/">
                    <h1 className="text-lg font-black tracking-tighter text-slate-900 leading-none">부동산탐정</h1>
                  </Link>
                  <div className="inline-flex items-center gap-1 bg-emerald-500 text-white rounded-full px-2.5 py-0.5 shadow-none">
                    <span className="text-[10px] font-extrabold tracking-wider">PRO</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 font-bold tracking-tight">
                  전문가 모드 <span className="font-extrabold text-emerald-600">심층 매물 판독</span>
                </p>
              </div>
            </div>
            <Link href="/" className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 font-extrabold text-xs items-center gap-2 hidden sm:flex transition-all">
              목록으로 돌아가기
            </Link>
          </div>
        </header>

        <div className="max-w-3xl mx-auto space-y-6 pb-20">
          <div className="animate-fade-in-up space-y-6">
            {/* Step 1: Category */}
            <div className="input-panel p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
              <h2 className="text-xs font-extrabold text-emerald-600 mb-4 uppercase tracking-wider">
                카테고리 선택
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { id: 'land', label: '토지', icon: '/land.svg' },
                  { id: 'house', label: '주택', icon: '/jutack.svg' },
                  { id: 'apartment', label: '아파트', icon: '/apart.svg' },
                  { id: 'store', label: '상가', icon: '/cshop.svg' },
                  { id: 'building', label: '빌딩', icon: '/build.svg' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 ${selectedCategory === cat.id ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-slate-100 bg-slate-50/50 hover:border-emerald-200'}`}
                  >
                    <img src={cat.icon} alt={cat.label} className="w-8 h-8 object-contain" />
                    <span className="text-xs font-bold text-slate-700">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Location */}
            <div className="input-panel p-6 space-y-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
              <h2 className="text-xs font-extrabold text-emerald-600 mb-2 uppercase tracking-wider">
                대상지 위치 특정
              </h2>
              <div className="relative">
                <div className="flex items-center bg-slate-50/50 border border-slate-200/80 rounded-xl px-4 py-2.5 focus-within:border-emerald-400 focus-within:bg-white transition-all">
                  <svg className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="지번 또는 도로명 주소를 입력하세요"
                    className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                  {isSearching && <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0" />}
                </div>
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                    {searchResults.map((r, i) => (
                      <button key={i} onClick={() => selectSearchResult(r)} className="w-full px-4 py-3 text-left hover:bg-emerald-50 border-b border-slate-100 last:border-0 transition-colors">
                        <div className="text-xs font-bold text-slate-800">{r.place_name || r.address_name}</div>
                        <div className="text-[10px] text-slate-450 font-semibold mt-0.5">{r.road_address_name || r.address_name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative border border-slate-200/85 rounded-2xl overflow-hidden bg-slate-50 h-[320px]">
                <div ref={mapContainerRef} className="w-full h-full" />
                {!lat && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/5 backdrop-blur-[0.5px] text-center p-4">
                    <p className="text-xs font-bold text-slate-500 leading-relaxed">지도 위를 클릭하거나 주소를 검색하여<br />위치를 지정해주세요</p>
                  </div>
                )}
              </div>
              {address && (
                <div className="bg-emerald-50/40 border border-emerald-100/50 rounded-2xl p-4 animate-fade-in-up">
                  <label className="text-[10px] font-extrabold text-emerald-600 mb-1.5 block uppercase tracking-wider">분석 대상 주소</label>
                  <input
                    type="text"
                    className="w-full bg-transparent border-none outline-none text-xs font-black text-slate-850 p-0 leading-none"
                    value={address}
                    readOnly
                  />
                  <div className="text-[9px] text-slate-450 mt-2 uppercase font-mono flex items-center justify-between font-semibold">
                    <span>COORD: {lat?.toFixed(6)}, {lng?.toFixed(6)}</span>
                    {primaryPnu && <span>PNU: {primaryPnu}</span>}
                  </div>
                </div>
              )}

              {/* 추가 필지 일괄매매 설정 */}
              {['land', 'building'].includes(selectedCategory) && address && lat !== null && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xs font-extrabold text-slate-800 tracking-tight">다중 필지 일괄매매 (선택)</h3>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">합필되거나 공동 매매로 진행되는 필지를 추가합니다.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isMultiParcel}
                        onChange={(e) => {
                          setIsMultiParcel(e.target.checked);
                          if (!e.target.checked) setAdditionalParcels([]);
                        }}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {isMultiParcel && (
                    <div className="space-y-3 animate-fade-in-up">
                      <div className="relative">
                        <div className="flex items-center bg-slate-50/50 border border-slate-200/80 rounded-xl px-4 py-2 focus-within:border-emerald-450 transition-all">
                          <svg className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            placeholder="추가할 필지 주소 검색"
                            className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400"
                            value={parcelSearchQuery}
                            onChange={(e) => handleParcelSearch(e.target.value)}
                          />
                          {isParcelSearching && <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0" />}
                        </div>
                        {parcelSearchResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                            {parcelSearchResults.map((r, i) => (
                              <button key={i} onClick={() => selectParcelSearchResult(r)} className="w-full px-4 py-2.5 text-left hover:bg-emerald-50 border-b border-slate-50 last:border-0 transition-colors">
                                <div className="text-[11px] font-bold text-slate-800">{r.place_name || r.address_name}</div>
                                <div className="text-[10px] text-slate-450 font-semibold mt-0.5">{r.road_address_name || r.address_name}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {additionalParcels.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {additionalParcels.map((parcel, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5">
                              <div className="flex-1 min-w-0 pr-3">
                                <p className="text-xs font-bold text-slate-700 truncate">{parcel.address}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  {parcel.isLoadingPnu ? (
                                    <span className="text-[9px] text-slate-450 flex items-center gap-1 font-semibold">
                                      <div className="w-2 h-2 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                                      PNU 확인 중...
                                    </span>
                                  ) : parcel.pnu ? (
                                    <span className="text-[9px] text-emerald-600 font-mono font-semibold">PNU: {parcel.pnu}</span>
                                  ) : (
                                    <span className="text-[9px] text-rose-500 font-semibold">PNU 없음</span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => setAdditionalParcels(prev => prev.filter((_, i) => i !== idx))}
                                className="p-1 text-slate-400 hover:text-rose-500 transition-colors text-sm font-bold"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {isMobile ? (
                <button
                  type="button"
                  onClick={() => setShowMobileWarning(true)}
                  className="w-full py-4 bg-slate-800 text-white font-extrabold rounded-2xl hover:bg-slate-900 tracking-wide transition-all text-xs animate-pulse"
                >
                  매물 분석은 앱 - PC에서만 지원 →
                </button>
              ) : !user ? (
                <Link href="/login" className="block w-full py-4 bg-slate-900 text-white font-extrabold rounded-2xl text-center text-xs tracking-wide hover:bg-slate-850 transition-all shadow-sm">로그인 후 진행</Link>
              ) : !canAnalyze ? (
                <div className="w-full py-4 bg-rose-50 text-rose-600 font-bold rounded-2xl text-center text-xs border border-rose-100">일일 수집 한도 초과</div>
              ) : (
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !selectedCategory || !address}
                  className="w-full py-4 bg-emerald-500 text-white font-extrabold rounded-2xl hover:bg-emerald-600 shadow-md shadow-emerald-500/10 disabled:opacity-30 disabled:cursor-not-allowed tracking-wide transition-all text-xs"
                >
                  {isAnalyzing ? '데이터 수집 중...' : '공공데이터 수집 리포트 생성'}
                </button>
              )}
              <p className="text-[10px] text-slate-450 text-center font-semibold px-4 leading-relaxed tracking-tight">
                ※ 주소 정보를 입력하면 국가 기관의 공공 데이터를 수집합니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 분석 중 모달 */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-md px-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 max-w-sm w-full shadow-2xl flex flex-col items-center relative overflow-hidden">
            <div className="flex items-center gap-2 mb-5 z-10">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest">Public Data Collector Active</span>
            </div>
            <div className="relative w-16 h-16 mb-5 z-10 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" />
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              <img
                src={stepIcons[analysisStep] || '/3d/suzip.svg'}
                alt="Loading Step"
                className="w-8 h-8 object-contain animate-bounce"
              />
            </div>
            <h3 className="text-sm font-extrabold text-white mb-1.5 z-10 tracking-tight">{analysisSteps[analysisStep]?.label}</h3>
            <p className="text-xs text-slate-400 mb-5 text-center z-10 px-4 leading-relaxed font-semibold">{analysisSteps[analysisStep]?.desc}</p>
            <div className="w-full z-10">
              <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${((analysisStep + 1) / analysisSteps.length) * 100}%` }} />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-500 mt-3 tabular-nums uppercase tracking-wider">
                <span>Phase {analysisStep + 1} / {analysisSteps.length}</span>
                <span>{elapsedSeconds}s</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {analysisError && (
        <div className="fixed bottom-10 left-4 right-4 z-[110] max-w-sm mx-auto">
          <div className="bg-rose-50/90 border border-rose-100 rounded-2xl p-4 flex gap-3 items-center shadow-2xl">
            <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1 text-xs font-bold text-rose-700 leading-normal">{analysisError}</div>
            <button onClick={() => setAnalysisError(null)} className="text-slate-400 hover:text-slate-655 font-black text-sm">&times;</button>
          </div>
        </div>
      )}

      {/* 모바일 매물 분석 페이지 접속 시 하단 알림 */}
      {isMobile && showMobileWarning && (
        <div className="fixed bottom-6 left-6 right-6 z-[150] bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-col gap-3 text-white">
            <div className="flex justify-between items-start">
              <p className="text-[12px] text-slate-355 font-semibold leading-relaxed animate-pulse">
                매물 분석은 <strong className="text-emerald-400 font-extrabold">앱</strong>과 <strong className="text-emerald-400 font-extrabold">PC</strong>에서만 지원.
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
                  <span>💻</span>
                  <span>PC 웹 버전 바로가기</span>
                </div>
                <span className="text-emerald-400 text-[11px] font-extrabold">tamjung.me →</span>
              </a>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href="https://play.google.com/store/apps/details?id=com.yongcar.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-[11px] bg-white/10 hover:bg-white/15 active:scale-[0.98] py-2.5 rounded-xl border border-white/10 transition-all text-white font-bold"
                >
                  <span>🤖 Google Play</span>
                </a>
                <a
                  href="https://apps.apple.com/kr/app/%EB%B6%80%EB%8F%99%EC%82%B0%ED%83%90%EC%A0%95/id6762132537"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-[11px] bg-white/10 hover:bg-white/15 active:scale-[0.98] py-2.5 rounded-xl border border-white/10 transition-all text-white font-bold"
                >
                  <span>🍎 App Store</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}