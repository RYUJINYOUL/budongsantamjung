import Link from 'next/link';

interface EmptyStateProps {
  /** 큰 아이콘/이모지 */
  icon?: string;
  /** 메인 메시지 */
  message: string;
  /** 서브 메시지 */
  sub?: string;
  /** CTA 버튼 텍스트 */
  actionLabel?: string;
  /** CTA 버튼 링크 */
  actionHref?: string;
  /** 배경 테마 */
  theme?: 'light' | 'dark';
}

export default function EmptyState({
  icon = '🔍',
  message,
  sub,
  actionLabel,
  actionHref,
  theme = 'light',
}: EmptyStateProps) {
  const isDark = theme === 'dark';

  return (
    <div
      className={[
        'text-center py-16 rounded-2xl border',
        isDark
          ? 'bg-slate-800/40 border-slate-700'
          : 'bg-white border-slate-200 shadow-sm',
      ].join(' ')}
    >
      <p className="text-4xl mb-3">{icon}</p>
      <p className={`font-semibold text-sm mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
        {message}
      </p>
      {sub && (
        <p className={`text-xs mt-1 mb-4 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{sub}</p>
      )}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-block mt-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
