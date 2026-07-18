'use client';
import { Suspense, useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SideNav from '../../../components/SideNav';
import { auth } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import CategoryDetailModal from './CategoryDetailModal';
import MarketRonePanel from '../../../components/MarketRonePanel';
import RealTradesPanel from '../../../components/RealTradesPanel';
import PopulationPanel from '../../../components/PopulationPanel';
import AdditionalInfoPanel from '../../../components/AdditionalInfoPanel';
import KakaoMap from '../../../components/KakaoMap';
import GosiMap from '../../../components/GosiMap';
import {
  ArrowLeft, BarChart3, Building2, CheckCircle2, ChevronRight, Clock, FileText, Hammer,
  Info, Landmark, MapPin, MinusCircle, Search, Sparkles, TrendingUp, Zap,
} from 'lucide-react';

interface DiscoveryResult {
  success: boolean;
  historyId?: number;
  id?: number;
  region?: string;
  query?: { sggNm?: string; budget?: number; category?: string };
  analysis?: {
    regionalOutlook?: {
      direction?: string;
      reasoning?: string;
      keyPositives?: string[];
      keyFactors?: string[];
      overallGrade?: string;
    };
    land?: Record<string, any>;
    apartment?: Record<string, any>;
    store?: Record<string, any>;
    building?: Record<string, any>;
    raw?: string;
  };
  volumeRanking?: Record<string, any[]>;
  marketIndicators?: Record<string, any>;
  macroIndicators?: Record<string, any>;
  unsold?: Record<string, any>;
  construction?: Record<string, any>;
  allTrades?: any[];
  permits?: any[];
  gosi?: any[];
  classifiedFactors?: Record<string, any>;
  population?: Record<string, any>;
  populationMovement?: Record<string, any>;
  backgroundHousehold?: Record<string, any>;
  backgroundPopAge?: Record<string, any>;
  housingSupply?: Record<string, any>;
  saleNotices?: Record<string, any>;
  ordinance?: Record<string, any>;
  dealVolumeStats?: any[];
  targetComplexInfo?: any;
  targetTrades?: any[];
  nearbyTrades?: any;
  created_at?: string;
  deterministicResults?: Record<string, any>;
  guidelineContext?: Record<string, any>;
  isBatchData?: boolean;
}

const CATEGORY_TABS = [
  { key: 'apartment', label: '아파트' },
  { key: 'land', label: '토지' },
  { key: 'store', label: '상가' },
  { key: 'building', label: '빌딩' },
];

const RANK_BADGE: Record<number, string> = {
  0: 'bg-teal-700 text-white',
  1: 'bg-teal-600 text-white',
  2: 'bg-teal-500 text-white',
};

const RANK_LABEL: Record<string, string> = {
  apartment: '아파트',
  land: '토지',
  store: '상가',
  building: '빌딩',
};

const MAIN_TABS = ['종합평가', '주변호재', '시장지표', '실거래가', '인구현황', '조례·동향·공급'];

/** 메인 탭 줄 — 부모 고정 높이로 터치·스켈레톤 영역 확보 */
const MAIN_TAB_ROW_CLASS =
  'max-w-3xl mx-auto px-4 flex items-stretch border-t border-slate-100 overflow-x-auto no-scrollbar h-12';

function mainTabItemClass(active: boolean, loading = false) {
  return [
    'flex items-center h-full px-5 text-sm font-bold border-b-2 -mb-px shrink-0 whitespace-nowrap',
    active ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400',
    loading && !active ? 'opacity-60' : '',
    !loading && !active ? 'hover:text-slate-600' : '',
  ].join(' ');
}

const FACTOR_ORDER = [
  'gtx', 'subway', 'road', 'newTown',
  'redevelopment', 'reconstruction', 'tourism',
  'zoningChange', 'greenbeltRelease',
  'publicRelocation', 'corporateInvest', 'permitExpansion',
];

function formatWon(n?: number) {
  if (!n) return '-';
  if (n >= 10000) return `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}억원`;
  return `${n.toLocaleString()}만원`;
}

function formatDate(dateStr: any) {
  if (!dateStr) return '-';
  const str = String(dateStr);
  if (str.length === 8) return `${str.substring(0, 4)}.${str.substring(4, 6)}.${str.substring(6, 8)}`;
  return str;
}

function getPermitYear(dateStr: any) {
  if (!dateStr) return '연도 미상';
  const str = String(dateStr).replace(/[^0-9]/g, '');
  if (str.length >= 4) return `${str.substring(0, 4)}년`;
  return '연도 미상';
}

function groupPermitsByYear(permitList: any[]) {
  const grouped: Record<string, any[]> = {};
  for (const item of permitList) {
    const year = getPermitYear(item.archPmsDay);
    if (!grouped[year]) grouped[year] = [];
    grouped[year].push(item);
  }
  const sortedYears = Object.keys(grouped).sort((a, b) => {
    if (a === '연도 미상') return 1;
    if (b === '연도 미상') return -1;
    return b.localeCompare(a);
  });
  return { grouped, sortedYears };
}

function Badge({ text, color }: { text: string; color: string }) {
  return <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${color}`}>{text}</span>;
}

function RankBadge({ rank, index }: { rank?: number; index: number }) {
  const style = RANK_BADGE[index] ?? 'bg-slate-100 text-slate-400';
  return (
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 ${style}`}>
      {rank ?? index + 1}
    </div>
  );
}

function GuidelineContextCard({ gc }: { gc?: Record<string, any> }) {
  if (!gc) return null;

  const sanitized = gc.sanitizedOutput;
  const display = sanitized?.display;
  const rangeText = display?.range_text;
  const warnings = (display?.warnings as string[]) || [];
  const liquidity = gc.liquidityContext;
  const liquidityFlag = liquidity?.liquidity_flag;
  const appliedGuidelines = (gc.appliedGuidelines as any[]) || [];

  if (!rangeText && warnings.length === 0 && !liquidityFlag && appliedGuidelines.length === 0) {
    return null;
  }

  const getWarningBadgeStyle = (text: string) => {
    const isRed = text.includes('🔴');
    const isYellow = text.includes('🟡');
    if (isRed) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (isYellow) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-50 text-slate-500 border-slate-200';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-teal-700" />
          <h3 className="font-black text-slate-800 text-sm">호재 조합 분석</h3>
        </div>
        {gc.region && (
          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-md">
            {gc.region}
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {rangeText && (
          <div className="rounded-xl p-4 bg-gradient-to-r from-emerald-50 to-teal-50/50 border border-teal-100/60 shadow-sm">
            <p className="text-slate-500 text-[10px] font-bold tracking-wider uppercase mb-1">추정 변동 구간</p>
            <p className="text-sm font-black text-slate-800 leading-relaxed">{rangeText}</p>
          </div>
        )}

        {appliedGuidelines.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {appliedGuidelines.map((g, idx) => (
              <span key={idx} className="text-[11px] bg-slate-50 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg font-bold">
                {g.label} {g.range}
              </span>
            ))}
          </div>
        )}

        {(warnings.length > 0 || liquidityFlag) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {warnings.map((w, idx) => (
              <span key={idx} className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${getWarningBadgeStyle(w)}`}>
                {w}
              </span>
            ))}
            {liquidityFlag && (
              <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${getWarningBadgeStyle(liquidityFlag)}`}>
                {liquidityFlag}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function renderGosiBox(
  title: string,
  subtitle: string,
  list: any[],
  IconComponent: any,
  accentColorClass: string,
  bgBadgeClass: string,
  borderBadgeClass: string
) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-4 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <IconComponent className="w-4 h-4 text-teal-700" />
            <h3 className="font-black text-slate-900 text-lg tracking-tight">{title}</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>
        {list.length > 0 && (
          <span className={`shrink-0 text-[10px] font-black ${accentColorClass} ${bgBadgeClass} ${borderBadgeClass} border px-2.5 py-1 rounded-full uppercase tracking-wide`}>
            {list.length}건
          </span>
        )}
      </div>

      <div className="px-5 pb-5">
        {list.length > 0 ? (
          <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {list.slice(0, 15).map((item: any, i: number) => {
              const itemName = item.title || item.plan_nm || item.area_nm || item.zone_name || item.location_name || item.mainPurpsCdNm || '상세 규제 예정';
              const rawDate = item.gosiDate || item.gosi_date || item.archPmsDay || item.plan_wrtg_de || item.sys_updt_dt || item.plan_year;
              const formattedDate = formatDate(rawDate);
              const status = item.projectType || item.archGbCdNm || item.prcs_stts_stcd || '진행중';
              const bldNm = item.bldNm?.trim() || '';
              const summary = item.summary || item.content || '';
              const url = item.url || '';

              return (
                <div key={i} className="p-4 bg-white hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="font-bold text-sm text-slate-800 leading-relaxed flex-1">{itemName}</p>
                    <span className={`shrink-0 text-[10px] font-black ${accentColorClass} ${bgBadgeClass} ${borderBadgeClass} border px-2 py-1 rounded-md`}>
                      {status}
                    </span>
                  </div>

                  {summary && (
                    <p className="text-[11px] text-slate-500 leading-relaxed mb-3">{summary}</p>
                  )}

                  {bldNm && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
                      <p className="text-[11px] text-slate-700 font-bold">{bldNm}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 flex-wrap pt-2 mt-2 border-t border-slate-50">
                    <div className="flex items-center gap-4 flex-wrap">
                      {formattedDate && formattedDate !== '-' && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-[11px] text-slate-500 font-medium">고시일: {formattedDate}</span>
                        </div>
                      )}
                      {url && (
                        <div className="flex items-center gap-3">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:underline"
                          >
                            <Info className="w-3.5 h-3.5" />
                            고시 원문 보기
                          </a>
                          <span className="text-slate-300">|</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(url);
                              alert('링크가 클립보드에 복사되었습니다.');
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-teal-700 hover:underline"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            링크 복사
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 rounded-xl border border-dashed border-slate-200 bg-slate-50">
            <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-400">진행 데이터 없음</p>
          </div>
        )}
      </div>
    </section>
  );
}

function DiscoverDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<DiscoveryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState(0);
  const [rankTab, setRankTab] = useState('apartment');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [selectedGosiTitle, setSelectedGosiTitle] = useState<string | null>(null);

  // 수혜 필지 관련 상태
  const [isBenefitOpen, setIsBenefitOpen] = useState(false);
  const [benefitParcels, setBenefitParcels] = useState<any[]>([]);
  const [benefitGosiGroups, setBenefitGosiGroups] = useState<any[]>([]);
  const [benefitLoading, setBenefitLoading] = useState(false);
  const [benefitError, setBenefitError] = useState<string | null>(null);
  const [selectedBenefitParcel, setSelectedBenefitParcel] = useState<any | null>(null);

  // 신규 수혜 필지 탭 관련 상태
  const [activeEmergingGosi, setActiveEmergingGosi] = useState<string | null>(null);

  // 수혜 필지 분석 모달 필터 탭 관련 상태
  const [modalActiveGosi, setModalActiveGosi] = useState<string>('전체');

  // modalActiveGosi Reset when modal opens/closes
  useEffect(() => {
    if (isBenefitOpen) {
      setModalActiveGosi('전체');
    }
  }, [isBenefitOpen]);

  const modalGosiTabs = useMemo(() => {
    if (!benefitParcels || benefitParcels.length === 0) return [];
    const tabs = [{ title: '전체', count: benefitParcels.length }];
    if (benefitGosiGroups.length > 1) {
      benefitGosiGroups.forEach((g) => {
        const title = g.gosiTitle || '기타';
        const count = (g.parcels as any[])?.length ?? 0;
        tabs.push({ title, count });
      });
    } else {
      const counts: Record<string, number> = {};
      benefitParcels.forEach((p) => {
        const title = p.gosiTitle || '기타';
        counts[title] = (counts[title] || 0) + 1;
      });
      Object.entries(counts).forEach(([title, count]) => {
        tabs.push({ title, count });
      });
    }
    return tabs;
  }, [benefitParcels, benefitGosiGroups]);

  const filteredBenefitParcels = useMemo(() => {
    if (modalActiveGosi === '전체') return benefitParcels;
    if (benefitGosiGroups.length > 1) {
      const group = benefitGosiGroups.find((g) => (g.gosiTitle || '기타') === modalActiveGosi);
      return (group?.parcels as any[]) ?? [];
    }
    return benefitParcels.filter((p) => p.gosiTitle === modalActiveGosi);
  }, [benefitParcels, benefitGosiGroups, modalActiveGosi]);

  // filteredBenefitParcels가 바뀌면 selectedBenefitParcel 자동 조정
  useEffect(() => {
    if (filteredBenefitParcels.length > 0) {
      const exists = filteredBenefitParcels.some((p) => p.pnu === selectedBenefitParcel?.pnu);
      if (!exists) {
        setSelectedBenefitParcel(filteredBenefitParcels[0]);
      }
    } else {
      setSelectedBenefitParcel(null);
    }
  }, [filteredBenefitParcels, selectedBenefitParcel]);

  const historyId = data?.historyId ?? data?.id ?? (id ? parseInt(id, 10) : undefined);

  useEffect(() => {
    if (!isBenefitOpen || !historyId || benefitParcels.length > 0) return;
    const fetchBenefitParcels = async () => {
      setBenefitLoading(true);
      setBenefitError(null);
      try {
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const res = await fetch(`/api/land/detective/benefit-parcels?historyId=${historyId}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
        const json = await res.json();
        if (json.success) {
          // Flutter의 _composeAllFromGroups와 동일: gosiGroups에서 전체 필지를 합산 (중복 PNU dedup)
          const groups: any[] = json.gosiGroups || [];
          let allParcels: any[] = [];
          if (groups.length > 0) {
            const byPnu: Record<string, any> = {};
            groups.forEach((g) => {
              ((g.parcels as any[]) || []).forEach((p) => {
                const pnu = p.pnu?.toString() ?? '';
                if (!pnu) return;
                const cur = byPnu[pnu];
                if (!cur || (Number(p.proximity) ?? 0) > (Number(cur.proximity) ?? 0)) {
                  byPnu[pnu] = { ...p, gosiTitle: g.gosiTitle };
                }
              });
            });
            allParcels = Object.values(byPnu).sort((a, b) => (Number(b.proximity) ?? 0) - (Number(a.proximity) ?? 0));
          } else {
            allParcels = json.parcels || [];
          }
          setBenefitGosiGroups(groups);
          setBenefitParcels(allParcels);
          if (allParcels.length > 0) {
            setSelectedBenefitParcel(allParcels[0]);
          }
        } else {
          setBenefitError(json.error || '수혜 필지 데이터를 불러올 수 없습니다.');
        }
      } catch (err: any) {
        setBenefitError(err.message || '네트워크 오류가 발생했습니다.');
      } finally {
        setBenefitLoading(false);
      }
    };
    fetchBenefitParcels();
  }, [isBenefitOpen, historyId, benefitParcels.length]);

  useEffect(() => {
    if (!id) return;
    setData(null);
    setLoading(true);
    setError(null);
    setActiveEmergingGosi(null);
    setBenefitParcels([]);
    setBenefitGosiGroups([]);
    setSelectedBenefitParcel(null);
    setIsBenefitOpen(false);
    setModalActiveGosi('전체');
    const load = async () => {
      try {
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const res = await fetch(`/api/land/detective/discovery/global/${id}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
        const json = await res.json();
        if (json.success) setData(json);
        else setError(json.error || '데이터를 불러올 수 없습니다.');
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    };
    load(); // 즉시 호출하여 초기 로딩 지연을 없앰
    const unsub = onAuthStateChanged(auth, () => load());
    return () => unsub();
  }, [id]);

  const region = data?.query?.sggNm || data?.region || '투자처 상세';
  const outlook = data?.analysis?.regionalOutlook || {};
  const analysis = data?.analysis || {};
  const ranking = data?.volumeRanking || {};
  const rankRows = (ranking[rankTab] as any[]) || [];
  const isBatchData = !!(data as any)?.isBatchData; // 배치 데이터: LLM 섹션 숨김

  const gosiMarkers = useMemo(() => {
    if (!data?.gosi) return [];

    // Create a title to category map
    const titleToCategory: Record<string, string> = {};
    if (data?.classifiedFactors) {
      Object.values(data.classifiedFactors).forEach((factor: any) => {
        if (factor.items && Array.isArray(factor.items)) {
          factor.items.forEach((item: any) => {
            if (item.title) {
              titleToCategory[item.title] = factor.label || item.projectType;
            }
          });
        }
      });
    }

    const markers: any[] = [];
    data.gosi.forEach((g: any) => {
      let locs = g.locations;
      if ((!locs || locs.length === 0) && g.parsedData?.regions) {
        locs = g.parsedData.regions
          .filter((r: any) => r.lat != null && r.lng != null)
          .map((r: any) => ({
            lat: r.lat,
            lng: r.lng,
            address: r.address || r.name || null
          }));
      }

      if (locs && Array.isArray(locs)) {
        const shortTitle = titleToCategory[g.title] || '개발 호재';
        locs.forEach((loc: any, idx: number) => {
          if (loc.lat && loc.lng) {
            markers.push({
              id: `gosi-${g.id || g.title}-${idx}`,
              address: loc.address || g.title || '',
              propertyTitle: shortTitle,
              riskScore: 0,
              lat: Number(loc.lat),
              lng: Number(loc.lng),
              category: 'gosi',
              originalTitle: g.title
            });
          }
        });
      }
    });
    return markers;
  }, [data?.gosi, data?.classifiedFactors]);

  const gradeColor = (g?: string) => {
    if (!g) return 'bg-slate-100 text-slate-500 border-slate-200';
    const upper = g.toUpperCase();
    if (['A+', 'A', 'A-'].some(x => upper.startsWith(x))) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (['B+', 'B', 'B-'].some(x => upper.startsWith(x))) return 'bg-sky-50 text-sky-700 border-sky-200';
    if (['C+', 'C', 'C-'].some(x => upper.startsWith(x))) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SideNav />
      <div className="lg:pl-16 min-h-screen flex flex-col">

        {/* 헤더 */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-black text-slate-900 truncate">{region}</h1>
              <p className="text-[10px] font-bold text-teal-700 tracking-widest uppercase">투자처 발견 리포트</p>
            </div>
            {data?.query?.budget && (
              <span className="shrink-0 text-xs font-bold bg-teal-50 text-teal-700 px-3 py-1 rounded-full border border-teal-100">
                예산 {formatWon(data.query.budget)}
              </span>
            )}
          </div>

          {/* 메인 탭 — 로딩 중에도 동일 높이 유지 (loading.tsx와 page 로더 공통) */}
          {!error && (
            <div className={MAIN_TAB_ROW_CLASS}>
              {MAIN_TABS.map((t, i) =>
                loading ? (
                  <div key={t} className={mainTabItemClass(i === 0, true)}>
                    {t}
                  </div>
                ) : (
                  <button key={t} type="button" onClick={() => setMainTab(i)} className={mainTabItemClass(mainTab === i)}>
                    {t}
                  </button>
                )
              )}
            </div>
          )}
        </header>

        {/* 바디 */}
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 pb-24">
          {loading ? (
            <div className="flex flex-col items-center py-24 gap-4">
              <div className="w-12 h-12 relative">
                <div className="absolute inset-0 rounded-full border-2 border-teal-100" />
                <div className="absolute inset-0 rounded-full border-t-2 border-teal-600 animate-spin" />
              </div>
              <p className="text-xs font-bold text-teal-600 tracking-widest">결과 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="text-center py-24">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                <Search className="w-6 h-6 text-rose-400" />
              </div>
              <p className="font-bold text-slate-800 mb-2">불러오기 실패</p>
              <p className="text-slate-500 text-sm mb-4">{error}</p>
              <button onClick={() => router.back()} className="px-5 py-2 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700">돌아가기</button>
            </div>
          ) : mainTab === 0 ? (
            /* ── 종합평가 ── */
            <div className="space-y-4">
              {/* 지역 + 예산 카드 */}
              <div className="rounded-2xl p-5 border border-teal-100 bg-gradient-to-br from-emerald-50 to-slate-50 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-slate-500 text-xs font-bold mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-teal-600" /> 분석 지역
                    </p>
                    <h2 className="text-xl font-black text-slate-900 leading-tight tracking-tight">{region}</h2>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {data?.query?.budget && (
                        <span className="inline-flex items-center gap-1.5 bg-white text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200">
                          <Landmark className="w-3.5 h-3.5 text-teal-600" />
                          예산 {formatWon(data.query.budget)}
                        </span>
                      )}
                      {data?.query?.category && data.query.category !== 'all' && (
                        <span className="bg-white text-slate-600 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200">{data.query.category}</span>
                      )}
                    </div>
                  </div>
                  {outlook.overallGrade && (
                    <div className="shrink-0 w-14 h-14 rounded-2xl bg-teal-700 flex items-center justify-center shadow-sm">
                      <span className="text-2xl font-black text-white">{outlook.overallGrade}</span>
                    </div>
                  )}
                </div>
                {outlook.direction && (
                  <div className="mt-4 bg-white/80 rounded-xl p-3 border border-slate-100">
                    <p className="text-slate-500 text-xs font-bold mb-1">투자 방향</p>
                    <p className="text-slate-800 text-sm font-semibold leading-relaxed">{outlook.direction}</p>
                  </div>
                )}
              </div>

              {/* 핵심 요약 */}
              {(outlook.reasoning || analysis.raw) && (
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-teal-700" />
                    </div>
                    <h3 className="font-black text-teal-800 text-sm">분석 핵심 요약</h3>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {outlook.reasoning || (analysis as any).raw}
                  </p>
                  {((outlook.keyPositives || outlook.keyFactors) as string[] | undefined)?.length && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {((outlook.keyPositives || outlook.keyFactors) as string[]).map((f, i) => (
                        <span key={i} className="text-[11px] bg-slate-50 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg font-semibold">{f}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 호재 조합 분석 */}
              {data?.guidelineContext && (
                <GuidelineContextCard gc={data.guidelineContext} />
              )}

              {/* 고시 호재 지도 */}
              {gosiMarkers.length > 0 && (
                <div className="space-y-3">
                  <div className={`bg-white border border-slate-200 transition-all duration-300 ${
                    isMapExpanded 
                      ? 'fixed inset-0 z-[100] overflow-hidden' 
                      : 'rounded-2xl shadow-sm overflow-hidden h-[340px] relative'
                  }`}>
                    {/* @ts-ignore */}
                    <GosiMap
                      markers={gosiMarkers.map(m => ({
                        lat: m.lat,
                        lng: m.lng,
                        title: m.propertyTitle || '개발 호재',
                        originalTitle: m.originalTitle
                      }))}
                      initialCenter={{ lat: gosiMarkers[0].lat, lng: gosiMarkers[0].lng }}
                      sigCd={id}
                      isExpanded={isMapExpanded}
                      onToggleExpand={() => setIsMapExpanded(!isMapExpanded)}
                      onMarkerClick={(marker: any) => {
                        if (marker && marker.originalTitle) {
                          setSelectedGosiTitle(marker.originalTitle);
                          const el = document.getElementById(`gosi-card-${marker.originalTitle}`);
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                          }
                        }
                      }}
                    />

                    {/* 크게보기 모드일 때 지도 하단에 절대 좌표로 배치되는 정보 카드 오버레이 */}
                    {isMapExpanded && selectedGosiTitle && (() => {
                      const selectedGosi = data?.gosi?.find((g: any) => g.title === selectedGosiTitle);
                      if (!selectedGosi) return null;

                      const itemName = selectedGosi.title || selectedGosi.plan_nm || '상세 규제 예정';
                      const rawDate = selectedGosi.gosiDate || selectedGosi.gosi_date || selectedGosi.plan_wrtg_de || '';
                      const formattedDate = formatDate(rawDate);
                      const summary = selectedGosi.summary || selectedGosi.content || '';
                      const url = selectedGosi.url || '';

                      return (
                        <div className="absolute bottom-6 left-6 right-6 z-[200] bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-2xl border border-slate-200/80 max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col gap-3">
                          {/* 닫기 버튼 */}
                          <button
                            onClick={() => setSelectedGosiTitle(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            ✕
                          </button>

                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5 mb-1">
                                <div className="w-2 h-2 rounded-full bg-teal-600" />
                                <span className="text-[11px] font-black text-slate-800 tracking-tight">선택된 호재</span>
                              </div>
                              <h4 className="text-[15px] font-black text-slate-900 leading-snug break-all pr-6">{itemName}</h4>
                              {formattedDate && formattedDate !== '-' && (
                                <p className="text-[10px] text-slate-400 font-bold mt-0.5">고시일: {formattedDate}</p>
                              )}
                            </div>

                            {/* 우측 배지 */}
                            <span className="shrink-0 text-[10px] font-black text-teal-700 bg-teal-50 border border-teal-100 px-3 py-1 rounded-full uppercase tracking-wider">
                              {selectedGosi.projectType || '개발계획'}
                            </span>
                          </div>

                          {summary && (
                            <div className="bg-emerald-50/20 border border-emerald-100/50 rounded-xl p-3.5 text-xs text-emerald-800 leading-relaxed font-semibold">
                              {summary}
                            </div>
                          )}

                          {url && (
                            <div className="flex justify-end mt-1">
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-700/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                              >
                                <Info className="w-3.5 h-3.5" />
                                고시 원문 보기 (새창)
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* 지도 아래 고시 상세 카드 목록 */}
                  {data?.gosi && data.gosi.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-500">지도에 표시된 개발 호재 세부 정보 ({data.gosi.length}건)</span>
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-3 pt-1 no-scrollbar scroll-smooth snap-x snap-mandatory">
                        {data.gosi.map((g: any, idx: number) => {
                          const itemName = g.title || g.plan_nm || '상세 규제 예정';
                          const rawDate = g.gosiDate || g.gosi_date || g.plan_wrtg_de || '';
                          const formattedDate = formatDate(rawDate);
                          const summary = g.summary || g.content || '';
                          const url = g.url || '';
                          const isSelected = selectedGosiTitle === g.title;

                          return (
                            <div 
                              id={`gosi-card-${g.title}`}
                              key={idx} 
                              onClick={() => setSelectedGosiTitle(g.title)}
                              className={`min-w-[280px] max-w-[280px] snap-start bg-white border rounded-xl p-4 shadow-sm flex flex-col justify-between transition-all duration-300 cursor-pointer ${
                                isSelected 
                                  ? 'border-teal-500 ring-2 ring-teal-500/10 scale-[1.01]' 
                                  : 'border-slate-200 hover:border-slate-350'
                              }`}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                  <span className="text-[9px] font-black text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded">
                                    {g.projectType || '개발계획'}
                                  </span>
                                  {formattedDate && formattedDate !== '-' && (
                                    <span className="text-[10px] text-slate-400 font-bold">{formattedDate}</span>
                                  )}
                                </div>
                                <h5 className="font-black text-slate-900 text-[13px] line-clamp-2 leading-snug mb-1.5">{itemName}</h5>
                                {summary && (
                                  <p className="text-[11px] text-slate-500 leading-normal line-clamp-3 font-semibold mb-3">{summary}</p>
                                )}
                              </div>
                              
                              {url && (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-center text-teal-700 font-bold text-[11px] rounded-lg border border-slate-200/80 transition-colors flex items-center justify-center gap-1.5 mt-2"
                                >
                                  <Info className="w-3.5 h-3.5" />
                                  고시 원문 보기 (새창)
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 유형별 분석 요약 — 배치 데이터(LLM 없음)면 숨김 */}
              {!isBatchData && CATEGORY_TABS.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-teal-700" />
                    <h3 className="font-black text-slate-800 text-sm">유형별 투자 적합도 분석</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {CATEGORY_TABS.map(cat => {
                      const catData = analysis[cat.key as keyof typeof analysis] as any;
                      const grade = catData?.investmentGrade || catData?.grade || '';
                      const strategy = catData?.strategy || catData?.summary || '정밀 분석 데이터가 없습니다.';
                      const outlookDesc = catData?.outlook || '';
                      return (
                        <div key={cat.key} className="px-4 py-4">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-black text-sm text-slate-800">{cat.label}</span>
                            {grade ? <Badge text={`등급 ${grade}`} color={gradeColor(grade)} /> : <Badge text="분석 대기" color="bg-slate-100 text-slate-500 border-slate-200" />}
                          </div>
                          {strategy && <p className="text-sm text-slate-700 leading-relaxed font-medium mb-2">{strategy}</p>}
                          {outlookDesc && <p className="text-xs text-slate-500 leading-relaxed">{outlookDesc}</p>}
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => setSelectedCategory(cat.key)}
                              className="flex-1 py-2.5 bg-teal-50 text-teal-800 font-bold text-xs rounded-xl hover:bg-teal-100 transition-colors border border-teal-100 flex items-center justify-center gap-1"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                              {cat.label} 정밀 분석 보기
                            </button>
                            <button
                              onClick={() => router.push(`/ranking?sigunguCd=${id}&sigunguName=${encodeURIComponent(region)}&rankingType=${cat.key}`)}
                              className="px-3 py-2.5 bg-slate-50 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors border border-slate-200 shrink-0"
                            >
                              랭킹 →
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 지역별 투자 지표 요약 */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 pt-5 pb-4">
                  <h3 className="font-black text-slate-900 text-lg tracking-tight">지역별 투자 지표 요약</h3>
                  <p className="text-xs text-slate-500 mt-1">거래량 및 실거래가 기반 동별 분석</p>
                </div>

                {/* 카테고리 필터 */}
                <div className="px-5 pb-4 flex gap-2 flex-wrap">
                  {CATEGORY_TABS.map(c => (
                    <button
                      key={c.key}
                      onClick={() => setRankTab(c.key)}
                      className={`px-4 py-2 rounded-full text-[13px] font-bold border transition-all ${rankTab === c.key
                        ? 'bg-teal-700 border-teal-700 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-teal-300 hover:text-teal-700'
                        }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {/* 동별 순위 테이블 및 신규 수혜 주목 */}
                {(() => {
                  const detResult = data?.deterministicResults?.[rankTab];
                  const ranking = detResult?.ranking;
                  const topList = ranking?.top || data?.volumeRanking?.[rankTab] || [];
                  const emergingList = ranking?.emerging || [];

                  if (topList.length === 0 && emergingList.length === 0) {
                    return (
                      <div className="mx-5 mb-5 text-center py-10 rounded-xl border border-dashed border-slate-200 bg-slate-50">
                        <p className="text-slate-400 text-sm font-medium">순위 및 수혜 데이터 없음</p>
                      </div>
                    );
                  }

                  const categoryLabel = RANK_LABEL[rankTab] || '';

                  return (
                    <div className="space-y-4 mx-5 mb-5">
                      {/* ── 추천 TOP 섹션 ── */}
                      {topList.length > 0 && (
                        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
                          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <BarChart3 className="w-4 h-4 text-teal-700 shrink-0" />
                              <span className="font-extrabold text-[13px] text-slate-800">{categoryLabel} 추천 TOP</span>
                              <span className="text-[10px] font-extrabold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-md">
                                거래 활발
                              </span>
                            </div>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {topList.slice(0, 10).map((row: any, i: number) => {
                              const isTop3 = i < 3;
                              return (
                                <div
                                  key={i}
                                  className={`flex items-start gap-3 px-4 py-3.5 ${isTop3 ? 'bg-teal-50/20' : 'bg-white'}`}
                                >
                                  <RankBadge rank={row.rank} index={i} />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-black text-sm text-slate-900 truncate">
                                      {row.name || row.location || '-'}
                                    </p>

                                    {rankTab === 'apartment' ? (
                                      /* 아파트 전용 세부 항목 */
                                      <div className="mt-1 space-y-1">
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                          {row.price != null ? (
                                            <span className="text-[12px] font-bold text-teal-700">{formatWon(row.price)}</span>
                                          ) : row.avgPrice != null ? (
                                            <span className="text-[12px] font-bold text-teal-700">{formatWon(row.avgPrice)}</span>
                                          ) : null}
                                          {row.area && (
                                            <span className="text-[11px] text-slate-500">전용 {row.area}㎡</span>
                                          )}
                                          {row.floor && (
                                            <span className="text-[11px] text-slate-500">{row.floor}층</span>
                                          )}
                                        </div>
                                        {row.reason && (
                                          <p className="text-[11px] text-teal-700 font-semibold leading-relaxed">
                                            {row.reason}
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      /* 토지/상가/빌딩 공통 세부 항목 */
                                      <div className="mt-1">
                                        {row.avgPrice != null && (
                                          <div className="flex items-center gap-1">
                                            <span className="text-[11px] text-slate-500">평균 거래가</span>
                                            <span className="text-[12px] font-bold text-teal-700">{formatWon(row.avgPrice)}</span>
                                          </div>
                                        )}
                                        {row.reason && (
                                          <p className="text-[11px] text-teal-700 font-semibold leading-relaxed mt-1">
                                            {row.reason}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {rankTab === 'apartment' ? (
                                    row.date && (
                                      <div className="text-right shrink-0">
                                        <p className={`text-xs font-black ${isTop3 ? 'text-teal-700' : 'text-slate-600'}`}>
                                          {row.date}
                                        </p>
                                        <p className="text-[9px] text-slate-400 font-medium">거래일</p>
                                      </div>
                                    )
                                  ) : (
                                    row.count != null && (
                                      <div className="text-right shrink-0">
                                        <p className={`text-sm font-black tabular-nums ${isTop3 ? 'text-teal-700' : 'text-slate-700'}`}>
                                          {Number(row.count).toLocaleString()}건
                                        </p>
                                        <p className="text-[9px] text-slate-400 font-medium">거래</p>
                                      </div>
                                    )
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* ── 신규 수혜 주목 섹션 ── */}
                      {emergingList.length > 0 && (
                        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
                          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-teal-700 shrink-0" />
                              <span className="font-extrabold text-[13px] text-slate-800">{categoryLabel} 신규 수혜 주목</span>
                              <span className="text-[10px] font-extrabold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-md">
                                개발 호재 직접수혜
                              </span>
                            </div>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {emergingList.map((row: any, i: number) => {
                              const nearest = row.nearest || {};
                              const location = row.location || '-';
                              const tradeCount = row.tradeCount ?? row.count ?? 0;
                              const distLabel = nearest.distLabel || '';
                              const tierLabel = nearest.tierLabel || '';
                              const nearestTitle = nearest.title || '';
                              const note = row.note || '';

                              return (
                                <div key={i} className="p-4 space-y-2.5">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="font-black text-sm text-slate-900 truncate">{location}</p>
                                    <div className="flex items-center gap-2">
                                      {tierLabel && (
                                        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-md shrink-0">
                                          {tierLabel}
                                        </span>
                                      )}
                                      <span className="text-xs font-bold text-teal-800">
                                        거래 {tradeCount}건
                                      </span>
                                    </div>
                                  </div>

                                  {nearestTitle && (
                                    <div className="flex items-start gap-1.5 text-xs text-slate-700 leading-relaxed font-bold">
                                      <Zap className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                                      <p>{nearestTitle}</p>
                                    </div>
                                  )}

                                  {distLabel && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-teal-700 font-bold">
                                      <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                      <p>{distLabel}</p>
                                    </div>
                                  )}

                                  {note && (
                                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 flex items-start gap-2">
                                      <Info className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
                                      <p className="text-[11px] text-slate-600 font-semibold leading-relaxed">
                                        {note}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 신규 수혜 필지 주목 (글로벌) */}
                {(() => {
                  const gosiGroups: Record<string, { locations: Set<string> }> = {};
                  const suitCategories = ['land', 'apartment', 'store', 'building'];

                  suitCategories.forEach(catKey => {
                    const detResult = data?.deterministicResults?.[catKey];
                    const ranking = detResult?.ranking;
                    const emerging = ranking?.emerging || [];
                    emerging.forEach((r: any) => {
                      const location = r.location;
                      if (!location) return;
                      const gosiTitle = r.nearest?.title || '기타 호재';
                      if (!gosiGroups[gosiTitle]) {
                        gosiGroups[gosiTitle] = { locations: new Set() };
                      }
                      gosiGroups[gosiTitle].locations.add(location);
                    });
                  });

                  const gosiTitles = Object.keys(gosiGroups);
                  if (gosiTitles.length === 0) return null;

                  const defaultGosi = (activeEmergingGosi && gosiTitles.includes(activeEmergingGosi))
                    ? activeEmergingGosi
                    : gosiTitles[0];
                  const currentLocations = Array.from(gosiGroups[defaultGosi]?.locations || []);

                  return (
                    <div className="mt-5 mx-5 p-5 bg-[#F0FDF4] rounded-[24px] border border-[#BBF7D0] border-[1.5px] shadow-sm">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[#16A34A] text-lg">🌱</span>
                          <h4 className="text-base font-black text-[#14532D]">신규 수혜 필지 주목</h4>
                        </div>
                        {historyId != null && (
                          <button
                            type="button"
                            onClick={() => setIsBenefitOpen(true)}
                            className="bg-white border border-[#BBF7D0] rounded-xl px-3 py-1.5 text-xs font-bold text-[#16A34A] hover:bg-[#F0FDF4] transition-all flex items-center gap-1 shadow-sm active:scale-95"
                          >
                            <Search className="w-3.5 h-3.5" />
                            필지 분석
                          </button>
                        )}
                      </div>
                      <p className="text-[12px] font-semibold text-[#15803D] leading-relaxed mb-4">
                        고시 호재 구역 직접, 간접 수혜를 목록, 지도로 확인해보세요
                      </p>

                      {/* 고시별 탭 */}
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 border-b border-[#BBF7D0]/40 mb-4">
                        {gosiTitles.map((title) => {
                          const isActive = title === defaultGosi;
                          return (
                            <button
                              key={title}
                              type="button"
                              onClick={() => setActiveEmergingGosi(title)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${isActive
                                  ? 'bg-[#16A34A] border-[#16A34A] text-white shadow-sm'
                                  : 'bg-white border-[#BBF7D0] text-[#166534] hover:bg-[#F0FDF4]/50'
                                }`}
                            >
                              {title}
                            </button>
                          );
                        })}
                      </div>

                      {/* 선택된 고시의 수혜 필지(동) 목록 */}
                      <div className="flex flex-wrap gap-2">
                        {currentLocations.map((dong: string, i: number) => {
                          return (
                            <span
                              key={i}
                              className="bg-white border border-[#86EFAC] rounded-2xl px-3.5 py-2 text-[13px] font-bold text-[#166534] shadow-sm"
                            >
                              {dong}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* 거시경제 지표 */}
                {(data?.macroIndicators || data?.unsold || data?.construction) && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-2 mb-1 mt-4">
                      <TrendingUp className="w-4 h-4 text-teal-700" />
                      <h4 className="font-black text-slate-900 text-base tracking-tight">거시경제 지표</h4>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">투자 환경 핵심 수치 (KOSIS)</p>
                    <div className="grid grid-cols-2 gap-3">
                      {data?.macroIndicators?.cpi && (
                        <div className="rounded-xl p-3.5 border border-rose-100 bg-white shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded-lg bg-rose-50"><TrendingUp className="w-3.5 h-3.5 text-rose-500" /></div>
                            <p className="text-[11px] font-bold text-slate-500 leading-tight">소비자물가지수</p>
                          </div>
                          <p className="text-xl font-black text-rose-600 tabular-nums">
                            {data.macroIndicators.cpi.value}
                            <span className="text-[11px] text-slate-400 font-semibold ml-1">{data.macroIndicators.cpi.unit}</span>
                          </p>
                        </div>
                      )}
                      {data?.macroIndicators?.constructCostIndex && (
                        <div className="rounded-xl p-3.5 border border-amber-100 bg-white shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded-lg bg-amber-50"><Hammer className="w-3.5 h-3.5 text-amber-600" /></div>
                            <p className="text-[11px] font-bold text-slate-500 leading-tight">건설공사비지수</p>
                          </div>
                          <p className="text-xl font-black text-amber-600 tabular-nums">
                            {data.macroIndicators.constructCostIndex.value}
                            <span className="text-[11px] text-slate-400 font-semibold ml-1">{data.macroIndicators.constructCostIndex.unit}</span>
                          </p>
                        </div>
                      )}
                      {data?.macroIndicators?.loanRate && (
                        <div className="rounded-xl p-3.5 border border-teal-100 bg-white shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded-lg bg-teal-50"><Landmark className="w-3.5 h-3.5 text-teal-600" /></div>
                            <p className="text-[11px] font-bold text-slate-500 leading-tight">가계대출금리</p>
                          </div>
                          <p className="text-xl font-black text-teal-700 tabular-nums">
                            {data.macroIndicators.loanRate.value}
                            <span className="text-[11px] text-slate-400 font-semibold ml-1">%</span>
                          </p>
                        </div>
                      )}
                      {data?.unsold && (
                        <div className="rounded-xl p-3.5 border border-indigo-100 bg-white shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded-lg bg-indigo-50"><Building2 className="w-3.5 h-3.5 text-indigo-500" /></div>
                            <p className="text-[11px] font-bold text-slate-500 leading-tight">시도 미분양</p>
                          </div>
                          <p className="text-xl font-black text-indigo-600 tabular-nums">
                            {data.unsold.count?.toLocaleString()}
                            <span className="text-[11px] text-slate-400 font-semibold ml-1">세대</span>
                          </p>
                        </div>
                      )}
                      {data?.construction?.start && (
                        <div className="rounded-xl p-3.5 border border-sky-100 bg-white shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded-lg bg-sky-50"><Hammer className="w-3.5 h-3.5 text-sky-600" /></div>
                            <p className="text-[11px] font-bold text-slate-500 leading-tight">건축착공</p>
                          </div>
                          <p className="text-xl font-black text-sky-600 tabular-nums">
                            {data.construction.start.count?.toLocaleString() || '-'}
                            <span className="text-[11px] text-slate-400 font-semibold ml-1">동</span>
                          </p>
                        </div>
                      )}
                      {data?.construction?.permit && (
                        <div className="rounded-xl p-3.5 border border-violet-100 bg-white shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded-lg bg-violet-50"><FileText className="w-3.5 h-3.5 text-violet-600" /></div>
                            <p className="text-[11px] font-bold text-slate-500 leading-tight">건축허가</p>
                          </div>
                          <p className="text-xl font-black text-violet-600 tabular-nums">
                            {data.construction.permit.count?.toLocaleString() || '-'}
                            <span className="text-[11px] text-slate-400 font-semibold ml-1">동</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 수집 데이터 리스트 뷰 */}
                <div className="mt-5 mx-5 p-5 rounded-[20px] border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-teal-700" />
                    <h4 className="font-black text-slate-900 text-base tracking-tight">수집된 원천 데이터 리스트</h4>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">본 지역을 분석하기 위해 실시간으로 수집된 22개 API 데이터 현황입니다.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { key: 'gosi', label: '고시·공고 (지자체/관보)', count: data?.gosi?.length || 0 },
                      { key: 'permits', label: '건축 인허가 (세움터)', count: data?.permits?.length || 0 },
                      { key: 'allTrades', label: '실거래가 (국토부)', count: data?.allTrades?.reduce((acc: number, t: any) => acc + (t.data?.length || 0), 0) || 0 },
                      { key: 'marketIndicators.apartment', label: '아파트 시장지표 (부동산원)', count: data?.marketIndicators?.apartment ? 1 : 0 },
                      { key: 'marketIndicators.land', label: '토지 시장지표 (부동산원)', count: data?.marketIndicators?.land ? 1 : 0 },
                      { key: 'macroIndicators', label: '거시경제 지표 (KOSIS)', count: data?.macroIndicators ? Object.keys(data.macroIndicators).length : 0 },
                      { key: 'unsold', label: '미분양 현황 (국토부)', count: data?.unsold ? 1 : 0 },
                      { key: 'construction', label: '건축 착공/허가 (국토부)', count: data?.construction ? 2 : 0 },
                      { key: 'housingSupply', label: '주택 인허가/공급 (국토부)', count: data?.housingSupply?.count || data?.housingSupply?.items?.length || (data?.housingSupply ? 1 : 0) },
                      { key: 'saleNotices', label: '분양 공고 (LH)', count: data?.saleNotices?.notices?.length || (data?.saleNotices ? 1 : 0) },
                      { key: 'population', label: '인구 동향 (SGIS)', count: data?.population ? 1 : 0 },
                      { key: 'populationMovement', label: '인구 이동 (KOSIS)', count: data?.populationMovement ? 1 : 0 },
                      { key: 'backgroundHousehold', label: '가구 구성 (KOSIS)', count: data?.backgroundHousehold ? 1 : 0 },
                      { key: 'backgroundPopAge', label: '연령별 인구 (KOSIS)', count: data?.backgroundPopAge ? 1 : 0 },
                      { key: 'ordinance', label: '자치구 조례', count: data?.ordinance ? 1 : 0 },
                    ].map(api => (
                      <div key={api.key} className="flex items-center justify-between p-2.5 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <span className="text-[11px] font-bold text-slate-700">{api.label}</span>
                        {api.count > 0 ? (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 bg-teal-50 border border-teal-100 text-teal-700 rounded-md">수집완료 ({api.count})</span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-400 rounded-md">대기/없음</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 면책 문구 */}
                <div className="mt-5 mx-5 p-4 rounded-[16px] border border-slate-200 bg-[#F8FAFC] flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                    {data?.guidelineContext?.sanitizedOutput?.display?.disclaimer ||
                      '본 분석 리포트는 수집된 데이터와 AI 알고리즘을 기반으로 작성된 예측 정보이며, 법적 효력을 가지지 않습니다. 실제 투자 시 현장 확인 및 전문가 상담이 필요하며, 투자 결정으로 인한 책임은 투자자 본인에게 있습니다.'}
                  </p>
                </div>
              </div>
            </div>
          ) : mainTab === 1 ? (() => {
            const classifiedFactors = data?.classifiedFactors || {};
            const foundKeys = FACTOR_ORDER.filter((k) => classifiedFactors[k]?.found === true);
            const notFoundKeys = FACTOR_ORDER.filter((k) => classifiedFactors[k]?.found !== true);
            const permitList = data?.permits || [];
            const gosiList = data?.gosi || [];
            const urbanRenewalList = gosiList.filter((g: any) => /재개발|재건축|정비/.test(g.title || ''));
            const districtPlanList = gosiList.filter((g: any) => /지구단위/.test(g.title || ''));
            const implementationPlanList = gosiList.filter((g: any) => /실시계획|인가/.test(g.title || ''));
            const propertyAddress = data?.query?.sggNm || data?.region || '';
            const { grouped: groupedPermits, sortedYears: permitYears } = groupPermitsByYear(permitList);
            const hasFactors = Object.keys(classifiedFactors).length > 0;

            const renderPermitChip = (label: string, value: string) => (
              <span key={label} className="inline-flex items-center px-2 py-1 bg-slate-50 border border-slate-100 rounded-md text-[10px]">
                <span className="text-slate-400">{label} </span>
                <span className="text-slate-700 font-bold">{value}</span>
              </span>
            );

            return (
              <div className="space-y-4">
                {/* 투자 호재 체크리스트 */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 pt-5 pb-4">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-teal-700" />
                      <h3 className="font-black text-slate-900 text-lg tracking-tight">투자 호재 체크리스트</h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">지역 내 확인된 개발·교통·정비 호재</p>
                  </div>

                  <div className="px-5 pb-5">
                    {!hasFactors ? (
                      <div className="text-center py-10 rounded-xl border border-dashed border-slate-200 bg-slate-50">
                        <p className="text-xs text-slate-400">데이터를 불러오는 중...</p>
                      </div>
                    ) : foundKeys.length === 0 ? (
                      <div className="text-center py-10 rounded-xl border border-dashed border-slate-200 bg-slate-50">
                        <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="font-bold text-slate-800 text-sm">확인된 호재가 없습니다</p>
                        <p className="text-xs text-slate-500 mt-1">해당 지역의 주요 투자 호재가 감지되지 않았습니다.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {foundKeys.map((key) => {
                          const cat = classifiedFactors[key];
                          const items = cat?.items || [];
                          return (
                            <div key={key} className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="font-extrabold text-sm text-emerald-900">{cat.label}</span>
                                <span className="ml-auto text-[11px] font-bold text-emerald-700 bg-white/80 border border-emerald-100 px-2 py-0.5 rounded-full">
                                  {items.length}건
                                </span>
                              </div>

                              <div className="space-y-2.5">
                                {items.map((item: any, j: number) => {
                                  const itemTitle = item.title || '';
                                  const source = item.source || '';
                                  const date = item.date ? String(item.date).slice(0, 10) : '';
                                  const detail = item.detail || '';
                                  const location = item.location || '';
                                  const lat = item.lat;
                                  const lng = item.lng;
                                  const url = item.url || '';

                                  return (
                                    <div key={j} className="p-3 bg-white rounded-lg border border-slate-100 space-y-2">
                                      <div className="flex items-start justify-between gap-3">
                                        <p className="font-semibold text-xs text-slate-800 leading-relaxed">{itemTitle}</p>
                                        {source && (
                                          <span className="text-[9px] bg-sky-50 text-sky-700 border border-sky-100 px-1.5 py-0.5 rounded font-bold shrink-0">
                                            {source}
                                          </span>
                                        )}
                                      </div>

                                      {location && (
                                        <div className="flex flex-col gap-0.5 pl-0.5">
                                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span>{location}</span>
                                          </div>
                                          {lat != null && lng != null && (
                                            <span className="text-[9px] text-slate-400 font-bold pl-4">
                                              (좌표: {String(lat).slice(0, 8)}, {String(lng).slice(0, 9)})
                                            </span>
                                          )}
                                        </div>
                                      )}

                                      {detail && (
                                        <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-md leading-relaxed">
                                          {detail}
                                        </p>
                                      )}

                                      <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-slate-50/50">
                                        {date && (
                                          <span className="text-[10px] text-slate-400 font-medium mr-auto">{date}</span>
                                        )}

                                        {url && (
                                          <div className="flex items-center gap-3">
                                            <a
                                              href={url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 hover:underline"
                                            >
                                              <Info className="w-3.5 h-3.5" />
                                              원문 보기
                                            </a>
                                            <span className="text-slate-300">|</span>
                                            <button
                                              onClick={() => {
                                                navigator.clipboard.writeText(url);
                                                alert('링크가 클립보드에 복사되었습니다.');
                                              }}
                                              className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-teal-700 hover:underline"
                                            >
                                              <FileText className="w-3.5 h-3.5" />
                                              링크 복사
                                            </button>
                                          </div>
                                        )}

                                        {lat != null && lng != null && (
                                          <>
                                            {(url || date) && <span className="text-slate-300">|</span>}
                                            <a
                                              href={`https://map.kakao.com/link/map/${encodeURIComponent(itemTitle || location || '대상지')},${lat},${lng}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 hover:underline"
                                            >
                                              <MapPin className="w-3.5 h-3.5" />
                                              위치표시
                                            </a>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {hasFactors && notFoundKeys.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">미확인 항목</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                          {notFoundKeys.map((key) => {
                            const label = classifiedFactors[key]?.label || key;
                            return (
                              <span key={key} className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                <MinusCircle className="w-3 h-3 shrink-0" />
                                {label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* 연도별 인허가 현황 */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 pt-5 pb-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-teal-700" />
                        <h3 className="font-black text-slate-900 text-lg tracking-tight">인허가 현황</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">허가일 기준 연도별 건축·개발 인허가 내역</p>
                    </div>
                    {permitList.length > 0 && (
                      <span className="shrink-0 text-[10px] font-black text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-full uppercase tracking-wide">
                        {permitList.length}건
                      </span>
                    )}
                  </div>

                  <div className="px-5 pb-5">
                    {permitList.length > 0 ? (
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        {permitYears.map((year) => (
                          <div key={year}>
                            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
                              <div className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                              <span className="text-[13px] font-black text-slate-800">{year}</span>
                              <span className="text-[11px] font-bold text-slate-400">({groupedPermits[year].length}건)</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                              {groupedPermits[year].map((item: any, i: number) => {
                                const title = item.archGbCdNm || '인허가 항목';
                                const bldNm = item.bldNm?.trim?.() || item.bldNm || '';
                                const platPlc = item.platPlc || item.platAddr || '';
                                const dispName = bldNm || platPlc || propertyAddress || '인허가 대상지';
                                const showAddress = platPlc || propertyAddress;
                                const platArea = item.platArea ?? '-';
                                const totArea = item.totArea ?? '-';
                                const mainPurps = item.mainPurpsCdNm || '-';
                                const jimok = item.jimokCdNm || '-';
                                const jiyuk = item.jiyukCdNm || '-';
                                const jigu = item.jiguCdNm || '-';

                                return (
                                  <div key={i} className="p-4 bg-white hover:bg-slate-50/80 transition-colors">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                      <p className="font-bold text-sm text-slate-800 truncate flex-1">{dispName}</p>
                                      <span className="shrink-0 text-[10px] font-black text-sky-700 bg-sky-50 border border-sky-100 px-2 py-1 rounded-md">
                                        {title}
                                      </span>
                                    </div>
                                    {showAddress && dispName !== showAddress && (
                                      <div className="flex items-center gap-1.5 mb-1.5">
                                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                        <p className="text-[11px] text-slate-500 truncate">{showAddress}</p>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                      <p className="text-[11px] text-slate-500">허가일: {formatDate(item.archPmsDay)}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 mb-3">
                                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                      <p className="text-[11px] text-slate-500 truncate">주용도: {mainPurps}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {renderPermitChip('대지면적', `${platArea}㎡`)}
                                      {renderPermitChip('연면적', `${totArea}㎡`)}
                                      {renderPermitChip('지목', jimok)}
                                      {renderPermitChip('지역', jiyuk)}
                                      {jigu !== '-' && renderPermitChip('지구', jigu)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 rounded-xl border border-dashed border-slate-200 bg-slate-50">
                        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm font-bold text-slate-600">인허가 데이터 없음</p>
                        <p className="text-xs text-slate-400 mt-1">해당 지역의 건축·개발 인허가 정보가 없습니다.</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* 도시정비사업 (재개발·재건축) */}
                {renderGosiBox('도시정비사업 (재개발·재건축)', '재개발·재건축 및 도시정비구역 지정·시행 현황', urbanRenewalList, Hammer, 'text-orange-700', 'bg-orange-50', 'border-orange-100')}

                {/* 지구단위계획 */}
                {renderGosiBox('지구단위계획', '용도지역·지구 규제 및 체계적 공간 관리를 위한 계획', districtPlanList, MapPin, 'text-emerald-700', 'bg-emerald-50', 'border-emerald-100')}

                {/* 실시계획인가 */}
                {renderGosiBox('실시계획인가', '구체적인 개발 사업 시행을 위한 최종 승인 단계', implementationPlanList, TrendingUp, 'text-violet-700', 'bg-violet-50', 'border-violet-100')}
              </div>
            );
          })() : mainTab === 2 ? (
            <div className="space-y-4">
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 pt-5 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-teal-700" />
                      <h3 className="font-black text-slate-900 text-lg tracking-tight">부동산원 시장 지표</h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">한국부동산원(R-ONE) 공식 지표 · 유형별 분석</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-black text-violet-700 bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-full uppercase tracking-wide">
                    R-ONE
                  </span>
                </div>
                <div className="px-5 pb-4 flex gap-2 flex-wrap">
                  {CATEGORY_TABS.filter(c => c.key !== 'store').map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setRankTab(c.key)}
                      className={`px-4 py-2 rounded-full text-[13px] font-bold border transition-all ${rankTab === c.key
                        ? 'bg-teal-700 border-teal-700 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-teal-300 hover:text-teal-700'
                        }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </section>

              <MarketRonePanel
                key={rankTab}
                category={rankTab}
                indicators={(data?.marketIndicators?.[rankTab] as Record<string, any>) || {}}
              />
            </div>
          ) : mainTab === 3 ? (
            <RealTradesPanel
              category={rankTab}
              allTrades={data?.allTrades}
              nearbyTrades={data?.nearbyTrades}
              dealVolumeStats={data?.dealVolumeStats}
              targetComplexInfo={data?.targetComplexInfo}
              targetTrades={data?.targetTrades}
            />
          ) : mainTab === 4 ? (
            <PopulationPanel
              population={data?.population}
              populationMovement={data?.populationMovement}
              backgroundHousehold={data?.backgroundHousehold}
              backgroundPopAge={data?.backgroundPopAge}
            />
          ) : (
            <AdditionalInfoPanel
              housingSupply={(data as any)?.housingSupply}
              dynamicNews={(data as any)?.dynamicNews}
              ordinance={(data as any)?.ordinance}
            />
          )}

          {selectedCategory && data && (
            <CategoryDetailModal
              category={selectedCategory}
              data={data}
              onClose={() => setSelectedCategory(null)}
            />
          )}

          {isBenefitOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col border border-slate-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">수혜 필지 분석 (인접 10개)</h3>
                    <p className="text-xs font-semibold text-slate-500 mt-1">고시 호재 구역 주변의 공시지가, 지목, 인접도를 분석한 필지입니다.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBenefitOpen(false)}
                    className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-slate-50">
                  {/* Left list panel */}
                  <div className="w-full md:w-5/12 flex flex-col h-full border-r border-slate-200/60 bg-white overflow-hidden">
                    {/* 모달 탭 필터 */}
                    {!benefitLoading && !benefitError && benefitParcels.length > 0 && (
                      <div className="px-4 py-3 border-b border-slate-100 flex gap-2 overflow-x-auto no-scrollbar bg-slate-50 shrink-0">
                        {modalGosiTabs.map((tab) => {
                          const isActive = tab.title === modalActiveGosi;
                          return (
                            <button
                              key={tab.title}
                              type="button"
                              onClick={() => setModalActiveGosi(tab.title)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 max-w-[160px] truncate ${isActive
                                  ? 'bg-[#E6F4EA] border-[#16A34A] text-[#16A34A] shadow-sm'
                                  : 'bg-[#F1F3F4] border-transparent text-[#5F6368] hover:bg-[#E8EAED]'
                                }`}
                            >
                              {tab.title === '전체' ? `전체 (${tab.count})` : `${tab.title} (${tab.count})`}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {benefitLoading ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-teal-100 border-t-2 border-teal-600 animate-spin" />
                        <p className="text-xs font-bold text-teal-600 tracking-wider">수혜 필지 분석 중...</p>
                      </div>
                    ) : benefitError ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                        <p className="text-sm font-semibold text-slate-800 mb-1">데이터를 불러오지 못했습니다</p>
                        <p className="text-xs text-slate-500">{benefitError}</p>
                      </div>
                    ) : filteredBenefitParcels.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center p-8 text-slate-400 text-xs font-bold">
                        수혜 대상 필지가 없습니다.
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {filteredBenefitParcels.map((parcel, idx) => {
                          const isSelected = selectedBenefitParcel?.pnu === parcel.pnu;
                          const address = pnuToJibun(parcel.pnu || '', parcel.dongName || '');

                          let badgeBg = 'bg-slate-50 text-slate-500 border-slate-200';
                          if (parcel.tier === 'direct') badgeBg = 'bg-rose-50 text-rose-600 border-rose-200';
                          else if (parcel.tier === 'indirect') badgeBg = 'bg-orange-50 text-orange-600 border-orange-200';
                          else if (parcel.tier === 'weak') badgeBg = 'bg-blue-50 text-blue-600 border-blue-200';

                          return (
                            <button
                              key={parcel.pnu || idx}
                              type="button"
                              onClick={() => setSelectedBenefitParcel(parcel)}
                              className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${isSelected
                                  ? 'bg-teal-50/30 border-teal-500/80 shadow-md ring-1 ring-teal-500/30'
                                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                                }`}
                            >
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <h4 className="font-black text-sm text-slate-900 truncate flex-1">{address}</h4>
                                <span className={`shrink-0 text-[10px] font-black border px-2 py-0.5 rounded-md ${badgeBg}`}>
                                  {parcel.tierLabel || parcel.tier}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 font-semibold mb-3">
                                {parcel.gosiTitle}에서 {parcel.dist_m}m 거리
                              </p>
                              <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-4 flex-wrap">
                                <div className="flex items-center gap-4">
                                  <div>
                                    <p className="text-[9px] text-slate-400 font-bold">지목</p>
                                    <p className="text-xs font-bold text-slate-700">{parcel.jimok || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] text-slate-400 font-bold">용도지역</p>
                                    <p className="text-xs font-bold text-slate-700 truncate max-w-[100px]">{parcel.landUse || '-'}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-[9px] text-slate-400 font-bold">공시지가</p>
                                  <p className="text-xs font-bold text-slate-900">
                                    {parcel.officialPrice ? `${Number(parcel.officialPrice).toLocaleString()}원/㎡` : '-'}
                                  </p>
                                </div>
                              </div>
                              {parcel.officialPrice && (
                                <div className="mt-2 text-right">
                                  <span className="text-[10px] text-slate-400 font-semibold">평당 환산: </span>
                                  <span className="text-[11px] font-black text-teal-700">
                                    {Math.round(parcel.officialPrice * 3.3058).toLocaleString()}원
                                  </span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right map panel */}
                  <div className="flex-1 h-full relative bg-slate-100">
                    {!benefitLoading && filteredBenefitParcels.length > 0 && (
                      <KakaoMap
                        isAnalyzeMode={true}
                        isBenefitMode={true}
                        benefitParcels={filteredBenefitParcels}
                        selectedBenefitParcel={selectedBenefitParcel}
                        onBenefitParcelSelect={(p) => setSelectedBenefitParcel(p)}
                        properties={[]}
                        initialCenter={selectedBenefitParcel ? { lat: parseFloat(selectedBenefitParcel.lat), lng: parseFloat(selectedBenefitParcel.lng) } : (filteredBenefitParcels[0] ? { lat: parseFloat(filteredBenefitParcels[0].lat), lng: parseFloat(filteredBenefitParcels[0].lng) } : null)}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function DiscoverDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-10 h-10 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <DiscoverDetailContent />
    </Suspense>
  );
}

function pnuToJibun(pnu: string, dongName: string): string {
  if (pnu.length < 19) return dongName || pnu;
  const san = pnu[10] === '2' ? '산' : '';
  const bonStr = pnu.substring(11, 15);
  const buStr = pnu.substring(15, 19);

  const bon = parseInt(bonStr, 10) || 0;
  const bu = parseInt(buStr, 10) || 0;

  const bunji = bu === 0 ? `${bon}` : `${bon}-${bu}`;
  return `${dongName} ${san}${bunji}`.trim();
}
