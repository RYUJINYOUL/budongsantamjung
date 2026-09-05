'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { isAdminUser } from '../lib/adminUids';
import { readHomeMapSession } from '../lib/homeMapSession';

const EMERALD_ICON_FILTER =
  'invert(43%) sepia(97%) saturate(541%) hue-rotate(113deg) brightness(91%) contrast(92%)';
const SLATE_ICON_FILTER =
  'invert(48%) sepia(11%) saturate(727%) hue-rotate(182deg) brightness(93%) contrast(88%)';

/** SideNav에서만 숨김 — URL·페이지 기능은 유지 (발견·분양·랭킹) */
const HIDDEN_NAV_IDS = new Set(['discover', 'presale', 'ranking', 'listings']);

const NAV_ITEMS = [
  {
    id: 'home',
    label: '홈',
    href: '/',
    icon: '/a1.png',
  },
  {
    id: 'recom',
    label: '추천',
    href: '/recom',
    icon: '/a5.png',
  },
  {
    id: 'listings',
    label: '매물',
    href: '/listings',
    icon: '/a3.png',
  },
  {
    id: 'discover',
    label: '발견',
    href: '/discover',
    icon: '/a3.png',
  },
  {
    id: 'presale',
    label: '분양',
    href: '/presale',
    icon: '/a15.png',
  },
  {
    id: 'ranking',
    label: '랭킹',
    href: '/ranking',
    icon: '/a7.png',
  },
  {
    id: 'analyze',
    label: '분석',
    href: '/?panel=analyze',
    icon: '/a2.png',
  },
  {
    id: 'profile',
    label: '내기록',
    href: '/profile',
    icon: '/a4.png',
  },
] as const;

function SideNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [homeHref, setHomeHref] = useState('/');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const saved = readHomeMapSession();
    if (!saved) {
      setHomeHref('/');
      return;
    }
    const params = new URLSearchParams();
    params.set('tab', saved.tab);
    params.set('lat', String(saved.lat));
    params.set('lng', String(saved.lng));
    params.set('zoom', String(saved.zoomLevel));
    if (saved.category !== 'all') params.set('category', saved.category);
    setHomeHref(`/?${params.toString()}`);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/' && !searchParams.get('panel');
    if (href === '/?panel=analyze') return pathname === '/' && searchParams.get('panel') === 'analyze';
    if (href === '/ranking') return pathname === '/ranking' || pathname.startsWith('/ranking/');
    if (href === '/recom') return pathname.startsWith('/recom');
    if (href === '/discover') return pathname.startsWith('/discover');
    if (href === '/presale') return pathname.startsWith('/presale');
    if (href === '/profile') return pathname.startsWith('/profile');
    if (href === '/reviews') return pathname.startsWith('/reviews');
    if (href === '/admin/analyze') return pathname.startsWith('/admin/analyze');
    return false;
  };

  const isAdmin = isAdminUser(user?.uid);

  return (
    <>
      {/* ── 사이드바 본체 ── */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-[100] flex flex-col',
          'bg-white shadow-xl border-r border-slate-100',
          'transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0 w-56' : '-translate-x-full w-56',
          'lg:translate-x-0 lg:w-16 lg:shadow-none',
        ].join(' ')}
        aria-label="사이드 내비게이션"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 lg:justify-center lg:p-0 lg:h-16 lg:border-b-0 shrink-0">
          <div className="flex items-center gap-3 lg:justify-center">
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-sm shrink-0">
              <img src="/logo512.png" alt="부동산탐정 로고" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-slate-800 lg:hidden">부동산탐정</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-slate-100 lg:hidden"
            aria-label="메뉴 닫기"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 p-3 lg:p-2 overflow-y-auto">
          <ul className="space-y-1">
            {NAV_ITEMS.filter((item) => !HIDDEN_NAV_IDS.has(item.id)).map((item) => {
              const href = item.id === 'home' ? homeHref : item.href;
              const active = isActive(item.id === 'home' ? '/' : item.href);
              return (
                <li key={item.id}>
                  <Link
                    href={href}
                    onClick={() => setIsOpen(false)}
                    className={[
                      'w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all',
                      'lg:flex-col lg:gap-1 lg:py-3 lg:px-1',
                      active
                        ? 'bg-emerald-50 text-emerald-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
                    ].join(' ')}
                  >
                    <span className={active ? 'text-emerald-600' : ''}>
                      <img
                        src={item.icon}
                        alt={item.label}
                        className="w-5 h-5 lg:w-6 lg:h-6 object-contain transition-all"
                        style={
                          active || item.id === 'analyze'
                            ? { filter: EMERALD_ICON_FILTER }
                            : { filter: SLATE_ICON_FILTER }
                        }
                      />
                    </span>
                    <span className="font-bold text-sm lg:text-[11px] lg:tracking-tight">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 관리자 샘플 분석 — PC + 관리자만, 리뷰 위 */}
        {isAdmin && (
          <div className="hidden lg:block p-2 shrink-0">
            <Link
              href="/admin/analyze"
              title="관리자 샘플 분석"
              className={[
                'w-full flex flex-col items-center gap-1 py-3 px-1 rounded-xl transition-all',
                isActive('/admin/analyze')
                  ? 'bg-violet-50 text-violet-700 font-bold'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
              ].join(' ')}
            >
              <span className={isActive('/admin/analyze') ? 'text-violet-600' : 'text-slate-400'}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </span>
              <span className="font-bold text-[11px] tracking-tight text-center leading-tight">샘플</span>
            </Link>
          </div>
        )}

        {/* 리뷰 — 프로필 위 */}
        <div className="p-3 lg:p-2 shrink-0">
          <Link
            href="/reviews"
            onClick={() => setIsOpen(false)}
            title="리뷰"
            className={[
              'w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all',
              'lg:flex-col lg:gap-1 lg:py-3 lg:px-1',
              isActive('/reviews')
                ? 'bg-emerald-50 text-emerald-700 font-bold'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
            ].join(' ')}
          >
            <span>
              <img
                src="/a6.png"
                alt="리뷰"
                className="w-5 h-5 lg:w-6 lg:h-6 object-contain transition-all"
                style={
                  isActive('/reviews')
                    ? { filter: 'invert(43%) sepia(97%) saturate(541%) hue-rotate(113deg) brightness(91%) contrast(92%)' }
                    : undefined
                }
              />
            </span>
            <span className="font-bold text-sm lg:text-[11px] lg:tracking-tight">리뷰</span>
          </Link>
        </div>

        {/* 사용자 프로필 */}
        <div className="border-t border-slate-100 p-3 lg:p-2 shrink-0">
          {user ? (
            <div className="flex items-center gap-3 lg:flex-col lg:gap-2">
              <Link
                href="/profile"
                title="내 정보"
                onClick={() => setIsOpen(false)}
                className="relative shrink-0"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="프로필"
                    className="w-9 h-9 lg:w-8 lg:h-8 rounded-full border-2 border-emerald-100 object-cover hover:border-emerald-400 transition-all"
                  />
                ) : (
                  <div className="w-9 h-9 lg:w-8 lg:h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm text-slate-600 hover:border-emerald-400 hover:bg-emerald-50 transition-all cursor-pointer font-bold">
                    {user.displayName?.[0] || user.email?.[0]?.toUpperCase() || '나'}
                  </div>
                )}
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
              </Link>

              <div className="flex-1 lg:text-center min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate lg:hidden">
                  {user.displayName || user.email}
                </p>
                <button
                  onClick={() => { signOut(auth); setIsOpen(false); }}
                  className="text-[11px] text-slate-400 hover:text-rose-500 transition-colors"
                  type="button"
                >
                  로그아웃
                </button>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span className="lg:hidden">로그인</span>
            </Link>
          )}
        </div>
      </aside>

      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[90] lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 햄버거 버튼 (모바일) */}
      {!(pathname.startsWith('/analyze/') || (pathname.startsWith('/discover/') && pathname !== '/discover')) && (
        <button
          onClick={() => setIsOpen(true)}
          className={[
            'fixed top-2 left-3 z-[80] p-2 rounded-lg bg-white shadow-md border border-slate-200',
            'hover:bg-slate-50 transition-colors lg:hidden',
            isOpen ? 'invisible' : 'visible',
          ].join(' ')}
          aria-label="메뉴 열기"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}
    </>
  );
}

export default function SideNav() {
  return (
    <Suspense fallback={null}>
      <SideNavInner />
    </Suspense>
  );
}
