import { Suspense } from 'react';
import AuctionDetailClient from './AuctionDetailClient';

export const dynamic = 'force-dynamic';

export default async function AuctionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-semibold">
          상세 로딩 중…
        </div>
      }
    >
      <AuctionDetailClient id={id} />
    </Suspense>
  );
}
