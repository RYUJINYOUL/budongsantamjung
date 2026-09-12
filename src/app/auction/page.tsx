import { Suspense } from 'react';
import AuctionClientPage from './AuctionClientPage';

export const dynamic = 'force-dynamic';

export default function AuctionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-semibold">
          경매 목록 로딩 중…
        </div>
      }
    >
      <AuctionClientPage />
    </Suspense>
  );
}
