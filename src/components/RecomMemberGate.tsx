'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { RECOM_LIST_TAGLINE } from '../lib/recomQuickPicks';

type Props = {
  loginReturnPath?: string;
  onClose?: () => void;
};

export default function RecomMemberGate({ loginReturnPath = '/recom', onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const loginHref = `/login?return=${encodeURIComponent(loginReturnPath)}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recom-member-gate-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-6 pb-4 text-center">
          <h2 id="recom-member-gate-title" className="text-base font-black text-slate-900 tracking-tight">
            추천 매물
          </h2>
          <p className="mt-3 text-sm text-slate-700 leading-relaxed font-bold">
            무료 가입 후 확인하세요.
          </p>
          <p className="mt-1.5 text-sm text-slate-800 leading-relaxed font-bold">
            {RECOM_LIST_TAGLINE}
          </p>
        </div>
        <div className="px-5 pb-5 flex flex-col gap-2">
          <Link
            href={loginHref}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold text-center transition-all shadow-sm shadow-emerald-500/20 active:scale-[0.98]"
          >
            로그인하기
          </Link>
          <Link
            href="/"
            className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold text-center transition-all active:scale-[0.98]"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
