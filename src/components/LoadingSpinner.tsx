interface LoadingSpinnerProps {
  /** 스피너 크기 (기본: 'md') */
  size?: 'sm' | 'md' | 'lg';
  /** 아래에 표시할 텍스트 */
  label?: string;
  /** 배경 테마 */
  theme?: 'light' | 'dark';
  /** 전체 화면 중앙 정렬 여부 */
  fullScreen?: boolean;
}

const sizeMap = { sm: 'w-6 h-6', md: 'w-10 h-10', lg: 'w-16 h-16' };

export default function LoadingSpinner({
  size = 'md',
  label,
  theme = 'light',
  fullScreen = false,
}: LoadingSpinnerProps) {
  const isDark = theme === 'dark';
  const ring = isDark
    ? 'border-emerald-500/20 border-t-emerald-500'
    : 'border-emerald-100 border-t-emerald-500';
  const textCls = isDark ? 'text-emerald-400' : 'text-emerald-600';
  const bg = isDark ? 'bg-slate-900' : 'bg-white/80';

  const inner = (
    <div className="flex flex-col items-center gap-4">
      <div className={`relative ${sizeMap[size]}`}>
        <div className={`absolute inset-0 rounded-full border-2 ${ring.split(' ')[0]}`} />
        <div className={`absolute inset-0 rounded-full border-t-2 animate-spin ${ring.split(' ')[1]}`} />
      </div>
      {label && (
        <p className={`text-xs font-bold tracking-widest uppercase ${textCls}`}>{label}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg}`}>
        {inner}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      {inner}
    </div>
  );
}
