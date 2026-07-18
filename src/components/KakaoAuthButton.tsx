'use client';

import { signInWithKakao } from '../lib/kakaoAuthClient';

type KakaoAuthButtonProps = {
  disabled?: boolean;
  returnTo?: string;
  onError?: (message: string) => void;
  label?: string;
  className?: string;
};

export default function KakaoAuthButton({
  disabled = false,
  returnTo = '/',
  onError,
  label = '카카오로 계속하기',
  className = '',
}: KakaoAuthButtonProps) {
  const handleClick = () => {
    try {
      signInWithKakao(returnTo);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : '카카오 로그인에 실패했습니다.';
      onError?.(msg);
      if (!onError) alert(msg);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={
        className ||
        'w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-bold text-[#191919] bg-[#FEE500] hover:bg-[#f5dc00] border border-[#e6d200] transition-all shadow-sm disabled:opacity-50'
      }
    >
      <img src="/kakao.png" alt="" className="w-5 h-5 shrink-0 object-contain" aria-hidden />
      {label}
    </button>
  );
}
