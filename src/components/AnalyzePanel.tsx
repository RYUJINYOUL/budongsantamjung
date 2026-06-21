'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { GeolocationError, getCurrentPosition, reverseGeocodeKakao } from '../lib/geolocation';
import AnalysisDetailInputSection from './AnalysisDetailInputSection';
import {
  collectAnalysisInputData,
  defaultAnalysisDetailInput,
  type AnalysisDetailInput,
} from '../lib/collectAnalysisInputData';
import { parseParcelPolygonFromVworldResponse } from '../lib/parcelGeometry';
import {
  PANEL_CARD,
  PANEL_CARD_INNER,
  PANEL_SECTION_LABEL,
  PANEL_SECTION_DESC,
  PANEL_INPUT_WRAP,
  PANEL_INPUT,
  PANEL_SELECT,
  PAGE_SUBHEADER,
  PAGE_SUBHEADER_TITLE,
  panelCategoryBtn,
  panelStepBadge,
} from './analyzePanelFormStyles';

interface SearchResult {
  place_name?: string;
  address_name: string;
  road_address_name?: string;
  x: string;
  y: string;
}

interface AnalyzePanelProps {
  /** 지도 위치 선택 시 외부(홈) 지도에 마커 및 폴리곤 표시용 콜백 */
  onLocationSelect?: (lat: number, lng: number, address: string, polygon?: { lat: number; lng: number }[] | null) => void;
  /** 선택된 위치 초기화 시 지도 마커/폴리곤 제거용 콜백 */
  onLocationClear?: () => void;
  /** 추가된 필지 목록 상태 전달 콜백 (지도 틸색 폴리곤 렌더링용) */
  onAdditionalParcelsChange?: (
    parcels: { lat: number; lng: number; polygon?: { lat: number; lng: number }[] | null }[]
  ) => void;
  /** 지도를 터치해서 얻어온 위치 정보가 AnalyzePanel로 꽂히도록 하기 위한 prop (주필지 또는 다중필지 자동 분기) */
  externalClickParcel?: {
    lat: number;
    lng: number;
    address: string;
    pnu: string | null;
    polygon: { lat: number; lng: number }[] | null;
    timestamp: number;
  } | null;
  onMobileButtonClick?: () => void;
  /** 관리자 샘플 분석(/admin/analyze) — 리포트 생성 후 AI 자동 실행 플래그 */
  adminSampleMode?: boolean;
  /** URL 추출 등 외부에서 분석 폼 전체를 채울 때 사용 */
  urlPrefill?: {
    timestamp: number;
    category: string;
    address: string;
    lat: number;
    lng: number;
    pnu?: string | null;
    polygon?: { lat: number; lng: number }[] | null;
    detailInput?: Partial<AnalysisDetailInput>;
    specialNotes?: string;
  } | null;
}

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

const CATEGORIES = [
  { id: 'land', label: '토지', icon: '/land.svg' },
  { id: 'house', label: '주택', icon: '/jutack.svg' },
  { id: 'apartment', label: '아파트', icon: '/apart.svg' },
  { id: 'store', label: '상가', icon: '/cshop.svg' },
  { id: 'building', label: '빌딩', icon: '/build.svg' },
];

interface AdditionalParcel { 
  address: string; 
  lat: number; 
  lng: number; 
  pnu: string | null; 
  isLoadingPnu: boolean; 
  polygon?: { lat: number; lng: number }[] | null; 
}
interface Industry { code: string; name: string; middle?: { code: string; name: string; small?: { code: string; name: string }[] }[] }

const ADDRESS_SEARCH_DEBOUNCE_MS = 300;

function SearchInputLocationTrailing({
  busy,
  onMyLocation,
}: {
  busy: boolean;
  onMyLocation: () => void;
}) {
  return (
    <div className="relative shrink-0 w-7 h-7">
      {busy && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <button
        type="button"
        onClick={onMyLocation}
        disabled={busy}
        aria-label="내 위치"
        title="내 위치"
        className={`w-7 h-7 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors ${
          busy ? 'opacity-0 pointer-events-none' : ''
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 2v2m0 16v2M2 12h2m16 0h2" />
          <circle cx="12" cy="12" r="4" strokeWidth={2.5} />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      </button>
    </div>
  );
}

function SearchInputSpinnerSlot({ busy }: { busy: boolean }) {
  return (
    <div className="relative shrink-0 w-7 h-7">
      {busy && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

export default function AnalyzePanel({ onLocationSelect, onLocationClear, onAdditionalParcelsChange, externalClickParcel, onMobileButtonClick, urlPrefill, adminSampleMode }: AnalyzePanelProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [canAnalyze, setCanAnalyze] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [primaryPnu, setPrimaryPnu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // 다중 필지
  const [isMultiParcel, setIsMultiParcel] = useState(false);
  const [additionalParcels, setAdditionalParcels] = useState<AdditionalParcel[]>([]);
  const [parcelSearchQuery, setParcelSearchQuery] = useState('');
  const [parcelSearchResults, setParcelSearchResults] = useState<SearchResult[]>([]);
  const [isParcelSearching, setIsParcelSearching] = useState(false);

  // 업종
  const [allIndustries, setAllIndustries] = useState<Industry[]>([]);
  const [selectedLarge, setSelectedLarge] = useState<string | null>(null);
  const [selectedMedium, setSelectedMedium] = useState<string | null>(null);
  const [selectedSmall, setSelectedSmall] = useState<string | null>(null);
  const [industrySearch, setIndustrySearch] = useState('');
  const [industryResults, setIndustryResults] = useState<{large:string;medium:string;small:string;display:string}[]>([]);
  const [desiredBusiness, setDesiredBusiness] = useState('');

  const [detailInput, setDetailInput] = useState<AnalysisDetailInput>(defaultAnalysisDetailInput);
  const patchDetailInput = (patch: Partial<AnalysisDetailInput>) =>
    setDetailInput((prev) => ({ ...prev, ...patch }));

  /** URL 추출(땅야 Q&A 등) → AI 정밀 분석 특이사항 prefill */
  const [pendingSpecialNotes, setPendingSpecialNotes] = useState('');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [noTradeDataModal, setNoTradeDataModal] = useState<{ aptName: string | null; reason: string } | null>(null);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const addressSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const parcelSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addressSearchSeqRef = useRef(0);
  const parcelSearchSeqRef = useRef(0);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    return () => {
      if (addressSearchTimerRef.current) clearTimeout(addressSearchTimerRef.current);
      if (parcelSearchTimerRef.current) clearTimeout(parcelSearchTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) checkUsage(u.uid);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetch('/industry_master.json').then(r => r.json()).then(setAllIndustries).catch(() => {});
  }, []);

  // 외부(지도 터치 등)에서 위치 정보가 전달되었을 때 상태를 일치시킴 또는 추가 필지에 적층시킴
  useEffect(() => {
    if (!externalClickParcel) return;
    const { lat: latVal, lng: lngVal, address: addr, pnu, polygon } = externalClickParcel;

    // 만약 다중 필지 일괄매매가 활성화되어 있고 토지/빌딩 카테고리라면, 추가 필지로 처리!
    if (isMultiParcel && (selectedCategory === 'land' || selectedCategory === 'building')) {
      if (address === addr || (primaryPnu && primaryPnu === pnu)) return; // 주필지와 중복 방지
      if (additionalParcels.some(p => p.address === addr || (p.pnu && p.pnu === pnu))) return; // 이미 추가된 필지 중복 방지
      if (additionalParcels.length >= 4) return; // 최대 4개 제한

      const entry: AdditionalParcel = {
        address: addr,
        lat: latVal,
        lng: lngVal,
        pnu,
        isLoadingPnu: false,
        polygon
      };

      setAdditionalParcels(prev => {
        const next = [...prev, entry];
        onAdditionalParcelsChange?.(next.map(p => ({ lat: p.lat, lng: p.lng, polygon: p.polygon })));
        return next;
      });
    } else {
      // 그 외의 경우(일반 모드)에는 대표 주필지로 변경
      setAddress(addr);
      setLat(latVal);
      setLng(lngVal);
      setPrimaryPnu(pnu);
      onLocationSelect?.(latVal, lngVal, addr, polygon);
    }
  }, [externalClickParcel]);

  useEffect(() => {
    if (!urlPrefill) return;
    setSelectedCategory(urlPrefill.category);
    setAddress(urlPrefill.address);
    setLat(urlPrefill.lat);
    setLng(urlPrefill.lng);
    setPrimaryPnu(urlPrefill.pnu ?? null);
    setSearchQuery('');
    setSearchResults([]);
    if (urlPrefill.detailInput) {
      setDetailInput((prev) => ({
        ...prev,
        ...defaultAnalysisDetailInput(),
        ...urlPrefill.detailInput,
      }));
    }
    setPendingSpecialNotes(urlPrefill.specialNotes?.trim() || '');
    onLocationSelect?.(
      urlPrefill.lat,
      urlPrefill.lng,
      urlPrefill.address,
      urlPrefill.polygon ?? null,
    );
  }, [urlPrefill?.timestamp]);

  const getPnuAndPolygonFromCoords = async (latV: number, lngV: number): Promise<{ pnu: string | null; polygon: { lat: number; lng: number }[] | null }> => {
    try {
      const res = await fetch(`/api/vworld?lat=${latV}&lng=${lngV}`);
      if (!res.ok) return { pnu: null, polygon: null };
      const data = await res.json();
      const pnu = data?.response?.result?.featureCollection?.features?.[0]?.properties?.pnu?.toString() || null;
      const polygon = parseParcelPolygonFromVworldResponse(data);
      return { pnu, polygon };
    } catch { 
      return { pnu: null, polygon: null }; 
    }
  };

  const getPnuFromCoords = async (latV: number, lngV: number): Promise<string | null> => {
    const { pnu } = await getPnuAndPolygonFromCoords(latV, lngV);
    return pnu;
  };

  const executeParcelSearch = useCallback((q: string) => {
    if (typeof window === 'undefined' || !window.kakao?.maps?.services) {
      setIsParcelSearching(false);
      return;
    }

    const seq = ++parcelSearchSeqRef.current;
    setIsParcelSearching(true);
    const geocoder = new (window as any).kakao.maps.services.Geocoder();
    geocoder.addressSearch(q, (result: any, status: any) => {
      if (seq !== parcelSearchSeqRef.current) return;
      setIsParcelSearching(false);
      if (status === (window as any).kakao.maps.services.Status.OK && result.length > 0) {
        setParcelSearchResults(result.slice(0, 5).map((p: any) => ({
          address_name: p.address_name,
          road_address_name: p.road_address?.address_name || '',
          x: p.x,
          y: p.y,
        })));
      } else setParcelSearchResults([]);
    });
  }, []);

  const handleParcelSearch = (q: string) => {
    setParcelSearchQuery(q);
    if (parcelSearchTimerRef.current) clearTimeout(parcelSearchTimerRef.current);

    if (!q || q.length < 2) {
      parcelSearchSeqRef.current += 1;
      setParcelSearchResults([]);
      setIsParcelSearching(false);
      return;
    }

    parcelSearchTimerRef.current = setTimeout(() => {
      executeParcelSearch(q);
    }, ADDRESS_SEARCH_DEBOUNCE_MS);
  };

  const selectParcelResult = async (r: SearchResult) => {
    const addr = r.road_address_name || r.address_name;
    const latV = parseFloat(r.y); const lngV = parseFloat(r.x);
    setParcelSearchQuery(''); setParcelSearchResults([]);
    if (additionalParcels.some(p => p.address === addr)) return;
    const entry: AdditionalParcel = { address: addr, lat: latV, lng: lngV, pnu: null, isLoadingPnu: true, polygon: null };
    
    setAdditionalParcels(prev => {
      const next = [...prev, entry];
      onAdditionalParcelsChange?.(next.map(p => ({ lat: p.lat, lng: p.lng, polygon: p.polygon })));
      return next;
    });

    const { pnu, polygon } = await getPnuAndPolygonFromCoords(latV, lngV);
    setAdditionalParcels(prev => {
      const next = prev.map(p => p.address === addr ? { ...p, pnu, polygon, isLoadingPnu: false } : p);
      onAdditionalParcelsChange?.(next.map(p => ({ lat: p.lat, lng: p.lng, polygon: p.polygon })));
      return next;
    });
  };

  const searchIndustry = (q: string) => {
    setIndustrySearch(q);
    if (!q || q.length < 1) { setIndustryResults([]); return; }
    const results: {large:string;medium:string;small:string;display:string}[] = [];
    for (const large of allIndustries) {
      for (const mid of (large.middle || [])) {
        for (const sm of (mid.small || [])) {
          if (sm.name.includes(q) || mid.name.includes(q)) {
            results.push({ large: large.name, medium: mid.name, small: sm.name, display: `${large.name} > ${mid.name} > ${sm.name}` });
          }
        }
        if (mid.name.includes(q) && !(mid.small || []).some(s => s.name.includes(q))) {
          results.push({ large: large.name, medium: mid.name, small: '', display: `${large.name} > ${mid.name}` });
        }
      }
      if (results.length >= 8) break;
    }
    setIndustryResults(results.slice(0, 8));
  };

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


  const executeAddressSearch = useCallback((query: string) => {
    if (typeof window === 'undefined' || !window.kakao?.maps?.services) {
      setIsSearching(false);
      return;
    }

    const seq = ++addressSearchSeqRef.current;
    setIsSearching(true);
    const { kakao } = window;
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.addressSearch(query, (result: any, status: any) => {
      if (seq !== addressSearchSeqRef.current) return;

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
          if (seq !== addressSearchSeqRef.current) return;
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
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (addressSearchTimerRef.current) clearTimeout(addressSearchTimerRef.current);

    if (!query || query.length < 2) {
      addressSearchSeqRef.current += 1;
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    addressSearchTimerRef.current = setTimeout(() => {
      executeAddressSearch(query);
    }, ADDRESS_SEARCH_DEBOUNCE_MS);
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
    setLocationError(null);
    const { pnu, polygon } = await getPnuAndPolygonFromCoords(latVal, lngVal);
    setPrimaryPnu(pnu);
    onLocationSelect?.(latVal, lngVal, addr, polygon);
  };

  const handleMyLocation = async () => {
    if (isLocating || isSearching) return;
    setIsLocating(true);
    setLocationError(null);
    try {
      const { lat: latVal, lng: lngVal } = await getCurrentPosition();
      const addr = await reverseGeocodeKakao(latVal, lngVal);
      await selectResult({
        place_name: addr,
        address_name: addr,
        road_address_name: addr,
        x: String(lngVal),
        y: String(latVal),
      });
      setSearchQuery(addr);
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

  const clearSelectedLocation = () => {
    setAddress('');
    setLat(null);
    setLng(null);
    setPrimaryPnu(null);
    setSearchQuery('');
    setSearchResults([]);
    setIsMultiParcel(false);
    setAdditionalParcels([]);
    onAdditionalParcelsChange?.([]);
    onLocationClear?.();
  };

  const handleAnalyze = async () => {
    if (!selectedCategory || !address || !lat || !lng || !user) return;

    let resolvedPnu = primaryPnu;

    // 아파트인 경우 결제 전 실거래 가용성 사전 체크
    if (selectedCategory === 'apartment') {
      // PNU가 없으면 lat/lng로 재시도 (VWorld 지연 대응)
      if (!resolvedPnu && lat && lng) {
        setIsCheckingAvailability(true);
        try {
          const fetched = await getPnuFromCoords(lat, lng);
          if (fetched) {
            resolvedPnu = fetched;
            setPrimaryPnu(fetched);
          }
        } catch { /* 무시 */ }
      }

      if (!resolvedPnu) {
        // 재시도 후에도 PNU 없음 — 진짜 실패
        setNoTradeDataModal({
          aptName: null,
          reason: '필지 정보를 불러올 수 없습니다. 주소를 다시 선택해주세요.',
        });
        setIsCheckingAvailability(false);
        return;
      }

      setIsCheckingAvailability(true);
      try {
        const dealYmd = new Date().toISOString().slice(0, 7).replace('-', ''); // YYYYMM
        const params = new URLSearchParams({
          pnu: resolvedPnu,
          dealYmd,
          address,
        });
        const checkRes = await fetch(`${BACKEND_URL}/api/land/detective/check-availability?${params}`);
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (!checkData.available) {
            setNoTradeDataModal({
              aptName: checkData.aptName,
              reason: checkData.reason || '최근 6개월간 해당 단지의 실거래가 데이터가 없습니다.',
            });
            setIsCheckingAvailability(false);
            return; // 결제 및 분석 중단
          }
        }
      } catch {
        // 체크 실패 시 분석 그냥 진행 (보수적 처리)
      }
      setIsCheckingAvailability(false);
    }

    setIsAnalyzing(true);
    setAnalysisStep(0);
    setElapsedSeconds(0);
    setAnalysisError(null);

    try {
      const idToken = await user.getIdToken();
      const allParcels = [{ address, lat, lng, pnu: resolvedPnu }];
      if (isMultiParcel && (selectedCategory === 'land' || selectedCategory === 'building')) {
        additionalParcels.forEach(p => { if (p.pnu) allParcels.push(p); });
      }
      const pnuList = allParcels.map(p => p.pnu).filter(Boolean);
      const storeData = collectAnalysisInputData(selectedCategory, {
        ...detailInput,
        desiredBusiness: desiredBusiness || detailInput.desiredBusiness,
      });
      const specialNotes = pendingSpecialNotes.trim();
      if (specialNotes) {
        storeData.specialNotes = specialNotes;
      }

      const payload: Record<string, unknown> = {
        category: selectedCategory,
        address,
        lat: lat.toString(),
        lng: lng.toString(),
        storeData,
      };
      if (specialNotes) {
        payload.specialNotes = specialNotes;
      }
      if (pnuList.length > 0) {
        payload.primaryPnu = resolvedPnu;
        payload.pnuList = pnuList;
      }
      Object.entries(storeData).forEach(([key, value]) => {
        if (value != null) payload[key] = value;
      });

      const res = await fetch('/api/land/detective/analyze-with-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || '오류 발생'); }
      const result = await res.json();
      if (result.success && result.reportId) {
        const qs = adminSampleMode ? '?adminSample=1' : '';
        router.push(`/analyze/${result.reportId}${qs}`);
      } else throw new Error('결과 수신 실패');
    } catch (err: any) {
      setAnalysisError(err.message);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="relative flex flex-col h-full min-h-0 bg-slate-50/30">
      {/* 헤더 */}
      <div className={PAGE_SUBHEADER}>
        <h2 className={PAGE_SUBHEADER_TITLE}>공공데이터 수집</h2>
        <p className={PANEL_SECTION_DESC}>카테고리와 위치를 선택한 뒤 리포트를 생성하세요</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 lg:px-5 py-4 space-y-3">
        {/* ① 카테고리 */}
        <section className={PANEL_CARD}>
          <div className="flex items-center gap-2 mb-3">
            <span className={panelStepBadge(1)}>1</span>
            <div>
              <p className={PANEL_SECTION_LABEL}>카테고리</p>
              <p className={PANEL_SECTION_DESC}>분석할 매물 유형</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIES.slice(0, 3).map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setIsMultiParcel(false);
                    setAdditionalParcels([]);
                    setDetailInput(defaultAnalysisDetailInput());
                  }}
                  className={panelCategoryBtn(selectedCategory === cat.id)}
                >
                  <img src={cat.icon} alt="" className="w-6 h-6 object-contain" />
                  <span className={`text-[10px] font-bold leading-none ${selectedCategory === cat.id ? 'text-emerald-700' : 'text-slate-500'}`}>
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
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setIsMultiParcel(false);
                    setAdditionalParcels([]);
                    setDetailInput(defaultAnalysisDetailInput());
                  }}
                  className={panelCategoryBtn(selectedCategory === cat.id)}
                >
                  <img src={cat.icon} alt="" className="w-6 h-6 object-contain" />
                  <span className={`text-[10px] font-bold leading-none ${selectedCategory === cat.id ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ② 위치 */}
        <section className={PANEL_CARD}>
          <div className="flex items-center gap-2 mb-3">
            <span className={panelStepBadge(2)}>2</span>
            <div>
              <p className={PANEL_SECTION_LABEL}>매물 위치</p>
              <p className={PANEL_SECTION_DESC}>주소 검색 또는 지도에서 선택</p>
            </div>
          </div>

          <div className="relative">
            <div className={PANEL_INPUT_WRAP}>
              <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="지번 또는 도로명 주소 검색"
                className={PANEL_INPUT}
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
              />
              <SearchInputLocationTrailing
                busy={isSearching || isLocating}
                onMyLocation={handleMyLocation}
              />
            </div>

            {locationError && (
              <p className="mt-1.5 text-[10px] font-semibold text-rose-600">{locationError}</p>
            )}

            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                {searchResults.map((r, i) => (
                  <button key={i} onClick={() => selectResult(r)} className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-50/60 border-b border-slate-50 last:border-0 transition-colors">
                    <div className="text-xs font-semibold text-slate-800">{r.place_name || r.address_name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{r.road_address_name || r.address_name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {address && (
            <div className={`${PANEL_CARD_INNER} mt-2.5 flex items-start gap-2`}>
              <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 leading-snug">{address}</p>
                {primaryPnu && (
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">{primaryPnu}</p>
                )}
              </div>
              <button
                type="button"
                onClick={clearSelectedLocation}
                className="shrink-0 w-5 h-5 flex items-center justify-center rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors text-xs"
                aria-label="위치 삭제"
              >
                ✕
              </button>
            </div>
          )}
        </section>

        {/* 다중 필지 */}
        {(selectedCategory === 'land' || selectedCategory === 'building') && address && (
          <section className={PANEL_CARD}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={PANEL_SECTION_LABEL}>다중 필지 일괄매매</p>
                <p className={PANEL_SECTION_DESC}>최대 4필지 추가 · 선택사항</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" className="sr-only peer" checked={isMultiParcel} onChange={e => {
                  setIsMultiParcel(e.target.checked);
                  if (!e.target.checked) {
                    setAdditionalParcels([]);
                    onAdditionalParcelsChange?.([]);
                  }
                }} />
                <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>
            {isMultiParcel && (
              <div className="mt-3 space-y-1.5">
                <div className={`${PANEL_CARD_INNER} flex items-center gap-2 py-2`}>
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">주</span>
                  <span className="text-[11px] font-semibold text-slate-700 truncate flex-1">{address}</span>
                </div>
                {additionalParcels.map((p, i) => (
                  <div key={i} className={`${PANEL_CARD_INNER} flex items-center gap-2 py-2`}>
                    <span className="text-[9px] font-bold text-slate-400 shrink-0">#{i + 1}</span>
                    <span className="text-[11px] font-semibold text-slate-700 truncate flex-1">{p.address}</span>
                    {p.isLoadingPnu ? (
                      <div className="w-3 h-3 border border-slate-300 border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : p.pnu ? (
                      <span className="text-[9px] text-emerald-600 font-bold shrink-0">✓</span>
                    ) : (
                      <span className="text-[9px] text-rose-400 shrink-0">—</span>
                    )}
                    <button type="button" onClick={() => setAdditionalParcels(prev => {
                      const next = prev.filter((_, j) => j !== i);
                      onAdditionalParcelsChange?.(next.map(item => ({ lat: item.lat, lng: item.lng, polygon: item.polygon })));
                      return next;
                    })} className="text-slate-300 hover:text-rose-500 text-xs shrink-0">✕</button>
                  </div>
                ))}
                {additionalParcels.length < 4 && (
                  <div className="relative">
                    <div className={PANEL_INPUT_WRAP}>
                      <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input type="text" placeholder="추가 필지 검색" className={PANEL_INPUT} value={parcelSearchQuery} onChange={e => handleParcelSearch(e.target.value)} />
                      <SearchInputSpinnerSlot busy={isParcelSearching} />
                    </div>
                    {parcelSearchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                        {parcelSearchResults.map((r, i) => (
                          <button key={i} onClick={() => selectParcelResult(r)} className="w-full px-3 py-2 text-left hover:bg-emerald-50/60 border-b border-slate-50 last:border-0">
                            <p className="text-[11px] font-semibold text-slate-800">{r.road_address_name || r.address_name}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* 상가 희망 업종 */}
        {selectedCategory === 'store' && address && (
          <section className={PANEL_CARD}>
            <div className="mb-3">
              <p className={PANEL_SECTION_LABEL}>희망 업종</p>
              <p className={PANEL_SECTION_DESC}>선택사항 · AI 상권 분석에 반영</p>
            </div>
            <div className="relative">
              <div className={PANEL_INPUT_WRAP}>
                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" placeholder="업종 검색 (예: 카페)" className={PANEL_INPUT} value={industrySearch} onChange={e => searchIndustry(e.target.value)} />
                {industrySearch && (
                  <button type="button" onClick={() => { setIndustrySearch(''); setIndustryResults([]); }} className="text-slate-300 hover:text-slate-500 text-xs shrink-0">✕</button>
                )}
              </div>
              {industryResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  {industryResults.map((r, i) => (
                    <button key={i} onClick={() => { setSelectedLarge(r.large); setSelectedMedium(r.medium); setSelectedSmall(r.small || null); setDesiredBusiness(r.small || r.medium); setIndustrySearch(r.small || r.medium); setIndustryResults([]); }} className="w-full px-3 py-2 text-left hover:bg-emerald-50/60 border-b border-slate-50 last:border-0">
                      <p className="text-[11px] font-semibold text-slate-800">{r.small || r.medium}</p>
                      <p className="text-[10px] text-slate-400">{r.display}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-2.5 space-y-1.5">
              {allIndustries.length === 0 ? (
                <p className="text-[10px] text-slate-400 text-center py-2">로딩 중...</p>
              ) : (
                <>
                  <select value={selectedLarge || ''} onChange={e => { setSelectedLarge(e.target.value || null); setSelectedMedium(null); setSelectedSmall(null); setDesiredBusiness(e.target.value); }} className={PANEL_SELECT}>
                    <option value="">대분류</option>
                    {allIndustries.map(l => <option key={l.code} value={l.name}>{l.name}</option>)}
                  </select>
                  {selectedLarge && (() => { const midList = (allIndustries.find(l => l.name === selectedLarge)?.middle || []); return midList.length > 0 ? (
                    <select value={selectedMedium || ''} onChange={e => { setSelectedMedium(e.target.value || null); setSelectedSmall(null); setDesiredBusiness(e.target.value); }} className={PANEL_SELECT}>
                      <option value="">중분류</option>
                      {midList.map(m => <option key={m.code} value={m.name}>{m.name}</option>)}
                    </select>
                  ) : null; })()}
                  {selectedMedium && (() => { const smallList = (allIndustries.find(l => l.name === selectedLarge)?.middle?.find(m => m.name === selectedMedium)?.small || []); return smallList.length > 0 ? (
                    <select value={selectedSmall || ''} onChange={e => { setSelectedSmall(e.target.value || null); setDesiredBusiness(e.target.value || selectedMedium || ''); }} className={PANEL_SELECT}>
                      <option value="">소분류</option>
                      {smallList.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
                    </select>
                  ) : null; })()}
                  {desiredBusiness && (
                    <p className="text-[10px] text-emerald-600 font-bold px-1">✓ {desiredBusiness}</p>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {/* ③ 상세 정보 */}
        {selectedCategory && address && (
          <section className={PANEL_CARD}>
            <div className="flex items-center gap-2 mb-4">
              <span className={panelStepBadge(3)}>3</span>
              <div>
                <p className={PANEL_SECTION_LABEL}>매물 정보</p>
                <p className={PANEL_SECTION_DESC}>거래 조건 · 선택사항</p>
              </div>
            </div>
            <AnalysisDetailInputSection
              category={selectedCategory}
              input={detailInput}
              onChange={patchDetailInput}
            />
          </section>
        )}

        {analysisError && (
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex gap-2 items-start">
            <p className="text-[11px] font-semibold text-rose-700 flex-1">{analysisError}</p>
            <button type="button" onClick={() => setAnalysisError(null)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
          </div>
        )}
      </div>

      {/* 하단 CTA — 고정 */}
      <div className="shrink-0 px-4 lg:px-5 py-3.5 border-t border-slate-100 bg-white">
        {isMobile ? (
          <button
            type="button"
            onClick={onMobileButtonClick}
            className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-all shadow-sm active:scale-95 animate-pulse"
          >
            매물 분석은 앱 - PC에서만 지원 →
          </button>
        ) : !user ? (
          <a href="/login" className="block w-full py-3 bg-slate-900 text-white font-bold rounded-xl text-center text-xs hover:bg-slate-800 transition-all">
            로그인 후 진행
          </a>
        ) : !canAnalyze ? (
          <div className="w-full py-3 bg-rose-50 text-rose-600 font-semibold rounded-xl text-center text-xs border border-rose-100">
            일일 수집 한도 초과
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isAnalyzing || isCheckingAvailability || !selectedCategory || !address}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-35 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-all shadow-sm shadow-emerald-500/15 flex items-center justify-center gap-2"
          >
            {isCheckingAvailability ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                실거래 확인 중...
              </>
            ) : isAnalyzing ? (
              '데이터 수집 중...'
            ) : (
              '공공데이터 수집 리포트 생성'
            )}
          </button>
        )}
        <p className="text-[9px] text-slate-400 text-center mt-2 font-medium">국가 공공 데이터 기반 리포트</p>
      </div>

      {/* 아파트 실거래 없음 모달 */}
      {noTradeDataModal && (
        <div
          className="absolute inset-0 z-40 flex items-end justify-center bg-slate-950/50 backdrop-blur-sm"
          onClick={() => setNoTradeDataModal(null)}
        >
          <div
            className="w-full bg-white rounded-t-3xl p-5 pb-8 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* 핸들 */}
            <div className="w-8 h-1 bg-slate-200 rounded-full mx-auto mb-5" />

            {/* 아이콘 + 타이틀 */}
            <div className="flex flex-col items-center text-center gap-2 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-1">
                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <p className="text-sm font-extrabold text-slate-900">실거래 데이터 없음</p>
              {noTradeDataModal.aptName && (
                <p className="text-xs font-bold text-emerald-600">{noTradeDataModal.aptName}</p>
              )}
            </div>

            <p className="text-xs text-slate-500 text-center leading-relaxed font-medium mb-5">
              {noTradeDataModal.reason}
              <br />
              <span className="text-slate-400">거래가 드문 단지는 정확한 시세 분석이 어렵습니다.</span>
            </p>

            {/* 안내 박스 */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-5 space-y-2">
              <p className="text-[10px] font-bold text-slate-600">💡 이런 경우라면</p>
              <ul className="space-y-1.5">
                {[
                  '초고가 빌라트·단독주택 등 거래 빈도가 극히 낮은 단지',
                  '신축 또는 준공 직후라 거래 이력이 없는 경우',
                  '실제 거래가 없는 미분양 단지',
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-500 text-[10px] mt-0.5 shrink-0">•</span>
                    <span className="text-[10px] text-slate-500 font-medium">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setNoTradeDataModal(null)}
              className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-2xl text-xs hover:bg-slate-800 transition-all"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 분석 중 오버레이 */}
      {isAnalyzing && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/60 backdrop-blur-md px-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 max-w-sm w-full shadow-2xl flex flex-col items-center relative overflow-hidden">
            <div className="flex items-center gap-2 mb-5 z-10">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest">Public Data Collector Active</span>
            </div>
            <div className="relative w-16 h-16 mb-5 z-10 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" />
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              <img
                src={STEP_ICONS[analysisStep] || '/3d/suzip.svg'}
                alt=""
                className="w-8 h-8 object-contain animate-bounce"
              />
            </div>
            <h3 className="text-sm font-extrabold text-white mb-1.5 z-10 tracking-tight">{ANALYSIS_STEPS[analysisStep]?.label}</h3>
            <p className="text-xs text-slate-400 mb-5 text-center z-10 px-4 leading-relaxed font-semibold">{ANALYSIS_STEPS[analysisStep]?.desc}</p>
            <div className="w-full z-10">
              <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${((analysisStep + 1) / ANALYSIS_STEPS.length) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-500 mt-3 tabular-nums uppercase tracking-wider">
                <span>Phase {analysisStep + 1} / {ANALYSIS_STEPS.length}</span>
                <span>{elapsedSeconds}s</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
