'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { makeAnalyzeSlug } from '../lib/slug';

// ────────────────────────────────────────────────
// 타입 정의
// ────────────────────────────────────────────────

export interface PropertyCardData {
  id: string;
  /** 건물명 (아파트/빌딩 카테고리, SEO 슬러그용) */
  bldNm?: string;
  /** 매물 제목 (없으면 '부동산탐정 판독'으로 표시) */
  propertyTitle?: string;
  /** 위치 정보 */
  location?: { name?: string; address?: string };
  /** 카테고리 (토지 / 주택 / 아파트 / 빌딩 등) */
  category?: string;
  /** 탐정 노트 — 한 줄 요약 */
  detectiveNote?: string;
  /** 한 줄 평 */
  oneLiner?: string;
  /** 등급/리스크 */
  propertyGrade?: { riskScore?: string; overall?: string };
  /** 찜 (uid 배열) */
  likes?: string[];
  /** 생성일 ISO string */
  createdAt?: string;
  /** 6개월 상승률 (%) */
  riseRate6m?: number | null;
  /** 최근 1개월 평균가 (만원) */
  avgPrice1m?: number | null;
  /** 대표 평수 최소 면적 (㎡) */
  minArea?: number | null;
  /** 대표 평수 최대 면적 (㎡) */
  maxArea?: number | null;
  /** 전용 면적 (㎡) */
  exclusiveArea?: number | null;
  /** 면적 (㎡) */
  area?: number | null;
  /** apartment_master.id (타임라인 aptSeq) */
  aptSeq?: string | null;
  rtmsAptSeq?: string | null;
  /** discover — 리포트 없으면 카드 클릭·자세히 보기 비활성 */
  hasReport?: boolean;
}

export interface PropertyCardProps {
  data: PropertyCardData;
  /** 카드를 클릭했을 때 이동할 경로 — 생략 시 router.push(`/analyze/${id}`) */
  href?: string;
  /** 클릭 핸들러 — 지정 시 기본 이동 대신 실행 */
  onClick?: (e: React.MouseEvent) => void;
  /** 현재 로그인된 유저 uid (찜 하이라이트용) */
  currentUid?: string;
  /** 찜 버튼 클릭 콜백 — 없으면 찜 버튼을 숨김 */
  onLikeToggle?: (id: string, e: React.MouseEvent) => void;
  /** 선택된 카드 강조 여부 */
  selected?: boolean;
  /** 아파트 — 비교함 담기 (클릭 시 카드 이동 방지) */
  onAddToCompare?: (e: React.MouseEvent) => void;
  /** 비교함에 이미 담김 */
  inCompareBasket?: boolean;
  /** 카드 크기: 'default' | 'compact' (기본: 'default') */
  size?: 'default' | 'compact';
  /** 테마: 'light' | 'dark' (기본: 'light') */
  theme?: 'light' | 'dark';
  /** 아파트 발견 — 3칸 통계 (매매/전세/월세 모드) */
  apartmentDisplay?: {
    col1Label: string;
    col1Value: string;
    col1ValueClassName?: string;
    col2Label: string;
    col2Value: string;
    col3Label: string;
    col3Value: string;
    col3ValueClassName?: string;
  };
}

// ────────────────────────────────────────────────
// 유틸
// ────────────────────────────────────────────────

/** AI 종합 점수 — 높을수록 우수 (mapMarkers·지도 마커와 동일) */
function getRiskConfig(score: string | undefined | null): {
  label: string;
  bg: string;
  text: string;
  border: string;
} {
  const n = parseInt(score || '0', 10);
  if (n >= 70) return { label: '우수', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' };
  if (n >= 40) return { label: '보통', bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-100' };
  if (n > 0) return { label: '주의', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' };
  return { label: '준비', bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100' };
}

function formatRiskScoreDisplay(score: string | undefined | null): string {
  const n = parseInt(score || '0', 10);
  if (Number.isNaN(n) || n <= 0) return '준비';
  return String(n);
}

function hasRiskScore(score: string | undefined | null): boolean {
  return score != null && score !== '';
}

function getRiskConfigDark(score: string | undefined | null): {
  bg: string;
  text: string;
  border: string;
} {
  const n = parseInt(score || '0', 10);
  if (n >= 70) return { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' };
  if (n >= 40) return { bg: 'bg-sky-500/20', text: 'text-sky-300', border: 'border-sky-500/30' };
  if (n > 0) return { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/30' };
  return { bg: 'bg-slate-700', text: 'text-slate-400', border: 'border-slate-600' };
}

function formatDetectiveNote(note?: string): string | undefined {
  if (!note) return note;
  if (note === '데이터 분석이 완료되었습니다.') return '데이터 분석 완료 - AI분석 준비 중입니다.';
  return note;
}

function formatDate(dateString?: string): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatExclusiveAreaValue(exclusiveArea?: number | null, area?: number | null): string {
  const displayArea = area ?? exclusiveArea;
  if (displayArea == null) return '-';
  const sqmInt = Math.round(Number(displayArea));
  if (!Number.isFinite(sqmInt) || sqmInt <= 0) return '-';
  return `${sqmInt}㎡`;
}

function formatRiseRate6m(riseRate6m?: number | null): string {
  if (riseRate6m == null) return '-';
  return `${riseRate6m > 0 ? '+' : ''}${riseRate6m}%`;
}

function riseRateClass(riseRate6m?: number | null): string {
  if (riseRate6m == null || riseRate6m === 0) return 'text-slate-600';
  if (riseRate6m > 0) return 'text-red-500';
  return 'text-blue-500';
}

function riseRateClassDark(riseRate6m?: number | null): string {
  if (riseRate6m == null || riseRate6m === 0) return 'text-slate-300';
  if (riseRate6m > 0) return 'text-red-400';
  return 'text-blue-400';
}

function formatAvgPrice1m(avgPrice1m?: number | null): string {
  if (avgPrice1m == null || avgPrice1m <= 0) return '-';
  return `${(avgPrice1m / 10000).toFixed(1)}억`;
}

function isApartmentAnalysisComplete(data: PropertyCardData): boolean {
  if (data.hasReport === false) return false;
  const n = parseInt(data.propertyGrade?.riskScore || '0', 10);
  return !Number.isNaN(n) && n > 0;
}

function locationSubtitle(data: PropertyCardData): string {
  const label = (data.location?.address || data.location?.name || '').trim();
  const title = (data.propertyTitle || '').trim();
  if (!label || label === title) return '';
  return label;
}

// ────────────────────────────────────────────────
// 컴포넌트
// ────────────────────────────────────────────────

/**
 * PropertyCard — 홈·발견·내분석·찜 목록 등에서 공용으로 사용하는 매물 카드.
 *
 * 사용 예:
 * ```tsx
 * // 홈 (light, 찜 버튼 있음)
 * <PropertyCard data={analysis} currentUid={user?.uid} onLikeToggle={toggleLike} />
 *
 * // 내 기록 (dark, 찜 없음)
 * <PropertyCard data={item} theme="dark" />
 *
 * // compact 모드
 * <PropertyCard data={item} size="compact" />
 * ```
 */
export default function PropertyCard({
  data,
  href,
  onClick,
  currentUid,
  onLikeToggle,
  selected = false,
  onAddToCompare,
  inCompareBasket = false,
  size = 'default',
  theme = 'light',
  apartmentDisplay,
}: PropertyCardProps) {
  const router = useRouter();
  const isDark = theme === 'dark';
  const isCompact = size === 'compact';
  const isApartment = data.category === '아파트' || data.category === 'apartment';
  const discoverClickDisabled = isApartment && data.hasReport === false;

  const riskScore = data.propertyGrade?.riskScore;
  const riskLight = getRiskConfig(riskScore);
  const riskDark = getRiskConfigDark(riskScore);
  const analysisComplete = !isApartment || isApartmentAnalysisComplete(data);
  const subtitle = locationSubtitle(data);

  const isLiked = currentUid ? (data.likes?.includes(currentUid) ?? false) : false;

  const handleClick = (e?: React.MouseEvent) => {
    if (discoverClickDisabled) return;
    if (onClick) {
      if (e) {
        onClick(e);
      } else {
        onClick(new MouseEvent('click') as any);
      }
      return;
    }
    const target = href ?? `/analyze/${makeAnalyzeSlug(data.id, data.bldNm)}`;
    router.push(target);
  };

  // ── light 테마 ──
  if (!isDark) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        className={[
          'group relative bg-white border rounded-2xl',
          discoverClickDisabled ? 'cursor-default' : 'cursor-pointer',
          !discoverClickDisabled && 'transition-all hover:border-emerald-300 hover:shadow-md',
          isCompact ? 'p-3' : 'p-4',
          selected
            ? 'border-emerald-400 ring-1 ring-emerald-400 shadow-sm'
            : 'border-slate-100',
        ].join(' ')}
      >
        {/* 상단: 제목 + 리스크 */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h3
                className={[
                  'font-bold text-slate-900 tracking-tight truncate leading-tight flex-1 min-w-0',
                  'group-hover:text-emerald-600 transition-colors',
                  isCompact ? 'text-sm' : 'text-[15px]',
                ].join(' ')}
              >
                {data.propertyTitle || '부동산탐정 판독'}
              </h3>
            </div>
            {subtitle && (
              <p className="text-xs text-slate-400 truncate font-medium mt-0.5">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span
              className={[
                'text-[10px] px-2 py-0.5 rounded-lg font-bold border',
                analysisComplete
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50'
                  : 'bg-slate-50 text-slate-500 border-slate-200/80',
              ].join(' ')}
            >
              {analysisComplete ? '분석완료' : '분석 준비'}
            </span>
            {analysisComplete && hasRiskScore(riskScore) && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-tighter">AI</span>
                <span
                  className={[
                    'text-[11px] font-black px-1.5 py-0.5 rounded-md border',
                    riskLight.bg,
                    riskLight.text,
                    riskLight.border,
                  ].join(' ')}
                >
                  {formatRiskScoreDisplay(riskScore)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 아파트 통계 또는 탐정 노트 */}
        {!isCompact && (isApartment ? (
          <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-100/50 rounded-xl p-3 mb-3 text-center">
            <div>
              <p className="text-[10px] text-slate-400 font-bold">{apartmentDisplay?.col1Label ?? '6개월'}</p>
              <p className={`text-xs font-bold mt-1 ${apartmentDisplay?.col1ValueClassName ?? riseRateClass(data.riseRate6m)}`}>
                {apartmentDisplay?.col1Value ?? formatRiseRate6m(data.riseRate6m)}
              </p>
            </div>
            <div className="border-x border-slate-200/60 flex flex-col justify-center">
              <p className="text-[10px] text-slate-400 font-bold">{apartmentDisplay?.col2Label ?? '전용면적'}</p>
              <p className="text-xs font-extrabold text-slate-700 mt-1 leading-tight">
                {apartmentDisplay?.col2Value ?? formatExclusiveAreaValue(data.exclusiveArea, data.area)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold">{apartmentDisplay?.col3Label ?? '최근 1개월'}</p>
              <p className={`text-xs font-bold mt-1 ${apartmentDisplay?.col3ValueClassName ?? 'text-slate-700'}`}>
                {apartmentDisplay?.col3Value ?? formatAvgPrice1m(data.avgPrice1m)}
              </p>
            </div>
          </div>
        ) : (
          data.detectiveNote && (
            <div className="bg-slate-50 border border-slate-100/50 rounded-xl p-2.5 mb-2.5">
              <p className="text-[12px] text-slate-600 font-medium line-clamp-2 leading-relaxed">
                {formatDetectiveNote(data.detectiveNote)}
              </p>
            </div>
          )
        ))}

        {/* 하단: 날짜 + 카테고리 + 찜 + 비교 */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2 flex-wrap">
            {data.createdAt && (
              <span className="text-[10px] text-slate-300 font-medium">{formatDate(data.createdAt)}</span>
            )}
            {data.category && (
              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">
                {data.category}
              </span>
            )}
            {onLikeToggle && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLikeToggle(data.id, e);
                }}
                className={[
                  'flex items-center gap-1 text-sm transition-all focus:outline-none',
                  isLiked
                    ? 'text-rose-500 hover:text-rose-600'
                    : 'text-slate-300 hover:text-rose-400',
                ].join(' ')}
                aria-label={isLiked ? '찜 취소' : '찜하기'}
                type="button"
              >
                <span className={isLiked ? 'animate-pulse' : ''}>♥</span>
                <span className="text-[10px] font-bold mt-0.5">{data.likes?.length ?? 0}</span>
              </button>
            )}
            {isApartment && onAddToCompare && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCompare(e);
                }}
                className={[
                  'text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors',
                  inCompareBasket
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200',
                ].join(' ')}
              >
                {inCompareBasket ? '✓ 비교함' : '+ 비교'}
              </button>
            )}
          </div>
          {!discoverClickDisabled && (
          <span className="text-[10px] text-emerald-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
            자세히 보기 →
          </span>
          )}
        </div>
      </div>
    );
  }

  // ── dark 테마 ──
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className={[
        'group bg-slate-800/60 border rounded-xl',
        discoverClickDisabled ? 'cursor-default' : 'cursor-pointer',
        !discoverClickDisabled && 'transition-all hover:border-emerald-500/50',
        isCompact ? 'p-3' : 'p-4',
        selected ? 'border-emerald-500/60' : 'border-slate-700',
      ].join(' ')}
    >
      {/* 상단: 제목 + 리스크 + 찜 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3
              className={[
                'font-bold text-white truncate group-hover:text-emerald-300 transition-colors flex-1 min-w-0',
                isCompact ? 'text-xs' : 'text-sm',
              ].join(' ')}
            >
              {data.propertyTitle || '부동산탐정 판독'}
            </h3>
            {isApartment && hasRiskScore(riskScore) && (
              <span
                className={[
                  'shrink-0 text-[11px] font-black px-1.5 py-0.5 rounded-md border tabular-nums',
                  riskDark.bg,
                  riskDark.text,
                  riskDark.border,
                ].join(' ')}
              >
                {formatRiskScoreDisplay(riskScore)}
              </span>
            )}
          </div>
          {data.location?.name && (
            <p className="text-xs text-slate-400 truncate mt-0.5">{data.location.name}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isApartment && hasRiskScore(riskScore) && (
            <span
              className={[
                'text-xs font-bold px-2 py-0.5 rounded-lg border',
                riskDark.bg,
                riskDark.text,
                riskDark.border,
              ].join(' ')}
            >
              {formatRiskScoreDisplay(riskScore)}
            </span>
          )}
          {/* 찜 버튼 */}
          {onLikeToggle && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLikeToggle(data.id, e);
              }}
              className="flex items-center gap-1 text-sm transition-all focus:outline-none"
              aria-label={isLiked ? '찜 취소' : '찜하기'}
              type="button"
            >
              <span
                className={[
                  'text-lg leading-none',
                  isLiked
                    ? 'text-rose-500 hover:text-rose-600 animate-pulse'
                    : 'text-slate-500 hover:text-rose-400',
                ].join(' ')}
              >
                ♥
              </span>
              <span className="text-xs font-bold text-slate-400">{data.likes?.length ?? 0}</span>
            </button>
          )}
        </div>
      </div>

      {/* 아파트 통계 또는 탐정 노트 */}
      {!isCompact && (isApartment ? (
        <div className="grid grid-cols-3 gap-2 bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 mb-3 text-center">
          <div>
            <p className="text-[10px] text-slate-400 font-bold">6개월</p>
            <p className={`text-xs font-bold mt-1 ${riseRateClassDark(data.riseRate6m)}`}>
              {formatRiseRate6m(data.riseRate6m)}
            </p>
          </div>
          <div className="border-x border-slate-700/60 flex flex-col justify-center">
            <p className="text-[10px] text-slate-400 font-bold">전용면적</p>
            <p className="text-xs font-extrabold text-slate-300 mt-1 leading-tight">
              {formatExclusiveAreaValue(data.exclusiveArea, data.area)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold">최근 1개월</p>
            <p className="text-xs font-extrabold text-slate-300 mt-1">
              {formatAvgPrice1m(data.avgPrice1m)}
            </p>
          </div>
        </div>
      ) : (
        data.detectiveNote && (
          <p className="text-xs text-emerald-400 font-semibold line-clamp-1 mb-2">
            🕵️ {formatDetectiveNote(data.detectiveNote)}
          </p>
        )
      ))}

      {/* 하단: 카테고리 + 날짜 */}
      <div className="flex items-center justify-between mt-1">
        {data.category && (
          <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-bold">
            {data.category}
          </span>
        )}
        {data.createdAt && (
          <span className="text-[10px] text-slate-500">{formatDate(data.createdAt)}</span>
        )}
      </div>
    </div>
  );
}
