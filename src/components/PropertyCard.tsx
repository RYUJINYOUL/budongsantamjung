'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// ────────────────────────────────────────────────
// 타입 정의
// ────────────────────────────────────────────────

export interface PropertyCardData {
  id: string;
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
}

export interface PropertyCardProps {
  data: PropertyCardData;
  /** 카드를 클릭했을 때 이동할 경로 — 생략 시 router.push(`/analyze/${id}`) */
  href?: string;
  /** 현재 로그인된 유저 uid (찜 하이라이트용) */
  currentUid?: string;
  /** 찜 버튼 클릭 콜백 — 없으면 찜 버튼을 숨김 */
  onLikeToggle?: (id: string, e: React.MouseEvent) => void;
  /** 선택된 카드 강조 여부 */
  selected?: boolean;
  /** 카드 크기: 'default' | 'compact' (기본: 'default') */
  size?: 'default' | 'compact';
  /** 테마: 'light' | 'dark' (기본: 'light') */
  theme?: 'light' | 'dark';
}

// ────────────────────────────────────────────────
// 유틸
// ────────────────────────────────────────────────

function getRiskConfig(score: string | undefined | null): {
  label: string;
  bg: string;
  text: string;
  border: string;
} {
  const n = parseInt(score || '0');
  if (n > 70) return { label: '고위험', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' };
  if (n > 40) return { label: '주의', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' };
  return { label: '양호', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' };
}

function getRiskConfigDark(score: string | undefined | null): {
  bg: string;
  text: string;
  border: string;
} {
  const n = parseInt(score || '0');
  if (n > 70) return { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/30' };
  if (n > 40) return { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' };
  return { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' };
}

function formatDate(dateString?: string): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
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
  currentUid,
  onLikeToggle,
  selected = false,
  size = 'default',
  theme = 'light',
}: PropertyCardProps) {
  const router = useRouter();
  const isDark = theme === 'dark';
  const isCompact = size === 'compact';

  const riskScore = data.propertyGrade?.riskScore;
  const riskLight = getRiskConfig(riskScore);
  const riskDark = getRiskConfigDark(riskScore);

  const isLiked = currentUid ? (data.likes?.includes(currentUid) ?? false) : false;

  const handleClick = () => {
    const target = href ?? `/analyze/${data.id}`;
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
          'group relative bg-white border rounded-2xl cursor-pointer',
          'transition-all hover:border-emerald-300 hover:shadow-md',
          isCompact ? 'p-3' : 'p-4',
          selected
            ? 'border-emerald-400 ring-1 ring-emerald-400 shadow-sm'
            : 'border-slate-100',
        ].join(' ')}
      >
        {/* 상단: 제목 + 리스크 */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h3
              className={[
                'font-bold text-slate-900 tracking-tight truncate leading-tight',
                'group-hover:text-emerald-600 transition-colors',
                isCompact ? 'text-sm' : 'text-[15px]',
              ].join(' ')}
            >
              {data.propertyTitle || '부동산탐정 판독'}
            </h3>
            {data.location?.name && (
              <p className="text-xs text-slate-400 truncate font-medium mt-0.5">
                {data.location.name}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg font-bold border border-emerald-100/50">
              판독완료
            </span>
            {riskScore && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-tighter">RISK</span>
                <span
                  className={[
                    'text-[11px] font-black px-1.5 py-0.5 rounded-md border',
                    riskLight.bg,
                    riskLight.text,
                    riskLight.border,
                  ].join(' ')}
                >
                  {riskScore}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 탐정 노트 */}
        {!isCompact && data.detectiveNote && (
          <div className="bg-slate-50 border border-slate-100/50 rounded-xl p-2.5 mb-2.5">
            <p className="text-[12px] text-slate-600 font-medium line-clamp-2 leading-relaxed">
              {data.detectiveNote}
            </p>
          </div>
        )}

        {/* 하단: 날짜 + 카테고리 + 찜 */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2">
            {data.createdAt && (
              <span className="text-[10px] text-slate-300 font-medium">{formatDate(data.createdAt)}</span>
            )}
            {data.category && (
              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">
                {data.category}
              </span>
            )}
            {/* 찜 버튼 */}
            {onLikeToggle && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLikeToggle(data.id, e);
                }}
                className={[
                  'flex items-center gap-1 text-sm transition-all focus:outline-none ml-1',
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
          </div>
          <span className="text-[10px] text-emerald-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
            자세히 보기 →
          </span>
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
        'group bg-slate-800/60 border rounded-xl cursor-pointer',
        'transition-all hover:border-emerald-500/50',
        isCompact ? 'p-3' : 'p-4',
        selected ? 'border-emerald-500/60' : 'border-slate-700',
      ].join(' ')}
    >
      {/* 상단: 제목 + 리스크 + 찜 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3
            className={[
              'font-bold text-white truncate group-hover:text-emerald-300 transition-colors',
              isCompact ? 'text-xs' : 'text-sm',
            ].join(' ')}
          >
            {data.propertyTitle || '부동산탐정 판독'}
          </h3>
          {data.location?.name && (
            <p className="text-xs text-slate-400 truncate mt-0.5">{data.location.name}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {riskScore && (
            <span
              className={[
                'text-xs font-bold px-2 py-0.5 rounded-lg border',
                riskDark.bg,
                riskDark.text,
                riskDark.border,
              ].join(' ')}
            >
              {riskScore}
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

      {/* 탐정 노트 */}
      {!isCompact && data.detectiveNote && (
        <p className="text-xs text-emerald-400 font-semibold line-clamp-1 mb-2">
          🕵️ {data.detectiveNote}
        </p>
      )}

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
