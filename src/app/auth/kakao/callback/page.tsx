'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '../../../../lib/firebase';
import {
  clearKakaoAuthReturnPath,
  completeKakaoRedirect,
  resolveReturnPath,
} from '../../../../lib/kakaoAuthClient';

function KakaoCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('카카오 로그인 처리 중...');
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const returnTo = resolveReturnPath(searchParams.get('state'));

    const finishSuccess = async () => {
      clearKakaoAuthReturnPath();
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
        setMessage('카카오 로그인이 취소되었습니다.');
        setTimeout(() => router.replace('/login'), 2000);
        return;
      }

      if (!code) {
        if (await finishIfAlreadyLoggedIn()) return;
        setMessage('인증 코드가 없습니다.');
        setTimeout(() => router.replace('/login'), 2000);
        return;
      }

      const storageKey = `kakao_code_used_${code}`;
      if (sessionStorage.getItem(storageKey)) {
        if (await finishIfAlreadyLoggedIn()) return;
        setMessage('이미 처리된 로그인입니다. 다시 시도해 주세요.');
        setTimeout(() => router.replace('/login'), 2500);
        return;
      }

      const redirectUri = `${window.location.origin}/auth/kakao/callback`;

      try {
        await completeKakaoRedirect(code, redirectUri);
        sessionStorage.setItem(storageKey, '1');
        setMessage('로그인 완료. 이동 중...');
        await finishSuccess();
      } catch (err: unknown) {
        // React Strict Mode 등으로 code가 이미 소비된 경우 — 첫 요청은 성공했을 수 있음
        if (await finishIfAlreadyLoggedIn()) {
          sessionStorage.setItem(storageKey, '1');
          return;
        }

        const msg = err instanceof Error ? err.message : '로그인 실패';
        const isCodeReuse =
          msg.includes('KOE320') ||
          msg.includes('authorization code not found') ||
          msg.includes('invalid_grant');

        if (isCodeReuse) {
          setMessage('로그인 처리 중입니다. 잠시만 기다려 주세요...');
          await new Promise((r) => setTimeout(r, 800));
          if (await finishIfAlreadyLoggedIn()) {
            sessionStorage.setItem(storageKey, '1');
            return;
          }
        }

        setMessage(msg);
        setTimeout(() => router.replace('/login'), 3000);
      }
    })();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-[#FEE500] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-bold text-slate-700">{message}</p>
      </div>
    </div>
  );
}

export default function KakaoCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <KakaoCallbackContent />
    </Suspense>
  );
}
