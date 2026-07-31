'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { makeAnalyzeSlug } from '../../../lib/slug';

/** 레거시 /apartment/* → /analyze 또는 디스커버 홈 */
export default function ApartmentClientPage({ aptSeq }: { aptSeq: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const reportId = searchParams.get('reportId');
    if (reportId) {
      const ret = searchParams.get('return');
      const qs = ret ? `?return=${encodeURIComponent(ret)}` : '';
      router.replace(`/analyze/${makeAnalyzeSlug(reportId)}${qs}`);
      return;
    }
    void aptSeq;
    router.replace('/?category=아파트');
  }, [router, searchParams, aptSeq]);

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
