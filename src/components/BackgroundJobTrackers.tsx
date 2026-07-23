'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const BackgroundAnalysisTracker = dynamic(
    () => import('./BackgroundAnalysisTracker'),
    { ssr: false },
);

const BackgroundAiAnalysisTracker = dynamic(
    () => import('./BackgroundAiAnalysisTracker'),
    { ssr: false },
);

function TrackersInner() {
    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
            <div className="pointer-events-auto flex flex-col gap-3">
                <BackgroundAiAnalysisTracker embedded />
                <BackgroundAnalysisTracker embedded />
            </div>
        </div>
    );
}

export default function BackgroundJobTrackers() {
    return (
        <Suspense fallback={null}>
            <TrackersInner />
        </Suspense>
    );
}
