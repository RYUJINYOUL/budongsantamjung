import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const PresaleClientPage = dynamic(() => import('./PresaleClientPage'), { ssr: false });

export default function PresalePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-semibold">
          페이지 로딩 중…
        </div>
      }
    >
      <PresaleClientPage />
    </Suspense>
  );
}
