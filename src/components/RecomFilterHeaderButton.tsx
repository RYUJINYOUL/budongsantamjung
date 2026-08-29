'use client';

type Props = {
  active: boolean;
  onClick: () => void;
  className?: string;
};

/** 추천 페이지 모바일 헤더 — 필터 바텀시트 열기 */
export default function RecomFilterHeaderButton({ active, onClick, className = '' }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'lg:hidden inline-flex items-center gap-1.5 shrink-0',
        'px-2.5 py-1 rounded-xl font-bold text-[11px] tracking-wide',
        'bg-emerald-400 hover:bg-emerald-500 text-white',
        'shadow-sm shadow-emerald-400/25 transition-all active:scale-95',
        className,
      ].join(' ')}
      aria-label={active ? '필터 — 조건 적용됨' : '필터'}
    >
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
          d="M3 4h18M7 12h10M10 20h4"
        />
      </svg>
      <span className="relative">
        필터
        {active ? (
          <span
            className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-white border border-emerald-300 shadow-sm"
            aria-hidden
          />
        ) : null}
      </span>
    </button>
  );
}
