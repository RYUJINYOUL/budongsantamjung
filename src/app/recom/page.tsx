import { Suspense } from 'react';
import { HomePageContent } from '../HomePageContent';

export const dynamic = 'force-dynamic';

export default function RecomPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <HomePageContent feedMode="recom" />
    </Suspense>
  );
}
