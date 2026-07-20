import { Suspense } from 'react';
import ApartmentClientPage from './ApartmentClientPage';

export default function ApartmentPage({ params }: { params: { aptSeq: string } }) {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            }
        >
            <ApartmentClientPage aptSeq={params.aptSeq} />
        </Suspense>
    );
}
