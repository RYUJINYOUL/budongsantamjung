'use client';

import { signInWithNaver } from '../lib/naverAuthClient';

type NaverAuthButtonProps = {
  disabled?: boolean;
  returnTo?: string;
  onError?: (message: string) => void;
  label?: string;
  className?: string;
};

export default function NaverAuthButton({
  disabled = false,
  returnTo = '/',
  onError,
  label = '네이버로 계속하기',
  className = '',
}: NaverAuthButtonProps) {
  const handleClick = () => {
    try {
      signInWithNaver(returnTo);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : '네이버 로그인에 실패했습니다.';
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
        'w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#03C75A] hover:bg-[#02b351] border border-[#02a84a] transition-all shadow-sm disabled:opacity-50'
      }
    >
      <img src="/naver.png" alt="" className="w-5 h-5 shrink-0 object-contain" aria-hidden />
      {label}
    </button>
  );
}
