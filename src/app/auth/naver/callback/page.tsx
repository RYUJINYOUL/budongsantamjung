'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '../../../../lib/firebase';
import {
  clearNaverAuthReturnPath,
  completeNaverRedirect,
  resolveNaverReturnPath,
} from '../../../../lib/naverAuthClient';

function parseNaverState(state: string | null): {
  oauthState: string;
  returnTo: string;
} {
  if (!state) {
    return { oauthState: '', returnTo: '/' };
  }

  const separatorIndex = state.indexOf('::');
  if (separatorIndex === -1) {
    return { oauthState: state, returnTo: resolveNaverReturnPath(state) };
  }

  const returnPart = state.slice(0, separatorIndex);
  return {
    oauthState: state,
    returnTo: resolveNaverReturnPath(returnPart),
  };
}

function NaverCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('네이버 로그인 처리 중...');
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const { oauthState, returnTo } = parseNaverState(state);

    const finishSuccess = async () => {
      clearNaverAuthReturnPath();
      await auth.authStateReady();
      router.replace(returnTo);
      router.refresh();
    };

    const finishIfAlreadyLoggedIn = async () => {
      await auth.authStateReady();
      if (auth.currentUser) {
        await finishSuccess();
        return true;
      }
      return false;
    };

    (async () => {
      if (error) {
        if (await finishIfAlreadyLoggedIn()) return;
        setMessage(errorDescription || '네이버 로그인이 취소되었습니다.');
        setTimeout(() => router.replace('/login'), 2000);
        return;
      }

      if (!code || !oauthState) {
        if (await finishIfAlreadyLoggedIn()) return;
        setMessage('인증 코드가 없습니다.');
        setTimeout(() => router.replace('/login'), 2000);
        return;
      }

      const storageKey = `naver_code_used_${code}`;
      if (sessionStorage.getItem(storageKey)) {
        if (await finishIfAlreadyLoggedIn()) return;
        setMessage('이미 처리된 로그인입니다. 다시 시도해 주세요.');
        setTimeout(() => router.replace('/login'), 2500);
        return;
      }

      try {
        await completeNaverRedirect(code, oauthState);
        sessionStorage.setItem(storageKey, '1');
        setMessage('로그인 완료. 이동 중...');
        await finishSuccess();
      } catch (err: unknown) {
        if (await finishIfAlreadyLoggedIn()) {
          sessionStorage.setItem(storageKey, '1');
          return;
        }

        const msg = err instanceof Error ? err.message : '로그인 실패';
        setMessage(msg);
        setTimeout(() => router.replace('/login'), 3000);
      }
    })();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-[#03C75A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-bold text-slate-700">{message}</p>
      </div>
    </div>
  );
}

export default function NaverCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <NaverCallbackContent />
    </Suspense>
  );
}
