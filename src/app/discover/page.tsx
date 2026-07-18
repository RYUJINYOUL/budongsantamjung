'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SideNav from '../../components/SideNav';
import {
  PANEL_CARD,
  PANEL_SECTION_LABEL,
  PANEL_SECTION_DESC,
  PANEL_INPUT_WRAP,
  PANEL_INPUT,
  panelChoiceBtnSoft,
  panelStepBadge,
  PAGE_HEADER_TITLE,
  PAGE_STICKY_HEADER,
  PAGE_SUBHEADER,
  PAGE_SUBHEADER_TITLE,
} from '../../components/analyzePanelFormStyles';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  RAIL_STAGE_FILTERS,
  RAIL_PUBLISHER_CLASS,
  RAIL_SIGNAL_CLASS,
  enrichRailItemClient,
  type RailStageGuide,
} from '../../lib/railStageGuide';
import {
  REDEV_STAGE_FILTERS,
  STAGE_SIGNAL_CLASS,
  OFFICIAL_ADMIN_STEPS,
  checkStatusClass,
  checkStatusIcon,
  enrichInvestmentItemClient,
  getStageMeta,
  matchOfficialStepNo,
  type RedevStageCheck,
  type RedevStageGuide,
  type RedevStageTimelineItem,
} from '../../lib/redevStageGuide';
import { resolveGwanboPdfLink } from '../../lib/gwanboPdfUrl';
import RedevLocationModal from '../../components/RedevLocationModal';
import RedevInvestmentCalculator from '../../components/RedevInvestmentCalculator';
import { buildRedevPortalLink } from '../../lib/redevSourceLinks';
import { ArrowLeft } from 'lucide-react';

function loadKakaoSdk(callback: () => void) {
  if (window.kakao?.maps) { callback(); return; }
  const existingScript = document.getElementById('kakao-maps-sdk');
  if (existingScript) { existingScript.addEventListener('load', callback); return; }
  const script = document.createElement('script');
  script.id = 'kakao-maps-sdk';
  script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY}&libraries=services&autoload=false`;
  script.onload = () => window.kakao.maps.load(callback);
  document.head.appendChild(script);
}

// ── 상수 ─────────────────────────────────────────────────────────
const GOSI_CATEGORIES = [
  { id: 'all', label: '전체', emoji: '🗺️' },
  { id: 'redevelopment', label: '재개발·재정비', emoji: '🏗️' },
  { id: 'reconstruction', label: '재건축', emoji: '🏢' },
  { id: 'gtx', label: 'GTX', emoji: '🚄' },
  { id: 'subway', label: '지하철', emoji: '🚇' },
  { id: 'road', label: '도로개설', emoji: '🛣️' },
  { id: 'zoningChange', label: '지구단위계획', emoji: '📋' },
  { id: 'executionPlan', label: '실시계획', emoji: '📌' },
  { id: 'newTown', label: '신도시·역세권', emoji: '🏘️' },
  { id: 'greenbeltRelease', label: '개발제한구역', emoji: '🌿' },
  { id: 'publicRelocation', label: '공공기관', emoji: '🏛️' },
  { id: 'corporateInvest', label: '기업·산업단지', emoji: '🏭' },
  { id: 'schoolNew', label: '학교신설', emoji: '🏫' },
  { id: 'zoningAreaChange', label: '용도지역', emoji: '🗂️' },
  { id: 'tradeApt', label: '아파트거래량', emoji: '🏢' },
  { id: 'tradeLand', label: '토지거래량', emoji: '🏞️' },
];


interface RankingItem {
  rank: number;
  sigunguCd: string;
  name: string;
  lat: number | null;
  lng: number | null;
  gosiCount: number;
  latestDate: string;
  latestTitle: string | null;
  categoryCount: number | null;
}

interface SearchResult {
  place_name?: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
}

const PAGE_SIZE = 20;

type MainTabId = 'gosi' | 'analysis' | 'infra';

// ── 메인 탭 ──────────────────────────────────────────────────────
const MAIN_TABS: { id: MainTabId; label: string; desc: string }[] = [
  { id: 'gosi', label: '호재 발굴', desc: '전국 고시 DB 기반 즉시 결과' },
  { id: 'analysis', label: '투자처 발굴', desc: '지역 선택 후 22개 API 수집 분석' },
  { id: 'infra', label: '철도·정비', desc: '관보 철도 고시 + 서울·경기 정비사업' },
];

const INVEST_FILTERS = [
  { id: 'all', label: '전체' },
  { id: '철도', label: '철도' },
  { id: '재개발', label: '재개발' },
  { id: '재건축', label: '재건축' },
];

interface InvestmentItem {
  id: number;
  itemKind: 'rail' | 'redev';
  title: string;
  subtitle?: string;
  type?: string;
  stage?: string;
  stageOrder?: number;
  stageLabel?: string | null;
  stageTitle?: string | null;
  stageSignal?: string | null;
  institution?: string;
  railStage?: string;
  railStageLabel?: string;
  publisher?: string;
  publisherLabel?: string;
  investmentSignal?: string | null;
  addressLevel?: string | null;
  stageGuide?: RedevStageGuide | RailStageGuide | null;
  stageTimeline?: RedevStageTimelineItem[];
  stageChecks?: RedevStageCheck[];
  unitRatioPct?: number | null;
  currentStage?: string;
  publishDate?: string | null;
  pdfUrl?: string | null;
  contentSeq?: string | null;
  lawsuitNews?: Array<{ title?: string; link?: string; pubDate?: string }>;
  shopNews?: Array<{ title?: string; link?: string; pubDate?: string }>;
  lineName?: string | null;
  region?: string | null;
  city?: string;
  source?: string;
  projectType?: string;
  badges?: string[];
  plannedUnits?: number | null;
  memberCount?: number | null;
  avgLandShare?: number | null;
  totalAreaSqm?: number | null;
  location?: string | null;
  cleanupCafeUrl?: string | null;
  salePrice?: {
    houseName?: string;
    priceMinLabel?: string;
    priceMaxLabel?: string;
    types?: Array<{ type?: string; supplyArea?: number; priceLabel?: string }>;
    source?: string;
  } | null;
  salePriceLabel?: string | null;
}

interface InvestmentStats {
  railCount: number;
  redevCount: number;
  reconCount: number;
  seoulCount?: number;
  gyeonggiCount?: number;
  stageCounts?: Record<number, number>;
  railStageCounts?: Record<string, number>;
}

function DiscoverPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presaleDeepLinkApplied = useRef(false);
  const [user, setUser] = useState<User | null>(null);
  const [showMobileList, setShowMobileList] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mainTab, setMainTab] = useState<MainTabId>('gosi');

  // ── 탭 간 공유 지역 컨텍스트 ───────────────────────────────────
  // 호재발굴에서 선택한 지역을 투자처발굴 탭으로 전달할 때 사용
  const [sharedRegion, setSharedRegion] = useState<{ name: string; lat: number; lng: number } | null>(null);

  // ── 호재발굴 체크박스 선택 ────────────────────────────────
  // 지역브리핑 비교 대상
  const [checkedSigungus, setCheckedSigungus] = useState<Map<string, { name: string; lat: number | null; lng: number | null }>>(new Map());
  const [checkToast, setCheckToast] = useState(false);

  const toggleCheck = (item: RankingItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedSigungus(prev => {
      const next = new Map(prev);
      if (next.has(item.sigunguCd)) {
        next.delete(item.sigunguCd);
      } else {
        if (next.size >= 3) {
          // 3개 초과 시 토스트
          setCheckToast(true);
          setTimeout(() => setCheckToast(false), 2000);
          return prev;
        }
        next.set(item.sigunguCd, { name: item.name, lat: item.lat, lng: item.lng });
      }
      return next;
    });
  };

  const goToBriefing = () => {
    const entries = Array.from(checkedSigungus.entries());
    if (typeof window !== 'undefined') {
      localStorage.setItem('briefing_prefill', JSON.stringify(
        entries.map(([code, v]) => ({ code, name: v.name, lat: v.lat, lng: v.lng }))
      ));
    }
    router.push('/ranking?sub=compare');
  };

  const renderRankingList = () => {
    if (gosiRunning && gosiPage === 1) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 relative">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-100" />
            <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500 animate-spin" />
          </div>
          <p className="text-xs font-extrabold text-emerald-600 tracking-wider">전국 DB 탐색 중...</p>
        </div>
      );
    }
    if (rankingItems.length === 0) {
      return (
        <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl">
          <p className="text-slate-800 font-bold text-xs">검색 결과 없음</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {gosiDisplayed.map((r, idx) => (
          <div key={r.sigunguCd + '-' + idx}
            onClick={() => router.push(`/discover/${r.sigunguCd}`)}
            className={`group relative bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${checkedSigungus.has(r.sigunguCd)
              ? 'border-indigo-400 ring-1 ring-indigo-200'
              : 'border-slate-100 hover:border-emerald-300'
              }`}>
            {idx < 3 && (
              <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-md z-10 ${idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                {idx + 1}
              </div>
            )}
            <button
              type="button"
              onClick={e => toggleCheck(r, e)}
              className={`absolute top-3 right-3 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all z-10 ${checkedSigungus.has(r.sigunguCd)
                ? 'bg-indigo-500 border-indigo-500 text-white'
                : 'bg-white border-slate-300 hover:border-indigo-400'
                }`}
            >
              {checkedSigungus.has(r.sigunguCd) && <span className="text-[10px] font-black">✓</span>}
            </button>
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0 pr-6">
                <h2 className="text-sm font-extrabold text-slate-900 leading-tight group-hover:text-emerald-600 transition-colors line-clamp-1 mb-1">
                  {r.name}
                </h2>
                {r.latestTitle && (
                  <div className="bg-emerald-50/30 border border-emerald-100/50 rounded-xl p-2.5 mb-2">
                    <p className="text-[11px] text-emerald-800 font-bold line-clamp-2 leading-relaxed">{r.latestTitle}</p>
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold ${selectedCategory === 'tradeApt' || selectedCategory === 'tradeLand' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {selectedCategory === 'tradeApt' || selectedCategory === 'tradeLand' ? '거래' : '고시'} {Number(r.gosiCount).toLocaleString()}건
                  </span>
                  {r.latestDate && (
                    <span className="text-[9px] text-slate-400 font-bold">
                      {new Date(r.latestDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {r.lat && r.lng && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); goToAnalysisWithRegion(r.name, r.lat, r.lng); }}
                      className="ml-auto shrink-0 text-[9px] font-extrabold px-2 py-1 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      투자처 분석 →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // 모바일에서도 초기에는 폼(입력 화면)을 먼저 보여줌
      // 버튼 클릭 시에만 결과 목록으로 전환
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ── 호재 발굴 상태 ────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [hasMoreBackend, setHasMoreBackend] = useState(false);
  const [rankingItems, setRankingItems] = useState<RankingItem[]>([]);
  const [gosiRunning, setGosiRunning] = useState(false);
  const [gosiError, setGosiError] = useState<string | null>(null);
  const [gosiSearched, setGosiSearched] = useState(false);
  const [gosiSearchQuery, setGosiSearchQuery] = useState('');
  const [gosiPage, setGosiPage] = useState(1);
  const gosiLoaderRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false); // 동시 요청 방지
  const nextPageRef = useRef(1);       // 항상 최신 다음 페이지 추적
  const hasMoreRef = useRef(false);    // Observer 클로저 stale 방지
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleGosiSearchChange = (q: string) => {
    setGosiSearchQuery(q);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      const trimmed = q.trim();
      setKeyword(trimmed);
      runGosiDiscover(1, trimmed || undefined);
    }, 400);
  };

  const gosiDisplayed = rankingItems; // 로컬 필터 제거: 백엔드에서 직접 검색

  // stale closure 방지: 항상 최신 runGosiDiscover를 ref로 추적
  const runGosiDiscoverRef = useRef<any>(null);
  useEffect(() => { runGosiDiscoverRef.current = runGosiDiscover; });

  const handleGosiObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting && hasMoreRef.current && !isFetchingRef.current) {
      runGosiDiscoverRef.current(nextPageRef.current);
    }
  }, []); // 의존성 없음 — ref로만 추적

  // Observer: gosiSearched가 true가 된 후 로더 div가 DOM에 생겨야 연결 가능
  useEffect(() => {
    const el = gosiLoaderRef.current; if (!el) return;
    const obs = new IntersectionObserver(handleGosiObserver, { threshold: 0.1 });
    obs.observe(el); return () => obs.disconnect();
  }, [handleGosiObserver, gosiSearched]); // gosiSearched 없으면 div가 null

  const runGosiDiscover = async (page = 1, overrideKeyword?: string, autoSwitch = true) => {
    if (isFetchingRef.current) return; // 중복 요청 차단
    isFetchingRef.current = true;
    setGosiRunning(true);
    if (page === 1) {
      setGosiError(null);
      setRankingItems([]);
      hasMoreRef.current = false;
    }
    try {
      const kw = overrideKeyword !== undefined ? overrideKeyword : keyword;
      let url: string;
      if (kw.trim()) {
        const cat = selectedCategory !== 'all' ? `&category=${selectedCategory}` : '';
        url = `/api/batch/ranking/by-keyword?keyword=${encodeURIComponent(kw.trim())}&limit=${PAGE_SIZE}&page=${page}${cat}`;
      } else {
        const cat = selectedCategory === 'all' ? '' : `&category=${selectedCategory}`;
        url = `/api/batch/ranking/by-category?limit=${PAGE_SIZE}&page=${page}${cat}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        const items: RankingItem[] = (data.ranking || data.results || []).map((r: any, i: number) => ({
          rank: r.rank ?? ((page - 1) * PAGE_SIZE + i + 1),
          sigunguCd: r.sigunguCd,
          name: r.name || r.regionName || r.sigunguCd,
          lat: r.lat ? parseFloat(r.lat) : null,
          lng: r.lng ? parseFloat(r.lng) : null,
          gosiCount: r.gosiCount ?? 0,
          latestDate: r.latestDate || r.publishedAt || '',
          latestTitle: r.latestTitle || r.title || null,
          categoryCount: r.categoryCount ?? null,
        }));
        const more = items.length === PAGE_SIZE;
        hasMoreRef.current = more;
        nextPageRef.current = page + 1;
        setRankingItems(prev => page === 1 ? items : [...prev, ...items]);
        setHasMoreBackend(more);
        setGosiPage(page);
        if (page === 1) {
          setGosiSearched(true);
          if (autoSwitch) setShowMobileList(true); // ✅ 사용자 클릭 시에만 자동 전환
        }
      } else {
        if (page === 1) setGosiError(data.message || '조회 중 오류가 발생했습니다.');
        hasMoreRef.current = false;
      }
    } catch (e: any) {
      if (page === 1) setGosiError(e.message);
      hasMoreRef.current = false;
    } finally {
      setGosiRunning(false);
      isFetchingRef.current = false;
    }
  };

  // ── 투자처 발굴 (22 API 분석) ─────────────────────────────────
  const [kakaoReady, setKakaoReady] = useState(false);
  const [dAddress, setDAddress] = useState('');
  const [dLat, setDLat] = useState<number | null>(null);
  const [dLng, setDLng] = useState<number | null>(null);
  const [dSearchQ, setDSearchQ] = useState('');
  const [dSearchResults, setDSearchResults] = useState<SearchResult[]>([]);
  const [dSearching, setDSearching] = useState(false);
  const [dRunning, setDRunning] = useState(false);
  const [dError, setDError] = useState<string | null>(null);
  const [dHasExisting, setDHasExisting] = useState<boolean | null>(null);
  const [dExistingSigunguCd, setDExistingSigunguCd] = useState<string | null>(null);

  useEffect(() => {
    if (mainTab === 'analysis') {
      if (window.kakao?.maps) setKakaoReady(true);
      else loadKakaoSdk(() => setKakaoReady(true));

      if (sharedRegion && !dAddress) {
        setDAddress(sharedRegion.name);
        setDLat(sharedRegion.lat);
        setDLng(sharedRegion.lng);
        setDHasExisting(null);
        setDExistingSigunguCd(null);
        fetch(`/api/land/detective/checkExisting?lat=${sharedRegion.lat}&lng=${sharedRegion.lng}`)
          .then(r => r.json())
          .then(data => {
            if (data.exists) { setDHasExisting(true); setDExistingSigunguCd(data.sigunguCd); }
            else setDHasExisting(false);
          })
          .catch(() => setDHasExisting(false));
        setSharedRegion(null);
      }
    }
  }, [mainTab, sharedRegion, dAddress]);

  const goToAnalysisWithRegion = (name: string, lat: number | null, lng: number | null) => {
    if (!lat || !lng) { setMainTab('analysis'); return; }
    setSharedRegion({ name, lat, lng });
    setMainTab('analysis');
    if (isMobile) setShowMobileList(false);
  };

  const handleDiscoverSearch = (q: string) => {
    setDSearchQ(q);
    if (!q || q.length < 2) { setDSearchResults([]); return; }
    if (!kakaoReady || !window.kakao?.maps?.services) {
      loadKakaoSdk(() => handleDiscoverSearch(q)); return;
    }
    setDSearching(true);
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(q, (result: any, status: any) => {
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        setDSearching(false);
        setDSearchResults(result.slice(0, 5).map((p: any) => ({
          address_name: p.address_name,
          road_address_name: p.road_address?.address_name || '',
          x: p.x, y: p.y,
        })));
      } else {
        new window.kakao.maps.services.Places().keywordSearch(q, (data: any, s: any) => {
          setDSearching(false);
          if (s === window.kakao.maps.services.Status.OK) {
            setDSearchResults(data.slice(0, 5).map((p: any) => ({
              place_name: p.place_name,
              address_name: p.address_name,
              road_address_name: p.road_address_name,
              x: p.x, y: p.y,
            })));
          } else setDSearchResults([]);
        });
      }
    });
  };

  const selectDiscoverResult = (r: SearchResult) => {
    const lat = parseFloat(r.y);
    const lng = parseFloat(r.x);
    setDAddress(r.road_address_name || r.address_name);
    setDLat(lat); setDLng(lng);
    setDSearchQ(''); setDSearchResults([]);
    setDHasExisting(null); setDExistingSigunguCd(null);

    fetch(`/api/land/detective/checkExisting?lat=${lat}&lng=${lng}`)
      .then(r => r.json())
      .then(data => {
        if (data.exists) {
          setDHasExisting(true);
          setDExistingSigunguCd(data.sigunguCd);
        } else {
          setDHasExisting(false);
        }
      })
      .catch(() => setDHasExisting(false));
  };

  const runAnalysis = async () => {
    if (!dLat || !dLng) { setDError('지역을 검색하여 선택해 주세요.'); return; }

    const headquarters = ['수원시', '성남시', '안양시', '안산시', '고양시', '용인시', '화성시', '청주시', '천안시', '전주시', '포항시', '창원시'];
    const isHeadquarters = headquarters.some(city => dAddress.includes(city));
    if (isHeadquarters && !dAddress.includes('구')) {
      setDError(`성남시, 용인시 등 구가 있는 지역은 '분당구', '수지구' 처럼 구 단위까지 검색해 주셔야 더 정확한 분석이 가능합니다.`);
      return;
    }

    if (!user) { router.push('/login'); return; }

    if (dHasExisting && dExistingSigunguCd) {
      router.push(`/discover/${dExistingSigunguCd}`);
      return;
    }

    setDRunning(true); setDError(null);
    if (isMobile) setShowMobileList(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/land/detective/investmentDiscovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lat: dLat, lng: dLng, budget: 0, category: 'all' }),
      });
      const data = await res.json();
      if (data.success && data.historyId) {
        router.push(`/discover/${data.historyId}`);
      } else {
        setDError(data.error || '발굴 중 오류가 발생했습니다.');
      }
    } catch (e: any) { setDError(e.message); }
    finally { setDRunning(false); }
  };

  useEffect(() => {
    setDHasExisting(null);
    setDExistingSigunguCd(null);
  }, [dAddress]);

  // ── 철도·정비 발굴 ─────────────────────────────────────────────
  const [invFilter, setInvFilter] = useState('all');
  const [invStageFilter, setInvStageFilter] = useState('all');
  const [invRailStageFilter, setInvRailStageFilter] = useState('all');
  const [invQuery, setInvQuery] = useState('');
  const [invItems, setInvItems] = useState<InvestmentItem[]>([]);
  const [invStats, setInvStats] = useState<InvestmentStats | null>(null);
  const [invLoading, setInvLoading] = useState(false);
  const [invError, setInvError] = useState<string | null>(null);
  const [invLoaded, setInvLoaded] = useState(false);
  const [invPage, setInvPage] = useState(1);
  const [invTotal, setInvTotal] = useState(0);
  const [invExpandedId, setInvExpandedId] = useState<string | null>(null);
  const [redevLocationModal, setRedevLocationModal] = useState<{
    projectId: number;
    title: string;
    address: string | null;
    source: string | null;
  } | null>(null);
  const invSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const INV_PAGE_SIZE = 100;

  const showRedevStageUi = invFilter === 'all' || invFilter === '재개발' || invFilter === '재건축';
  const showRailStageUi = invFilter === 'all' || invFilter === '철도';

  useEffect(() => {
    if (presaleDeepLinkApplied.current) return;
    const filter = searchParams.get('filter');
    const stage = searchParams.get('stage');
    const q = searchParams.get('q');
    if (!filter && !stage && !q) return;
    presaleDeepLinkApplied.current = true;
    if (filter) setInvFilter(filter);
    if (stage) setInvStageFilter(stage);
    if (q) setInvQuery(q);
    setMainTab('infra');
  }, [searchParams]);

  const badgeClass = (badge: string) => {
    if (badge.includes('위험')) return 'bg-rose-100 text-rose-700 border-rose-200';
    if (badge.includes('정석')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (badge.includes('안전')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (badge.includes('사업성')) return 'bg-violet-100 text-violet-700 border-violet-200';
    if (badge.includes('추천')) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (badge === '실시계획') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (badge === '기본계획') return 'bg-sky-100 text-sky-700 border-sky-200';
    if (badge === '준공') return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    if (badge === '변경') return 'bg-orange-100 text-orange-700 border-orange-200';
    if (badge === '민간투자') return 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200';
    if (badge === '공격적 투자' || badge === '선행 투자') return 'bg-orange-100 text-orange-700 border-orange-200';
    if (badge === '일반적 진입') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (badge === '리스크 점검') return 'bg-rose-100 text-rose-700 border-rose-200';
    if (badge === '주목') return 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200';
    if (badge === '출구 전략') return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    if (badge === '구축계획') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (badge === '연장·지연') return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const fetchInvestment = useCallback(async (
    filter = invFilter,
    q = invQuery,
    stage = invStageFilter,
    railStage = invRailStageFilter,
    page = 1,
    append = false,
  ) => {
    setInvLoading(true);
    setInvError(null);
    try {
      const params = new URLSearchParams({ filter, limit: String(INV_PAGE_SIZE), page: String(page) });
      if (q.trim()) params.set('q', q.trim());
      const isRedevFilter = filter === 'all' || filter === '재개발' || filter === '재건축';
      const isRailFilter = filter === 'all' || filter === '철도';
      if (isRedevFilter && stage !== 'all') params.set('stage', stage);
      if (isRailFilter && railStage !== 'all') params.set('railStage', railStage);
      const res = await fetch(`/api/discover/investment?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || '조회 실패');
      const items = (data.items || []).map((item: InvestmentItem) => {
        if (item.itemKind === 'rail') return enrichRailItemClient(item);
        return enrichInvestmentItemClient(item);
      });
      setInvItems((prev) => (append ? [...prev, ...items] : items));
      setInvTotal(Number(data.total || 0));
      setInvPage(page);
      setInvStats(data.stats || null);
      setInvLoaded(true);
    } catch (e: any) {
      setInvError(e.message);
      if (!append) setInvItems([]);
    } finally {
      setInvLoading(false);
    }
  }, [invFilter, invQuery, invStageFilter, invRailStageFilter]);

  useEffect(() => {
    if (mainTab !== 'infra') return;
    fetchInvestment(invFilter, invQuery, invStageFilter, invRailStageFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTab, invFilter, invStageFilter, invRailStageFilter]);

  const handleInvSearchChange = (q: string) => {
    setInvQuery(q);
    if (invSearchRef.current) clearTimeout(invSearchRef.current);
    invSearchRef.current = setTimeout(() => fetchInvestment(invFilter, q, invStageFilter, invRailStageFilter, 1, false), 350);
  };

  const loadMoreInvestment = () => {
    if (invLoading || invItems.length >= invTotal) return;
    fetchInvestment(invFilter, invQuery, invStageFilter, invRailStageFilter, invPage + 1, true);
  };

  const railTabClass = (active: boolean) =>
    active
      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm'
      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-200 hover:text-emerald-700';

  const stageTabClass = (active: boolean) =>
    active
      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm'
      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-200 hover:text-emerald-700';

  const renderStageDetail = (item: InvestmentItem) => {
    const stageOrder = item.stageOrder || 1;
    const meta = getStageMeta(stageOrder);
    if (!meta) return null;
    const checks = stageOrder === 2 ? (item.stageChecks ?? []) : [];
    const officialNo = matchOfficialStepNo(item.currentStage || '');
    const portalLink = buildRedevPortalLink({
      source: item.source,
      districtName: item.title,
      title: item.title,
      address: item.location,
      cleanupCafeUrl: item.cleanupCafeUrl,
    });

    return (
      <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/50 p-3">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-[9px] px-2 py-0.5 rounded-md font-extrabold bg-violet-600 text-white">{meta.label}</span>
          <span className="text-[11px] font-extrabold text-slate-800">{meta.title}</span>
          <span className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold border ${STAGE_SIGNAL_CLASS[meta.signal] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
            {meta.signal}
          </span>
        </div>
        {item.currentStage && (
          <p className="text-[10px] text-slate-500 mb-2">
            공식 진행단계: <span className="font-extrabold text-slate-700">{item.currentStage}</span>
            {officialNo ? <span className="text-slate-400"> (행정 {officialNo}/10단계)</span> : null}
          </p>
        )}
        <p className="text-[10px] text-slate-600 leading-relaxed">{meta.summary}</p>
        <p className="text-[10px] font-bold text-slate-800 mt-2">{meta.investment}</p>
        {checks.length > 0 && (
          <div className="mt-3 pt-3 border-t border-amber-100 space-y-2">
            <p className="text-[10px] font-extrabold text-amber-800">2단계 체크리스트</p>
            {checks.map((check) => (
              <div key={check.id} className="flex gap-2 items-start">
                <span className={`text-xs font-black shrink-0 ${checkStatusClass(check.status)}`}>
                  {checkStatusIcon(check.status)}
                </span>
                <div>
                  <p className="text-[10px] font-extrabold text-slate-800">{check.label}</p>
                  <p className={`text-[9px] font-semibold mt-0.5 ${checkStatusClass(check.status)}`}>{check.detail}</p>
                  {(check.newsLinks?.length ?? 0) > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {check.newsLinks!.slice(0, 3).map((news, idx) => (
                        <li key={idx}>
                          <a
                            href={news.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] font-bold text-blue-600 hover:text-blue-700 line-clamp-1"
                          >
                            {news.title || '관련 뉴스'} →
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <details className="mt-3 pt-2 border-t border-slate-200/80">
          <summary className="text-[9px] font-extrabold text-slate-400 cursor-pointer">공식 10단계 vs 투자 5단계 보기</summary>
          <div className="mt-2 space-y-1">
            {OFFICIAL_ADMIN_STEPS.map((step) => (
              <div key={step.no} className={`text-[9px] flex gap-2 ${officialNo === step.no ? 'text-violet-700 font-extrabold' : 'text-slate-400'}`}>
                <span className="w-4 shrink-0">{step.no}.</span>
                <span className="flex-1">{step.name}</span>
                <span className="shrink-0">→ 투자 {step.investStage}단계</span>
              </div>
            ))}
          </div>
        </details>
        {portalLink && (
          <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-col items-start gap-1">
            <a
              href={portalLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-[10px] font-extrabold text-white hover:bg-slate-700"
            >
              {portalLink.label}
            </a>
            {portalLink.hint && (
              <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">{portalLink.hint}</p>
            )}
          </div>
        )}
        {stageOrder === 4 && (
          <RedevInvestmentCalculator projectId={item.id} title={item.title} />
        )}
      </div>
    );
  };

  const renderRailStageDetail = (item: InvestmentItem) => {
    const guide = item.stageGuide as RailStageGuide | null;
    if (!guide) return null;
    return (
      <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/50 p-3">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-[9px] px-2 py-0.5 rounded-md font-extrabold bg-sky-600 text-white">
            {item.railStageLabel || item.railStage}
          </span>
          {item.investmentSignal && (
            <span className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold border ${RAIL_SIGNAL_CLASS[item.investmentSignal] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              {item.investmentSignal}
            </span>
          )}
          {guide.addressLevel && (
            <span className="text-[9px] text-slate-500 font-semibold">주소: {guide.addressLevel}</span>
          )}
        </div>
        <p className="text-[10px] text-slate-600 leading-relaxed">{guide.summary}</p>
        <p className="text-[10px] font-bold text-slate-800 mt-2">{guide.investment}</p>
        {(guide.tactics?.length ?? 0) > 0 && (
          <ul className="mt-2 space-y-1">
            {guide.tactics!.map((t, i) => (
              <li key={i} className="text-[9px] text-slate-600 flex gap-1.5">
                <span className="text-sky-500 font-black shrink-0">•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        )}
        {item.railStage === '기본계획' && (
          <p className="mt-2 text-[9px] text-orange-700 font-semibold bg-orange-50 border border-orange-100 rounded-lg px-2 py-1.5">
            주소 없음 → 랜드마크·교차로·기존 역 기준 선점 + 인근 재개발 빌라 통매수가 핵심 전략입니다.
          </p>
        )}
      </div>
    );
  };

  const renderInvestmentCards = () => {
    if (invLoading && !invLoaded) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 relative">
            <div className="absolute inset-0 rounded-full border-2 border-blue-100" />
            <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 animate-spin" />
          </div>
          <p className="text-xs font-extrabold text-blue-600 tracking-wider">투자처 데이터 불러오는 중...</p>
        </div>
      );
    }
    if (!invItems.length) {
      return (
        <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl">
          <p className="text-slate-800 font-bold text-xs">표시할 항목이 없습니다</p>
          <p className="text-[10px] text-slate-400 mt-2">필터를 바꾸거나 검색어를 조정해 보세요</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {invStats?.gyeonggiCount === 0 && showRedevStageUi && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-[11px] font-extrabold text-amber-800">경기도 정비사업 데이터 준비 중</p>
            <p className="text-[10px] text-amber-700 mt-1 leading-relaxed">
              현재 서울시 API 데이터만 표시됩니다. 경기데이터드림 Open API 서비스명·인증 연동 확인 후 경기도 구역도 추가 예정입니다.
            </p>
          </div>
        )}
        {invItems.map((item) => {
          const cardKey = `${item.itemKind}-${item.id}`;
          const expanded = invExpandedId === cardKey;
          const isRedev = item.itemKind === 'redev';
          const isRail = item.itemKind === 'rail';
          return (
            <div key={cardKey}
              className={`bg-white border rounded-2xl p-4 shadow-sm transition-all ${
                expanded
                  ? isRail ? 'border-sky-300 shadow-md ring-1 ring-sky-100' : 'border-violet-300 shadow-md ring-1 ring-violet-100'
                  : 'border-slate-100 hover:shadow-md hover:border-blue-200'
              }`}>
              <div className="w-full text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold ${isRail ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'}`}>
                        {isRail ? '철도' : item.projectType || item.type}
                      </span>
                      {isRail && item.publisher && (
                        <span className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold ${RAIL_PUBLISHER_CLASS[item.publisher] || RAIL_PUBLISHER_CLASS.기타}`}>
                          {item.publisherLabel || item.publisher}
                        </span>
                      )}
                      {isRail && item.railStageLabel && (
                        <span className="text-[9px] px-2 py-0.5 rounded-md font-extrabold bg-sky-600 text-white">
                          {item.railStageLabel}
                        </span>
                      )}
                      {isRedev && item.stageLabel && (
                        <span className="text-[9px] px-2 py-0.5 rounded-md font-extrabold bg-violet-600 text-white">
                          {item.stageLabel}
                        </span>
                      )}
                      {isRedev && item.stageSignal && (
                        <span className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold border ${STAGE_SIGNAL_CLASS[item.stageSignal] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {item.stageSignal}
                        </span>
                      )}
                      {isRedev && item.source && <span className="text-[9px] text-slate-400 font-bold">{item.source}</span>}
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-2">{item.title}</h3>
                    {item.lineName && (
                      <p className="text-[10px] text-sky-700 mt-1 font-extrabold">노선: {item.lineName}</p>
                    )}
                    {isRedev && (
                      <p className="text-[10px] mt-1.5 flex items-start gap-1 leading-snug">
                        <svg className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <button
                          type="button"
                          onClick={() => setRedevLocationModal({
                            projectId: item.id,
                            title: item.title,
                            address: item.location || item.title || Array.from(new Set([item.city, item.source])).filter(Boolean).join(' ') || null,
                            source: item.source || null,
                          })}
                          className="text-left line-clamp-2 font-semibold text-violet-700 hover:text-violet-900 underline decoration-violet-300 underline-offset-2 hover:decoration-violet-500 transition-colors"
                        >
                          {item.location || item.title || Array.from(new Set([item.city, item.source])).filter(Boolean).join(' · ') || '주소 정보 없음'}
                        </button>
                      </p>
                    )}
                    {!isRedev && (item.region || item.location) && (
                      <p className="text-[10px] text-slate-700 mt-1.5 font-semibold flex items-start gap-1 leading-snug">
                        <svg className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <span className="line-clamp-2">{item.location || item.region}</span>
                      </p>
                    )}
                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                      {isRail
                        ? [item.institution, item.publishDate].filter(Boolean).join(' · ')
                        : Array.from(new Set([item.city, item.source])).filter(Boolean).concat(item.currentStage ? [item.currentStage] : []).join(' · ')}
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {item.publishDate && isRail && (
                      <span className="text-[9px] text-slate-400 font-bold">{item.publishDate}</span>
                    )}
                    {(isRedev || isRail) && (
                      <button
                        type="button"
                        className={`text-[9px] font-bold ${isRail ? 'text-sky-500' : 'text-violet-500'}`}
                        onClick={() => setInvExpandedId(expanded ? null : cardKey)}
                      >
                        {expanded ? '접기 ▲' : '투자 가이드 ▼'}
                      </button>
                    )}
                  </div>
                </div>

                {(item.badges?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {item.badges!.map((b) => (
                      <span key={b} className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold border ${badgeClass(b)}`}>{b}</span>
                    ))}
                  </div>
                )}

                {expanded && isRedev && renderStageDetail(item)}
                {expanded && isRail && renderRailStageDetail(item)}

                {isRedev && (item.plannedUnits || item.memberCount || item.avgLandShare || item.unitRatioPct || item.salePriceLabel) && (
                  <div className="flex flex-wrap gap-2 mt-3 text-[9px] text-slate-500 font-semibold">
                    {item.plannedUnits ? <span>예정 {item.plannedUnits}세대</span> : null}
                    {item.memberCount ? <span>조합원 {item.memberCount}</span> : null}
                    {item.unitRatioPct ? <span>세대/조합원 {item.unitRatioPct}%</span> : null}
                    {item.avgLandShare ? <span>대지지분 {item.avgLandShare}평</span> : null}
                    {item.salePriceLabel ? (
                      <span className="text-emerald-700 font-extrabold">
                        분양가 {item.salePriceLabel}
                        {item.salePrice?.source ? ` (${item.salePrice.source})` : ''}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
              {(() => {
                const pdfLink = resolveGwanboPdfLink(item);
                return pdfLink ? (
                  <a href={pdfLink} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-[10px] font-extrabold text-blue-600 hover:text-blue-700">
                    고시 PDF 원문 →
                  </a>
                ) : null;
              })()}
            </div>
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    runGosiDiscover(1, undefined, false); // ✅ 초기 로드: 백그라운드 데이터 프리페치, 모바일 자동 전환 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedCatLabel = GOSI_CATEGORIES.find(c => c.id === selectedCategory)?.label || '전체';

  const mobileResultsTitle =
    mainTab === 'gosi'
      ? (gosiSearched ? `${selectedCatLabel} 랭킹` : '호재 발굴 결과')
      : mainTab === 'analysis'
        ? '투자처 발굴 결과'
        : '철도·정비 발굴';
  const selectedCatEmoji = GOSI_CATEGORIES.find(c => c.id === selectedCategory)?.emoji || '🗺️';

  return (
    <div className="detective-bg min-h-screen text-slate-900 relative bg-white flex">
      <div className="noise-overlay" /><div className="scanline" />
      <SideNav />
      {/* 3개 제한 토스트 */}
      {checkToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-xl">
            <span className="text-amber-400">⚠</span>
            최대 3개 지역까지 비교할 수 있습니다
          </div>
        </div>
      )}
      <div className="lg:pl-16 flex-1 flex flex-col lg:grid lg:grid-cols-[minmax(0,25%)_minmax(0,75%)] min-h-screen">

        {/* ── 좌측 패널 ── */}
        <div className={`w-full border-b lg:border-b-0 lg:border-r border-slate-200/50 flex flex-col h-auto lg:h-screen lg:sticky lg:top-0 min-w-0 bg-gradient-to-b from-white to-slate-50/30 ${showMobileList ? 'hidden lg:flex' : 'flex'}`}>
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

          <div className={PAGE_SUBHEADER}>
            <div className="flex w-full mb-4 bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
              {MAIN_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setMainTab(t.id);
                    if (isMobile) setShowMobileList(false);
                  }}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    mainTab === t.id
                      ? 'text-sm font-extrabold text-emerald-800 bg-emerald-50 shadow-sm'
                      : 'text-sm font-bold text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <h2 className={PAGE_SUBHEADER_TITLE}>
              {MAIN_TABS.find((t) => t.id === mainTab)?.label}
            </h2>
            <p className={PANEL_SECTION_DESC}>
              {MAIN_TABS.find((t) => t.id === mainTab)?.desc}
            </p>
          </div>

          {/* ── 호재 발굴 폼 ── */}
          {mainTab === 'gosi' && (
            <div className="relative flex flex-col flex-1 min-h-0">
              <div className="flex-1 min-h-0 overflow-y-auto px-4 lg:px-5 py-4 space-y-3">
                <section className={PANEL_CARD}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={panelStepBadge(1)}>1</span>
                    <div>
                      <p className={PANEL_SECTION_LABEL}>호재 유형</p>
                      <p className={PANEL_SECTION_DESC}>전국 고시 기반 개발 카테고리</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {GOSI_CATEGORIES.map(cat => (
                      <button key={cat.id} type="button" onClick={() => setSelectedCategory(cat.id)}
                        className={`flex flex-col items-center justify-center py-3.5 px-1 rounded-xl border text-center transition-all ${selectedCategory === cat.id
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-200'
                          }`}>
                        {/* <span className="text-base leading-none">{cat.emoji}</span> */}
                        <span className="text-[10px] font-extrabold leading-tight">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className={PANEL_CARD}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={panelStepBadge(2)}>2</span>
                    <div>
                      <p className={PANEL_SECTION_LABEL}>키워드 검색 <span className="text-slate-400 font-normal">(선택)</span></p>
                      <p className={PANEL_SECTION_DESC}>입력 시 카테고리 대신 키워드로 검색</p>
                    </div>
                  </div>
                  <div className={PANEL_INPUT_WRAP}>
                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="text" placeholder="예: GTX, 광역급행, 재정비촉진"
                      value={keyword} onChange={e => setKeyword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && runGosiDiscover()}
                      className={PANEL_INPUT} />
                    {keyword && <button type="button" onClick={() => setKeyword('')} className="text-slate-400 hover:text-slate-600 shrink-0 text-xs">✕</button>}
                  </div>
                </section>



                {gosiError && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex gap-2 items-start">
                    <p className="text-[11px] font-semibold text-rose-700 flex-1">{gosiError}</p>
                    <button type="button" onClick={() => setGosiError(null)} className="text-slate-400 text-xs">✕</button>
                  </div>
                )}
              </div>
              <div className="shrink-0 px-4 lg:px-5 py-3.5 border-t border-slate-100 bg-white">
                <button type="button" onClick={() => runGosiDiscover(1)} disabled={gosiRunning && gosiPage === 1}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-35 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-all shadow-sm shadow-emerald-500/15 active:scale-[0.98]">
                  {gosiRunning && gosiPage === 1 ? '전국 고시 탐색 중...' : keyword.trim() ? `"${keyword}" 검색` : `AI 발견 시작 — ${selectedCatLabel}`}
                </button>
                <p className="text-[9px] text-slate-400 text-center mt-2 font-medium">전국 251개 시군구 고시 DB · AI 바로 분석</p>
              </div>
            </div>
          )}

          {/* ── 투자처 발굴 폼 ── */}
          {mainTab === 'analysis' && (
            <div className="relative flex flex-col flex-1 min-h-0">
              <div className="flex-1 min-h-0 overflow-y-auto px-4 lg:px-5 py-4 space-y-3">
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
                      <input type="text" placeholder="지역명 또는 주소 검색"
                        value={dSearchQ} onChange={e => handleDiscoverSearch(e.target.value)}
                        className={PANEL_INPUT} />
                      {dSearching && <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0" />}
                    </div>
                    {dSearchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                        {dSearchResults.map((r, i) => (
                          <button key={i} type="button" onClick={() => selectDiscoverResult(r)}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-50/60 border-b border-slate-50 last:border-0 transition-colors">
                            <div className="text-xs font-semibold text-slate-800">{r.place_name || r.address_name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{r.road_address_name || r.address_name}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {dAddress && (
                    <div className="mt-2.5 flex items-start gap-2 bg-emerald-50/30 border border-emerald-100/50 rounded-xl p-2.5">
                      <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="flex-1 min-w-0 text-xs font-semibold text-slate-800 leading-snug">{dAddress}</p>
                      <button type="button" onClick={() => { setDAddress(''); setDLat(null); setDLng(null); }}
                        className="shrink-0 w-5 h-5 flex items-center justify-center rounded-md text-slate-400 hover:text-rose-500 text-xs">✕</button>
                    </div>
                  )}
                </section>

                <section className={PANEL_CARD}>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-6 bg-emerald-500 rounded-sm shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">수집 데이터</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">고시·인허가 · 시장지표 · 실거래가 · 인구이동 · 조례 · 미분양 · 공급현황 · 거시지표 등 22개 API</p>
                    </div>
                  </div>
                </section>

                {dError && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex gap-2 items-start">
                    <p className="text-[11px] font-semibold text-rose-700 flex-1">{dError}</p>
                    <button type="button" onClick={() => setDError(null)} className="text-slate-400 text-xs">✕</button>
                  </div>
                )}
              </div>
              <div className="shrink-0 px-4 lg:px-5 py-3.5 border-t border-slate-100 bg-white">
                {!user ? (
                  <button type="button" onClick={() => router.push('/login')}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all">
                    로그인 후 진행
                  </button>
                ) : (
                  <>
                    {dHasExisting && dExistingSigunguCd && (
                      <div className="mb-2 flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                        <p className="text-[10px] font-bold text-emerald-700 flex-1">이미 수집된 데이터가 있습니다</p>
                        <button type="button"
                          onClick={() => router.push(`/discover/${dExistingSigunguCd}`)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all active:scale-95">
                          바로 보기
                        </button>
                      </div>
                    )}
                    <button type="button" onClick={runAnalysis}
                      disabled={dRunning || !dAddress}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-35 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-all shadow-sm shadow-emerald-500/15 active:scale-[0.98]">
                      {dRunning ? '데이터 수집 중...' : dHasExisting ? '기존 데이터 참조 또는 업데이트' : '발굴 시작'}
                    </button>
                  </>
                )}
                <p className="text-[9px] text-slate-400 text-center mt-2 font-medium">
                  {dRunning ? '22개 공공API 병렬 수집 중입니다' : '22개 공공데이터 분석 결과 제공'}
                </p>
              </div>
            </div>
          )}

          {/* ── 철도·정비 발굴 필터 ── */}
          {mainTab === 'infra' && (
            <div className="relative flex flex-col flex-1 min-h-0">
              <div className="flex-1 min-h-0 overflow-y-auto px-4 lg:px-5 py-4 space-y-3">
                <section className={PANEL_CARD}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={panelStepBadge(1)}>1</span>
                    <div>
                      <p className={PANEL_SECTION_LABEL}>유형 필터</p>
                      <p className={PANEL_SECTION_DESC}>철도 · 재개발 · 재건축</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {INVEST_FILTERS.map((f) => (
                      <button key={f.id} type="button"
                        onClick={() => {
                          setInvFilter(f.id);
                          if (f.id === '철도') setInvStageFilter('all');
                          if (f.id === '재개발' || f.id === '재건축') setInvRailStageFilter('all');
                          if (isMobile) setShowMobileList(true);
                        }}
                        className={panelChoiceBtnSoft(invFilter === f.id)}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </section>

                {showRailStageUi && (
                  <section className={PANEL_CARD}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={panelStepBadge(2)}>2</span>
                      <div>
                        <p className={PANEL_SECTION_LABEL}>철도 고시 단계</p>
                        <p className={PANEL_SECTION_DESC}>국가·서울·인천·경기 발행기관별 투자 타이밍</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {RAIL_STAGE_FILTERS.map((f) => (
                        <button key={f.id} type="button"
                          onClick={() => {
                            setInvRailStageFilter(f.id);
                            if (f.id !== 'all') setInvStageFilter('all');
                            if (isMobile) setShowMobileList(true);
                          }}
                          className={panelChoiceBtnSoft(invRailStageFilter === f.id)}>
                          {f.label}
                          {f.id !== 'all' && invStats?.railStageCounts?.[f.id] != null && (
                            <span className="block text-[9px] opacity-70 mt-0.5">
                              {invStats.railStageCounts[f.id]}건
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {showRedevStageUi && (
                  <section className={PANEL_CARD}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={panelStepBadge(showRailStageUi ? 3 : 2)}>{showRailStageUi ? 3 : 2}</span>
                      <div>
                        <p className={PANEL_SECTION_LABEL}>투자 단계</p>
                        <p className={PANEL_SECTION_DESC}>투자 시점별 5단계 (공식 10단계를 묶음)</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {REDEV_STAGE_FILTERS.map((f) => (
                        <button key={f.id} type="button"
                          onClick={() => {
                            setInvStageFilter(f.id);
                            if (f.id !== 'all') setInvRailStageFilter('all');
                            if (isMobile) setShowMobileList(true);
                          }}
                          className={panelChoiceBtnSoft(invStageFilter === f.id)}>
                          {f.label}
                          {f.id !== 'all' && invStats?.stageCounts?.[Number(f.id)] != null && (
                            <span className="block text-[9px] opacity-70 mt-0.5">
                              {invStats.stageCounts[Number(f.id)]}건
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                <section className={PANEL_CARD}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={panelStepBadge(showRailStageUi && showRedevStageUi ? 4 : showRailStageUi || showRedevStageUi ? 3 : 2)}>
                      {showRailStageUi && showRedevStageUi ? 4 : showRailStageUi || showRedevStageUi ? 3 : 2}
                    </span>
                    <div>
                      <p className={PANEL_SECTION_LABEL}>검색</p>
                      <p className={PANEL_SECTION_DESC}>노선명, 구역명, 지역명</p>
                    </div>
                  </div>
                  <div className={PANEL_INPUT_WRAP}>
                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="text" placeholder="예: GTX, 고덕, 분당"
                      value={invQuery} onChange={e => handleInvSearchChange(e.target.value)}
                      className={PANEL_INPUT} />
                    {invQuery && <button type="button" onClick={() => handleInvSearchChange('')} className="text-slate-400 hover:text-slate-600 shrink-0 text-xs">✕</button>}
                  </div>
                </section>

                {invStats && (
                  <section className={PANEL_CARD}>
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                      철도 {invStats.railCount} · 재개발 {invStats.redevCount} · 재건축 {invStats.reconCount}
                      {invStats.seoulCount != null && (
                        <> · 서울 {invStats.seoulCount}{invStats.gyeonggiCount != null ? ` · 경기 ${invStats.gyeonggiCount}` : ''}</>
                      )}
                    </p>
                  </section>
                )}

                {invError && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex gap-2 items-start">
                    <p className="text-[11px] font-semibold text-rose-700 flex-1">{invError}</p>
                    <button type="button" onClick={() => setInvError(null)} className="text-slate-400 text-xs">✕</button>
                  </div>
                )}
              </div>
              <div className="shrink-0 px-4 lg:px-5 py-3.5 border-t border-slate-100 bg-white">
                <button type="button" onClick={() => { fetchInvestment(invFilter, invQuery, invStageFilter, invRailStageFilter); if (isMobile) setShowMobileList(true); }}
                  disabled={invLoading}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-35 text-white font-bold rounded-xl text-xs transition-all shadow-sm shadow-emerald-500/15 active:scale-[0.98]">
                  {invLoading ? '불러오는 중...' : '목록 새로고침'}
                </button>
                <p className="text-[9px] text-slate-400 text-center mt-2 font-medium">관보 API · 서울·경기 정비사업 DB</p>
              </div>
            </div>
          )}
        </div>

        {/* ── 우측 패널: 결과 ── */}
        <div className={`w-full flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50 min-w-0 ${!showMobileList ? 'hidden lg:flex' : 'flex'}`}>
          <header className={`${PAGE_STICKY_HEADER} lg:hidden`}>
            <div className="flex items-center gap-2">
              <div className="w-9 shrink-0" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setShowMobileList(false)}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600 shrink-0"
                aria-label="뒤로가기"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-black text-slate-900 truncate">{mobileResultsTitle}</h1>
                <p className="text-[10px] font-bold text-emerald-700 truncate">
                  {MAIN_TABS.find((t) => t.id === mainTab)?.desc}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileList(false)}
                className="bg-emerald-400 hover:bg-emerald-500 text-white px-3 py-1 rounded-xl font-bold text-xs tracking-wide shadow-sm transition-all active:scale-95 shrink-0"
              >
                발굴 하기
              </button>
            </div>
          </header>

          {/* 호재 발굴 결과 */}
          {mainTab === 'gosi' && (
            <>
              <div className={`hidden lg:block ${PAGE_SUBHEADER} lg:py-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className={PAGE_SUBHEADER_TITLE}>
                      {gosiSearched ? `${selectedCatLabel} 랭킹` : '호재 발굴 결과'}
                    </h2>
                    <p className={PANEL_SECTION_DESC}>
                      {gosiSearched
                        ? `전국 고시 기준 · 총 ${rankingItems.length}건`
                        : '좌측에서 호재 유형을 선택하고 발굴 시작을 눌러주세요'}
                    </p>
                  </div>
                  {gosiSearched && <span className="hidden lg:block text-[10px] text-slate-400 font-extrabold shrink-0">{rankingItems.length}건</span>}
                </div>
              </div>

              {gosiSearched && (
                <div className="px-6 py-3 bg-white border-b border-slate-200/40 shrink-0">
                  <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-2.5 focus-within:border-emerald-400 transition-all">
                    <svg className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="text" placeholder="지역명, 고시 제목 검색..."
                      value={gosiSearchQuery} onChange={e => handleGosiSearchChange(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400" />
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-6 py-5 pb-24">
                {renderRankingList()}
                {gosiSearched && (
                  <div ref={gosiLoaderRef} className="py-4 flex justify-center">
                    {hasMoreBackend
                      ? <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold"><div className="w-3.5 h-3.5 border-2 border-emerald-300 border-t-emerald-500 rounded-full animate-spin" />불러오는 중...</div>
                      : <p className="text-[10px] text-slate-300 font-semibold">총 {rankingItems.length}건 완료</p>}
                  </div>
                )}
                {/* 플로팅 지역브리핑 비교 CTA */}
                {checkedSigungus.size > 0 && (
                  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <button
                      onClick={goToBriefing}
                      className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl shadow-xl shadow-indigo-600/30 transition-all active:scale-95"
                    >
                      <span className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center font-black text-[10px]">{checkedSigungus.size}</span>
                      지역 브리핑 비교
                      <span className="text-indigo-200">→</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* 투자처 발굴 안내 */}
          {mainTab === 'analysis' && (
            <>
              <div className={`hidden lg:block ${PAGE_SUBHEADER} lg:py-5`}>
                <h2 className={PAGE_SUBHEADER_TITLE}>투자처 발굴 결과</h2>
                <p className={PANEL_SECTION_DESC}>지역 선택 후 발굴 시작 → 상세 분석 페이지로 이동</p>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 pb-24">
                {dRunning ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-12 h-12 relative">
                      <div className="absolute inset-0 rounded-full border-2 border-emerald-100" />
                      <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500 animate-spin" />
                    </div>
                    <p className="text-xs font-extrabold text-emerald-600 tracking-wider">22개 공공데이터 수집 중...</p>
                    <p className="text-[10px] text-slate-400 font-semibold">약 30~60초 소요됩니다</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {renderRankingList()}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-start gap-2 mb-3">
                        <div className="w-1.5 h-5 bg-emerald-500 rounded-sm shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-slate-800">투자처 분석 안내</p>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                        좌측에서 관심 지역을 검색/선택한 후 <strong>발굴 시작</strong>을 눌러보세요.<br />
                        22개 공공데이터를 수집하여 정밀 투자 보고서를 생성합니다.
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {['고시·인허가', '시장지표', '실거래가', '인구이동', '조례', '미분양·공급', '거시지표', '건축착공'].map(item => (
                          <div key={item} className="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-600 font-extrabold shadow-sm">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* 철도·정비 발굴 결과 */}
          {mainTab === 'infra' && (
            <>
              <div className={`hidden lg:block ${PAGE_SUBHEADER} lg:py-5`}>
                <h2 className={PAGE_SUBHEADER_TITLE}>철도·정비 발굴</h2>
                <p className={PANEL_SECTION_DESC}>
                  {INVEST_FILTERS.find(f => f.id === invFilter)?.label || '전체'}
                  {showRailStageUi && invRailStageFilter !== 'all' ? ` · ${invRailStageFilter}` : ''}
                  {showRedevStageUi && invStageFilter !== 'all' ? ` · ${invStageFilter}단계` : ''}
                  {invLoaded ? ` · ${invItems.length.toLocaleString()}건 표시 / 전체 ${invTotal.toLocaleString()}건` : ''}
                </p>
                {showRailStageUi && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {RAIL_STAGE_FILTERS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setInvRailStageFilter(f.id);
                          if (f.id !== 'all') setInvStageFilter('all');
                        }}
                        className={`text-[10px] px-3 py-1.5 rounded-lg font-extrabold border transition-all ${railTabClass(invRailStageFilter === f.id)}`}
                      >
                        {f.label}
                        {f.id !== 'all' && invStats?.railStageCounts?.[f.id] != null && (
                          <span className="ml-1 opacity-80">({invStats.railStageCounts[f.id]})</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {showRedevStageUi && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {REDEV_STAGE_FILTERS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setInvStageFilter(f.id)}
                        className={`text-[10px] px-3 py-1.5 rounded-lg font-extrabold border transition-all ${stageTabClass(invStageFilter === f.id)}`}
                      >
                        {f.label}
                        {f.id !== 'all' && invStats?.stageCounts?.[Number(f.id)] != null && (
                          <span className="ml-1 opacity-80">({invStats.stageCounts[Number(f.id)]})</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 pb-24">
                {showRailStageUi && (
                  <div className="lg:hidden flex flex-wrap gap-1.5 mb-4">
                    {RAIL_STAGE_FILTERS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setInvRailStageFilter(f.id);
                          if (f.id !== 'all') setInvStageFilter('all');
                        }}
                        className={`text-[10px] px-3 py-1.5 rounded-lg font-extrabold border transition-all ${railTabClass(invRailStageFilter === f.id)}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}
                {showRedevStageUi && (
                  <div className="lg:hidden flex flex-wrap gap-1.5 mb-4">
                    {REDEV_STAGE_FILTERS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setInvStageFilter(f.id)}
                        className={`text-[10px] px-3 py-1.5 rounded-lg font-extrabold border transition-all ${stageTabClass(invStageFilter === f.id)}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}
                {renderInvestmentCards()}
                {invLoaded && invItems.length < invTotal && (
                  <div className="mt-6 flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={loadMoreInvestment}
                      disabled={invLoading}
                      className="px-5 py-2.5 bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 font-extrabold text-xs rounded-xl transition-all disabled:opacity-50"
                    >
                      {invLoading ? '불러오는 중...' : `더 불러오기 (${invItems.length}/${invTotal})`}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {redevLocationModal && (
        <RedevLocationModal
          open
          onClose={() => setRedevLocationModal(null)}
          projectId={redevLocationModal.projectId}
          title={redevLocationModal.title}
          address={redevLocationModal.address}
          source={redevLocationModal.source}
        />
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
