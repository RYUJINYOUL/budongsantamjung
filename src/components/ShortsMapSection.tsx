'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import ComparableMap from './ComparableMap';

interface ShortsMapSectionProps {
    lat?: number | string | null;
    lng?: number | string | null;
    mapData?: any;
    category?: string;
    targetArea?: number;
}

export default function ShortsMapSection({
    lat,
    lng,
    mapData,
    category,
    targetArea = 0,
}: ShortsMapSectionProps) {
    const [staticReady, setStaticReady] = useState(false);
    const [staticError, setStaticError] = useState(false);

    const parsedLat = lat != null ? parseFloat(String(lat)) : NaN;
    const parsedLng = lng != null ? parseFloat(String(lng)) : NaN;
    const hasCoords = !isNaN(parsedLat) && !isNaN(parsedLng);

    const hasComparableMap = mapData && (mapData.target || (Array.isArray(mapData.comparables) && mapData.comparables.length > 0));

    /** same-origin 프록시 → html-to-image 캡처 가능 */
    const staticMapUrl = useMemo(() => {
        if (!hasCoords) return null;
        return `/api/shorts/static-map?lat=${parsedLat}&lng=${parsedLng}`;
    }, [hasCoords, parsedLat, parsedLng]);

    useEffect(() => {
        if (!staticMapUrl) {
            if (hasComparableMap) return;
            setStaticError(true);
        }
    }, [staticMapUrl, hasComparableMap]);

    const mapReady = staticReady || (hasComparableMap && !staticMapUrl);

    return (
        <div
            className="p-4 sm:p-5 bg-[#13131a]/80 backdrop-blur-2xl rounded-[28px] border border-white/[0.08] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)] h-full flex flex-col"
            data-shorts-map-ready={mapReady ? 'true' : 'false'}
        >
            <div className="flex items-center gap-2 mb-3 shrink-0">
                <MapPin className="w-5 h-5 text-sky-400" />
                <span className="text-white text-base font-bold tracking-tight">매물 위치</span>
            </div>

            {staticMapUrl && !staticError && (
                <div className="relative flex-1 min-h-[180px] w-full rounded-2xl overflow-hidden border border-white/[0.08] bg-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={staticMapUrl}
                        alt="매물 위치 지도"
                        className="w-full h-full object-cover"
                        onLoad={() => setStaticReady(true)}
                        onError={() => setStaticError(true)}
                    />
                </div>
            )}

            {!staticMapUrl && hasComparableMap && (
                <div className="relative flex-1 min-h-[200px] w-full rounded-2xl overflow-hidden border border-white/[0.08]">
                    <ComparableMap mapData={mapData} category={category} targetArea={targetArea} />
                </div>
            )}

            {!hasCoords && !hasComparableMap && (
                <div className="flex flex-1 items-center justify-center min-h-[180px] rounded-2xl border border-white/[0.08] bg-white/[0.02] text-white/40 text-sm">
                    위치 정보 없음
                </div>
            )}

            <p className="text-[9px] text-white/30 mt-2 text-right shrink-0">© Kakao Corp.</p>
        </div>
    );
}
