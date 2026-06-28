'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { makeAnalyzeSlug } from '../lib/slug';
import {
  PANEL_CARD,
  PANEL_SECTION_LABEL,
  PANEL_SECTION_DESC,
  PAGE_SUBHEADER,
  PAGE_SUBHEADER_TITLE,
  panelStepBadge,
} from './analyzePanelFormStyles';

// ── 타입 정의 ─────────────────────────────────────────────────────
type RankingType = 'apartment' | 'land' | 'building';

const TABS: { type: RankingType; label: string; icon: string; sortDesc: string; color: string }[] = [
  { type: 'apartment', label: '아파트', icon: '/apart.svg', sortDesc: '매매 거래량 기준 · 호재 근접도 보조 정렬', color: '#ec4899' },
  { type: 'land', label: '토지', icon: '/land.svg', sortDesc: '호재 직접수혜 기준 · 최근접 거리 보조 정렬', color: '#8b5cf6' },
  { type: 'building', label: '빌딩', icon: '/build.svg', sortDesc: '수익환원법 수익률 기준 · 매매 거래량 보조 정렬', color: '#10b981' },
];

const BUDGET_CHIPS = [
  { label: '3억', value: 30000 },
  { label: '5억', value: 50000 },
  { label: '10억', value: 100000 },
  { label: '20억', value: 200000 },
  { label: '30억', value: 300000 },
  { label: '50억', value: 500000 },
];

interface RankingPanelProps {
  onResultsChange?: (results: any[], gosiPoints?: any[]) => void;
  urlPrefill?: {
    sigunguCd: string;
    sigunguName?: string;
    minPrice: number;
    maxPrice: number;
    rankingType?: string;
  } | null;
}

// ── 금액 포맷터 ────────────────────────────────────────────────────
function formatEok(n: number): string {
  if (!n || n <= 0) return '-';
  const manwon = Math.floor(n / 10000);
  if (manwon >= 10000) {
    const eok = Math.floor(manwon / 10000);
    const rest = manwon % 10000;
    return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만` : `${eok}억`;
  }
  return `${manwon.toLocaleString()}만`;
}

// ── 순위 배지 색상 ─────────────────────────────────────────────────
function rankColor(idx: number): string {
  if (idx === 0) return 'text-amber-400';
  if (idx === 1) return 'text-slate-400';
  if (idx === 2) return 'text-amber-600';
  return 'text-slate-300';
}
function rankBarColor(idx: number): string {
  if (idx === 0) return 'bg-amber-400';
  if (idx === 1) return 'bg-slate-300';
  if (idx === 2) return 'bg-amber-600';
  return 'bg-slate-100';
}

export default function RankingPanel({ onResultsChange, urlPrefill }: RankingPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── 탭 상태 ──────────────────────────────────────────────────────
  const [rankingType, setRankingType] = useState<RankingType>('apartment');

  // ── 검색 상태 ─────────────────────────────────────────────────────
  const [aptSigunguCd, setAptSigunguCd] = useState('');
  const [minBudget, setMinBudget] = useState<number | null>(null);
  const [maxBudget, setMaxBudget] = useState<number | null>(null);

  const [isSearchingRank, setIsSearchingRank] = useState(false);
  const [rankingSearched, setRankingSearched] = useState(false);
  const [rankedApts, setRankedApts] = useState<any[]>([]);
  const [rankingMessage, setRankingMessage] = useState<string | null>(null);

  const [searchQ, setSearchQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // ── urlPrefill 동기화 ──────────────────────────────────────────────
  useEffect(() => {
    const pSigungu = urlPrefill?.sigunguCd;
    const pMin = urlPrefill?.minPrice || null;
    const pMax = urlPrefill?.maxPrice || null;
    const pType = (urlPrefill?.rankingType as RankingType) || 'apartment';

    if (pSigungu && (pSigungu !== aptSigunguCd || pMin !== minBudget || pMax !== maxBudget)) {
      setAptSigunguCd(pSigungu);
      setMinBudget(pMin);
      setMaxBudget(pMax);
      setRankingType(pType);
      if (urlPrefill?.sigunguName) setSearchQ(urlPrefill.sigunguName);
      handleRankingSearch(pSigungu, pMin || undefined, pMax || undefined, pType, true);
    } else if (!pSigungu) {
      setSearchQ('');
      setAptSigunguCd('');
      setMinBudget(null);
      setMaxBudget(null);
      setRankedApts([]);
      setRankingSearched(false);
    }
  }, [urlPrefill?.sigunguCd, urlPrefill?.minPrice, urlPrefill?.maxPrice, urlPrefill?.rankingType]);

  // ── 카카오 주소 검색 ───────────────────────────────────────────────
  const handleSearchInput = (q: string) => {
    setSearchQ(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);

    if (!(window as any).kakao?.maps?.services) { setSearching(false); return; }

    const geocoder = new (window as any).kakao.maps.services.Geocoder();
    geocoder.addressSearch(q, (result: any, status: any) => {
      if (status === (window as any).kakao.maps.services.Status.OK) {
        setSearchResults(result.slice(0, 5));
        setSearching(false);
      } else {
        const ps = new (window as any).kakao.maps.services.Places();
        ps.keywordSearch(q, (data: any, status: any) => {
          if (status === (window as any).kakao.maps.services.Status.OK) {
            setSearchResults(data.slice(0, 5));
          } else {
            setSearchResults([]);
          }
          setSearching(false);
        });
      }
    });
  };

  const selectSearchResult = (r: any) => {
    let sCode = '';
    if (r.address && r.address.b_code) {
      sCode = r.address.b_code.substring(0, 5);
      setAptSigunguCd(sCode);
      setSearchQ(r.place_name || r.address_name);
      setSearchResults([]);
    } else if (r.address_name) {
      const geocoder = new (window as any).kakao.maps.services.Geocoder();
      geocoder.addressSearch(r.address_name, (res: any, status: any) => {
        if (status === (window as any).kakao.maps.services.Status.OK && res[0].address?.b_code) {
          setAptSigunguCd(res[0].address.b_code.substring(0, 5));
          setSearchQ(r.place_name || r.address_name);
          setSearchResults([]);
        } else {
          alert('해당 위치의 시군구 정보를 찾을 수 없습니다.');
        }
      });
    } else {
      alert('해당 위치의 시군구 정보를 찾을 수 없습니다.');
    }
  };

  // ── 탭 변경 시 결과 초기화 ────────────────────────────────────────
  const handleTabChange = (type: RankingType) => {
    setRankingType(type);
    setRankedApts([]);
    setRankingSearched(false);
    setRankingMessage(null);
    if (onResultsChange) onResultsChange([]);
  };

  // ── 랭킹 조회 ─────────────────────────────────────────────────────
  const handleRankingSearch = async (
    sigunguCdOverride?: string,
    min?: number,
    max?: number,
    typeOverride?: RankingType,
    skipUrlUpdate = false,
  ) => {
    const code = sigunguCdOverride || aptSigunguCd;
    if (!code) { alert('시군구를 선택해주세요.'); return; }

    const type = typeOverride || rankingType;
    const finalMin = min !== undefined ? min : (minBudget || 0);
    const finalMax = (max !== undefined && max !== 0) ? max : (maxBudget || 99999999);
    if (finalMin > finalMax) { alert('최소 예산이 최대 예산보다 큽니다.'); return; }

    setIsSearchingRank(true);
    setRankingSearched(false);
    setRankingMessage(null);
    setRankedApts([]);
    if (onResultsChange) onResultsChange([]);

    try {
      const res = await fetch(
        `/api/land/ranking?category=${type}&sigunguCd=${code}&minPrice=${finalMin}&maxPrice=${finalMax}&topN=20`
      );
      if (!res.ok) throw new Error('API 오류');
      const data = await res.json();

      if (data.success) {
        setRankedApts(data.ranked || []);
        if (onResultsChange) onResultsChange(data.ranked || [], data.gosiPoints || []);
        if (data.message) setRankingMessage(data.message);

        if (!skipUrlUpdate) {
          const params = new URLSearchParams(searchParams.toString());
          params.set('panel', 'ranking');
          params.set('rankingType', type);
          params.set('sigunguCd', code);
          params.set('sigunguName', searchQ || code);
          if (finalMin) params.set('minPrice', finalMin.toString()); else params.delete('minPrice');
          if (finalMax !== 99999999) params.set('maxPrice', finalMax.toString()); else params.delete('maxPrice');
          router.replace(`/?${params.toString()}`);
        }
      } else {
        setRankingMessage(data.error || '조회에 실패했습니다.');
      }
    } catch (err: any) {
      setRankingMessage(err.message || '서버 연결에 실패했습니다.');
    } finally {
      setRankingSearched(true);
      setIsSearchingRank(false);
    }
  };

  const navigateToRankingDetail = (item: any) => {
    const params = new URLSearchParams();
    params.set('panel', 'ranking');
    params.set('rankingType', rankingType);
    if (aptSigunguCd) params.set('sigunguCd', aptSigunguCd);
    if (minBudget) params.set('minPrice', String(minBudget));
    if (maxBudget) params.set('maxPrice', String(maxBudget));
    if (searchQ) params.set('sigunguName', searchQ);

    const displayName = item.bldNm || item.address || String(item.reportId);
    const slug = makeAnalyzeSlug(item.reportId, displayName);
    router.push(`/analyze/${slug}?return=${encodeURIComponent('?' + params.toString())}`);
  };

  const activeTab = TABS.find(t => t.type === rankingType) || TABS[0];

  return (
    <div className="relative flex flex-col h-full min-h-0 bg-slate-50/30">
      <div className={PAGE_SUBHEADER}>
        <h2 className={PAGE_SUBHEADER_TITLE}>🏆 AI 랭킹</h2>
        <p className={PANEL_SECTION_DESC}>DB 기반 즉시 순위 조회 · 외부 API 0건</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 lg:px-5 py-4 space-y-3 pb-24">

        {/* ── 카테고리 탭 ────────────────────────────────────────── */}
        <div className="flex gap-1.5 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm">
          {TABS.map(tab => {
            const isActive = rankingType === tab.type;
            return (
              <button
                key={tab.type}
                onClick={() => handleTabChange(tab.type)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-center transition-all ${isActive
                    ? 'text-white shadow-md'
                    : 'text-slate-500 hover:bg-slate-50'
                  }`}
                style={isActive ? { backgroundColor: tab.color } : undefined}
              >
                <img
                  src={tab.icon}
                  alt={tab.label}
                  className="w-5 h-5 object-contain"
                  style={isActive ? { filter: 'brightness(0) invert(1)' } : undefined}
                />
                <span className={`text-[11px] font-bold ${isActive ? 'text-white' : 'text-slate-600'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── 검색 입력 ──────────────────────────────────────────── */}
        <section className={PANEL_CARD}>
          <div className="flex items-center gap-2 mb-3">
            <span className={panelStepBadge(1)}>1</span>
            <div>
              <p className={PANEL_SECTION_LABEL}>지역 및 예산</p>
              <p className={PANEL_SECTION_DESC}>검색할 시군구와 예산 범위를 설정하세요</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
            {/* 지역 검색 */}
            <div className="flex-1 min-w-[150px] relative">
              <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2.5 transition-all focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20 shadow-sm">
                <svg className="w-4 h-4 text-slate-400 shrink-0 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="시군구 검색"
                  value={searchQ}
                  onChange={e => handleSearchInput(e.target.value)}
                  className="w-full bg-transparent border-none text-[13px] font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                />
                {searching && (
                  <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0 ml-2" />
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  {searchResults.map((r, i) => (
                    <button key={i} type="button" onClick={() => selectSearchResult(r)} className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-50/60 border-b border-slate-50 last:border-0 transition-colors">
                      <div className="text-xs font-semibold text-slate-800">{r.place_name || r.address_name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{r.road_address_name || r.address_name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 예산 범위 */}
            <div className="flex-1 min-w-[150px] flex items-center gap-1.5">
              <input
                type="number"
                placeholder="최소 (만원)"
                value={minBudget || ''}
                onChange={e => setMinBudget(e.target.value ? Number(e.target.value) : null)}
                className="flex-1 min-w-0 text-center bg-white border border-slate-200 rounded-xl px-2.5 py-2.5 text-xs font-semibold text-slate-700 outline-none transition-all hover:border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 shadow-sm"
              />
              <span className="text-slate-400 text-xs shrink-0 font-bold">~</span>
              <input
                type="number"
                placeholder="최대 (만원)"
                value={maxBudget || ''}
                onChange={e => setMaxBudget(e.target.value ? Number(e.target.value) : null)}
                className="flex-1 min-w-0 text-center bg-white border border-slate-200 rounded-xl px-2.5 py-2.5 text-xs font-semibold text-slate-700 outline-none transition-all hover:border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 shadow-sm"
              />
            </div>

            {/* 예산 칩 */}
            <div className="flex flex-wrap gap-1.5">
              {BUDGET_CHIPS.map(chip => (
                <button
                  key={chip.label}
                  onClick={() => {
                    if (!minBudget) setMinBudget(chip.value);
                    else setMaxBudget(chip.value);
                  }}
                  className="px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-semibold hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                >
                  {chip.label} 이하
                </button>
              ))}
            </div>

            {/* 조회 버튼 */}
            <button
              onClick={() => handleRankingSearch()}
              disabled={!aptSigunguCd || isSearchingRank}
              className={`w-full py-3.5 rounded-xl text-sm font-bold text-white shadow-md transition-all ${(!aptSigunguCd || isSearchingRank)
                  ? 'bg-slate-300 cursor-not-allowed shadow-none'
                  : 'hover:opacity-90 active:scale-[0.98]'
                }`}
              style={(!aptSigunguCd || isSearchingRank) ? undefined : { backgroundColor: activeTab.color }}
            >
              {isSearchingRank ? '검색 중...' : `${activeTab.label} 랭킹 조회`}
            </button>
          </div>
        </section>

        {/* ── 랭킹 결과 ──────────────────────────────────────────── */}
        {(rankingSearched || isSearchingRank) && (
          <section className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <img
                src={activeTab.icon}
                alt={activeTab.label}
                className="w-4 h-4 object-contain"
              />
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: activeTab.color }}>
                AI {activeTab.label} 랭킹
              </span>
              {rankedApts.length > 0 && (
                <span className="text-[9px] font-bold text-slate-400">{rankedApts.length}개</span>
              )}
            </div>

            {isSearchingRank ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className="w-8 h-8 relative">
                  <div className="absolute inset-0 rounded-full border-2 border-slate-100" />
                  <div className="absolute inset-0 rounded-full border-t-2 animate-spin" style={{ borderColor: activeTab.color }} />
                </div>
                <p className="text-[11px] font-extrabold" style={{ color: activeTab.color }}>DB 랭킹 계산 중...</p>
              </div>
            ) : rankingMessage ? (
              <div className="text-center py-8 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <p className="text-xs font-bold text-slate-500">{rankingMessage}</p>
              </div>
            ) : rankedApts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-slate-100">
                <p className="text-slate-500 font-bold text-sm">랭킹 데이터가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-[10px] text-slate-400 font-semibold mb-2 text-right">
                  {activeTab.sortDesc}
                </div>
                {rankedApts.map((item, idx) => (
                  <RankingCard
                    key={item.reportId}
                    item={item}
                    idx={idx}
                    type={rankingType}
                    accentColor={activeTab.color}
                    onClick={() => navigateToRankingDetail(item)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

// ── 카드 컴포넌트 ──────────────────────────────────────────────────
function RankingCard({
  item,
  idx,
  type,
  accentColor,
  onClick,
}: {
  item: any;
  idx: number;
  type: RankingType;
  accentColor: string;
  onClick: () => void;
}) {
  const estimatedAmt = item.estimatedTotalPrice ? formatEok(Number(item.estimatedTotalPrice)) : null;

  return (
    <div
      onClick={onClick}
      className="group bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 cursor-pointer hover:border-opacity-80 hover:shadow-md transition-all relative overflow-hidden"
      style={{ ['--hover-border' as any]: accentColor }}
    >
      {/* 순위 사이드 바 */}
      <div className={`absolute top-0 left-0 w-1 h-full ${rankBarColor(idx)}`} />

      <div className="flex items-start gap-3 pl-2">
        {/* 순위 숫자 */}
        <div className="flex flex-col items-center justify-center shrink-0 w-6 pt-0.5">
          <span className={`text-xl font-black ${rankColor(idx)}`}>{idx + 1}</span>
        </div>

        {/* 카드 내용 */}
        <div className="flex-1 min-w-0">
          {/* 이름/주소 */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-bold text-sm text-slate-900 truncate group-hover:transition-colors" style={{ color: undefined }}>
              {type === 'apartment'
                ? item.bldNm
                : type === 'land'
                  ? (item.address || item.pnu)
                  : (item.bldNm || item.address)}
            </h4>
            {type === 'apartment' && item.targetArea > 0 && (
              <span className="text-[10px] text-slate-400 font-semibold">{item.targetArea}㎡</span>
            )}
            {type === 'land' && item.jimok && (
              <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-md border border-purple-100 font-semibold">지목: {item.jimok}</span>
            )}
            {type === 'building' && item.yieldRate === null && (
              <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md border border-slate-200 font-semibold">수익률 미산출</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5 mt-1">
            {/* 추정가 + 카테고리별 핵심 지표 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${estimatedAmt ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                {estimatedAmt ? `추정가 ${estimatedAmt}` : '가격 미상'}
              </span>

              {/* 아파트: 가격 추세 + 매매 건수 */}
              {type === 'apartment' && (
                <>
                  {item.priceTrendPercent !== null && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${item.priceTrendPercent > 0 ? 'bg-rose-50 text-rose-600 border border-rose-100/50' : item.priceTrendPercent < 0 ? 'bg-blue-50 text-blue-600 border border-blue-100/50' : 'bg-slate-50 text-slate-500'}`}>
                      6개월 {item.priceTrendPercent > 0 ? '+' : ''}{item.priceTrendPercent.toFixed(1)}% {item.priceTrendPercent > 0 ? '↑' : item.priceTrendPercent < 0 ? '↓' : '-'}
                    </span>
                  )}
                  <span className="text-[10px] font-semibold text-slate-500">매매 {item.saleCount}건</span>
                </>
              )}

              {/* 토지: 면적 */}
              {type === 'land' && item.targetArea > 0 && (
                <span className="text-[10px] font-semibold text-slate-500">{item.targetArea.toLocaleString()}㎡</span>
              )}

              {/* 빌딩: 수익률 + NOI */}
              {type === 'building' && item.yieldRate !== null && (
                <>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md border bg-emerald-50 text-emerald-700 border-emerald-100">
                    CAP {item.yieldRate.toFixed(1)}%
                  </span>
                  {item.noi && item.noi > 0 && (
                    <span className="text-[10px] font-semibold text-slate-500">연 NOI {formatEok(item.noi)}</span>
                  )}
                </>
              )}
            </div>

            {/* 호재 정보 */}
            {item.gosiHitCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100/50 line-clamp-1 max-w-[240px]">
                  ✨ 직접 수혜 {item.gosiHitCount}건 {item.nearestGosiTitle ? `| ${item.nearestGosiTitle} (${item.nearestGosiKm}km)` : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
