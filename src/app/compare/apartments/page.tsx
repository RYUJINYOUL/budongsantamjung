import type { Metadata } from 'next';
import { Suspense } from 'react';
import ApartmentCompareClientPage from './ApartmentCompareClientPage';

export const metadata: Metadata = {
  title: '아파트 단지 비교',
  description: '후보 단지·평형을 한 표에서 시세·거래량을 비교합니다.',
};

/** localStorage·지도 SDK 등 클라이언트 전용 — 정적 prerender 제외 */
export const dynamic = 'force-dynamic';

export default function ApartmentComparePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-white/40 text-sm font-bold">
          불러오는 중…
        </div>
      }
    >
      <ApartmentCompareClientPage />
    </Suspense>
  );
}
