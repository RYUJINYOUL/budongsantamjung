import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
  accent?: boolean;
};

export default function MyHomeWeeklyReportCard({ children, className = '', accent = false }: Props) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        accent
          ? 'border-emerald-200/80 bg-emerald-50/40'
          : 'border-slate-200 bg-white'
      } ${className}`}
    >
      {children}
    </div>
  );
}
