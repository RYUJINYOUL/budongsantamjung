'use client';

import { signInWithCustomToken } from 'firebase/auth';
import { auth } from './firebase';

/**
 * 카카오 로그인 — JavaScript SDK 없이 서버 /api/auth/kakao/authorize 로 이동
 * (SDK v2는 Auth.login 미지원, SDK 로드 충돌·지연 이슈 회피)
 */
export function signInWithKakao(returnTo: string = '/'): void {
  if (typeof window === 'undefined') return;
  const safeReturn =
    returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
  const params = new URLSearchParams({ returnTo: safeReturn });
  window.location.href = `/api/auth/kakao/authorize?${params.toString()}`;
}

export async function completeKakaoRedirect(
  code: string,
  redirectUri: string,
): Promise<void> {
  const res = await fetch('/api/auth/kakao', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.details || data.error || '카카오 로그인 처리 실패');
  }
  if (!data.customToken) {
    throw new Error('인증 토큰을 받지 못했습니다.');
  }
  await signInWithCustomToken(auth, data.customToken);
  await auth.authStateReady();
}

/** 카카오 OAuth state 파라미터 또는 sessionStorage */
export function resolveReturnPath(state: string | null): string {
  if (state && state.startsWith('/') && !state.startsWith('//')) {
    return state;
  }
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem('kakao_auth_return');
    if (stored && stored.startsWith('/') && !stored.startsWith('//')) {
      return stored;
    }
  }
  return '/';
}

export function clearKakaoAuthReturnPath() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('kakao_auth_return');
  }
}
