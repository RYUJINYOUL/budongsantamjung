'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface SearchResult {
  place_name?: string;
  address_name: string;
  road_address_name?: string;
  x: string;
  y: string;
}

interface AnalyzePanelProps {
  /** 지도 위치 선택 시 외부(홈) 지도에 마커 표시용 콜백 */
  onLocationSelect?: (lat: number, lng: number, address: string) => void;
}

const ANALYSIS_STEPS = [
  { label: '위치 데이터 매칭' },
  { label: '국가 API 연동' },
  { label: '주변 실거래가 수집' },
  { label: '공시가격 조회' },
  { label: '인허가/규제 확인' },
  { label: '인구/통계 데이터 수집' },
  { label: '기초 데이터 조립' },
  { label: '수집 완료' },
];

const CATEGORIES = [
  { id: 'land', label: '토지', icon: '/land.svg' },
  { id: 'house', label: '주택', icon: '/jutack.svg' },
  { id: 'apartment', label: '아파트', icon: '/apart.svg' },
  { id: 'building', label: '빌딩', icon: '/build.svg' },
];

export default function AnalyzePanel({ onLocationSelect }: AnalyzePanelProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [canAnalyze, setCanAnalyze] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [primaryPnu, setPrimaryPnu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) checkUsage(u.uid);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAnalyzing) return;
    const timer = setInterval(() => setElapsedSeconds(p => p + 1), 1000);
    const stepTimer = setInterval(() => setAnalysisStep(p => (p < ANALYSIS_STEPS.length - 1 ? p + 1 : p)), 3000);
    return () => { clearInterval(timer); clearInterval(stepTimer); };
  }, [isAnalyzing]);

  const checkUsage = async (uid: string) => {
    try {
      const res = await fetch(`/api/user/usage?userId=${uid}`);
      const data = await res.json();
      setCanAnalyze(data.canAnalyze ?? true);
    } catch { /* ignore */ }
  };

  const getPnuFromCoords = async (latVal: number, lngVal: number): Promise<string | null> => {
    try {
      const res = await fetch(`/api/vworld?lat=${latVal}&lng=${lngVal}`);
      if (!res.ok) return null;
      const data = await res.json();
      const features = data?.response?.result?.featureCollection?.features;
      return features?.[0]?.properties?.pnu?.toString() || null;
    } catch { return null; }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query || query.length < 2) { setSearchResults([]); return; }
    if (typeof window === 'undefined' || !window.kakao?.maps?.services) return;

    setIsSearching(true);
    const { kakao } = window;
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.addressSearch(query, (result: any, status: any) => {
      if (status === kakao.maps.services.Status.OK && result.length > 0) {
        setIsSearching(false);
        setSearchResults(result.slice(0, 5).map((p: any) => ({
          place_name: p.address_name,
          address_name: p.address_name,
          road_address_name: p.road_address?.address_name || '',
          x: p.x, y: p.y,
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
              x: p.x, y: p.y,
            })));
          } else setSearchResults([]);
        });
      }
    });
  };

  const selectResult = async (r: SearchResult) => {
    const latVal = parseFloat(r.y);
    const lngVal = parseFloat(r.x);
    const addr = r.road_address_name || r.address_name;
    setAddress(addr);
    setLat(latVal);
    setLng(lngVal);
    setSearchQuery('');
    setSearchResults([]);
    onLocationSelect?.(latVal, lngVal, addr);
    const pnu = await getPnuFromCoords(latVal, lngVal);
    setPrimaryPnu(pnu);
  };

  const handleAnalyze = async () => {
    if (!selectedCategory || !address || !lat || !lng || !user) return;
    setIsAnalyzing(true);
    setAnalysisStep(0);
    setElapsedSeconds(0);
    setAnalysisError(null);

    try {
      const idToken = await user.getIdToken();
      const payload: any = { category: selectedCategory, address, lat: lat.toString(), lng: lng.toString() };
      if (primaryPnu) { payload.primaryPnu = primaryPnu; payload.pnuList = [primaryPnu]; }

      const res = await fetch(`${BACKEND_URL}/api/land/detective/analyze-with-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || '오류 발생'); }
      const result = await res.json();
      if (result.success && result.reportId) {
        router.push(`/analyze/${result.reportId}`);
      } else throw new Error('결과 수신 실패');
    } catch (err: any) {
      setAnalysisError(err.message);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 패널 헤더 */}
      <div className="px-4 lg:px-6 py-5 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">기초 데이터 수집</h2>
        </div>
        <p className="text-[11px] text-slate-400 font-semibold tracking-tight">분석을 진행할 카테고리와 위치를 선택해 주세요</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-5 pb-24 space-y-5">
        {/* 카테고리 선택 */}
        <div>
          <p className="text-[11px] font-extrabold text-emerald-600 tracking-wider mb-2.5 uppercase">카테고리 선택</p>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`group flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 transition-all gap-2 ${selectedCategory === cat.id
                  ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                  : 'border-slate-100 bg-slate-50/50 hover:border-emerald-200/70 hover:bg-white'
                  }`}
              >
                <img src={cat.icon} alt={cat.label} className="w-7 h-7 object-contain transition-transform group-hover:scale-105" />
                <span className={`text-xs font-bold ${selectedCategory === cat.id ? 'text-emerald-700' : 'text-slate-600'}`}>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 주소 검색 */}
        <div>
          <p className="text-[11px] font-extrabold text-emerald-600 tracking-wider mb-2.5 uppercase">매물 위치 선택</p>
          <div className="relative">
            <div className="flex items-center bg-slate-50/50 border border-slate-200/80 rounded-2xl px-4 py-3 focus-within:border-emerald-400 focus-within:bg-white transition-all">
              <input
                type="text"
                placeholder="지번 또는 도로명 주소 검색"
                className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
              />
              {isSearching ? (
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200/80 rounded-2xl shadow-xl overflow-hidden">
                {searchResults.map((r, i) => (
                  <button key={i} onClick={() => selectResult(r)} className="w-full px-4 py-3 text-left hover:bg-emerald-50/50 border-b border-slate-100 last:border-0 transition-colors">
                    <div className="text-xs font-bold text-slate-800">{r.place_name || r.address_name}</div>
                    <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{r.road_address_name || r.address_name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 선택된 주소 표시 */}
          {address && (
            <div className="mt-3 bg-emerald-50/40 border border-emerald-100/50 rounded-2xl p-4">
              <p className="text-[10px] font-extrabold text-emerald-600 tracking-wider uppercase mb-1.5">선택된 위치</p>
              <p className="text-xs font-bold text-slate-800 leading-snug">{address}</p>
              {primaryPnu && <p className="text-[10px] text-slate-400 font-mono mt-1">PNU: {primaryPnu}</p>}
            </div>
          )}
        </div>

        {/* 분석 시작 버튼 */}
        <div className="pt-3">
          {!user ? (
            <a href="/login" className="block w-full py-3.5 bg-slate-900 text-white font-extrabold rounded-2xl text-center text-xs tracking-wide hover:bg-slate-850 transition-all shadow-sm">
              로그인 후 진행
            </a>
          ) : !canAnalyze ? (
            <div className="w-full py-3.5 bg-rose-50 text-rose-600 font-bold rounded-2xl text-center text-xs border border-rose-100">
              일일 수집 한도 초과
            </div>
          ) : (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !selectedCategory || !address}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl text-xs transition-all shadow-md shadow-emerald-500/10 tracking-wide"
            >
              {isAnalyzing ? '데이터 수집 중...' : '공공데이터 수집 리포트 생성'}
            </button>
          )}
          <p className="text-[10px] text-slate-400 text-center mt-2.5 font-semibold tracking-tight leading-relaxed">
            ※ 국가 공공 데이터를 수집합니다.
          </p>
        </div>

        {/* 에러 */}
        {analysisError && (
          <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-4 flex gap-3 items-start">
            <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs font-bold text-rose-700 flex-1 leading-normal">{analysisError}</p>
            <button onClick={() => setAnalysisError(null)} className="text-slate-400 hover:text-slate-600 transition-colors text-sm font-black">&times;</button>
          </div>
        )}
      </div>

      {/* 분석 중 오버레이 */}
      {isAnalyzing && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 max-w-[280px] w-full mx-4 text-center shadow-2xl">
            <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" />
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              <span className="text-xs font-black text-emerald-400 tracking-tighter">
                {String(analysisStep + 1).padStart(2, '0')}
              </span>
            </div>
            <p className="text-xs font-extrabold text-white tracking-wide">{ANALYSIS_STEPS[analysisStep]?.label}</p>
            <div className="w-full bg-white/10 h-1 rounded-full mt-4">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${((analysisStep + 1) / ANALYSIS_STEPS.length) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-2.5 font-bold tracking-widest uppercase">{elapsedSeconds}s elapsed</p>
          </div>
        </div>
      )}
    </div>
  );
}
