'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup, getRedirectResult, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

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
    } catch (error: any) {
      console.error('Email signup error:', error);
      let message = '회원가입에 실패했습니다.';
      if (error.code === 'auth/email-already-in-use') message = '이미 사용 중인 이메일입니다.';
      if (error.code === 'auth/weak-password') message = '비밀번호가 너무 약합니다 (6자 이상).';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push('/');
    } catch (error: any) {
      console.error('Google signup error:', error);
      alert(`회원가입 실패: ${error.message}`);
    }
  };

  const handleKakaoSignup = () => {
    alert('카카오 회원가입은 현재 준비 중입니다.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-800 p-1 shadow-lg">
              <img src="/logo512.png" alt="Logo" className="w-full h-full rounded-xl bg-white object-cover" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">부동산탐정 시작하기</h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            현명한 부동산 투자의 시작, AI 탐정 분석
          </p>
        </div>

        <form onSubmit={handleEmailSignup} className="mt-8 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 ml-1">이메일</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
              placeholder="example@email.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 ml-1">닉네임 (선택)</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
              placeholder="탐정닉네임"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 ml-1">비밀번호</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
              placeholder="6자 이상 입력"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-emerald-800 text-white rounded-xl text-sm font-bold hover:bg-emerald-900 transition-all shadow-md disabled:opacity-50"
          >
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-400 font-bold tracking-widest">OR</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleGoogleSignup}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all shadow-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Google로 계속하기
          </button>

        </div>

        <div className="mt-6 text-center border-t border-slate-100 pt-6">
          <p className="text-sm text-slate-500">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-emerald-700 font-bold hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
