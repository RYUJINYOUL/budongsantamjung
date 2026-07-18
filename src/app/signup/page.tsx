'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup, getRedirectResult, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import Link from 'next/link';
import BrandSidePanel from '../../components/BrandSidePanel';
import KakaoAuthButton from '../../components/KakaoAuthButton';
import NaverAuthButton from '../../components/NaverAuthButton';
import {
  PANEL_INPUT,
  PANEL_INPUT_WRAP,
  PANEL_SECTION_DESC,
} from '../../components/analyzePanelFormStyles';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user) {
          router.push('/');
        }
      })
      .catch((error) => {
        console.error('Signup error:', error);
      });
  }, [router]);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (nickname) {
        await updateProfile(userCredential.user, { displayName: nickname });
      }
      router.push('/');
    } catch (error: unknown) {
      console.error('Email signup error:', error);
      let message = '회원가입에 실패했습니다.';
      const code = (error as { code?: string })?.code;
      if (code === 'auth/email-already-in-use') message = '이미 사용 중인 이메일입니다.';
      if (code === 'auth/weak-password') message = '비밀번호가 너무 약합니다 (6자 이상).';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.push('/');
    } catch (error: unknown) {
      console.error('Google signup error:', error);
      const msg = error instanceof Error ? error.message : '회원가입 실패';
      alert(`회원가입 실패: ${msg}`);
    } finally {
      setGoogleLoading(false);
    }
  };

  const busy = loading || googleLoading;

  return (
    <div className="detective-bg min-h-screen text-slate-900 relative flex">
      <div className="noise-overlay" />
      <div className="scanline" />

      <div className="relative z-10 flex flex-1 min-h-screen">
        <div className="hidden lg:flex lg:w-[44%] xl:w-[42%] min-h-screen">
          <BrandSidePanel className="w-full min-h-screen" />
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-[400px]">
            <div className="lg:hidden text-center mb-8">
              <Link href="/" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-emerald-600 text-xs font-bold mb-6 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
                홈으로
              </Link>
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-2xl bg-white p-1 shadow-md border border-slate-100">
                  <img src="/logo512.png" alt="부동산탐정" className="w-full h-full rounded-xl object-cover" />
                </div>
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">회원가입</h2>
              <p className={PANEL_SECTION_DESC}>계정을 만들고 서비스를 시작하세요</p>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.06)] p-6 sm:p-8">
              <div className="hidden lg:block mb-6">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">회원가입</h2>
                <p className={PANEL_SECTION_DESC}>Google · 카카오 · 네이버로 시작</p>
              </div>

              <div className="space-y-3 mb-5">
                <button
                  type="button"
                  onClick={handleGoogleSignup}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200/80 rounded-xl text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-50"
                >
                  <img src="/google.png" alt="" className="w-5 h-5 object-contain" />
                  {googleLoading ? '연결 중...' : '구글로 계속하기'}
                </button>
                <KakaoAuthButton
                  disabled={busy}
                  returnTo="/"
                  label="카카오로 시작하기"
                  onError={(msg) => alert(msg)}
                />
                <NaverAuthButton
                  disabled={busy}
                  returnTo="/"
                  label="네이버로 시작하기"
                  onError={(msg) => alert(msg)}
                />
              </div>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-[10px] text-slate-400 font-extrabold tracking-widest uppercase">
                    또는 이메일
                  </span>
                </div>
              </div>

              <form onSubmit={handleEmailSignup} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1.5 block">이메일</label>
                  <div className={PANEL_INPUT_WRAP}>
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={PANEL_INPUT}
                      placeholder="example@email.com"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1.5 block">닉네임 (선택)</label>
                  <div className={PANEL_INPUT_WRAP}>
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className={PANEL_INPUT}
                      placeholder="탐정닉네임"
                      autoComplete="nickname"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1.5 block">비밀번호</label>
                  <div className={PANEL_INPUT_WRAP}>
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={PANEL_INPUT}
                      placeholder="6자 이상 입력"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-sm shadow-emerald-500/20 active:scale-[0.99]"
                >
                  {loading ? '가입 중...' : '회원가입'}
                </button>
              </form>

              <p className="mt-6 pt-5 border-t border-slate-100 text-center text-sm text-slate-500">
                이미 계정이 있으신가요?{' '}
                <Link href="/login" className="text-emerald-600 font-extrabold hover:text-emerald-700 transition-colors">
                  로그인
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
