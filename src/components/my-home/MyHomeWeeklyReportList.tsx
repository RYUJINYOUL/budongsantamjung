import Link from 'next/link';
import { ChevronRight, Sparkles } from 'lucide-react';
import type { MyHomeWeeklyReport } from '../../lib/myHomeTypes';
import {
  formatMyHomeWeeklyReportDate,
  formatMyHomeWeeklyReportListPreview,
} from '../../lib/myHomeWeeklyReportUtils';

type Props = {
  reports: MyHomeWeeklyReport[];
  loading?: boolean;
  title?: string;
  className?: string;
};

export default function MyHomeWeeklyReportList({
  reports,
  loading = false,
  title = '주간 AI 리포트',
  className = '',
}: Props) {
  if (loading) {
    return (
      <div className={`flex justify-center py-12 ${className}`}>
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (reports.length === 0) return null;

  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-emerald-500" />
        <h3 className="text-sm font-black text-slate-900">{title}</h3>
      </div>
      <ul className="space-y-2">
        {reports.map((r) => (
          <li key={r.weekKey}>
            <Link
              href={`/my-home/reports/${encodeURIComponent(r.weekKey)}`}
              className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-bold text-slate-400">
                    {formatMyHomeWeeklyReportDate(r)}
                  </p>
                  {r.skippedAi ? (
                    <span className="rounded-md bg-slate-200/60 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                      변동없음
                    </span>
                  ) : null}
                </div>
                {r.homeComplexName?.trim() ? (
                  <p className="text-[11px] font-bold text-emerald-600 mt-0.5 truncate">
                    {r.homeComplexName.trim()}
                  </p>
                ) : null}
                <p className="text-xs font-bold text-slate-800 mt-0.5 line-clamp-2">
                  {formatMyHomeWeeklyReportListPreview(r)}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 shrink-0 text-slate-300 group-hover:text-emerald-500 mt-0.5 transition-colors" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
