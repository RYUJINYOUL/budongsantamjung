import { Suspense } from 'react';
import LiteClientPage from './LiteClientPage';

export default function LitePage({ params }: { params: { r114_prop_id: string } }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LiteClientPage r114PropId={params.r114_prop_id} />
    </Suspense>
  );
}
