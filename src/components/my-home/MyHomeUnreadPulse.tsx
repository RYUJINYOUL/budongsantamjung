import type { ReactNode } from 'react';

type Props = {
  active: boolean;
  children: ReactNode;
  className?: string;
};

/** 미확인 리포트 — 테두리 반짝임 (앱 `MyHomeLauncherButton` parity) */
export default function MyHomeUnreadPulse({ active, children, className = '' }: Props) {
  if (!active) return <>{children}</>;

  return (
    <div className={`my-home-unread-pulse rounded-xl ${className}`}>
      {children}
    </div>
  );
}
