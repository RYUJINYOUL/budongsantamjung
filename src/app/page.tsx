'use client';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import KakaoMap from '../components/KakaoMap';
import ComparableMap from '../components/ComparableMap';
import SideNav from '../components/SideNav';
import AnalyzePanel from '../components/AnalyzePanel';
import RankingPanel from '../components/RankingPanel';
import ComparePanel from '../components/ComparePanel';
import PropertyCard from '../components/PropertyCard';
import ApartmentCompareBasketBars, { ApartmentCompareBasketBar, useCompareBasketKeys } from '../components/ApartmentCompareBasket';
import ApartmentDiscoverToolbar from '../components/ApartmentDiscoverToolbar';
import ApartmentDiscoverFilterSheet from '../components/ApartmentDiscoverFilterSheet';
import {
  loadApartmentDiscoverFilters,
  saveApartmentDiscoverFilters,
  defaultApartmentDiscoverFilters,
  passesApartmentDiscoverFilters,
  buildApartmentCardDisplay,
  resolveAreaForCard,
  sortApartmentDiscoverList,
  apartmentDiscoverFilterHints,
  hasStrictDataFilters,
  type ApartmentDiscoverFilters,
  type ApartmentCardSnapshot,
} from '../lib/apartmentDiscoverFilters';
import { fetchApartmentCardSnapshot } from '../lib/fetchApartmentDiscoverCards';
import { fetchApartmentDiscover } from '../lib/fetchApartmentDiscover';
import { USE_SERVER_APARTMENT_DISCOVER, useServerApartmentDiscoverForCategory } from '../lib/apartmentDiscoverFlags';
import { mapDiscoverItemsToFeed } from '../lib/apartmentDiscoverFeedMap';
import { fetchApartmentAreas } from '../lib/apartmentCompareAreas';
import {
  isPyeongFilterActive,
  pickRepresentativeAreaM2,
} from '../lib/aptDiscoverArea';
import { searchKakaoPlaceSuggestions } from '../lib/kakaoResolvePlaceQuery';
import { makeAnalyzeSlug } from '../lib/slug';
import ApartmentAreaPickModal, { type ApartmentComparePickPayload } from '../components/ApartmentAreaPickModal';
import { compareItemKey } from '../lib/apartmentCompareBasket';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  DEFAULT_MAP_POSITION,
  TIMELINE_LIMIT,
  zoomLevelToRadiusKm,
  type MapPosition,
} from '../lib/timelineGeo';
import { parseParcelPolygonFromVworldResponse } from '../lib/parcelGeometry';
import { reverseGeocodeKakao } from '../lib/geolocation';
import {
  PANEL_INPUT,
  PANEL_INPUT_WRAP,
  PAGE_HEADER_TITLE,
  PAGE_STICKY_HEADER,
} from '../components/analyzePanelFormStyles';
import R114LiteFloatingPanel from '../components/R114LiteFloatingPanel';
import { fetchR114LiteComplex } from '../lib/r114LiteApi';
import { buildLiteCardDisplay } from '../lib/r114LiteCardDisplay';
import {
  fetchR114LiteDiscover,
  mapR114LiteDiscoverToFeedItem,
  mergeDiscoverWithR114Lite,
} from '../lib/fetchR114LiteDiscover';

interface Analysis {
  id: string;
  category: string;
  propertyTitle?: string;
  location?: { name: string; address: string };
  detectiveNote?: string;
  propertyGrade?: { overall: string; reason: string; riskScore: string };
  hasReport?: boolean;
  latestReportId?: string | null;
  warningFlags?: { falseListing: boolean; unrealisticYield: boolean; hiddenFlaws: boolean };
  createdAt: string;
  lat?: number;
  lng?: number;
  likes?: string[];
  aptSeq?: string | null;
  rtmsAptSeq?: string | null;
  masterId?: string | null;
  pnu?: string | null;
  bldNm?: string | null;
  riseRate6m?: number | null;
  avgPrice1m?: number | null;
  minArea?: number | null;
  maxArea?: number | null;
  exclusiveArea?: number | null;
  area?: number | null;
  /** Lite 단지 (discover merge · r114 SSOT) */
  r114PropId?: string | null;
  liteBadge?: boolean;
  householdCount?: number | null;
  tradeSparse?: boolean;
  saleCount6m?: number;
  jeonseRiseRate6m?: number | null;
  avgJeonseDeposit1m?: number | null;
  wolseRiseRate6m?: number | null;
  avgWolseMonthlyRent1m?: number | null;
}

function analysisCardCacheKey(
  aptSeq: string,
  centerM2: number | null,
): string {
  return `${aptSeq}:${centerM2 != null && centerM2 > 0 ? centerM2 : 'default'}`;
}

function isApartmentAnalysis(a: Pick<Analysis, 'category'>) {
  const c = (a.category || '').toLowerCase();
  return c.includes('apartment') || c.includes('아파트');
}

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activePanel = searchParams.get('panel'); // 'analyze' | null
  const litePanelPropId = searchParams.get('lite');
  const litePanelReportId = searchParams.get('liteReport');

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
  /** URL lat/lng → mapCenter 1회만 (lite 닫을 때 stale 서울 좌표 재적용 방지) */
  const appliedUrlGeoRef = useRef<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  // 분석 패널에서 선택한 위치 → 지도 이동 + 마커 표시
  const [analyzeLocation, setAnalyzeLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);

  // 랭킹 패널 결과 → 지도 마커 표시
  const [rankingProperties, setRankingProperties] = useState<any[]>([]);
  const [rankingGosiPoints, setRankingGosiPoints] = useState<any[]>([]);
  const [selectedRankingApt, setSelectedRankingApt] = useState<any | null>(null);
  const [selectedGosiPoint, setSelectedGosiPoint] = useState<any | null>(null);

  // 상급지 비교 결과 → 지도 영역에 표시
  const [showCompareResult, setShowCompareResult] = useState(false);
  const compareBasketKeys = useCompareBasketKeys();
  const [discoverFilters, setDiscoverFilters] = useState<ApartmentDiscoverFilters>(defaultApartmentDiscoverFilters);
  const [discoverSheetOpen, setDiscoverSheetOpen] = useState(false);
  const [discoverSheetSection, setDiscoverSheetSection] = useState<string | null>(null);
  const [aptCardCache, setAptCardCache] = useState<Record<string, ApartmentCardSnapshot>>({});
  /** discover 아파트 — 좌표→주소 역지오코딩 캐시 */
  const [aptAddressById, setAptAddressById] = useState<Record<string, string>>({});
  const aptAddressFetchedRef = useRef<Set<string>>(new Set());
  /** aptSeq → 대표 전용㎡; null=평형 구간 밖(제외) */
  const [aptAreaCenterM2, setAptAreaCenterM2] = useState<Record<string, number | null>>({});
  const selectedCategoryRef = useRef(selectedCategory);
  const discoverFiltersRef = useRef(discoverFilters);
  const prevSelectedCategoryRef = useRef(selectedCategory);
  useEffect(() => {
    selectedCategoryRef.current = selectedCategory;
  }, [selectedCategory]);
  useEffect(() => {
    discoverFiltersRef.current = discoverFilters;
  }, [discoverFilters]);

  const useApartmentDiscoverFeed =
    useServerApartmentDiscoverForCategory(selectedCategory);
  const apartmentTabDiscover =
    USE_SERVER_APARTMENT_DISCOVER && selectedCategory === '아파트';

  const analyzeDeepLinkKey = [
    searchParams.get('masterId'),
    searchParams.get('rtmsAptSeq'),
    searchParams.get('r114PropId'),
    searchParams.get('lat'),
    searchParams.get('lng'),
    searchParams.get('address'),
    searchParams.get('category'),
    searchParams.get('placeName'),
  ].join('|');

  const analyzeDeepLinkBase = useMemo(() => {
    if (activePanel !== 'analyze') return null;
    const masterId = searchParams.get('masterId');
    const rtmsAptSeq = searchParams.get('rtmsAptSeq');
    if (!masterId && !rtmsAptSeq) return null;
    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');
    const address = searchParams.get('address');
    if (!latStr || !lngStr || !address) return null;
    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      category: searchParams.get('category') || 'apartment',
      address,
      lat,
      lng,
      masterId: masterId || undefined,
      rtmsAptSeq: rtmsAptSeq || undefined,
      placeName: searchParams.get('placeName') || undefined,
    };
  }, [activePanel, analyzeDeepLinkKey, searchParams]);

  const [analyzePrefillStamp, setAnalyzePrefillStamp] = useState(0);
  const [r114AnalyzePrefill, setR114AnalyzePrefill] = useState<{
    timestamp: number;
    category: string;
    address: string;
    lat: number;
    lng: number;
    r114PropId: string;
    placeName?: string;
    rtmsAptSeq?: string;
  } | null>(null);

  useEffect(() => {
    if (!analyzeDeepLinkBase) return;
    setAnalyzePrefillStamp(Date.now());
    setAnalyzeLocation({
      lat: analyzeDeepLinkBase.lat,
      lng: analyzeDeepLinkBase.lng,
      address: analyzeDeepLinkBase.address,
    });
    setMapCenter({ lat: analyzeDeepLinkBase.lat, lng: analyzeDeepLinkBase.lng });
  }, [analyzeDeepLinkKey, analyzeDeepLinkBase]);

  useEffect(() => {
    if (activePanel !== 'analyze') {
      setR114AnalyzePrefill(null);
      return;
    }
    const r114PropId = searchParams.get('r114PropId')?.trim();
    if (!r114PropId) {
      setR114AnalyzePrefill(null);
      return;
    }
    let cancelled = false;
    void fetchR114LiteComplex(r114PropId).then((res) => {
      if (cancelled || !res.success || !res.data?.complex) return;
      const c = res.data.complex;
      if (c.lat == null || c.lng == null) return;
      const address = (c.address || [c.city, c.gu, c.dong].filter(Boolean).join(' ')).trim();
      const prefill = {
        timestamp: Date.now(),
        category: 'apartment',
        address: address || c.title,
        lat: c.lat,
        lng: c.lng,
        r114PropId,
        placeName: c.title,
        rtmsAptSeq: c.rtmsAptSeq || undefined,
      };
      setR114AnalyzePrefill(prefill);
      setAnalyzeLocation({ lat: c.lat, lng: c.lng, address: prefill.address });
      setMapCenter({ lat: c.lat, lng: c.lng });
    });
    return () => { cancelled = true; };
  }, [activePanel, searchParams]);

  const analyzePanelPrefill = r114AnalyzePrefill
    ?? (analyzeDeepLinkBase && analyzePrefillStamp
      ? { ...analyzeDeepLinkBase, timestamp: analyzePrefillStamp }
      : null);

  const [compareToast, setCompareToast] = useState<string | null>(null);
  const [comparePickPending, setComparePickPending] = useState<ApartmentComparePickPayload | null>(null);

  useEffect(() => {
    setDiscoverFilters(loadApartmentDiscoverFilters());
    const onDiscover = () => setDiscoverFilters(loadApartmentDiscoverFilters());
    window.addEventListener('apartment-discover-filters-updated', onDiscover);
    return () => {
      window.removeEventListener('apartment-discover-filters-updated', onDiscover);
    };
  }, []);

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

    if (lat && lng) {
      const geoKey = `${lat},${lng}`;
      if (appliedUrlGeoRef.current !== geoKey) {
        appliedUrlGeoRef.current = geoKey;
        setMapCenter({ lat: parseFloat(lat), lng: parseFloat(lng) });
      }
    }
    if (category) setSelectedCategory(category);
  }, [searchParams]);

  // 구형 URL 하위 호환 리다이렉트 (?panel=ranking -> /ranking)
  useEffect(() => {
    if (activePanel === 'ranking') {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('panel');
      router.replace(`/ranking?${params.toString()}`);
    }
  }, [activePanel, searchParams, router]);

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

      const category = selectedCategoryRef.current;
      const useDiscoverOnly = USE_SERVER_APARTMENT_DISCOVER && category === '아파트';
      const useAllTabMerge = USE_SERVER_APARTMENT_DISCOVER && category === 'all';

      if (useDiscoverOnly) {
        const geo = { lat, lng, radiusKm: radius };
        const fetchInit = { headers, signal: abortController.signal };
        const [{ items }, liteResult] = await Promise.all([
          fetchApartmentDiscover(
            discoverFiltersRef.current,
            geo,
            fetchInit,
          ),
          fetchR114LiteDiscover(geo, fetchInit, {
            limit: 50,
            filters: discoverFiltersRef.current,
          }),
        ]);
        const { list, cardUpdates } = mapDiscoverItemsToFeed(items, analysisCardCacheKey);
        if (Object.keys(cardUpdates).length > 0) {
          setAptCardCache((prev) => ({ ...prev, ...cardUpdates }));
        }
        const liteList = liteResult.items.map(mapR114LiteDiscoverToFeedItem) as Analysis[];
        setAnalyses(mergeDiscoverWithR114Lite(list as Analysis[], liteList));
        hasTimelineLoadedRef.current = true;
        return;
      }

      if (useAllTabMerge) {
        const timelineParams = new URLSearchParams({
          limit: String(TIMELINE_LIMIT),
          lat: String(lat),
          lng: String(lng),
          radius: String(radius),
        });
        const geo = { lat, lng, radiusKm: radius };
        const fetchInit = { headers, signal: abortController.signal };
        const [timelineRes, discoverResult, liteResult] = await Promise.all([
          fetch(`/api/land/detective/timeline?${timelineParams}`, fetchInit),
          fetchApartmentDiscover(
            discoverFiltersRef.current,
            geo,
            fetchInit,
            { analyzedOnly: true },
          ),
          fetchR114LiteDiscover(geo, fetchInit, {
            limit: 50,
            filters: discoverFiltersRef.current,
          }),
        ]);
        if (!timelineRes.ok) throw new Error('데이터를 불러오는데 실패했습니다');
        const timelineData = await timelineRes.json();
        const nonAptTimeline = (timelineData.analyses || [])
          .map((item: any) => ({
            ...item,
            id: item.id || item._id || item.reportId || item.report_id || '',
          }))
          .filter((item: Analysis) => !isApartmentAnalysis(item));

        const { list: aptList, cardUpdates } = mapDiscoverItemsToFeed(
          discoverResult.items,
          analysisCardCacheKey,
        );
        if (Object.keys(cardUpdates).length > 0) {
          setAptCardCache((prev) => ({ ...prev, ...cardUpdates }));
        }
        const liteList = liteResult.items.map(mapR114LiteDiscoverToFeedItem) as Analysis[];
        const aptMerged = mergeDiscoverWithR114Lite(aptList as Analysis[], liteList);
        setAnalyses([...nonAptTimeline, ...aptMerged]);
        hasTimelineLoadedRef.current = true;
        return;
      }

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

  /** 지도 이동·줌·탭 — discover는 600ms, 그 외 300ms 디바운스 */
  useEffect(() => {
    if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    const debounceMs =
      useServerApartmentDiscoverForCategory(selectedCategory) ? 600 : 300;
    fetchDebounceRef.current = setTimeout(() => {
      const radius = zoomLevelToRadiusKm(mapPosition.zoomLevel);
      fetchAnalyses(mapPosition.lat, mapPosition.lng, radius, hasTimelineLoadedRef.current);
    }, debounceMs);
    return () => {
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    };
  }, [mapPosition, selectedCategory, fetchAnalyses]);

  useEffect(() => {
    if (!apartmentTabDiscover) return;
    if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    fetchDebounceRef.current = setTimeout(() => {
      const radius = zoomLevelToRadiusKm(mapPosition.zoomLevel);
      fetchAnalyses(mapPosition.lat, mapPosition.lng, radius, true);
    }, 600);
    return () => {
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    };
  }, [discoverFilters, selectedCategory, mapPosition, fetchAnalyses]);

  useEffect(() => {
    if (prevSelectedCategoryRef.current === selectedCategory) return;
    prevSelectedCategoryRef.current = selectedCategory;
    const radius = zoomLevelToRadiusKm(mapPosition.zoomLevel);
    fetchAnalyses(mapPosition.lat, mapPosition.lng, radius, true);
    if (selectedCategory === '아파트' || selectedCategory === 'all') {
      setAptAreaCenterM2({});
    }
  }, [selectedCategory, mapPosition.lat, mapPosition.lng, mapPosition.zoomLevel, fetchAnalyses]);

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

  const buildDiscoverReturnParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set('tab', showMobileMap ? 'map' : 'list');
    if (mapPosition?.lat && mapPosition?.lng) {
      params.set('lat', mapPosition.lat.toString());
      params.set('lng', mapPosition.lng.toString());
    } else if (mapCenter) {
      params.set('lat', mapCenter.lat.toString());
      params.set('lng', mapCenter.lng.toString());
    } else if (mapBounds) {
      params.set('lat', ((mapBounds.neLat + mapBounds.swLat) / 2).toString());
      params.set('lng', ((mapBounds.neLng + mapBounds.swLng) / 2).toString());
    }
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    return params;
  }, [showMobileMap, mapPosition, mapCenter, mapBounds, selectedCategory]);

  const openLitePanel = useCallback((
    r114PropId: string,
    coords?: { lat: number; lng: number } | null,
    options?: { latestReportId?: string | null; propertyTitle?: string | null },
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('lite', r114PropId);
    if (options?.latestReportId) {
      params.set('liteReport', String(options.latestReportId));
    } else {
      params.delete('liteReport');
    }
    if (coords?.lat != null && coords?.lng != null) {
      params.set('lat', String(coords.lat));
      params.set('lng', String(coords.lng));
      appliedUrlGeoRef.current = `${coords.lat},${coords.lng}`;
      setMapCenter({ lat: coords.lat, lng: coords.lng });
    }
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const closeLitePanel = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('lite');
    params.delete('liteReport');
    const geo = mapPosition?.lat != null && mapPosition?.lng != null
      ? { lat: mapPosition.lat, lng: mapPosition.lng }
      : mapCenter;
    if (geo) {
      params.set('lat', String(geo.lat));
      params.set('lng', String(geo.lng));
      appliedUrlGeoRef.current = `${geo.lat},${geo.lng}`;
    }
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : '/', { scroll: false });
  }, [router, searchParams, mapPosition, mapCenter]);

  const handleLiteAnalyze = useCallback((r114PropId: string) => {
    closeLitePanel();
    const params = new URLSearchParams(searchParams.toString());
    params.set('panel', 'analyze');
    params.set('category', 'apartment');
    params.set('r114PropId', r114PropId);
    params.delete('lite');
    params.delete('liteReport');
    router.push(`/?${params.toString()}`);
  }, [closeLitePanel, router, searchParams]);

  const handleAddApartmentToCompare = useCallback((analysis: Analysis) => {
    const areaRaw = analysis.exclusiveArea ?? analysis.area;
    const exclusiveAreaM2 = areaRaw != null ? Number(areaRaw) : null;
    const rtms = analysis.rtmsAptSeq || (analysis.aptSeq?.includes('-') ? analysis.aptSeq : undefined);
    const masterId = analysis.masterId || (analysis.aptSeq && !analysis.aptSeq.includes('-') ? analysis.aptSeq : undefined);
    setComparePickPending({
      masterId: masterId ? String(masterId) : undefined,
      rtmsAptSeq: rtms ? String(rtms) : undefined,
      r114PropId: analysis.r114PropId ? String(analysis.r114PropId) : undefined,
      complexName: analysis.bldNm || analysis.propertyTitle || undefined,
      suggestedAreaM2: Number.isFinite(exclusiveAreaM2) ? exclusiveAreaM2 : null,
    });
  }, []);

  useEffect(() => {
    if (!litePanelPropId) return;
    let cancelled = false;
    void fetchR114LiteComplex(litePanelPropId).then((res) => {
      if (cancelled || !res.success || !res.data?.complex) return;
      const { lat, lng } = res.data.complex;
      if (lat != null && lng != null) {
        setMapCenter({ lat, lng });
      }
    });
    return () => { cancelled = true; };
  }, [litePanelPropId]);

  const navigateFromAnalysis = useCallback((analysis: Analysis) => {
    const isApartment = isApartmentAnalysis(analysis);
    const returnQs = buildDiscoverReturnParams().toString();
    const coords = analysis.lat != null && analysis.lng != null
      ? { lat: analysis.lat, lng: analysis.lng }
      : null;

    /** 아파트 — r114_prop_id 있으면 Lite 패널 (분석완료·미분석 공통) */
    if (isApartment && analysis.r114PropId) {
      const reportId = analysis.latestReportId
        ?? (analysis.hasReport !== false && !String(analysis.id).startsWith('lite-')
          ? analysis.id
          : undefined);
      openLitePanel(analysis.r114PropId, coords, {
        latestReportId: reportId,
        propertyTitle: analysis.bldNm || analysis.propertyTitle,
      });
      return;
    }

    if (isApartment && analysis.hasReport === false) {
      const params = new URLSearchParams();
      params.set('panel', 'analyze');
      params.set('category', 'apartment');
      const masterId = analysis.masterId
        || (analysis.aptSeq && !String(analysis.aptSeq).includes('-') ? analysis.aptSeq : null);
      const rtmsAptSeq = analysis.rtmsAptSeq
        || (analysis.aptSeq?.includes('-') ? analysis.aptSeq : null);
      if (masterId) params.set('masterId', String(masterId));
      if (rtmsAptSeq) params.set('rtmsAptSeq', String(rtmsAptSeq));
      if (analysis.lat != null) params.set('lat', String(analysis.lat));
      if (analysis.lng != null) params.set('lng', String(analysis.lng));
      const addr = aptAddressById[analysis.id]
        || analysis.location?.address
        || analysis.location?.name
        || '';
      if (addr) params.set('address', addr);
      const placeName = analysis.bldNm || analysis.propertyTitle;
      if (placeName) params.set('placeName', placeName);
      router.push(`/?${params.toString()}`);
      return;
    }

    const aptSeq = analysis.aptSeq;
    const pnu = analysis.pnu;
    if (isApartment && (aptSeq || pnu)) {
      const reportId = analysis.latestReportId || analysis.id;
      const slug = makeAnalyzeSlug(reportId, analysis.bldNm || analysis.propertyTitle);
      router.push(`/analyze/${slug}?return=${encodeURIComponent(returnQs)}`);
      return;
    }

    router.push(`/analyze/${analysis.id}?return=${encodeURIComponent(returnQs)}`);
  }, [router, buildDiscoverReturnParams, aptAddressById, openLitePanel]);

  const showCompareToast = useCallback((message: string) => {
    setCompareToast(message);
    window.setTimeout(() => setCompareToast(null), 2800);
  }, []);

  const categoryMappings: Record<string, string[]> = {
    '아파트': ['apartment', '아파트'],
    '토지': ['land', '토지'],
    '주택': ['house', '주택', '단독주택', '공동주택'],
    '상가': ['store', '상가', '상업용', '상업', 'shop', 'commercial'],
    '빌딩': ['building', '빌딩', '상업용빌딩'],
  };

  const filteredAnalyses = useMemo(() => {
    return analyses.filter((a) => {
      if (selectedCategory === 'all') return true;
      if (!a.category) return false;

      const allowedValues = categoryMappings[selectedCategory] || [selectedCategory];
      const categoryLower = a.category.toLowerCase().trim();

      return allowedValues.some(
        (val) =>
          categoryLower.includes(val.toLowerCase()) ||
          val.toLowerCase().includes(categoryLower),
      );
    });
  }, [analyses, selectedCategory]);
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
    // 랭킹 조회 후 특정 아파트가 선택된 경우
    if (activePanel === 'ranking' && selectedRankingApt) {
      return {
        id: selectedRankingApt.reportId,
        address: selectedRankingApt.address || '주소 없음',
        propertyTitle: selectedRankingApt.bldNm,
        category: searchParams.get('rankingType') || 'apartment',
        riskScore: 0,
        lat: selectedRankingApt.lat,
        lng: selectedRankingApt.lng,
        rank: selectedRankingApt.rank,
      };
    }
    if (!selectedProperty) return null;
    const riskScore = parseFloat(selectedProperty.propertyGrade?.riskScore || '0');
    const pendingAi = riskScore <= 0;
    return {
      id: selectedProperty.id,
      address: selectedProperty.location?.address || '주소 없음',
      propertyTitle: selectedProperty.propertyTitle,
      category: selectedProperty.category,
      riskScore,
      pendingAi,
      lat: selectedProperty.lat,
      lng: selectedProperty.lng,
    };
  }, [selectedProperty, selectedRankingApt, analyzeLocation, activePanel, searchParams]);

  const CATEGORIES = ['all', '아파트', '토지', '주택', '상가', '빌딩'];
  const CATEGORY_LABELS: Record<string, string> = { all: '전체', '토지': '토지', '주택': '주택', '아파트': '아파트', '상가': '상가', '빌딩': '빌딩' };
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [listSearchResults, setListSearchResults] = useState<any[]>([]);
  const ignoreSearchRef = useRef(false);

  useEffect(() => {
    if (ignoreSearchRef.current) {
      ignoreSearchRef.current = false;
      return;
    }

    const query = listSearchQuery.trim();
    if (!query || query.length < 2) {
      setListSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const list = await searchKakaoPlaceSuggestions(query);
        setListSearchResults(list);
      } catch {
        setListSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [listSearchQuery]);

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

  const getAptCenterM2 = useCallback(
    (a: Analysis): number | null | undefined => {
      const id = a.aptSeq ? String(a.aptSeq) : '';
      if (!id) return undefined;
      if (USE_SERVER_APARTMENT_DISCOVER && useServerApartmentDiscoverForCategory(selectedCategory) && isApartmentAnalysis(a)) {
        return resolveAreaForCard(null, a.exclusiveArea ?? a.area ?? null);
      }
      if (isPyeongFilterActive(discoverFilters)) {
        if (id in aptAreaCenterM2) return aptAreaCenterM2[id];
        return undefined;
      }
      return resolveAreaForCard(null, a.exclusiveArea ?? a.area ?? null);
    },
    [discoverFilters, aptAreaCenterM2, selectedCategory],
  );

  const cardKeyForAnalysis = useCallback(
    (a: Analysis) => {
      if (!a.aptSeq) return '';
      const center = getAptCenterM2(a);
      if (center === undefined) return '';
      if (center === null) return '';
      return analysisCardCacheKey(String(a.aptSeq), center);
    },
    [getAptCenterM2],
  );

  const buildPropertyCardBundle = useCallback(
    (analysis: Analysis) => {
      const cardKey = cardKeyForAnalysis(analysis);
      const cardSnap = cardKey ? aptCardCache[cardKey] : undefined;
      const centerM2 = getAptCenterM2(analysis);
      const isLiteFeedItem = Boolean(analysis.id?.startsWith('lite-') || analysis.liteBadge);
      const areaLocked = isPyeongFilterActive(discoverFilters) && !isLiteFeedItem;
      let aptDisplay =
        useApartmentDiscoverFeed && isApartmentAnalysis(analysis)
          ? isLiteFeedItem
            ? buildLiteCardDisplay(discoverFilters.dealMode, {
                riseRate6m: analysis.riseRate6m,
                avgPrice1m: analysis.avgPrice1m,
                area: analysis.exclusiveArea ?? analysis.area ?? null,
                jeonseRiseRate6m: analysis.jeonseRiseRate6m,
                avgJeonseDeposit1m: analysis.avgJeonseDeposit1m,
                wolseRiseRate6m: analysis.wolseRiseRate6m,
                avgWolseMonthlyRent1m: analysis.avgWolseMonthlyRent1m,
              })
            : buildApartmentCardDisplay(
              discoverFilters.dealMode,
              cardSnap,
              {
                riseRate6m: cardSnap?.riseRate6m ?? analysis.riseRate6m,
                avgPrice1m: cardSnap?.avgPrice1m ?? analysis.avgPrice1m,
                area: resolveAreaForCard(
                  typeof centerM2 === 'number' ? centerM2 : null,
                  analysis.exclusiveArea ?? analysis.area ?? null,
                ),
              },
              { areaLocked },
            )
          : undefined;
      const resolvedLocation = aptAddressById[analysis.id]
        ? { name: aptAddressById[analysis.id], address: aptAddressById[analysis.id] }
        : analysis.location;
      return {
        aptDisplay,
        data: {
          id: analysis.id,
          bldNm: analysis.bldNm || undefined,
          propertyTitle: analysis.propertyTitle,
          location: resolvedLocation,
          category: analysis.category,
          detectiveNote: analysis.detectiveNote,
          propertyGrade: analysis.propertyGrade,
          likes: analysis.likes,
          createdAt: analysis.createdAt,
          riseRate6m: cardSnap?.riseRate6m ?? analysis.riseRate6m,
          avgPrice1m: cardSnap?.avgPrice1m ?? analysis.avgPrice1m,
          minArea: analysis.minArea,
          maxArea: analysis.maxArea,
          exclusiveArea: cardSnap?.exclusiveAreaM2 ?? analysis.exclusiveArea,
          area: analysis.area,
          aptSeq: analysis.aptSeq,
          rtmsAptSeq: analysis.rtmsAptSeq,
          hasReport: analysis.hasReport,
          latestReportId: analysis.latestReportId ?? null,
          r114PropId: analysis.r114PropId ?? undefined,
        },
      };
    },
    [
      cardKeyForAnalysis,
      aptCardCache,
      getAptCenterM2,
      discoverFilters,
      useApartmentDiscoverFeed,
      aptAddressById,
    ],
  );

  const listAnalysesForDisplay = useMemo(() => {
    let list = searchFilteredAnalyses;
    if (selectedCategory === '아파트') {
      if (apartmentTabDiscover) {
        list = sortApartmentDiscoverList(list, discoverFilters, (a) => {
          if (a.id?.startsWith('lite-')) {
            return {
              riseRate6m: a.riseRate6m ?? null,
              tradeCount6m: a.saleCount6m ?? 0,
            };
          }
          const centerM2 = a.exclusiveArea ?? a.area ?? null;
          if (!a.aptSeq || centerM2 == null) return undefined;
          return aptCardCache[analysisCardCacheKey(String(a.aptSeq), centerM2)];
        });
        return list;
      }
      list = list.filter((a) => {
        if (!isApartmentAnalysis(a)) return true;
        if (isPyeongFilterActive(discoverFilters) && a.aptSeq) {
          const center = aptAreaCenterM2[String(a.aptSeq)];
          if (center === null || center === undefined) return false;
        }
        const key = cardKeyForAnalysis(a);
        return passesApartmentDiscoverFilters(
          { category: a.category, avgPrice1m: a.avgPrice1m },
          key ? aptCardCache[key] : undefined,
          discoverFilters,
        );
      });
      list = sortApartmentDiscoverList(list, discoverFilters, (a) => {
        const key = cardKeyForAnalysis(a);
        return key ? aptCardCache[key] : undefined;
      });
    }
    return list;
  }, [
    searchFilteredAnalyses,
    selectedCategory,
    useApartmentDiscoverFeed,
    discoverFilters,
    aptCardCache,
    aptAreaCenterM2,
    cardKeyForAnalysis,
  ]);

  useEffect(() => {
    if (!useApartmentDiscoverFeed) return;
    const targets = listAnalysesForDisplay.filter((a) => {
      if (!isApartmentAnalysis(a) || a.lat == null || a.lng == null) return false;
      if (aptAddressFetchedRef.current.has(a.id)) return false;
      const loc = (a.location?.address || a.location?.name || '').trim();
      const title = (a.propertyTitle || '').trim();
      return !loc || loc === title || /^[가-힣]+(?:동|읍|면|리|가)$/.test(loc);
    }).slice(0, 24);
    if (targets.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const a of targets) {
        if (cancelled) break;
        aptAddressFetchedRef.current.add(a.id);
        try {
          const addr = await reverseGeocodeKakao(Number(a.lat), Number(a.lng));
          if (cancelled || !addr.trim()) continue;
          setAptAddressById((prev) => (prev[a.id] ? prev : { ...prev, [a.id]: addr.trim() }));
        } catch {
          /* 역지오코딩 실패 — 동·읍·면 fallback 유지 */
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [listAnalysesForDisplay, useApartmentDiscoverFeed]);

  useEffect(() => {
    setAptAreaCenterM2({});
  }, [discoverFilters.pyeongMin, discoverFilters.pyeongMax]);

  useEffect(() => {
    if (USE_SERVER_APARTMENT_DISCOVER && selectedCategory === '아파트') return;
    if (selectedCategory !== '아파트') return;
    const targets = searchFilteredAnalyses.filter((a) => a.aptSeq && isApartmentAnalysis(a)).slice(0, 48);
    let cancelled = false;
    const pyeongActive = isPyeongFilterActive(discoverFilters);

    (async () => {
      const centerUpdates: Record<string, number | null> = {};
      const cardUpdates: Record<string, ApartmentCardSnapshot> = {};

      await Promise.all(
        targets.map(async (a) => {
          const aptKey = String(a.aptSeq);
          const reportArea = a.exclusiveArea ?? a.area ?? null;
          let centerM2: number | null = null;

          if (pyeongActive) {
            const areasRes = await fetchApartmentAreas(aptKey);
            centerM2 = pickRepresentativeAreaM2(
              areasRes.areas || [],
              discoverFilters.pyeongMin,
              discoverFilters.pyeongMax,
              reportArea,
            );
            centerUpdates[aptKey] = centerM2;
            if (centerM2 == null) return;
          } else {
            centerM2 = resolveAreaForCard(null, reportArea);
          }

          const cacheKey = analysisCardCacheKey(aptKey, centerM2);
          const card = await fetchApartmentCardSnapshot(aptKey, centerM2);
          if (card) cardUpdates[cacheKey] = card;
          if (!pyeongActive) centerUpdates[aptKey] = centerM2;
        }),
      );

      if (cancelled) return;
      if (Object.keys(centerUpdates).length > 0) {
        setAptAreaCenterM2((prev) => ({ ...prev, ...centerUpdates }));
      }
      if (Object.keys(cardUpdates).length > 0) {
        setAptCardCache((prev) => ({ ...prev, ...cardUpdates }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchFilteredAnalyses, discoverFilters, selectedCategory]);

  const mapAnalysesSource = useMemo(() => {
    if (selectedCategory === '아파트') return listAnalysesForDisplay;
    return filteredAnalyses;
  }, [selectedCategory, filteredAnalyses, listAnalysesForDisplay]);

  const mapProperties = useMemo(() => {
    if (activePanel === 'ranking') {
      const rankCategoryForMarker = (searchParams.get('rankingType') || 'apartment') as string;
      const rankMarkers = rankingProperties.filter(a => a.lat && a.lng).map(a => ({
        id: a.reportId,
        address: a.address || a.pnu || '주소 없음',
        propertyTitle: `${a.rank}위: ${a.bldNm || a.address || ''}`,
        category: rankCategoryForMarker,
        riskScore: 0,
        lat: a.lat,
        lng: a.lng,
        rank: a.rank,
      }));
      const uniqueGosi = Array.from(
        new Map(rankingGosiPoints.filter(g => g.lat && g.lng).map(g => [g.title || `${g.lat}-${g.lng}`, g])).values()
      ).map(g => {
        const cleanTitle = (g.title || '')
          .replace(/^(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주특별자치도|서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)\s*[가-힣]*(시|군|구)?\s*/g, '')
          .replace(/^[가-힣]+(?:특별자치시|특별자치도|광역시|북도|남도|도|시|군|구)\s*/g, '')
          .replace(/^[가-힣]{2,4}\s+(?=도시관리계획|도시계획|도로구역|일반산업|공원조성|제\d+일반산업단지|도시계획시설)/g, '')
          .trim();
        return { ...g, displayTitle: cleanTitle };
      });

      const gosiMarkers = uniqueGosi.map((g, i) => {
        const truncatedTitle = g.displayTitle.length > 12 ? g.displayTitle.slice(0, 12) + '...' : g.displayTitle;
        return {
          id: `gosi-${i}`,
          address: g.address || '개발호재 위치',
          propertyTitle: truncatedTitle || '개발호재',
          category: 'gosi',
          riskScore: 0,
          lat: g.lat,
          lng: g.lng,
        };
      });
      return [...rankMarkers, ...gosiMarkers];
    }
    if (activePanel === 'analyze' || activePanel === 'compare') {
      return [];
    }
    return mapAnalysesSource
      .filter(a => a.lat != null && a.lng != null)
      .map(a => {
        const riskScore = parseFloat(a.propertyGrade?.riskScore || '0');
        /** 타임라인과 동일: 점수 없으면 0.svg+00. 상세는 latestReportId/report id 기준 */
        const pendingAi = riskScore <= 0;
        const cardKey = cardKeyForAnalysis(a);
        const useDiscoverCard =
          useApartmentDiscoverFeed && isApartmentAnalysis(a) && cardKey;
        const card = useDiscoverCard ? aptCardCache[cardKey] : undefined;
        const priceHint =
          discoverFilters.dealMode === 'jeonse' && card?.avgJeonseDepositMan != null && card.avgJeonseDepositMan > 0
            ? ` · 전세 ${(card.avgJeonseDepositMan / 10000).toFixed(1)}억`
            : card?.avgPrice1m != null && card.avgPrice1m > 0
              ? ` · ${(card.avgPrice1m / 10000).toFixed(1)}억`
              : a.avgPrice1m != null && a.avgPrice1m > 0
                ? ` · ${(a.avgPrice1m / 10000).toFixed(1)}억`
                : '';
        const titleSuffix = priceHint;
        return {
          id: a.id,
          address: a.location?.address || '주소 없음',
          propertyTitle: `${a.propertyTitle || ''}${titleSuffix}`,
          category: a.category,
          riskScore,
          pendingAi,
          lat: a.lat,
          lng: a.lng,
        };
      });
  }, [mapAnalysesSource, activePanel, rankingProperties, rankingGosiPoints, searchParams, selectedCategory, aptCardCache, discoverFilters, cardKeyForAnalysis]);

  const handleListSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = listSearchQuery.trim();
    if (!query) return;

    // 1. 먼저 현재 필터링된 최근 분석 리스트에서 매칭되는 항목이 있는지 확인
    const localMatch = listAnalysesForDisplay.find(a => a.lat && a.lng);
    if (localMatch && localMatch.lat && localMatch.lng) {
      setMapCenter({ lat: localMatch.lat, lng: localMatch.lng });
      setSelectedProperty(localMatch);
      return;
    }

    // 2. 만약 최근 분석 리스트에 매칭되는 항목이 없다면, Kakao Maps API를 사용하여 주소/키워드 검색 후 지도 이동
    if (typeof window !== 'undefined' && window.kakao?.maps?.services) {
      const { kakao } = window;
      const geocoder = new kakao.maps.services.Geocoder();

      geocoder.addressSearch(query, (result: any, status: any) => {
        if (status === kakao.maps.services.Status.OK && result.length > 0) {
          const first = result[0];
          const lat = parseFloat(first.y);
          const lng = parseFloat(first.x);
          setMapCenter({ lat, lng });
          setListSearchQuery(''); // 검색창 비우기 (이동 후 해당 지역 매물이 바로 보이도록)
        } else {
          const ps = new kakao.maps.services.Places();
          ps.keywordSearch(query, (data: any, status: any) => {
            if (status === kakao.maps.services.Status.OK && data.length > 0) {
              const first = data[0];
              const lat = parseFloat(first.y);
              const lng = parseFloat(first.x);
              setMapCenter({ lat, lng });
              setListSearchQuery(''); // 검색창 비우기 (이동 후 해당 지역 매물이 바로 보이도록)
            }
          });
        }
      });
    }
  };

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
                  {activePanel === 'analyze' ? '매물분석' : activePanel === 'ranking' ? '부동산랭킹' : activePanel === 'compare' ? '지역 브리핑' : '부동산탐정'}
                </h1>
              </div>
              {(activePanel === 'analyze' || activePanel === 'ranking' || activePanel === 'compare') ? (
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
          {(activePanel !== 'analyze' && activePanel !== 'ranking' && activePanel !== 'compare') && (
            <div className="lg:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-[61] flex flex-col items-center gap-2.5 pointer-events-none pb-[env(safe-area-inset-bottom,0px)]">
              {!showMobileMap && (
                <div className="pointer-events-auto">
                  <ApartmentCompareBasketBar anchor="inline" />
                </div>
              )}
              <div className="pointer-events-auto flex bg-white/80 backdrop-blur-md rounded-2xl p-1 shadow-xl border border-slate-200">
                <button onClick={() => setShowMobileMap(true)} className={`flex flex-1 items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${showMobileMap ? 'bg-emerald-400 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                  지도
                </button>
                <button onClick={() => setShowMobileMap(false)} className={`flex flex-1 items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${!showMobileMap ? 'bg-emerald-400 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                  {activePanel === 'analyze' ? '매물분석' : '목록'}
                </button>
              </div>
            </div>
          )}



          {/* ── 패널 콘텐츠: 분석 폼 or 매물 리스트 ── */}
          {activePanel === 'analyze' ? (
            <div className={`relative flex-1 min-h-0 ${activePanel === 'analyze' ? 'flex flex-col' : (showMobileMap ? 'hidden lg:flex lg:flex-col' : 'flex flex-col')}`}>
              <AnalyzePanel
                urlPrefill={analyzePanelPrefill}
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
          ) : activePanel === 'compare' ? (
            <div className={`relative flex-1 min-h-0 ${activePanel === 'compare' ? 'flex flex-col' : (showMobileMap ? 'hidden lg:flex lg:flex-col' : 'flex flex-col')}`}>
              <ComparePanel onShowResult={setShowCompareResult} />
            </div>
          ) : (
            <div className={`flex-1 min-h-0 overflow-y-auto px-4 lg:px-6 py-4 pb-24 ${showMobileMap ? 'hidden lg:block' : 'block'}`}>
              <div className="flex flex-col gap-3 mb-4">
                <h2 className="text-sm font-bold text-slate-800">최근 분석</h2>

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
                </div>

                {selectedCategory === '아파트' && (
                  <ApartmentDiscoverToolbar
                    filters={discoverFilters}
                    onOpenSheet={(section) => {
                      setDiscoverSheetSection(section ?? null);
                      setDiscoverSheetOpen(true);
                    }}
                  />
                )}

                <form onSubmit={handleListSearchSubmit} className="w-full relative">
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
                        onClick={() => { setListSearchQuery(''); setListSearchResults([]); }}
                        className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label="검색어 지우기"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* 검색 결과 드롭다운 */}
                  {listSearchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-200/80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="max-h-[240px] overflow-y-auto">
                        {listSearchResults.map((result, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              const lat = parseFloat(result.y);
                              const lng = parseFloat(result.x);
                              ignoreSearchRef.current = true;
                              setMapCenter({ lat, lng });
                              setListSearchQuery(''); // 검색창 비우기 (이동 후 해당 지역 매물이 바로 보이도록)
                              setListSearchResults([]);
                            }}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50 transition-colors border-b border-slate-100 last:border-0 group flex flex-col gap-0.5"
                          >
                            <div className="flex items-start gap-2">
                              <div className="mt-0.5 flex-shrink-0">
                                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-600 transition-colors truncate">
                                  {result.place_name}
                                </div>
                                <div className="text-[10px] text-slate-500 leading-relaxed truncate">
                                  {result.road_address_name || result.address_name}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
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
              ) : listAnalysesForDisplay.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-slate-800 font-bold mono text-sm mb-1">
                    {listSearchQuery ? '검색 결과 없음' : '매물 없음'}
                  </p>
                  <p className="text-slate-500 font-medium text-xs">
                    {listSearchQuery ? '조건에 맞는 분석 내역이 없습니다.' : '지도 영역 내 매물이 없습니다.'}
                  </p>
                  {selectedCategory === '아파트'
                    && !listSearchQuery
                    && hasStrictDataFilters(discoverFilters) && (
                    <ul className="mt-3 mx-auto max-w-xs text-left text-[10px] text-amber-800/90 space-y-1 px-3">
                      {apartmentDiscoverFilterHints(discoverFilters).map((hint) => (
                        <li key={hint} className="leading-relaxed">
                          · {hint}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {listAnalysesForDisplay.slice(0, displayCount).map(analysis => {
                    const { data, aptDisplay } = buildPropertyCardBundle(analysis);
                    return (
                      <PropertyCard
                        key={analysis.id}
                        data={data}
                        apartmentDisplay={aptDisplay}
                        selected={selectedProperty?.id === analysis.id}
                        inCompareBasket={compareBasketKeys.has(compareItemKey({
                          masterId: analysis.masterId ?? (analysis.aptSeq && !String(analysis.aptSeq).includes('-') ? analysis.aptSeq : undefined),
                          rtmsAptSeq: analysis.rtmsAptSeq ?? (analysis.aptSeq?.includes('-') ? analysis.aptSeq : undefined),
                          r114PropId: analysis.r114PropId,
                          exclusiveAreaM2: analysis.exclusiveArea ?? analysis.area,
                        }))}
                        onAddToCompare={() => handleAddApartmentToCompare(analysis)}
                        currentUid={user?.uid}
                        onLikeToggle={(id, e) => toggleLike(e, id)}
                        onClick={() => navigateFromAnalysis(analysis)}
                      />
                    );
                  })}

                  {displayCount < listAnalysesForDisplay.length && (
                    <div className="flex flex-col items-center mt-6 gap-2">
                      <button onClick={() => setDisplayCount(p => p + (isMobile ? 15 : 20))}
                        className="bg-white border border-slate-200 text-slate-600 font-bold px-8 py-2.5 rounded-2xl text-[13px] flex items-center gap-2 hover:bg-slate-50 hover:border-emerald-200 transition-all shadow-sm active:scale-95">
                        <span>리스트 더보기</span>
                        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <span className="text-[10px] font-medium text-slate-400">{displayCount} / {listAnalysesForDisplay.length}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 오른쪽: 지도 (7) ── */}
        <div className={`w-full bg-gradient-to-br from-slate-50 to-slate-100 border-l border-slate-200/50 flex-1 lg:flex-none relative flex-col min-w-0 ${(activePanel === 'compare' && showCompareResult) ? 'flex' : (activePanel === 'analyze' || activePanel === 'ranking' || activePanel === 'compare') ? 'hidden lg:flex' : (showMobileMap ? 'flex' : 'hidden lg:flex')}`}>
          <div className="h-full flex flex-col w-full">
            <div className="flex-1 relative">

              {/* Lite 단지 플로팅 패널 — 지도 위에 떠 있음 (사이드바·지도 레이아웃 유지) */}
              {litePanelPropId && activePanel !== 'analyze' && activePanel !== 'ranking' && activePanel !== 'compare' && (
                <R114LiteFloatingPanel
                  r114PropId={litePanelPropId}
                  initialDealMode={discoverFilters.dealMode}
                  latestReportId={litePanelReportId}
                  reportTitle={analyses.find((a) => a.r114PropId === litePanelPropId)?.propertyTitle}
                  onClose={closeLitePanel}
                  onAnalyzeClick={handleLiteAnalyze}
                />
              )}

              {/* 상급지 비교 결과 오버레이 — 지도 위에 전체를 덮음 (항상 마운트, hidden으로 가시성 제어) */}
              {activePanel === 'compare' && (
                <div className={`absolute inset-0 z-30 ${showCompareResult ? '' : 'hidden'}`} id="compare-result-portal" />
              )}

              {/* 지도 내 카테고리 필터 (분석/랭킹 탭 제외 — 좌측 패널에서 선택) */}
              {(activePanel !== 'analyze' && activePanel !== 'ranking' && activePanel !== 'compare') && (
                <div className="absolute top-20 lg:top-1/2 lg:-translate-y-1/2 right-4 z-20 flex flex-col gap-1.5 bg-white/90 backdrop-blur-sm p-1.5 rounded-xl shadow-md border border-slate-200">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-sm text-center ${selectedCategory === cat ? 'bg-emerald-400 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              )}

              {activePanel === 'compare' ? (
                <ComparableMap
                  mapData={{
                    target: {
                      lat: mapCenter?.lat || 36.3504,
                      lng: mapCenter?.lng || 127.3845
                    }
                  }}
                  className="w-full h-full"
                  draggable={true}
                />
              ) : (
                <KakaoMap
                  properties={mapProperties}
                  selectedProperty={selectedMapProperty}
                  navigationZoomLevel={2}
                  initialCenter={mapCenter}
                  onPropertySelect={property => {
                    if (activePanel === 'ranking') {
                      if (String(property.id).startsWith('gosi-')) {
                        const idx = parseInt(String(property.id).replace('gosi-', ''), 10);
                        const uniqueGosi = Array.from(
                          new Map(rankingGosiPoints.filter(g => g.lat && g.lng).map(g => [g.title || `${g.lat}-${g.lng}`, g])).values()
                        );
                        const gosi = uniqueGosi[idx];
                        if (gosi) {
                          setSelectedGosiPoint(gosi);
                          setSelectedRankingApt(null);
                        }
                        return;
                      }
                      const apt = rankingProperties.find(a => a.reportId === property.id);
                      if (apt) {
                        setSelectedRankingApt(apt);
                        setSelectedGosiPoint(null);
                      }
                      return;
                    }
                    const analysis = analyses.find((a) => a.id === property.id);
                    if (analysis) setSelectedProperty(analysis);
                  }}
                  onBoundsChanged={bounds => setMapBounds(bounds)}
                  onMapIdle={pos => setMapPosition(pos)}
                  onMapDrag={() => { setSelectedProperty(null); setSelectedRankingApt(null); setSelectedGosiPoint(null); }}
                  isAnalyzeMode={activePanel === 'analyze'}
                  primaryPolygon={primaryPolygon}
                  additionalPolygons={additionalPolygons}
                  onMapClick={handleMapClickInAnalyze}
                />
              )}

              {/* 지도 하단: 비교함 → 선택 매물 카드 (위에서 아래 순) */}
              {activePanel !== 'ranking' && (
                <div className="absolute bottom-24 lg:bottom-6 left-4 right-4 lg:left-6 lg:right-6 z-30 flex flex-col items-center gap-2 pointer-events-none">
                  <div className="pointer-events-auto">
                    <ApartmentCompareBasketBar anchor="inline" />
                  </div>
                  {selectedProperty && (() => {
                    const { data, aptDisplay } = buildPropertyCardBundle(selectedProperty);
                    return (
                      <div className="w-full pointer-events-auto shadow-xl rounded-2xl">
                        <PropertyCard
                          data={data}
                          apartmentDisplay={aptDisplay}
                          selected
                          inCompareBasket={compareBasketKeys.has(compareItemKey({
                            masterId: selectedProperty.masterId ?? (selectedProperty.aptSeq && !String(selectedProperty.aptSeq).includes('-') ? selectedProperty.aptSeq : undefined),
                            rtmsAptSeq: selectedProperty.rtmsAptSeq ?? (selectedProperty.aptSeq?.includes('-') ? selectedProperty.aptSeq : undefined),
                            r114PropId: selectedProperty.r114PropId,
                            exclusiveAreaM2: selectedProperty.exclusiveArea ?? selectedProperty.area,
                          }))}
                          onAddToCompare={
                            isApartmentAnalysis(selectedProperty)
                              ? () => handleAddApartmentToCompare(selectedProperty)
                              : undefined
                          }
                          currentUid={user?.uid}
                          onLikeToggle={(id, e) => toggleLike(e, id)}
                          onClick={() => navigateFromAnalysis(selectedProperty)}
                        />
                      </div>
                    );
                  })()}
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
                          <span className={`text-[11px] font-bold px-2 py-1 rounded-lg border ${trend > 0 ? 'bg-rose-50 text-rose-600 border-rose-100' :
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

              {selectedGosiPoint && activePanel === 'ranking' && (
                <div className="absolute bottom-6 left-6 right-6 z-30 bg-white/95 backdrop-blur-md rounded-xl p-3.5 shadow-xl border border-emerald-100 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
                  {/* 닫기 */}
                  <button
                    className="absolute top-2.5 right-3 text-slate-400 hover:text-slate-600 text-lg leading-none"
                    onClick={() => setSelectedGosiPoint(null)}
                  >✕</button>

                  <div className="flex items-start gap-3">
                    {/* 호재 배지 */}
                    <div className="shrink-0 flex flex-col items-center justify-center w-9 h-9 rounded-xl border-2 border-emerald-500/20 bg-emerald-500/5">
                      <span className="text-[11px] font-black text-emerald-600">호재</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-emerald-600 text-[10px] font-black">● 개발계획 고시 정보</span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 leading-snug break-all">{selectedGosiPoint.displayTitle || selectedGosiPoint.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 font-semibold truncate">
                        위치 : {selectedGosiPoint.address || '개발 계획 구역 내'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
      {(activePanel === 'analyze' || activePanel === 'ranking' || activePanel === 'compare') && (
        <ApartmentCompareBasketBars />
      )}
      <ApartmentDiscoverFilterSheet
        open={discoverSheetOpen}
        scrollSection={discoverSheetSection}
        filters={discoverFilters}
        onClose={() => {
          setDiscoverSheetOpen(false);
          setDiscoverSheetSection(null);
        }}
        onApply={(f) => {
          setDiscoverFilters(f);
          saveApartmentDiscoverFilters(f);
        }}
      />
      <ApartmentAreaPickModal
        pending={comparePickPending}
        onClose={() => setComparePickPending(null)}
        onAdded={showCompareToast}
        onError={showCompareToast}
      />
      {compareToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg border border-white/10">
          {compareToast}
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