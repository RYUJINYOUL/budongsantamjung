'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';
import { buildAnalyzeHrefFromReportId } from '../../lib/apartmentCompareReportLink';

export type MyHomeReportTarget = {
  label: string;
  reportId?: string | null;
  complexName?: string | null;
  isHome?: boolean;
};

type Props = {
  targets: MyHomeReportTarget[];
};

export default function MyHomeReportButtons({ targets }: Props) {
  const visible = targets.filter((t) => t.reportId?.trim());
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((t) => {
        const href = buildAnalyzeHrefFromReportId(t.reportId, t.complexName);
        if (!href) return null;

        if (t.isHome) {
          return (
            <Link
              key={t.label}
              href={href}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm shadow-emerald-400/20 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              {t.label}
            </Link>
          );
        }

        return (
          <Link
            key={t.label}
            href={href}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-300 text-emerald-600 hover:bg-emerald-50 text-xs font-bold transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
