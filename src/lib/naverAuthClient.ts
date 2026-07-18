'use client';

import { signInWithCustomToken } from 'firebase/auth';
import { auth } from './firebase';

export function signInWithNaver(returnTo: string = '/'): void {
  if (typeof window === 'undefined') return;
  const safeReturn =
    returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
  const params = new URLSearchParams({ returnTo: safeReturn });
  window.location.href = `/api/auth/naver/authorize?${params.toString()}`;
}

export async function completeNaverRedirect(
  code: string,
  state: string,
): Promise<void> {
  const res = await fetch('/api/auth/naver', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, state }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.details || data.error || '네이버 로그인 처리 실패');
  }
  if (!data.customToken) {
    throw new Error('인증 토큰을 받지 못했습니다.');
  }
  await signInWithCustomToken(auth, data.customToken);
  await auth.authStateReady();
}

export function resolveNaverReturnPath(state: string | null): string {
  if (state && state.startsWith('/') && !state.startsWith('//')) {
    return state;
  }
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem('naver_auth_return');
    if (stored && stored.startsWith('/') && !stored.startsWith('//')) {
      return stored;
    }
  }
  return '/';
}

export function clearNaverAuthReturnPath() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('naver_auth_return');
  }
}
