'use client';

import Link from 'next/link';
import MyHomeUnreadPulse from './MyHomeUnreadPulse';

type Props = {
  href?: string;
  hasUnread?: boolean;
  className?: string;
  onClick?: () => void;
};

/** 우리집 헤더 — 리포트 진입 (홈 `MyHomeHeaderButton`과 동일 녹색 pill) */
export default function MyHomeReportNavButton({
  href = '/profile?tab=my-home',
  hasUnread = false,
  className = '',
  onClick,
}: Props) {
  const buttonClass = [
    'inline-flex items-center gap-1.5 shrink-0',
    'px-2.5 py-1 rounded-xl font-bold text-[11px] tracking-wide',
    'bg-emerald-400 hover:bg-emerald-500 text-white',
    'shadow-sm shadow-emerald-400/25 transition-all active:scale-95',
    className,
  ].join(' ');

  const label = (
    <span className="relative">
      리포트
      {hasUnread ? (
        <span
          className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-white border border-emerald-300 shadow-sm"
          aria-hidden
        />
      ) : null}
    </span>
  );

  const inner = onClick ? (
    <button type="button" onClick={onClick} className={buttonClass}>
      {label}
    </button>
  ) : (
    <Link href={href} className={buttonClass}>
      {label}
    </Link>
  );

  return <MyHomeUnreadPulse active={hasUnread}>{inner}</MyHomeUnreadPulse>;
}
