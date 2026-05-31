'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import SideNav from '../../components/SideNav';
import { AnimatePresence } from 'framer-motion';
import DiscoveryPaymentModal from '../../components/DiscoveryPaymentModal';
import {
  PANEL_CARD,
  PANEL_CARD_INNER,
  PANEL_SECTION_LABEL,
  PANEL_SECTION_DESC,
  PANEL_INPUT_WRAP,
  PANEL_INPUT,
  PANEL_HINT,
  panelChoiceBtn,
  panelCategoryBtn,
  panelStepBadge,
  PAGE_HEADER_TITLE,
  PAGE_STICKY_HEADER,
  PAGE_SUBHEADER,
  PAGE_SUBHEADER_TITLE,
} from '../../components/analyzePanelFormStyles';
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
  grade?: string;
  detectiveNote?: string;
  reasoning?: string;
  raw?: string;
  location?: { name: string; address: string };
  propertyGrade?: { overall: string; reason: string; riskScore: string };
  analysis?: {
    regionalOutlook?: {
      direction?: string;
      reasoning?: string;
      keyPositives?: string[];
      keyFactors?: string[];
      overallGrade?: string;
    };
    raw?: string;
  };
}

interface SearchResult {
  place_name?: string;
  address_name: string;
  road_address_name?: string;
  x: string;
  y: string;
}

const formatDate = (s?: string) => s ? new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
const formatReportDate = (s?: string) => {
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  const yy = String(d.getFullYear()).slice(2);
  return `${yy}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};
const formatBudget = (b?: number) => { if (!b) return ''; return b >= 10000 ? `${(b / 10000).toFixed(1)}억원` : `${b.toLocaleString()}만원`; };
const formatBudgetInline = (b?: number) => {
  if (!b) return '';
  if (b >= 10000) {
    const eok = b / 10000;
    return eok % 1 === 0 ? `${eok}억` : `${eok.toFixed(1)}억`;
  }
  return `${b.toLocaleString()}만`;
};
const CATEGORY_LABEL: Record<string, string> = {
  all: '전체', land: '토지', house: '주택', apartment: '아파트', store: '상가', building: '빌딩',
  토지: '토지', 주택: '주택', 아파트: '아파트', 상가: '상가', 빌딩: '빌딩',
};
const ALL_CATEGORY_REPORT_LABEL = '토지 아파트 빌딩 주택';

function getReportCategoryLabel(category?: string) {
  if (!category || category === 'all') return ALL_CATEGORY_REPORT_LABEL;
  return CATEGORY_LABEL[category] || category;
}

function getListReportResult(d: Discovery) {
  const parts: string[] = [];
  if (d.grade) {
    parts.push(`${d.grade}등급`);
  }
  const dir = d.direction || d.analysis?.regionalOutlook?.direction;
  if (dir) {
    parts.push(dir);
  }
  if (parts.length > 0) {
    return parts.join(' · ');
  }
  return d.propertyGrade?.overall || null;
}
const CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'land', label: '토지' },
  { id: 'house', label: '주택' },
  { id: 'apartment', label: '아파트' },
  { id: 'store', label: '상가' },
  { id: 'building', label: '빌딩' }
];
const BUDGET_CHIPS = [
  { label: '1억', value: 10000 },
  { label: '3억', value: 30000 },
  { label: '5억', value: 50000 },
  { label: '10억', value: 100000 },
  { label: '30억', value: 300000 },
  { label: '100억', value: 1000000 }
];
const ANALYSIS_STEPS = [
  { label: '위치 데이터 매칭', desc: '좌표를 기반으로 정확한 필지(PNU)를 식별합니다' },
  { label: '국가 API 연동', desc: '건축물대장 및 토지특성 데이터를 수집합니다' },
  { label: '주변 실거래가 수집', desc: '인근 지역의 최근 거래 정보를 필터링합니다' },
  { label: '공시가격 조회', desc: '연도별 공시지가 및 주택가격을 확인합니다' },
  { label: '인허가/규제 확인', desc: '토지이용계획 및 개발 행위 제한 사항을 검토합니다' },
  { label: '인구/통계 데이터 수집', desc: '지역 인구 이동 및 상권 활성도를 분석합니다' },
  { label: '기초 데이터 조립', desc: '수집된 모든 데이터를 분석용 리포트로 구성합니다' },
  { label: '수집 완료', desc: '데이터 수집이 완료되었습니다. 상세 페이지로 이동합니다' },
];
const STEP_ICONS = [
  '/3d/wich.svg',
  '/3d/api.svg',
  '/3d/sil.svg',
  '/3d/gong.svg',
  '/3d/inhuga.svg',
  '/3d/ingu.svg',
  '/3d/gicho.svg',
  '/3d/suzip.svg',
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
  'store': '/cshop.svg',
  '상가': '/cshop.svg',
  'building': '/build.svg',
  '빌딩': '/build.svg'
};

function DiscoverPageContent() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [kakaoReady, setKakaoReady] = useState(false);
  const [showMobileList, setShowMobileList] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setShowMobileList(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

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

  const displayed = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = displayed.length < filtered.length;

  useEffect(() => { setPage(1); }, [searchQuery, filterCat]);

  const getListReportMessage = (d: Discovery) => {
    const date = formatReportDate(d.created_at);
    const region = d.location?.name || d.region || '';
    const budget = d.budget ? formatBudgetInline(d.budget) : '';
    const category = getReportCategoryLabel(d.category);
    const parts = [
      date,
      region,
      budget ? `예산 ${budget}` : '',
      category,
    ].filter(Boolean);
    if (parts.length === 0) return null;
    return {
      base: `${parts.join(' ')} 투자 리포트`,
      result: getListReportResult(d),
    };
  };

  const getListDirection = (d: Discovery) => getListReportResult(d);

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

  const handleDiscoverClick = () => {
    if (!dLat || !dLng) { setDError('지역을 검색하여 선택해 주세요.'); return; }
    if (!dBudget) { setDError('예산을 선택하거나 입력해 주세요.'); return; }
    if (!user) { router.push('/login'); return; }

    // 개발자 계정은 결제 바이패스
    if (user.uid === '0aez3IDXppSP2WzDLGxJQ6XwnbJ2') {
      runDiscover();
    } else {
      setIsPaymentModalOpen(true);
    }
  };

  const runDiscover = async () => {
    if (!dLat || !dLng) { setDError('지역을 검색하여 선택해 주세요.'); return; }
    if (!dBudget) { setDError('예산을 선택하거나 입력해 주세요.'); return; }
    if (!user) { router.push('/login'); return; }
    setDRunning(true); setDStep(0); setDElapsed(0); setDError(null);
    const stepTimer = setInterval(() => setDStep(p => (p < ANALYSIS_STEPS.length - 1 ? p + 1 : p)), 3000);
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
      <div className="lg:pl-16 flex-1 flex flex-col lg:grid lg:grid-cols-[minmax(0,25%)_minmax(0,75%)] min-h-screen">

        {/* ── 좌측 패널: 투자처 발굴 폼 (3) ── */}
        <div className={`w-full border-b lg:border-b-0 lg:border-r border-slate-200/50 flex flex-col h-auto lg:h-screen lg:sticky lg:top-0 min-w-0 bg-slate-50/30 ${showMobileList ? 'hidden lg:flex' : 'flex'}`}>
          {/* 헤더 */}
          <header className={PAGE_STICKY_HEADER}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 lg:hidden shrink-0" />
                <h1 className={PAGE_HEADER_TITLE}>AI 투자처</h1>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileList(true)}
                className="lg:hidden bg-emerald-400 hover:bg-emerald-500 text-white px-3 py-1 rounded-xl font-bold text-xs tracking-wide shadow-sm transition-all active:scale-95 shrink-0"
              >
                목록
              </button>
            </div>
          </header>

          {/* 발굴 폼 */}
          <div className="relative flex flex-col flex-1 min-h-0 bg-slate-50/30">
            <div className={PAGE_SUBHEADER}>
              <h2 className={PAGE_SUBHEADER_TITLE}>투자처 발굴</h2>
              <p className={PANEL_SECTION_DESC}>지역·예산·유형을 설정하고 AI 발굴을 시작하세요</p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 lg:px-5 py-4 space-y-3">
            {/* ① 투자 지역 */}
            <section className={PANEL_CARD}>
              <div className="flex items-center gap-2 mb-3">
                <span className={panelStepBadge(1)}>1</span>
                <div>
                  <p className={PANEL_SECTION_LABEL}>투자 지역</p>
                  <p className={PANEL_SECTION_DESC}>지역명 또는 주소 검색</p>
                </div>
              </div>
              <div className="relative">
                <div className={PANEL_INPUT_WRAP}>
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="지역명 또는 주소 검색"
                    value={dSearchQ}
                    onChange={e => handleDiscoverSearch(e.target.value)}
                    className={PANEL_INPUT}
                  />
                  {dSearching && (
                    <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  )}
                </div>
                {dSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    {dSearchResults.map((r, i) => (
                      <button key={i} type="button" onClick={() => selectDiscoverResult(r)} className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-50/60 border-b border-slate-50 last:border-0 transition-colors">
                        <div className="text-xs font-semibold text-slate-800">{r.place_name || r.address_name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{r.road_address_name || r.address_name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {dAddress && (
                <div className={`${PANEL_CARD_INNER} mt-2.5 flex items-start gap-2`}>
                  <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="flex-1 min-w-0 text-xs font-semibold text-slate-800 leading-snug">{dAddress}</p>
                  <button
                    type="button"
                    onClick={() => { setDAddress(''); setDLat(null); setDLng(null); }}
                    className="shrink-0 w-5 h-5 flex items-center justify-center rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors text-xs"
                    aria-label="지역 삭제"
                  >
                    ✕
                  </button>
                </div>
              )}
            </section>

            {/* ② 투자 예산 */}
            <section className={PANEL_CARD}>
              <div className="flex items-center gap-2 mb-3">
                <span className={panelStepBadge(2)}>2</span>
                <div>
                  <p className={PANEL_SECTION_LABEL}>투자 예산</p>
                  <p className={PANEL_SECTION_DESC}>빠른 선택 또는 직접 입력 (만원)</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                {BUDGET_CHIPS.slice(0, 3).map(chip => (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => { setDBudget(chip.value); setDBudgetInput(chip.value.toString()); }}
                    className={panelChoiceBtn(dBudget === chip.value)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                {BUDGET_CHIPS.slice(3).map(chip => (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => { setDBudget(chip.value); setDBudgetInput(chip.value.toString()); }}
                    className={panelChoiceBtn(dBudget === chip.value)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <div className={PANEL_INPUT_WRAP}>
                <input
                  type="number"
                  placeholder="직접 입력 (만원)"
                  value={dBudgetInput}
                  onChange={e => { setDBudgetInput(e.target.value); setDBudget(parseInt(e.target.value, 10) || null); }}
                  className={PANEL_INPUT}
                />
                <span className="text-[10px] font-bold text-slate-400 shrink-0">만원</span>
              </div>
              {dBudget ? <p className={PANEL_HINT}>{formatBudget(dBudget)}</p> : null}
            </section>

            {/* ③ 투자 유형 */}
            <section className={PANEL_CARD}>
              <div className="flex items-center gap-2 mb-3">
                <span className={panelStepBadge(3)}>3</span>
                <div>
                  <p className={PANEL_SECTION_LABEL}>투자 유형</p>
                  <p className={PANEL_SECTION_DESC}>관심 매물 카테고리</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="grid grid-cols-3 gap-1.5">
                  {CATEGORIES.slice(0, 3).map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setDCategory(cat.id)}
                      className={panelCategoryBtn(dCategory === cat.id)}
                    >
                      <img src={catIconMap[cat.id] || '/land.svg'} alt="" className="w-6 h-6 object-contain" />
                      <span className={`text-[10px] font-bold leading-none ${dCategory === cat.id ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {cat.label}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {CATEGORIES.slice(3).map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setDCategory(cat.id)}
                      className={panelCategoryBtn(dCategory === cat.id)}
                    >
                      <img src={catIconMap[cat.id] || '/land.svg'} alt="" className="w-6 h-6 object-contain" />
                      <span className={`text-[10px] font-bold leading-none ${dCategory === cat.id ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {cat.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {dError && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex gap-2 items-start">
                <p className="text-[11px] font-semibold text-rose-700 flex-1">{dError}</p>
                <button type="button" onClick={() => setDError(null)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
              </div>
            )}
          </div>

          {/* 하단 CTA */}
          <div className="shrink-0 px-4 lg:px-5 py-3.5 border-t border-slate-100 bg-white">
            {!user ? (
              <Link
                href="/login"
                className="block w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-center text-xs transition-all"
              >
                로그인 후 진행
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleDiscoverClick}
                disabled={dRunning || !dAddress || !dBudget}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-35 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-all shadow-sm shadow-emerald-500/15"
              >
                {dRunning ? 'AI 투자처 탐색 중...' : 'AI 발견 시작 - 9.900원'}
              </button>
            )}
            <p className="text-[9px] text-slate-400 text-center mt-2 font-medium">선택 지역의 최적 매물을 AI가 추천합니다</p>
          </div>
          </div>
        </div>

        {/* ── 우측 패널: 발굴 결과 리스트 (7) ── */}
        <div className={`w-full flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50 min-w-0 ${!showMobileList ? 'hidden lg:flex' : 'flex'}`}>
          {/* 리스트 헤더 — 모바일: AI 투자처 / PC: 발견된 투자처 리스트 */}
          <header className={`${PAGE_STICKY_HEADER} lg:hidden`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 shrink-0" />
                <h1 className={PAGE_HEADER_TITLE}>AI 투자처</h1>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowMobileList(false)}
                  className="bg-emerald-400 hover:bg-emerald-500 text-white px-3 py-1 rounded-xl font-bold text-xs tracking-wide shadow-sm transition-all active:scale-95 shrink-0"
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
          </header>
          <div className={`${PAGE_SUBHEADER} lg:py-5`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className={PAGE_SUBHEADER_TITLE}>발견된 투자처 리스트</h2>
                <p className={PANEL_SECTION_DESC}>전체 사용자가 발견한 우수 투자처 실시간 내역입니다</p>
              </div>
              <button
                onClick={fetchList}
                className="hidden lg:flex p-2 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors text-slate-500 shadow-sm items-center justify-center shrink-0"
                aria-label="새로고침"
              >
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
                {displayed.map((d, idx) => {
                  const direction = getListDirection(d);
                  const reportMessage = getListReportMessage(d);
                  return (
                    <div
                      key={d.id}
                      onClick={() => router.push(`/discover/${d.id}`)}
                      className="group relative bg-white border border-slate-100 hover:border-emerald-300 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    >
                      {idx < 3 && (
                        <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-md z-10 ${idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-emerald-500' : 'bg-blue-500'}`}>
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

                          {reportMessage && (
                            <div className="bg-emerald-50/30 border border-emerald-100/50 rounded-xl p-2.5 mb-2.5">
                              <p className="text-[11px] text-emerald-800 font-bold line-clamp-2 leading-relaxed">
                                {reportMessage.base}
                                {reportMessage.result && (
                                  <>
                                    {' - '}
                                    <span className="text-teal-700">{reportMessage.result}</span>
                                  </>
                                )}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center gap-2 flex-wrap">
                            {d.category && (
                              <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                {getReportCategoryLabel(d.category)}
                              </span>
                            )}
                            {direction && (
                              <span className="text-[9px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wide border border-teal-100">
                                {direction}
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
                  );
                })}

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md px-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 max-w-sm w-full shadow-2xl flex flex-col items-center relative overflow-hidden">
            <div className="flex items-center gap-2 mb-5 z-10">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest">Public Data Collector Active</span>
            </div>
            <div className="relative w-16 h-16 mb-5 z-10 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" />
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              <img
                src={STEP_ICONS[dStep] || '/3d/suzip.svg'}
                alt=""
                className="w-8 h-8 object-contain animate-bounce"
              />
            </div>
            <h3 className="text-sm font-extrabold text-white mb-1.5 z-10 tracking-tight">{ANALYSIS_STEPS[dStep]?.label}</h3>
            <p className="text-xs text-slate-400 mb-5 text-center z-10 px-4 leading-relaxed font-semibold">{ANALYSIS_STEPS[dStep]?.desc}</p>
            <div className="w-full z-10">
              <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${((dStep + 1) / ANALYSIS_STEPS.length) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-500 mt-3 tabular-nums uppercase tracking-wider">
                <span>Phase {dStep + 1} / {ANALYSIS_STEPS.length}</span>
                <span>{dElapsed}s</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 앱 다운로드 안내 배너 팝업 (PC 전용) */}
      {!isMobile && showBanner && (
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

      {/* 결제 모달 */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <DiscoveryPaymentModal
            address={dAddress}
            user={user!}
            onClose={() => setIsPaymentModalOpen(false)}
            onSuccess={() => {
              setIsPaymentModalOpen(false);
              runDiscover();
            }}
          />
        )}
      </AnimatePresence>

      {/* 모바일 발굴하기 탭 접속 시 하단 알림 */}
      {isMobile && !showMobileList && (
        <div className="fixed bottom-6 left-6 right-6 z-[150] bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-col gap-3 text-white">
          
            <p className="text-[12px] text-slate-300 font-semibold leading-relaxed animate-pulse">
              매물 분석은 <strong className="text-emerald-400 font-extrabold">모바일 앱</strong>과 <strong className="text-emerald-400 font-extrabold">PC</strong>에서만 지원합니다.
            </p>
            <div className="h-px bg-white/5 my-0.5" />
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                <span className="text-slate-400 font-bold">🖥️ PC 버전</span>
                <span className="text-emerald-400 font-extrabold">구글 · 네이버 '부동산탐정' 검색</span>
              </div>
              <div className="flex items-center justify-between text-[11px] bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                <span className="text-slate-400 font-bold">📱 모바일 앱</span>
                <span className="text-emerald-400 font-extrabold">구글플레이 · 앱스토어 앱 다운로드</span>
              </div>
            </div>
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
