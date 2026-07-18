'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TopBarProps {
  /** 페이지 타이틀 */
  title: string;
  /** 뒤로가기 동작 — href 지정 시 Link, 없으면 router.back() */
  backHref?: string;
  /** 오른쪽 영역에 들어갈 커스텀 액션들 */
  actions?: React.ReactNode;
  /** 타이틀을 가운데 정렬할지 여부 (기본: true) */
  centered?: boolean;
  /** 배경 테마: 'light' | 'dark' (기본: 'light') */
  theme?: 'light' | 'dark';
}

/**
 * TopBar — 모든 서브 페이지에서 재사용하는 상단 헤더.
 *
 * 사용 예:
 * ```tsx
 * <TopBar title="새 분석" backHref="/analyze" />
 * <TopBar title="계정" actions={<LogoutButton />} theme="dark" />
 * ```
 */
export default function TopBar({
  title,
  backHref,
  actions,
  centered = true,
  theme = 'light',
}: TopBarProps) {
  const router = useRouter();

  const isDark = theme === 'dark';

  const containerCls = isDark
    ? 'bg-slate-900/95 backdrop-blur-xl border-b border-slate-700 text-slate-100'
    : 'bg-white/95 backdrop-blur-sm border-b border-slate-200/50 text-slate-900';

  const backBtnCls = isDark
    ? 'text-slate-300 hover:text-emerald-400'
    : 'text-slate-600 hover:text-slate-900';

  const backIconCls = isDark
    ? 'bg-slate-800 border-slate-600 group-hover:border-emerald-500'
    : 'bg-slate-50 border-slate-200 group-hover:border-emerald-400';

  return (
    <header
      className={`sticky top-0 z-50 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 ${containerCls}`}
    >
      {/* ── 왼쪽: 뒤로가기 버튼 ── */}
      <div className="shrink-0 w-10">
        {backHref ? (
          <Link
            href={backHref}
            className={`group flex items-center gap-2 font-semibold transition-all ${backBtnCls}`}
            aria-label="뒤로 가기"
          >
            <div
              className={`w-9 h-9 border rounded-full flex items-center justify-center transition-all ${backIconCls}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
          </Link>
        ) : (
          <button
            onClick={() => router.back()}
            className={`group flex items-center gap-2 font-semibold transition-all ${backBtnCls}`}
            aria-label="뒤로 가기"
            type="button"
          >
            <div
              className={`w-9 h-9 border rounded-full flex items-center justify-center transition-all ${backIconCls}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
          </button>
        )}
      </div>

      {/* ── 가운데: 타이틀 ── */}
      <div
        className={`flex-1 text-sm font-bold tracking-wide truncate ${
          centered ? 'text-center' : 'text-left'
        } ${isDark ? 'text-slate-200' : 'text-slate-800'}`}
      >
        {title}
      </div>

      {/* ── 오른쪽: 액션 영역 (없으면 균형 맞추기용 빈 div) ── */}
      <div className="shrink-0 w-10 flex justify-end">
        {actions ?? null}
      </div>
    </header>
  );
}
