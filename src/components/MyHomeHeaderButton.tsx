'use client';

import Link from 'next/link';
import Image from 'next/image';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { useMyHomeReportUnread } from '../hooks/useMyHomeReportUnread';
import MyHomeUnreadPulse from './my-home/MyHomeUnreadPulse';

/** 홈 헤더 — 부동산탐정 타이틀 옆 우리집 진입 (PC·모바일 공통) */
export default function MyHomeHeaderButton({ className = '' }: { className?: string }) {
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  const { hasUnread } = useMyHomeReportUnread(uid);

  return (
    <MyHomeUnreadPulse active={hasUnread}>
      <Link
        href="/my-home"
        className={[
          'inline-flex items-center gap-1.5 shrink-0',
          'px-2.5 py-1 rounded-xl font-bold text-[11px] tracking-wide',
          'bg-emerald-400 hover:bg-emerald-500 text-white',
          'shadow-sm shadow-emerald-400/25 transition-all active:scale-95',
          className,
        ].join(' ')}
        aria-label={hasUnread ? '우리집 — 새 주간 리포트 있음' : '우리집 — 등록 및 주간 리포트'}
      >
        <Image
          src="/myhome.png"
          alt=""
          width={14}
          height={14}
          className="w-3.5 h-3.5 shrink-0"
          aria-hidden
        />
        <span className="relative">
          우리집
          {hasUnread ? (
            <span
              className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-white border border-emerald-300 shadow-sm"
              aria-hidden
            />
          ) : null}
        </span>
      </Link>
    </MyHomeUnreadPulse>
  );
}
