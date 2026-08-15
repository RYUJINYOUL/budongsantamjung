'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, ChevronDown, Copy, Download, FileText, Image, Loader2, Pencil, Save, Sparkles, Trash2, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import {
  loadCompareBasket,
  saveCompareBasket,
  loadCompareProfile,
  saveCompareProfile,
  basketToCompareQueryItems,
  removeFromCompareBasket,
  type ApartmentCompareBasketItem,
  type ApartmentCompareProfile,
} from '../../../lib/apartmentCompareBasket';
import ApartmentAreaPickModal, { type ApartmentComparePickPayload } from '../../../components/ApartmentAreaPickModal';
import CompareProfileBar, { CompareProfileSummaryChips } from '../../../components/CompareProfileBar';
import { MORTGAGE_DISCLAIMER } from '../../../lib/apartmentCompareProfile';
import type { ApartmentCompareMapMarker } from '../../../components/ComparableMap';
import {
  parseCompareScoring,
  formatScore,
  type CompareScoringPayload,
} from '../../../lib/apartmentCompareScoring';
import { CompareScoreOverviewSection } from '../../../lib/apartmentCompareMomentumBreakdown';
import {
  CompareNarrativeOverviewSection,
  type CompareNarrativeColumn,
} from '../../../lib/apartmentCompareNarrativeDimensions';
import {
  basketItemsForSave,
  isApartmentCompareHistoryResult,
  restoreCompareFromHistory,
} from '../../../lib/apartmentCompareHistory';
import { resolveCompareReportHref } from '../../../lib/apartmentCompareReportLink';
import {
  buildApartmentCompareAdminAiPrompt,
  buildApartmentComparePromptFilename,
  buildApartmentComparePromptText,
  buildApartmentCompareSummaryFilename,
  copyApartmentComparePrompt,
  downloadApartmentComparePrompt,
  type ComparePromptTableRow,
} from '../../../lib/apartmentComparePrompt';
import { isAdminUser } from '../../../lib/adminUids';
import { extractAptRegionLabel } from '../../../lib/apartmentTenYearStory';
import {
  externalAiChatToastMessage,
  openExternalAiChatWithPrompt,
  type ExternalAiChatProvider,
} from '../../../lib/openExternalAiChat';

const ComparableMap = dynamic(() => import('../../../components/ComparableMap'), { ssr: false });
const CompareScoreFrameView = dynamic(() => import('../../../components/CompareScoreFrameView'), { ssr: false });

const NO_SALE_COPY = '최근 6개월 매매 없음';
const LOAN_ROW_HINT =
  '「대출」은 단지 최근 평균 시세 기준 · LTV·수도권 cap(6/4/2억) 가정';

type CompareProfileResult = {
  budgetMan?: number | null;
  firstTimeBuyer?: boolean;
  workplace?: { lat: number; lng: number } | null;
  mortgageAsOfLabel?: string;
  mortgageDisclaimer?: string;
};

type CompareItemResult = {
  rtmsAptSeq?: string | null;
  masterId?: string | null;
  pnu?: string | null;
  latestReportId?: string | null;
  latestCompletedReportId?: string | null;
  complexName?: string | null;
  shortAddress?: string | null;
  exclusiveAreaM2?: number | null;
  cardStatsAvailable?: boolean;
  cardStatsMessage?: string | null;
  riseRate6m?: number | null;
  avgPrice1m?: number | null;
  avgPriceMonth?: string | null;
  tradeCount6m?: number;
  maxPurchasableWithLoan?: number | null;
  loanAtPriceMan?: number | null;
  ltvPercent?: number | null;
  mortgageRegion?: string | null;
  loanCapMan?: number | null;
  gapPriceMan?: number | null;
  jeonseRatePercent?: number | null;
  avgJeonseDepositMan?: number | null;
  commuteMinutes?: number | null;
  commuteMinutesCar?: number | null;
  commuteMinutesTransit?: number | null;
  elementarySchoolNavMinutes?: number | null;
  elementarySchoolName?: string | null;
  elementarySchoolNavMode?: string | null;
  lat?: number | null;
  lng?: number | null;
  hardware?: {
    householdCount?: number | null;
    buildingAgeYears?: number | null;
    parkingPerHousehold?: number | null;
    parkingTotal?: number | null;
    entranceType?: string | null;
  } | null;
  extended?: {
    available?: boolean;
    rows?: { id: string; label: string; value: string }[];
    details?: {
      dynamicNews?: { count: number; items: { title: string; date?: string | null; url?: string | null }[] };
      redevelopment?: {
        isInZone?: boolean;
        projectCount?: number;
        projects?: { title: string; stage?: string | null; gosiDate?: string | null }[];
      };
      academy?: { within1km?: number | null; within2km?: number | null };
      populationUmd?: {
        label?: string | null;
        recent?: number | null;
        base?: number | null;
        baseMonth?: string | null;
        changePercent?: number | null;
      };
    } | null;
  } | null;
  error?: string | null;
};

function formatRise(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return '-';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

function formatPriceMan(v: number | null | undefined) {
  if (v == null || v <= 0) return '-';
  return `${(v / 10000).toFixed(1)}억`;
}

function formatArea(v: number | null | undefined) {
  if (v == null || v <= 0) return '-';
  return `${v.toFixed(1)}㎡`;
}

function formatPercent(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return '-';
  return `${v.toFixed(1)}%`;
}

function formatCommute(m: number | null | undefined, maxMinutes?: number | null) {
  if (m == null || m <= 0) return '-';
  const text = `약 ${m}분`;
  if (maxMinutes != null && maxMinutes > 0 && m > maxMinutes) {
    return `${text} (초과)`;
  }
  return text;
}

function formatElementaryWalkMinutes(c: CompareItemResult) {
  if (c.elementarySchoolNavMinutes == null || c.elementarySchoolNavMinutes <= 0) return '-';
  return `${c.elementarySchoolNavMinutes}분`;
}

/** compare 표 헤더 — 단지명 6자 */
function formatComplexShortName(name: string | null | undefined) {
  const t = (name || '단지').replace(/\s/g, '');
  if (t.length <= 6) return t;
  return t.slice(0, 6);
}

/** compare 주소 — "서초구 반포동" (시·지번 제외) */
function formatCompareLocationLabel(shortAddress: string | null | undefined) {
  const raw = shortAddress?.trim();
  if (!raw) return '-';
  return extractAptRegionLabel(raw) || raw;
}

function formatCompareParking(c: CompareItemResult): string {
  const hw = c.hardware;
  if (!hw) return '-';
  if (hw.parkingTotal != null && hw.parkingTotal > 0) {
    const total = `${hw.parkingTotal.toLocaleString()}대`;
    if (hw.parkingPerHousehold != null) {
      return `${total} (${hw.parkingPerHousehold}대/세대)`;
    }
    return total;
  }
  if (hw.parkingPerHousehold != null) return `${hw.parkingPerHousehold}대/세대`;
  return '-';
}

function parseMaxCommuteMinutes(raw?: string): number | null {
  if (!raw?.trim()) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** 시장/수급 — extended id 고정 순서·표시 라벨 */
const MARKET_EXTENDED_ROWS: { id: string; label: string }[] = [
  { id: 'rone_price', label: '가격지수(부동산원)' },
  { id: 'rone_jeonse', label: '전세지수(부동산원)' },
  { id: 'rone_volume', label: '거래량(부동산원)' },
  { id: 'supply_unsold', label: '미분양(시군구)' },
  { id: 'supply_movein', label: '입주예정(시군구)' },
  { id: 'supply_planned', label: '분양예정(시군구)' },
  { id: 'redevelopment', label: '재건축·정비' },
  { id: 'population', label: '인구·이동' },
  { id: 'dynamic_news', label: '호재' },
  { id: 'academy_near', label: '주변 학원' },
];

type CompareTableRow =
  | { kind: 'group'; key: string; title: string }
  | {
      kind: 'field';
      key: string;
      label: string;
      render: (c: CompareItemResult) => string;
      muted?: boolean;
      hint?: string;
    }
  | { kind: 'extended'; key: string; id: string; label: string };

function formatLoanAtPrice(c: CompareItemResult) {
  const loanMan = c.loanAtPriceMan ?? c.maxPurchasableWithLoan;
  const price = formatPriceMan(loanMan);
  if (price === '-') return '-';
  if (c.ltvPercent == null) return price;
  return `${price} (LTV)`;
}

function buildCompareTableRows(
  workPlaceSet: boolean,
  maxCommuteMinutes: number | null,
): CompareTableRow[] {
  const rows: CompareTableRow[] = [];

  rows.push({ kind: 'group', key: 'g-basic', title: '기본 정보' });
  rows.push({
    kind: 'field',
    key: 'address',
    label: '주소',
    muted: true,
    render: (c) => formatCompareLocationLabel(c.shortAddress),
  });
  rows.push({ kind: 'field', key: 'area', label: '평형', render: (c) => formatArea(c.exclusiveAreaM2) });
  rows.push({
    kind: 'field',
    key: 'households',
    label: '세대수',
    render: (c) => (c.hardware?.householdCount ? `${c.hardware.householdCount.toLocaleString()}세대` : '-'),
  });
  rows.push({
    kind: 'field',
    key: 'age',
    label: '입주년차',
    render: (c) => (c.hardware?.buildingAgeYears != null ? `${c.hardware.buildingAgeYears}년` : '-'),
  });
  rows.push({
    kind: 'field',
    key: 'parking',
    label: '주차',
    render: (c) => formatCompareParking(c),
  });

  rows.push({ kind: 'group', key: 'g-price', title: '가격/갭' });
  rows.push({ kind: 'field', key: 'avg', label: '최근 평균', render: (c) => formatPriceMan(c.avgPrice1m) });
  rows.push({ kind: 'field', key: 'gap', label: '갭가격', render: (c) => formatPriceMan(c.gapPriceMan) });
  rows.push({ kind: 'field', key: 'jeonse', label: '전세가율', render: (c) => formatPercent(c.jeonseRatePercent) });
  rows.push({
    kind: 'field',
    key: 'loan',
    label: '대출',
    hint: LOAN_ROW_HINT,
    render: (c) => formatLoanAtPrice(c),
  });
  rows.push({ kind: 'field', key: 'rise6', label: '상승률(6월)', render: (c) => formatRise(c.riseRate6m) });
  rows.push({
    kind: 'field',
    key: 'trade6',
    label: '거래량(6월)',
    render: (c) => (c.tradeCount6m != null ? String(c.tradeCount6m) : '-'),
  });
  rows.push({ kind: 'field', key: 'priceMonth', label: '시세 기준', render: (c) => c.avgPriceMonth || '-' });

  rows.push({ kind: 'group', key: 'g-location', title: '입지/교통' });
  rows.push({ kind: 'field', key: 'elem', label: '초품아(도보)', render: (c) => formatElementaryWalkMinutes(c) });
  if (workPlaceSet) {
    rows.push({
      kind: 'field',
      key: 'commute-t',
      label: '출근(교통)',
      render: (c) => formatCommute(c.commuteMinutesTransit ?? null, maxCommuteMinutes),
    });
    rows.push({
      kind: 'field',
      key: 'commute-c',
      label: '출근(승용)',
      render: (c) => formatCommute(c.commuteMinutesCar ?? c.commuteMinutes, maxCommuteMinutes),
    });
  }

  rows.push({ kind: 'group', key: 'g-market', title: '시장/수급' });
  for (const { id, label } of MARKET_EXTENDED_ROWS) {
    rows.push({ kind: 'extended', key: `ext-${id}`, id, label });
  }

  return rows;
}

export default function ApartmentCompareClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const savedId = searchParams.get('saved');
  const cardsCapture = searchParams.get('cards') === '1';
  const goBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  }, [router]);

  const openCompareCards = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('cards', '1');
    params.set('preview', '1');
    router.push(`/compare/apartments?${params.toString()}`);
  }, [router, searchParams]);

  const closeCompareCards = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('cards');
    params.delete('preview');
    const q = params.toString();
    router.replace(q ? `/compare/apartments?${q}` : '/compare/apartments');
  }, [router, searchParams]);

  const [basket, setBasket] = useState<ApartmentCompareBasketItem[]>([]);
  const [profile, setProfile] = useState<ApartmentCompareProfile>({ firstTimeBuyer: true });
  const patchCompareProfile = useCallback((patch: Partial<ApartmentCompareProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      saveCompareProfile(next);
      return next;
    });
  }, []);
  const [results, setResults] = useState<CompareItemResult[]>([]);
  const [scoring, setScoring] = useState<CompareScoringPayload | null>(null);
  const [compareProfile, setCompareProfile] = useState<CompareProfileResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [areaPickPending, setAreaPickPending] = useState<ApartmentComparePickPayload | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isMapCollapsed, setIsMapCollapsed] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [newsModal, setNewsModal] = useState<{
    complexName: string;
    items: { title: string; date?: string | null; url?: string | null }[];
  } | null>(null);
  const [redevModal, setRedevModal] = useState<{
    complexName: string;
    isInZone?: boolean;
    projects: { title: string; stage?: string | null; gosiDate?: string | null }[];
  } | null>(null);
  const [openRowHintKey, setOpenRowHintKey] = useState<string | null>(null);
  const [showCompareFeedbackModal, setShowCompareFeedbackModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [savingCompare, setSavingCompare] = useState(false);
  const [reportHrefs, setReportHrefs] = useState<Record<string, string>>({});
  const [isComparePromptOpen, setIsComparePromptOpen] = useState(false);
  const [isCompareAiSummaryOpen, setIsCompareAiSummaryOpen] = useState(false);
  const [compareAiSummaryText, setCompareAiSummaryText] = useState('');
  const [compareAiSummaryLoading, setCompareAiSummaryLoading] = useState(false);
  const [compareAiSummaryError, setCompareAiSummaryError] = useState<string | null>(null);
  const isMapManuallyToggledRef = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!isMapManuallyToggledRef.current && !isMapCollapsed && window.scrollY > 150) {
        setIsMapCollapsed(true);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMapCollapsed]);

  const refreshBasketFromStorage = useCallback(() => {
    setBasket(loadCompareBasket());
  }, []);

  useEffect(() => {
    if (savedId) return;
    refreshBasketFromStorage();
    const p = loadCompareProfile();
    setProfile(p);
    const onBasket = () => refreshBasketFromStorage();
    const onProfile = () => setProfile(loadCompareProfile());
    window.addEventListener('apartment-compare-updated', onBasket);
    window.addEventListener('apartment-compare-profile-updated', onProfile);
    return () => {
      window.removeEventListener('apartment-compare-updated', onBasket);
      window.removeEventListener('apartment-compare-profile-updated', onProfile);
    };
  }, [refreshBasketFromStorage, savedId]);

  useEffect(() => {
    if (!savedId) return;
    let cancelled = false;
    (async () => {
      try {
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const res = await fetch(`/api/land/detective/discovery/${savedId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (cancelled) return;
        if (isApartmentCompareHistoryResult(data)) {
          restoreCompareFromHistory(data);
          setBasket(loadCompareBasket());
          setProfile(loadCompareProfile());
        } else {
          setError('저장된 비교 기록을 찾을 수 없습니다.');
          refreshBasketFromStorage();
          setProfile(loadCompareProfile());
        }
      } catch {
        if (!cancelled) {
          setError('저장된 비교를 불러오지 못했습니다.');
          refreshBasketFromStorage();
          setProfile(loadCompareProfile());
        }
      }
    })();
    const onBasket = () => refreshBasketFromStorage();
    const onProfile = () => setProfile(loadCompareProfile());
    window.addEventListener('apartment-compare-updated', onBasket);
    window.addEventListener('apartment-compare-profile-updated', onProfile);
    return () => {
      cancelled = true;
      window.removeEventListener('apartment-compare-updated', onBasket);
      window.removeEventListener('apartment-compare-profile-updated', onProfile);
    };
  }, [savedId, refreshBasketFromStorage]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const handleSaveCompare = useCallback(async () => {
    if (!user) {
      router.push('/login?return=/compare/apartments');
      return;
    }
    if (basket.length === 0) {
      showToast('비교할 단지가 없습니다.');
      return;
    }
    setSavingCompare(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/land/detective/apartment-compare/history', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: basketItemsForSave(basket),
          profile,
          snapshot: {
            itemCount: basket.length,
            scoring: scoring ?? undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '저장에 실패했습니다.');
      }
      showToast('발견 기록에 저장했습니다.');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setSavingCompare(false);
    }
  }, [user, basket, profile, scoring, router, showToast]);

  const fetchCompare = useCallback(async (items: ApartmentCompareBasketItem[], prof: ApartmentCompareProfile) => {
    if (items.length === 0) {
      setResults([]);
      setScoring(null);
      setCompareProfile(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('items', JSON.stringify(basketToCompareQueryItems(items)));
      params.set('extended', '1');
      if (prof.firstTimeBuyer) params.set('firstTimeBuyer', '1');
      else params.set('firstTimeBuyer', '0');
      if (prof.workLat != null && prof.workLng != null) {
        params.set('workLat', String(prof.workLat));
        params.set('workLng', String(prof.workLng));
      }

      const res = await fetch(`/api/land/detective/apartment-compare?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '비교 데이터를 불러오지 못했습니다.');
      }
      setResults(data.items || []);
      setScoring(parseCompareScoring(data.scoring));
      setCompareProfile(data.profile || null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
      setResults([]);
      setScoring(null);
      setCompareProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompare(basket, profile);
  }, [basket, profile, fetchCompare]);

  const maxCommuteMinutes = parseMaxCommuteMinutes(profile.maxCommuteMinutes);

  const workPlaceSet = profile.workLat != null && profile.workLng != null;

  const tableRows = useMemo(
    () => buildCompareTableRows(workPlaceSet, maxCommuteMinutes),
    [workPlaceSet, maxCommuteMinutes],
  );

  const columns = useMemo(() => {
    return basket.map((b, idx) => {
      const r = results[idx];
      return { basket: b, data: r || { complexName: b.complexName, exclusiveAreaM2: b.exclusiveAreaM2 } };
    });
  }, [basket, results]);

  const narrativeColumns = useMemo((): CompareNarrativeColumn[] => {
    return columns.map(({ basket: b, data: c }, idx) => {
      const scoringItem = scoring?.items?.find(
        (it) =>
          (b.masterId && it.masterId === b.masterId) ||
          (b.rtmsAptSeq && it.rtmsAptSeq === b.rtmsAptSeq) ||
          (it.complexName && c.complexName && it.complexName === c.complexName),
      );
      return {
        aptKey: b.key || String(idx),
        complexName: c.complexName || b.complexName || '단지',
        data: c,
        scoring: scoringItem ?? null,
      };
    });
  }, [columns, scoring?.items]);

  const comparePromptInput = useMemo(() => {
    if (loading || basket.length === 0) return null;

    const promptColumns = columns.map(({ basket: b, data: c }) => ({
      name: c.complexName || b.complexName || '단지',
    }));

    const promptTableRows: ComparePromptTableRow[] = tableRows.map((row) => {
      if (row.kind === 'group') return { kind: 'group', title: row.title };
      if (row.kind === 'field') {
        return {
          kind: 'field',
          label: row.label,
          values: columns.map(({ data: c }) => row.render(c as CompareItemResult)),
        };
      }
      return {
        kind: 'field',
        label: row.label,
        values: columns.map(({ data: c }) => {
          const extRow = c.extended?.rows?.find((r) => r.id === row.id);
          return extRow?.value || '-';
        }),
      };
    });

    return {
      columns: promptColumns,
      tableRows: promptTableRows,
      profile,
      scoring,
      workplaceLabel: profile.workplaceLabel,
      workPlaceSet,
      maxCommuteMinutes,
      mortgageDisclaimer: compareProfile?.mortgageDisclaimer,
    };
  }, [
    loading,
    basket.length,
    columns,
    tableRows,
    profile,
    scoring,
    workPlaceSet,
    maxCommuteMinutes,
    compareProfile?.mortgageDisclaimer,
  ]);

  const comparePromptText = useMemo(
    () => (comparePromptInput ? buildApartmentComparePromptText(comparePromptInput) : ''),
    [comparePromptInput],
  );

  const handleOpenExternalAiChat = useCallback(async (provider: ExternalAiChatProvider) => {
    if (!comparePromptText) return;
    const result = await openExternalAiChatWithPrompt(provider, comparePromptText);
    showToast(externalAiChatToastMessage(result));
  }, [comparePromptText, showToast]);

  const compareAdminAiPrompt = useMemo(
    () => (comparePromptInput ? buildApartmentCompareAdminAiPrompt(comparePromptInput) : ''),
    [comparePromptInput],
  );

  const isAdmin = isAdminUser(user?.uid);

  const compareCardFilenamePrefix = useMemo(() => {
    if (!scoring?.items?.length) return undefined;
    return scoring.items
      .map((item) => (item.complexName || '단지').replace(/\s/g, '').slice(0, 8))
      .join('_vs_')
      .slice(0, 48);
  }, [scoring?.items]);

  const compareCardCover = useMemo(() => {
    if (!scoring?.items?.length) return null;
    return {
      workplaceLabel: profile.workplaceLabel,
      maxCommuteMinutes,
      complexNames: scoring.items.map((item) => item.complexName || '단지'),
    };
  }, [scoring?.items, profile.workplaceLabel, maxCommuteMinutes]);

  const canOpenCompareCards = Boolean(scoring?.items?.length) && !loading;

  const comparePromptFilename = useMemo(
    () => buildApartmentComparePromptFilename(
      columns.map(({ basket: b, data: c }) => ({
        name: c.complexName || b.complexName || '단지',
      })),
    ),
    [columns],
  );

  const compareAiSummaryFilename = useMemo(
    () => buildApartmentCompareSummaryFilename(
      columns.map(({ basket: b, data: c }) => ({
        name: c.complexName || b.complexName || '단지',
      })),
    ),
    [columns],
  );

  const handleGenerateCompareAiSummary = useCallback(async () => {
    if (!user || !compareAdminAiPrompt || compareAiSummaryLoading) return;

    setCompareAiSummaryLoading(true);
    setCompareAiSummaryError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/compare/apartments/admin-summary', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: compareAdminAiPrompt }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'AI 글 생성에 실패했습니다.');
      }
      setCompareAiSummaryText(String(data.text || ''));
    } catch (e: unknown) {
      setCompareAiSummaryError(e instanceof Error ? e.message : 'AI 글 생성에 실패했습니다.');
    } finally {
      setCompareAiSummaryLoading(false);
    }
  }, [user, compareAdminAiPrompt, compareAiSummaryLoading]);

  const openCompareAiSummary = useCallback(() => {
    setCompareAiSummaryError(null);
    setIsCompareAiSummaryOpen(true);
  }, []);

  useEffect(() => {
    setCompareAiSummaryText('');
    setCompareAiSummaryError(null);
  }, [compareAdminAiPrompt]);

  useEffect(() => {
    if (basket.length === 0) {
      setReportHrefs({});
      return;
    }

    let cancelled = false;
    (async () => {
      const authHeaders: HeadersInit = {};
      if (user) {
        try {
          const token = await user.getIdToken();
          authHeaders.Authorization = `Bearer ${token}`;
        } catch {
          /* optional auth */
        }
      }

      const entries = await Promise.all(
        basket.map(async (b, idx) => {
          const c = results[idx];
          const href = await resolveCompareReportHref(
            {
              pnu: c?.pnu,
              complexName: c?.complexName || b.complexName,
              latestReportId: c?.latestReportId,
              latestCompletedReportId: c?.latestCompletedReportId,
            },
            { headers: authHeaders },
          );
          return [b.key, href] as const;
        }),
      );

      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const [key, href] of entries) {
        if (href) next[key] = href;
      }
      setReportHrefs(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [basket, results, user]);

  type CompareMapPoint = { lat: number; lng: number; label: string; key: string };

  const compareMapPoints = useMemo((): CompareMapPoint[] => {
    const pts: CompareMapPoint[] = [];
    for (const { basket: b, data: c } of columns) {
      const lat = c.lat != null ? Number(c.lat) : NaN;
      const lng = c.lng != null ? Number(c.lng) : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      pts.push({
        lat,
        lng,
        label: c.complexName || b.complexName || '단지',
        key: b.key,
      });
    }
    if (profile.workLat != null && profile.workLng != null) {
      pts.push({
        lat: profile.workLat,
        lng: profile.workLng,
        label: profile.workplaceLabel || '직장',
        key: '__workplace__',
      });
    }
    return pts;
  }, [columns, profile.workLat, profile.workLng, profile.workplaceLabel]);

  const apartmentCompareMarkers = useMemo((): ApartmentCompareMapMarker[] => {
    const markers: ApartmentCompareMapMarker[] = [];
    columns.forEach(({ basket: b, data: c }, idx) => {
      const lat = c.lat != null ? Number(c.lat) : NaN;
      const lng = c.lng != null ? Number(c.lng) : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const area = formatArea(c.exclusiveAreaM2 ?? b.exclusiveAreaM2);
      const price = formatPriceMan(c.avgPrice1m);
      markers.push({
        lat,
        lng,
        label: c.complexName || b.complexName || '단지',
        index: idx + 1,
        subtitle: price !== '-' ? `${area} · ${price}` : area,
      });
    });
    if (profile.workLat != null && profile.workLng != null) {
      markers.push({
        lat: profile.workLat,
        lng: profile.workLng,
        label: profile.workplaceLabel || '직장',
        isWorkplace: true,
      });
    }
    return markers;
  }, [columns, profile.workLat, profile.workLng, profile.workplaceLabel]);

  const compareMapData = useMemo(() => {
    if (apartmentCompareMarkers.length === 0) return null;
    const first = apartmentCompareMarkers.find((m) => !m.isWorkplace) ?? apartmentCompareMarkers[0];
    return {
      target: {
        lat: first.lat,
        lng: first.lng,
        address: first.label,
        platPlc: first.label,
      },
    };
  }, [apartmentCompareMarkers]);

  const mapExpandLabel = useMemo(() => {
    if (compareMapPoints.length === 0) return '비교 지도 펼쳐보기';
    if (compareMapPoints.length === 1) return `${compareMapPoints[0].label} 지도 펼쳐보기`;
    return `후보 ${compareMapPoints.filter((p) => p.key !== '__workplace__').length}개 단지 지도 펼쳐보기`;
  }, [compareMapPoints]);

  const panelClass =
    'rounded-[20px] sm:rounded-[24px] border border-white/[0.08] bg-[#0f172a]/60 shadow-lg shadow-black/20';
  const summaryPanelClass = `${panelClass} overflow-hidden`;
  const sectionTitleClass =
    'text-[10px] font-extrabold text-emerald-400/90 mb-4 uppercase tracking-wider';
  const tableShell = `${panelClass} overflow-hidden`;
  const tableInner = 'overflow-x-auto';
  const thCell = 'p-3 text-left align-top min-w-[140px]';
  const rowLabel =
    'p-3 text-white/45 font-extrabold text-xs w-36 bg-white/[0.02] border-r border-white/5';
  const rowValue = 'p-3 font-semibold text-white/90 text-sm';
  const rowValueMuted = 'p-3 text-white/75 font-medium text-xs leading-relaxed';
  const rowBorder = 'border-t border-white/5';

  if (cardsCapture) {
    if (loading || (basket.length > 0 && !scoring)) {
      return (
        <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-white/40 text-sm font-bold">
          점수 카드 준비 중…
        </div>
      );
    }

    if (!scoring?.items?.length) {
      return (
        <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-6 text-center">
          <div className="max-w-md">
            <p className="text-white font-bold mb-2">점수 카드를 만들 수 없습니다</p>
            <p className="text-white/45 text-sm mb-6">비교함에 단지를 담고 점수가 계산된 뒤 다시 시도해 주세요.</p>
            <button
              type="button"
              onClick={closeCompareCards}
              className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-bold"
            >
              비교 페이지로
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0a0a0c]">
        <CompareScoreFrameView
          items={scoring.items}
          filenamePrefix={compareCardFilenamePrefix}
          cover={compareCardCover}
          onClose={closeCompareCards}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-sky-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-sky-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      <nav className="sticky top-0 z-50 bg-[#0a0a0c]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            className="group flex items-center gap-2 text-slate-400 hover:text-white transition-all shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-105 transition-all">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="hidden sm:inline font-bold text-sm">돌아가기</span>
          </button>
          <h1 className="flex-1 text-center text-sm font-black text-white tracking-tight truncate px-2">
            아파트 단지 비교
          </h1>
          <div className="flex items-center justify-end gap-1 shrink-0">
            {isAdmin && (
              <button
                type="button"
                disabled={!compareAdminAiPrompt || !user}
                onClick={openCompareAiSummary}
                title="AI 카페 글 생성 (관리자)"
                aria-label="AI 카페 글 생성"
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-violet-400/25 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" strokeWidth={2.25} />
              </button>
            )}
            <button
              type="button"
              disabled={!canOpenCompareCards}
              onClick={openCompareCards}
              title="간편 카드 보기"
              aria-label="간편 카드 보기"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-emerald-400/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <Image className="w-3.5 h-3.5" strokeWidth={2.25} />
            </button>
            <button
              type="button"
              disabled={!comparePromptText}
              onClick={() => handleOpenExternalAiChat('chatgpt')}
              title="ChatGPT에 질문 (프롬프트 복사)"
              aria-label="ChatGPT에 질문"
              className="inline-flex items-center justify-center min-w-[2rem] h-8 px-1.5 rounded-lg border border-white/15 bg-white/[0.04] text-[10px] font-black text-white/75 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              GPT
            </button>
            <button
              type="button"
              disabled={!comparePromptText}
              onClick={() => handleOpenExternalAiChat('claude')}
              title="Claude에 질문 (프롬프트 복사)"
              aria-label="Claude에 질문"
              className="inline-flex items-center justify-center min-w-[2rem] h-8 px-1.5 rounded-lg border border-orange-400/25 bg-orange-500/10 text-[10px] font-black text-orange-200 hover:bg-orange-500/20 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <span className="hidden sm:inline">Claude</span>
              <span className="sm:hidden">C</span>
            </button>
            <button
              type="button"
              disabled={!comparePromptText}
              onClick={() => handleOpenExternalAiChat('gemini')}
              title="Gemini에 질문 (프롬프트 복사)"
              aria-label="Gemini에 질문"
              className="inline-flex items-center justify-center min-w-[2rem] h-8 px-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 text-[10px] font-black text-sky-200 hover:bg-sky-500/20 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <span className="hidden sm:inline">Gemini</span>
              <span className="sm:hidden">G</span>
            </button>
            <button
              type="button"
              disabled={!comparePromptText}
              onClick={() => setIsComparePromptOpen(true)}
              title="프롬프트 다운로드"
              aria-label="프롬프트 다운로드"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-sky-400/25 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-4">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{
            opacity: 1,
            y: 0,
            height: isMapCollapsed ? '0px' : isMobile ? '320px' : '400px',
          }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[20px] sm:rounded-[32px] border border-white/[0.08] bg-[#0f172a]/50 mb-2"
        >
          {compareMapData ? (
            <ComparableMap
              mapData={compareMapData}
              category="apartment"
              className="w-full h-full min-h-[240px]"
              apartmentCompareMarkers={apartmentCompareMarkers}
              onToggleFullscreen={() => setIsMapModalOpen(true)}
              draggable
              controlsPosition="top-right"
              isCollapsed={isMapCollapsed}
              fitAllMarkers
            />
          ) : (
            <div className="w-full h-full min-h-[240px] flex flex-col items-center justify-center text-slate-500 text-sm p-6 text-center">
              <p className="font-bold text-white/45">비교 단지 위치</p>
              <p className="text-xs text-white/30 mt-2">홈에서 단지를 비교함에 담으면 지도에 표시됩니다.</p>
            </div>
          )}

          {!isMapCollapsed && compareMapData && (
            <button
              type="button"
              onClick={() => {
                setIsMapCollapsed(true);
                isMapManuallyToggledRef.current = true;
              }}
              className="absolute top-4 right-4 z-[30] flex items-center gap-1.5 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white text-xs font-bold rounded-full border border-white/10 shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              지도 접기
            </button>
          )}
        </motion.div>

        {isMapCollapsed && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mb-4">
            <button
              type="button"
              onClick={() => {
                setIsMapCollapsed(false);
                isMapManuallyToggledRef.current = true;
              }}
              className="w-full py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-black tracking-wide flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              <span className="truncate max-w-[calc(100%-2rem)]">{mapExpandLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            </button>
          </motion.div>
        )}
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-5 pb-24">
          <section className={`${panelClass} p-4 sm:p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-white/5">
              <h2 className="text-sm font-black text-white">비교 조건</h2>
              <Link
                href="/?panel=compare"
                className="text-xs text-white/40 font-bold hover:text-emerald-400 transition-colors"
              >
                읍면동·상급지 비교 ↗
              </Link>
            </div>
            <CompareProfileBar
              variant="compare"
              theme="dark"
              showCompareTableLink={false}
              mortgageDisclaimer={compareProfile?.mortgageDisclaimer}
              showMortgageFooter={false}
            />
            <CompareProfileSummaryChips className="mt-4" />
            <p className="text-[10px] text-white/30 leading-relaxed mt-3">
              {(compareProfile?.mortgageDisclaimer?.trim() || MORTGAGE_DISCLAIMER).trim()}
            </p>
          </section>

          {basket.length === 0 ? (
            <div className={`${panelClass} text-center py-16 border-dashed`}>
              <p className="text-white/80 font-extrabold mb-2">비교함이 비어 있습니다</p>
              <p className="text-white/45 text-sm mb-6 font-semibold">
                홈 리스트에서 아파트 카드의 「비교」를 눌러 담아주세요.
              </p>
              <Link
                href="/"
                className="inline-block bg-emerald-500 text-slate-900 font-extrabold px-6 py-3 rounded-xl text-xs tracking-wide hover:bg-emerald-400 shadow-md shadow-emerald-500/20 transition-all"
              >
                매물 보러 가기
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-rose-300 text-sm font-bold">
                  {error}
                </div>
              )}
              {loading && (
                <p className="text-white/40 text-xs font-bold animate-pulse">시세 불러오는 중…</p>
              )}

              {scoring && !loading && (
                <div className="space-y-4">
                  <section className={`${summaryPanelClass} p-4 sm:p-5`}>
                    <div>
                      <h2 className="text-sm font-black text-white">비교 요약</h2>
                      <p className="text-[10px] text-white/35 mt-1 leading-relaxed">
                        {scoring.disclaimer?.trim() ||
                          '참고용 규칙 점수입니다. 투자 권유가 아닙니다.'}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3 mt-4">
                      {(
                        [
                          ['investmentTop', '상승 가능성', scoring.badges?.investmentTop],
                          ['livabilityTop', '실거주 적합도', scoring.badges?.livabilityTop],
                          ['stabilityTop', '안정형(리스크↓)', scoring.badges?.stabilityTop],
                        ] as const
                      ).map(([key, title, badge]) =>
                        badge ? (
                          <div
                            key={key}
                            className="rounded-[14px] border border-white/10 bg-white/[0.03] p-3"
                          >
                            <p className="text-[10px] font-bold text-emerald-400/90">{title}</p>
                            <p className="text-sm font-black text-white mt-1 truncate">
                              {formatComplexShortName(badge.complexName)} - {formatScore(badge.score)}점
                            </p>
                          </div>
                        ) : null,
                      )}
                    </div>
                  </section>

                  {scoring.items && scoring.items.length > 0 && (
                    <section className={`${summaryPanelClass} p-4 sm:p-5`}>
                      <CompareScoreOverviewSection items={scoring.items} onOpenCards={openCompareCards} />
                    </section>
                  )}

                  {narrativeColumns.length > 0 && (
                    <section className={`${summaryPanelClass} p-4 sm:p-5`}>
                      <CompareNarrativeOverviewSection
                        columns={narrativeColumns}
                        workPlaceSet={workPlaceSet}
                      />
                    </section>
                  )}
                </div>
              )}

              {!scoring && !loading && narrativeColumns.length > 0 && (
                <section className={`${summaryPanelClass} p-4 sm:p-5`}>
                  <CompareNarrativeOverviewSection
                    columns={narrativeColumns}
                    workPlaceSet={workPlaceSet}
                  />
                </section>
              )}

              <section className={tableShell}>
                <div className="px-4 pt-4 pb-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-black text-white">단지 비교</h2>
                    <button
                      type="button"
                      aria-label="단지 비교 안내"
                      onClick={() => setShowCompareFeedbackModal(true)}
                      className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-white/10 text-white/45 hover:bg-white/15 hover:text-white/75 transition-colors"
                    >
                      <AlertCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={savingCompare || basket.length === 0}
                      onClick={handleSaveCompare}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-3 py-2 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" strokeWidth={2.5} />
                      {savingCompare ? '저장 중…' : '저장하기'}
                    </button>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={profile.firstTimeBuyer !== false}
                      onClick={() => patchCompareProfile({ firstTimeBuyer: profile.firstTimeBuyer === false })}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                        profile.firstTimeBuyer !== false
                          ? 'border-emerald-500/40 bg-emerald-500/10'
                          : 'border-white/12 bg-white/[0.03]'
                      }`}
                    >
                    <span className="text-[11px] font-bold text-white/85">생애최초 LTV</span>
                    <span
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                        profile.firstTimeBuyer !== false ? 'bg-emerald-500' : 'bg-white/15'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          profile.firstTimeBuyer !== false ? 'left-[18px]' : 'left-0.5'
                        }`}
                      />
                    </span>
                  </button>
                  </div>
                </div>
                <div className={tableInner}>
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="bg-white/[0.04] border-b border-white/10">
                      <th className={`${rowLabel} rounded-none`}>항목</th>
                      {columns.map(({ basket: b, data: c }, idx) => (
                        <th key={b.key} className={thCell}>
                          <div
                            className="font-black text-white text-base tracking-tight"
                            title={c.complexName || b.complexName || '단지'}
                          >
                            {formatComplexShortName(c.complexName || b.complexName)}
                          </div>
                          {c.error && (
                            <p className="text-[10px] text-amber-400 font-bold mt-1">{c.error}</p>
                          )}
                          {!c.cardStatsAvailable && !c.error && (
                            <p className="text-[10px] text-amber-400/90 mt-1 font-semibold">
                              {c.cardStatsMessage || NO_SALE_COPY}
                            </p>
                          )}
                          <div className="flex items-center justify-left gap-1 mt-2">
                            {reportHrefs[b.key] && (
                              <Link
                                href={reportHrefs[b.key]}
                                title="리포트"
                                aria-label="리포트"
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-emerald-400/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5" strokeWidth={2} />
                              </Link>
                            )}
                            <button
                              type="button"
                              title="평형 변경"
                              aria-label="평형 변경"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-white/10 bg-white/[0.04] text-white/55 hover:text-white hover:bg-white/10 transition-colors"
                              onClick={() => setAreaPickPending({
                                editBasketKey: b.key,
                                masterId: b.masterId,
                                rtmsAptSeq: b.rtmsAptSeq,
                                complexName: b.complexName,
                                suggestedAreaM2: b.exclusiveAreaM2 ?? c.exclusiveAreaM2,
                              })}
                            >
                              <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              title="비교에서 삭제"
                              aria-label="비교에서 삭제"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-white/10 bg-white/[0.04] text-white/40 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition-colors"
                              onClick={() => setBasket(removeFromCompareBasket(b.key))}
                            >
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row) => {
                      if (row.kind === 'group') {
                        return (
                          <tr key={row.key} className="bg-white/[0.03] border-b border-white/5">
                            <td
                              colSpan={columns.length + 1}
                              className="px-3 py-2 text-[11px] font-black text-emerald-400/80 tracking-wide"
                            >
                              {row.title}
                            </td>
                          </tr>
                        );
                      }
                      const label = row.label;
                      if (row.kind === 'extended') {
                        return (
                          <tr key={row.key} className={`${rowBorder} hover:bg-white/[0.02]`}>
                            <td className={rowLabel}>{label}</td>
                            {columns.map(({ data: c, basket: b }) => {
                              const extRow = c.extended?.rows?.find((r) => r.id === row.id);
                              const value = extRow?.value || '-';
                              const newsItems =
                                row.id === 'dynamic_news'
                                  ? c.extended?.details?.dynamicNews?.items
                                  : undefined;
                              const redevProjects =
                                row.id === 'redevelopment'
                                  ? c.extended?.details?.redevelopment?.projects
                                  : undefined;
                              const canOpenNews = newsItems && newsItems.length > 0;
                              const canOpenRedev = redevProjects && redevProjects.length > 0;
                              return (
                                <td key={`${b.key}-${row.id}`} className={rowValueMuted}>
                                  {canOpenNews ? (
                                    <button
                                      type="button"
                                      className="text-left font-semibold text-emerald-400 underline decoration-emerald-500/45 underline-offset-2 hover:text-emerald-300 transition-colors"
                                      onClick={() =>
                                        setNewsModal({
                                          complexName: c.complexName || '단지',
                                          items: newsItems,
                                        })
                                      }
                                    >
                                      {value}
                                    </button>
                                  ) : canOpenRedev ? (
                                    <button
                                      type="button"
                                      className="text-left underline decoration-white/30 underline-offset-2 hover:text-emerald-300"
                                      onClick={() =>
                                        setRedevModal({
                                          complexName: c.complexName || '단지',
                                          isInZone: c.extended?.details?.redevelopment?.isInZone,
                                          projects: redevProjects,
                                        })
                                      }
                                    >
                                      {value}
                                    </button>
                                  ) : (
                                    value
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      }
                      return (
                        <tr key={row.key} className={`${rowBorder} hover:bg-white/[0.02]`}>
                          <td className={`${rowLabel} align-top`}>
                            <div className="flex items-start gap-1">
                              <span>{label}</span>
                              {row.hint && (
                                <button
                                  type="button"
                                  aria-expanded={openRowHintKey === row.key}
                                  aria-label={`${label} 안내`}
                                  onClick={() =>
                                    setOpenRowHintKey((k) => (k === row.key ? null : row.key))
                                  }
                                  className="shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center bg-white/10 text-white/45 hover:bg-white/15 hover:text-white/75 transition-colors"
                                >
                                  <AlertCircle className="w-3 h-3" strokeWidth={2.5} />
                                </button>
                              )}
                            </div>
                            {row.hint && openRowHintKey === row.key && (
                              <p className="mt-2 text-[10px] text-white/45 font-semibold leading-relaxed pr-1">
                                {row.hint}
                              </p>
                            )}
                          </td>
                          {columns.map(({ data: c, basket: b }) => (
                            <td
                              key={`${b.key}-${row.key}`}
                              className={row.muted ? rowValueMuted : rowValue}
                            >
                              {row.render(c as CompareItemResult)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </section>

              <div className="flex justify-center sm:justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm('비교함을 모두 비울까요?')) return;
                    saveCompareBasket([]);
                    setBasket([]);
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-rose-500/10 hover:border-rose-500/30 text-white/70 hover:text-rose-300 text-xs font-extrabold tracking-wide transition-all active:scale-[0.98]"
                >
                  비교함 비우기
                </button>
              </div>
            </>
          )}
        </div>

      <ApartmentAreaPickModal
        pending={areaPickPending}
        onClose={() => setAreaPickPending(null)}
        onAdded={(msg) => {
          refreshBasketFromStorage();
          showToast(msg);
        }}
        onError={showToast}
      />
      {toast && (
        <div className="fixed bottom-10 left-4 right-4 z-[130] max-w-sm mx-auto pointer-events-none">
          <div className="bg-slate-900/95 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold shadow-2xl text-center">
            {toast}
          </div>
        </div>
      )}

      {showCompareFeedbackModal && (
        <div
          className="fixed inset-0 z-[115] bg-black/70 flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal
          aria-labelledby="compare-feedback-modal-title"
          onClick={() => setShowCompareFeedbackModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h2 id="compare-feedback-modal-title" className="text-sm font-black text-white">
                단지 비교
              </h2>
              <button
                type="button"
                onClick={() => setShowCompareFeedbackModal(false)}
                className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-xs text-white/55 leading-relaxed">
                시세·세대수·입지 등 표시 값이 실제와 다르거나 오류가 있다면 알려 주세요. 리뷰 게시판에서
                신고해 주시면 확인 후 반영하겠습니다.
              </p>
              <Link
                href="/reviews"
                onClick={() => setShowCompareFeedbackModal(false)}
                className="flex w-full items-center justify-center rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black py-3 transition-colors"
              >
                오류 정보 신고해 주세요
              </Link>
            </div>
          </div>
        </div>
      )}

      {newsModal && (
        <div
          className="fixed inset-0 z-[115] bg-black/70 flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal
          aria-labelledby="compare-news-modal-title"
        >
          <div className="w-full max-w-md max-h-[70vh] overflow-hidden rounded-2xl bg-slate-900 border border-white/10 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h2 id="compare-news-modal-title" className="text-sm font-black text-white truncate pr-2">
                호재 · {newsModal.complexName}
              </h2>
              <button
                type="button"
                onClick={() => setNewsModal(null)}
                className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="overflow-y-auto p-4 space-y-3">
              {newsModal.items.map((item, i) => (
                <li key={`${item.title}-${i}`} className="text-xs leading-relaxed">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-emerald-300 hover:underline"
                    >
                      {item.title}
                    </a>
                  ) : (
                    <span className="font-bold text-white/90">{item.title}</span>
                  )}
                  {item.date && (
                    <span className="block text-[10px] text-white/40 mt-0.5">{item.date}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {redevModal && (
        <div
          className="fixed inset-0 z-[115] bg-black/70 flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal
        >
          <div className="w-full max-w-md max-h-[70vh] overflow-hidden rounded-2xl bg-slate-900 border border-white/10 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h2 className="text-sm font-black text-white truncate pr-2">
                재건축·정비 · {redevModal.complexName}
                {redevModal.isInZone ? ' · 구역포함' : ''}
              </h2>
              <button
                type="button"
                onClick={() => setRedevModal(null)}
                className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="overflow-y-auto p-4 space-y-3">
              {redevModal.projects.map((p, i) => (
                <li key={`${p.title}-${i}`} className="text-xs leading-relaxed text-white/85">
                  <span className="font-bold">{p.title}</span>
                  {(p.stage || p.gosiDate) && (
                    <span className="block text-[10px] text-white/40 mt-0.5">
                      {[p.stage, p.gosiDate].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {isMapModalOpen && compareMapData && (
        <div className="fixed inset-0 z-[120] bg-black/90 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-sm font-bold text-white">단지 비교 지도</span>
            <button
              type="button"
              onClick={() => setIsMapModalOpen(false)}
              className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <ComparableMap
              mapData={compareMapData}
              category="apartment"
              className="w-full h-full"
              apartmentCompareMarkers={apartmentCompareMarkers}
              onToggleFullscreen={() => setIsMapModalOpen(false)}
              isFullscreen
              draggable
              fitAllMarkers
            />
          </div>
        </div>
      )}

      <AnimatePresence>
        {isComparePromptOpen && comparePromptText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-end md:items-center md:justify-center bg-black/55 backdrop-blur-sm p-0 md:p-6"
            onClick={() => setIsComparePromptOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative w-full md:max-w-lg max-h-[88vh] flex flex-col overflow-hidden rounded-t-[28px] md:rounded-[28px] border border-white/[0.08] bg-[#0f172a]/95 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/[0.08] via-transparent to-transparent" />
              <div className="md:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/15" />
              </div>

              <div className="relative z-10 flex items-start justify-between gap-3 px-5 pt-4 pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/25 via-cyan-500/10 to-transparent border border-sky-400/30 flex items-center justify-center">
                    <Download className="w-5 h-5 text-sky-300" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-white tracking-tight">비교 프롬프트</h2>
                    <p className="text-[11px] text-white/45 mt-0.5">ChatGPT·Claude 등에 붙여넣기</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsComparePromptOpen(false)}
                  className="shrink-0 w-9 h-9 rounded-xl border border-white/10 bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
                  aria-label="닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar px-5 py-4">
                <div className="rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-500/[0.12] via-sky-500/[0.05] to-transparent p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <pre className="whitespace-pre-wrap break-words text-[13px] leading-[1.75] text-white/85 font-sans select-text">
                    {comparePromptText}
                  </pre>
                </div>
              </div>

              <div className="relative z-10 flex items-center gap-2 px-5 py-4 border-t border-white/[0.06] bg-[#0a0f1a]/80 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setIsComparePromptOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-white/55 hover:text-white/85 hover:bg-white/[0.05] transition-colors"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await copyApartmentComparePrompt(comparePromptText);
                      showToast('프롬프트가 클립보드에 복사되었습니다.');
                    } catch {
                      showToast('복사에 실패했습니다.');
                    }
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-bold text-white border border-white/10 bg-white/[0.06] hover:bg-white/10 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  복사
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadApartmentComparePrompt(comparePromptText, comparePromptFilename);
                    showToast('프롬프트 파일을 다운로드했습니다.');
                    setIsComparePromptOpen(false);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-bold text-white bg-sky-500 hover:bg-sky-400 shadow-lg shadow-sky-500/20 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  .txt
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCompareAiSummaryOpen && isAdmin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-end md:items-center md:justify-center bg-black/55 backdrop-blur-sm p-0 md:p-6"
            onClick={() => setIsCompareAiSummaryOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative w-full md:max-w-lg max-h-[88vh] flex flex-col overflow-hidden rounded-t-[28px] md:rounded-[28px] border border-white/[0.08] bg-[#0f172a]/95 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/[0.08] via-transparent to-transparent" />
              <div className="md:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/15" />
              </div>

              <div className="relative z-10 flex items-start justify-between gap-3 px-5 pt-4 pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/25 via-fuchsia-500/10 to-transparent border border-violet-400/30 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-violet-300" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-white tracking-tight">AI 카페 글</h2>
                    <p className="text-[11px] text-white/45 mt-0.5">관리자 · Flash · 읽기 쉬운 평문</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCompareAiSummaryOpen(false)}
                  className="shrink-0 w-9 h-9 rounded-xl border border-white/10 bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
                  aria-label="닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar px-5 py-4">
                {compareAiSummaryError && (
                  <div className="mb-3 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-rose-300 text-xs font-semibold">
                    {compareAiSummaryError}
                  </div>
                )}

                {compareAiSummaryLoading && (
                  <div className="flex flex-col items-center justify-center py-16 text-white/45 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
                    <p className="text-sm font-bold">카페용 글 생성 중…</p>
                  </div>
                )}

                {!compareAiSummaryLoading && compareAiSummaryText && (
                  <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.12] via-violet-500/[0.05] to-transparent p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <pre className="whitespace-pre-wrap break-words text-[13px] leading-[1.75] text-white/85 font-sans select-text">
                      {compareAiSummaryText}
                    </pre>
                  </div>
                )}

                {!compareAiSummaryLoading && !compareAiSummaryText && (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
                    <p className="text-sm font-bold text-white/70 mb-1">비교 데이터 기준 카페 본문</p>
                    <p className="text-[11px] text-white/40 leading-relaxed mb-4">
                      점수 카드 PNG 업로드 후, 이 글을 본문에 붙여넣으세요.
                    </p>
                    <button
                      type="button"
                      disabled={!compareAdminAiPrompt || !user}
                      onClick={handleGenerateCompareAiSummary}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white text-sm font-bold transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      AI 글 생성
                    </button>
                  </div>
                )}
              </div>

              <div className="relative z-10 flex items-center gap-2 px-5 py-4 border-t border-white/[0.06] bg-[#0a0f1a]/80 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setIsCompareAiSummaryOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-white/55 hover:text-white/85 hover:bg-white/[0.05] transition-colors"
                >
                  닫기
                </button>
                {!compareAiSummaryText && !compareAiSummaryLoading && (
                  <button
                    type="button"
                    disabled={!compareAdminAiPrompt || !user}
                    onClick={handleGenerateCompareAiSummary}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-bold text-white bg-violet-500 hover:bg-violet-400 disabled:opacity-40 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    생성
                  </button>
                )}
                {compareAiSummaryText && (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await copyApartmentComparePrompt(compareAiSummaryText);
                          showToast('본문이 클립보드에 복사되었습니다.');
                        } catch {
                          showToast('복사에 실패했습니다.');
                        }
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-bold text-white border border-white/10 bg-white/[0.06] hover:bg-white/10 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      복사
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        downloadApartmentComparePrompt(compareAiSummaryText, compareAiSummaryFilename);
                        showToast('본문 파일을 다운로드했습니다.');
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-bold text-white bg-violet-500 hover:bg-violet-400 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      .txt
                    </button>
                    <button
                      type="button"
                      disabled={compareAiSummaryLoading}
                      onClick={handleGenerateCompareAiSummary}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl text-sm font-bold text-violet-200 border border-violet-400/25 bg-violet-500/10 hover:bg-violet-500/20 disabled:opacity-40 transition-colors"
                      title="다시 생성"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
