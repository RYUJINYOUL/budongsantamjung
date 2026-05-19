'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import SideNav from '../../components/SideNav';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

// 카카오 SDK 로딩 상태 (전역 공유)
let kakaoSdkLoading = false;
let kakaoSdkLoaded = false;
const kakaoSdkCallbacks: (() => void)[] = [];

function loadKakaoSdk(onReady: () => void) {
  if (kakaoSdkLoaded) { onReady(); return; }
  kakaoSdkCallbacks.push(onReady);
  if (kakaoSdkLoading) return;
  kakaoSdkLoading = true;
  const apiKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;
  const script = document.createElement('script');
  script.async = true;
  script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services&autoload=false`;
  script.onload = () => {
    window.kakao.maps.load(() => {
      kakaoSdkLoaded = true;
      kakaoSdkLoading = false;
      kakaoSdkCallbacks.forEach(cb => cb());
      kakaoSdkCallbacks.length = 0;
    });
  };
  document.head.appendChild(script);
}

interface Discovery {
  id: string;
  region?: string;
  direction?: string;
  category?: string;
  budget?: number;
  created_at?: string;
  propertyTitle?: string;
  detectiveNote?: string;
  location?: { name: string; address: string };
  propertyGrade?: { overall: string; reason: string; riskScore: string };
}

interface SearchResult {
  place_name?: string;
  address_name: string;
  road_address_name?: string;
  x: string;
  y: string;
}

const formatDate = (s?: string) => s ? new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
const formatBudget = (b?: number) => { if (!b) return ''; return b >= 10000 ? `${(b / 10000).toFixed(1)}억원` : `${b.toLocaleString()}만원`; };
const CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'land', label: '토지' },
  { id: 'house', label: '주택' },
  { id: 'apartment', label: '아파트' },
  { id: 'building', label: '빌딩' }
];
const BUDGET_CHIPS = [
  { label: '1억', value: 10000 },
  { label: '3억', value: 30000 },
  { label: '5억', value: 50000 },
  { label: '10억', value: 100000 },
  { label: '30억', value: 300000 }
];
const ANALYSIS_STEPS = [
  '위치 데이터 매칭',
  '국가 API 연동',
  '주변 실거래가 수집',
  '공시가격 조회',
  '인허가/규제 확인',
  '인구/통계 데이터 수집',
  '기초 데이터 조립',
  '수집 완료'
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
const PAGE_SIZE = 20;

const catIconMap: Record<string, string> = {
  'all': '/land.svg',
  'land': '/land.svg',
  '토지': '/land.svg',
  'house': '/jutack.svg',
  '주택': '/jutack.svg',
  'apartment': '/apart.svg',
  '아파트': '/apart.svg',
  'building': '/build.svg',
  '빌딩': '/build.svg'
};

function DiscoverPageContent() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [kakaoReady, setKakaoReady] = useState(false);
  const [showMobileList, setShowMobileList] = useState(false);

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

  // 리스트 상태
  const [allItems, setAllItems] = useState<Discovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [page, setPage] = useState(1);
  const loaderRef = useRef<HTMLDivElement>(null);

  // 발굴 폼 상태
  const [dAddress, setDAddress] = useState('');
  const [dLat, setDLat] = useState<number | null>(null);
  const [dLng, setDLng] = useState<number | null>(null);
  const [dBudget, setDBudget] = useState<number | null>(null);
  const [dBudgetInput, setDBudgetInput] = useState('');
  const [dCategory, setDCategory] = useState('all');
  const [dSearchQ, setDSearchQ] = useState('');
  const [dSearchResults, setDSearchResults] = useState<SearchResult[]>([]);
  const [dSearching, setDSearching] = useState(false);
  const [dRunning, setDRunning] = useState(false);
  const [dStep, setDStep] = useState(0);
  const [dElapsed, setDElapsed] = useState(0);
  const [dError, setDError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    fetchList();
    if (window.kakao?.maps) {
      setKakaoReady(true);
    } else {
      loadKakaoSdk(() => setKakaoReady(true));
    }
    return () => unsub();
  }, []);

  // 무한 스크롤 & 필터링
  const filtered = allItems.filter(d => {
    const mc = filterCat === 'all' || d.category === filterCat;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mc;
    const hay = [d.region, d.direction, d.propertyTitle, d.location?.name].filter(Boolean).join(' ').toLowerCase();
    return mc && hay.includes(q);
  });

  useEffect(() => { setPage(1); }, [searchQuery, filterCat]);

  const displayed = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = displayed.length < filtered.length;

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting && hasMore) setPage(p => p + 1);
  }, [hasMore]);

  useEffect(() => {
    const el = loaderRef.current; if (!el) return;
    const obs = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    obs.observe(el); return () => obs.disconnect();
  }, [handleObserver]);

  const fetchList = async () => {
    try {
      setLoading(true);
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const res = await fetch('/api/land/detective/discoveries', token ? { headers: { Authorization: `Bearer ${token}` } } : {});
      const data = await res.json();
      setAllItems(data.list || data.discoveries || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleDiscoverSearch = (q: string) => {
    setDSearchQ(q);
    if (!q || q.length < 2) { setDSearchResults([]); return; }
    if (!kakaoReady || !window.kakao?.maps?.services) {
      loadKakaoSdk(() => handleDiscoverSearch(q));
      return;
    }
    setDSearching(true);
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(q, (result: any, status: any) => {
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        setDSearching(false);
        setDSearchResults(result.slice(0, 5).map((p: any) => ({ address_name: p.address_name, road_address_name: p.road_address?.address_name || '', x: p.x, y: p.y })));
      } else {
        new window.kakao.maps.services.Places().keywordSearch(q, (data: any, s: any) => {
          setDSearching(false);
          if (s === window.kakao.maps.services.Status.OK) {
            setDSearchResults(data.slice(0, 5).map((p: any) => ({ place_name: p.place_name, address_name: p.address_name, road_address_name: p.road_address_name, x: p.x, y: p.y })));
          } else setDSearchResults([]);
        });
      }
    });
  };

  const selectDiscoverResult = (r: SearchResult) => {
    setDAddress(r.road_address_name || r.address_name);
    setDLat(parseFloat(r.y)); setDLng(parseFloat(r.x));
    setDSearchQ(''); setDSearchResults([]);
  };

  const runDiscover = async () => {
    if (!dLat || !dLng) { setDError('지역을 검색하여 선택해 주세요.'); return; }
    if (!dBudget) { setDError('예산을 선택하거나 입력해 주세요.'); return; }
    if (!user) { router.push('/login'); return; }
    setDRunning(true); setDStep(0); setDElapsed(0); setDError(null);
    const stepTimer = setInterval(() => setDStep(p => Math.min(p + 1, ANALYSIS_STEPS.length - 1)), 15000);
    const elTimer = setInterval(() => setDElapsed(p => p + 1), 1000);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/land/detective/investmentDiscovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lat: dLat, lng: dLng, budget: dBudget, category: dCategory }),
      });
      const data = await res.json();
      if (data.success && data.historyId) {
        router.push(`/discover/${data.historyId}`);
      } else {
        setDError(data.error || '발굴 중 오류가 발생했습니다.');
      }
    } catch (e: any) { setDError(e.message); }
    finally { clearInterval(stepTimer); clearInterval(elTimer); setDRunning(false); }
  };

  return (
    <div className="detective-bg min-h-screen text-slate-900 relative bg-white flex">
      <div className="noise-overlay" /><div className="scanline" />
      <SideNav />
      <div className="lg:pl-16 flex-1 flex flex-col lg:flex-row min-h-screen">

        {/* ── 좌측 패널: 투자처 발굴 폼 (w-full lg:w-[40%]) ── */}
        <div className={`w-full lg:w-[40%] bg-white border-b lg:border-b-0 lg:border-r border-slate-200/50 flex flex-col h-auto lg:h-screen lg:sticky lg:top-0 overflow-y-auto ${showMobileList ? 'hidden lg:flex' : 'flex'}`}>
          {/* 헤더 */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 shrink-0 lg:hidden" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">투자처 발굴</h2>
                </div>
                <p className="text-[11px] text-slate-400 font-semibold tracking-tight">공공데이터와 AI로 희망 지역을 분석하세요</p>
              </div>
            </div>
            <button
              onClick={() => setShowMobileList(true)}
              className="lg:hidden px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10px] rounded-xl shadow-md transition-all active:scale-95 shrink-0"
            >
              목록
            </button>
          </div>

          {/* 발굴 폼 내용 */}
          {!user ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
              <p className="text-xs font-bold text-slate-800 mb-4">로그인이 필요한 서비스입니다</p>
              <button onClick={() => router.push('/login')} className="px-6 py-2.5 bg-slate-900 text-white font-extrabold rounded-2xl text-xs hover:bg-slate-800 transition-all shadow-sm">
                로그인하기
              </button>
            </div>
          ) : (
            <div className="p-5 space-y-6 flex-1">

              {/* 1단계: 투자 지역 */}
              <div>
                <p className="text-[11px] font-extrabold text-emerald-600 tracking-wider mb-2.5 uppercase">01 투자 지역 선택</p>
                <div className="relative">
                  <div className="flex items-center bg-slate-50/50 border border-slate-200/80 rounded-2xl px-4 py-3 focus-within:border-emerald-400 focus-within:bg-white transition-all">
                    <svg className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="지역명 또는 주소 검색..."
                      value={dSearchQ}
                      onChange={e => handleDiscoverSearch(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400"
                    />
                    {dSearching && <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0" />}
                  </div>

                  {dSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                      {dSearchResults.map((r, i) => (
                        <button key={i} onClick={() => selectDiscoverResult(r)} className="w-full px-4 py-3 text-left hover:bg-emerald-50 border-b border-slate-100 last:border-0 transition-colors">
                          <div className="text-xs font-bold text-slate-800">{r.place_name || r.address_name}</div>
                          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{r.road_address_name || r.address_name}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {dAddress && (
                  <div className="mt-3 bg-emerald-50/40 border border-emerald-100/50 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex-1 pr-3">
                      <p className="text-[10px] font-extrabold text-emerald-600 tracking-wider uppercase mb-1">선택된 지역</p>
                      <p className="text-xs font-bold text-slate-850 leading-snug">{dAddress}</p>
                    </div>
                    <button onClick={() => { setDAddress(''); setDLat(null); setDLng(null); }} className="text-slate-400 hover:text-rose-500 transition-colors p-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* 2단계: 투자 예산 */}
              <div>
                <p className="text-[11px] font-extrabold text-emerald-600 tracking-wider mb-2.5 uppercase">02 투자 예산 설정</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {BUDGET_CHIPS.map(chip => (
                    <button
                      key={chip.value}
                      onClick={() => { setDBudget(chip.value); setDBudgetInput(chip.value.toString()); }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${dBudget === chip.value ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600'}`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus-within:border-emerald-400 focus-within:bg-white transition-all gap-2">
                  <input
                    type="number"
                    placeholder="직접 입력 (만원 단위)"
                    value={dBudgetInput}
                    onChange={e => { setDBudgetInput(e.target.value); setDBudget(parseInt(e.target.value) || null); }}
                    className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-850 placeholder:text-slate-400"
                  />
                  <span className="text-xs font-bold text-slate-400 shrink-0">만원</span>
                </div>
                {dBudget && <p className="text-xs text-emerald-600 font-extrabold mt-1.5">= {formatBudget(dBudget)}</p>}
              </div>

              {/* 3단계: 투자 유형 */}
              <div>
                <p className="text-[11px] font-extrabold text-emerald-600 tracking-wider mb-2.5 uppercase">03 투자 유형 선택</p>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setDCategory(cat.id)}
                      className={`group flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all ${dCategory === cat.id ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800 shadow-sm' : 'border-slate-100 bg-slate-50/50 text-slate-600 hover:border-emerald-200 hover:bg-white'}`}
                    >
                      <div className="w-6 h-6 flex items-center justify-center p-0.5 shrink-0 bg-white rounded-lg border border-slate-100">
                        <img src={catIconMap[cat.id] || '/land.svg'} alt="" className="w-full h-full object-contain" />
                      </div>
                      <span className="text-xs font-bold">{cat.label === '전체' ? '전체 유형' : cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 에러 */}
              {dError && (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex gap-3 items-start">
                  <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs font-bold text-rose-700 flex-1 leading-normal">{dError}</p>
                  <button onClick={() => setDError(null)} className="text-slate-400 hover:text-slate-600 text-sm font-black">&times;</button>
                </div>
              )}

              {/* 발굴 실행 버튼 */}
              <div className="pt-2">
                <button
                  onClick={runDiscover}
                  disabled={dRunning || !dAddress || !dBudget}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl text-xs transition-all shadow-md shadow-emerald-500/10 tracking-wide"
                >
                  {dRunning ? 'AI 투자처 탐색 중...' : 'AI 투자처 발굴 시작'}
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-2.5 font-semibold leading-relaxed">
                  ※ 선택한 지역의 최적 매물을 AI가 자동 분석 및 추천합니다.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── 우측 패널: 발굴 결과 리스트 (w-full lg:w-[60%]) ── */}
        <div className={`w-full lg:w-[60%] flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50 ${!showMobileList ? 'hidden lg:flex' : 'flex'}`}>
          {/* 리스트 헤더 */}
          <div className="px-6 py-5 border-b border-slate-200/50 bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 shrink-0 lg:hidden" />
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">발견된 투자처 리스트</h2>
                <p className="text-[11px] text-slate-400 font-semibold tracking-tight mt-0.5">전체 사용자가 발견한 우수 투자처 실시간 내역입니다</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowMobileList(false)}
                className="lg:hidden px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10px] rounded-xl shadow-md transition-all active:scale-95 shrink-0"
              >
                발굴 하기
              </button>
              <button onClick={fetchList} className="p-2 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors text-slate-500 shadow-sm flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* 필터 및 검색 바 */}
          <div className="px-6 py-4 bg-white border-b border-slate-200/40 space-y-3 shrink-0">
            <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-2.5 focus-within:border-emerald-400 focus-within:bg-white transition-all">
              <svg className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="지역, 투자 방향, 키워드 검색..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="ml-2 text-slate-400 hover:text-slate-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setFilterCat(c.id)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-all ${filterCat === c.id ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300'}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-slate-400 font-extrabold shrink-0 ml-4">{filtered.length}건</span>
            </div>
          </div>

          {/* 결과물 스크롤 뷰 */}
          <div className="flex-1 overflow-y-auto px-6 py-5 pb-24">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 relative">
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-100" />
                  <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500 animate-spin" />
                </div>
                <p className="text-xs font-extrabold text-emerald-600 tracking-wider">LOADING...</p>
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <p className="text-rose-500 font-bold text-xs mb-3">{error}</p>
                <button onClick={fetchList} className="px-4 py-2 bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-sm">다시 시도</button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
                <p className="text-slate-800 font-bold text-xs mb-1">검색 결과 없음</p>
                <p className="text-[10px] text-slate-450 font-semibold">조건에 매칭되는 AI 발견 매물이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayed.map((d, idx) => (
                  <div
                    key={d.id}
                    onClick={() => router.push(`/discover/${d.id}`)}
                    className="group relative bg-white border border-slate-100 hover:border-emerald-300 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  >
                    {idx < 3 && (
                      <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-md z-10 ${idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-slate-400' : 'bg-amber-700'}`}>
                        {idx + 1}
                      </div>
                    )}
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 w-10 h-10 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-center p-2">
                        <img src={catIconMap[d.category || ''] || '/land.svg'} alt="" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-extrabold text-slate-900 leading-tight group-hover:text-emerald-600 transition-colors line-clamp-1 mb-1.5">
                          {d.propertyTitle || d.region || 'AI 발견 매물'}
                        </h2>

                        {(d.location?.name || d.region) && (
                          <p className="text-xs text-slate-400 font-semibold mb-2 flex items-center gap-1">
                            <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {d.location?.name || d.region}
                          </p>
                        )}

                        {(d.direction || d.detectiveNote) && (
                          <div className="bg-emerald-50/30 border border-emerald-100/50 rounded-xl p-2.5 mb-2.5">
                            <p className="text-[11px] text-emerald-800 font-bold line-clamp-2 leading-relaxed">
                              {d.direction || d.detectiveNote}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                          {d.category && (
                            <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                              {d.category === 'land' ? '토지' : d.category === 'house' ? '주택' : d.category === 'apartment' ? '아파트' : d.category === 'building' ? '빌딩' : d.category}
                            </span>
                          )}
                          {d.budget && (
                            <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wide">
                              예산 {formatBudget(d.budget)}
                            </span>
                          )}
                          {d.created_at && (
                            <span className="text-[9px] text-slate-350 font-bold ml-auto shrink-0 tracking-tight">
                              {formatDate(d.created_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div ref={loaderRef} className="py-4 flex justify-center shrink-0">
                  {hasMore ? (
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
                      <div className="w-3.5 h-3.5 border-2 border-emerald-250 border-t-emerald-500 rounded-full animate-spin" />
                      불러오는 중... ({displayed.length}/{filtered.length})
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-300 font-semibold">총 {filtered.length}건 완료</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 분석 중 오버레이 */}
      {dRunning && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
            <div className="relative w-16 h-16 mx-auto mb-5 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" />
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              <img 
                src={stepIcons[dStep] || '/3d/suzip.svg'} 
                alt="Loading Step" 
                className="w-8 h-8 object-contain animate-bounce" 
              />
            </div>
            <p className="text-sm font-extrabold text-white mb-2 tracking-tight">{ANALYSIS_STEPS[dStep]}</p>
            <div className="w-full bg-white/10 h-1.5 rounded-full mt-4">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${((dStep + 1) / ANALYSIS_STEPS.length) * 100}%` }} />
            </div>
            <p className="text-[10px] text-slate-550 mt-3 font-bold tracking-widest uppercase">{dElapsed}s elapsed · 최대 3분 소요</p>
          </div>
        </div>
      )}

      {/* 앱 다운로드 안내 배너 팝업 */}
      {showBanner && (
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

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <DiscoverPageContent />
    </Suspense>
  );
}
