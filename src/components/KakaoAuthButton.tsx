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
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.87 5.33 4.68 6.78-.2.74-.72 2.67-.82 3.08-.13.52.38.96.86.7 2.48-1.14 3.64-1.67 4.28-1.98C10.14 19.93 11.05 20 12 20c5.52 0 10-3.58 10-8s-4.48-8-10-8z"
        />
      </svg>
      {label}
    </button>
  );
}
