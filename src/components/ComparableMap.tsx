'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, X } from 'lucide-react';

interface ComparableMapProps {
    mapData: any; // ai.analysisMetadata
    category?: string;
}

export default function ComparableMap({ mapData, category }: ComparableMapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<any>(null);
    const [selectedComp, setSelectedComp] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const target = mapData?.target || {};
    const comparables = Array.isArray(mapData?.comparables) ? mapData.comparables : [];

    useEffect(() => {
        let isMounted = true;
        const apiKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;

        const initializeMap = () => {
            if (!mapContainerRef.current) return;

            try {
                const kakao = (window as any).kakao;
                if (!kakao || !kakao.maps) {
                    throw new Error('Kakao Maps API not loaded');
                }

                // Default coordinates (Seoul City Hall)
                let lat = 37.5665;
                let lng = 126.9780;

                const targetLat = parseFloat(target.lat);
                const targetLng = parseFloat(target.lng);

                if (!isNaN(targetLat) && !isNaN(targetLng)) {
                    lat = targetLat;
                    lng = targetLng;
                }

                const options = {
                    center: new kakao.maps.LatLng(lat, lng),
                    level: 4,
                };

                const kakaoMap = new kakao.maps.Map(mapContainerRef.current, options);

                // Add zoom control
                const zoomControl = new kakao.maps.ZoomControl();
                kakaoMap.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

                // Render Target Marker
                if (!isNaN(targetLat) && !isNaN(targetLng)) {
                    const targetContent = `
                        <div style="position: relative; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%);">
                            <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background-color: rgba(14, 165, 233, 0.3); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                            <div style="width: 24px; height: 24px; border-radius: 50%; background-color: #0ea5e9; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(14, 165, 233, 0.4);">
                                <div style="width: 8px; height: 8px; border-radius: 50%; background-color: #fff;"></div>
                            </div>
                        </div>
                    `;

                    // Create element for Target Interactive click
                    const el = document.createElement('div');
                    el.style.cursor = 'pointer';
                    el.innerHTML = targetContent;
                    el.addEventListener('click', () => {
                        setSelectedComp({
                            isTarget: true,
                            address: target.platPlc || target.address || '분석 대상지',
                        });
                    });

                    const interactiveTargetOverlay = new kakao.maps.CustomOverlay({
                        position: new kakao.maps.LatLng(targetLat, targetLng),
                        content: el,
                        yAnchor: 0.5,
                        zIndex: 15,
                    });
                    interactiveTargetOverlay.setMap(kakaoMap);
                }

                // Render Comparable Markers
                comparables.forEach((c: any, index: number) => {
                    const cLat = parseFloat(c.lat);
                    const cLng = parseFloat(c.lng);

                    if (!isNaN(cLat) && !isNaN(cLng)) {
                        const contentEl = document.createElement('div');
                        contentEl.style.cursor = 'pointer';
                        contentEl.innerHTML = `
                            <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
                                <div style="width: 32px; height: 32px; border-radius: 50%; background-color: #7dd3c0; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                                    <span style="color: #0f172a; font-size: 12px; font-weight: 900;">${index + 1}</span>
                                </div>
                                <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 7px solid #fff; margin-top: -1px;"></div>
                            </div>
                        `;

                        contentEl.addEventListener('click', () => {
                            setSelectedComp({
                                ...c,
                                index: index + 1,
                            });
                        });

                        const compOverlay = new kakao.maps.CustomOverlay({
                            position: new kakao.maps.LatLng(cLat, cLng),
                            content: contentEl,
                            yAnchor: 1.0,
                            zIndex: 20,
                        });

                        compOverlay.setMap(kakaoMap);
                    }
                });

                // Map Click Listener
                kakao.maps.event.addListener(kakaoMap, 'click', () => {
                    setSelectedComp(null);
                });

                setMap(kakaoMap);
                setIsLoading(false);
            } catch (err: any) {
                console.error('Map init error:', err);
                setLoadError('지도를 초기화하는 중 오류가 발생했습니다.');
                setIsLoading(false);
            }
        };

        const loadScript = () => {
            if ((window as any).kakao && (window as any).kakao.maps) {
                initializeMap();
                return;
            }

            const script = document.createElement('script');
            script.async = true;
            script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services&autoload=false`;
            script.onload = () => {
                const kakao = (window as any).kakao;
                kakao.maps.load(() => {
                    if (isMounted) initializeMap();
                });
            };
            script.onerror = () => {
                if (isMounted) {
                    setLoadError('카카오 지도 스크립트를 로드하는데 실패했습니다.');
                    setIsLoading(false);
                }
            };
            document.head.appendChild(script);
        };

        loadScript();

        return () => {
            isMounted = false;
        };
    }, [mapData, target, comparables]);

    // Format currency
    const formatKoreanCurrency = (val: any) => {
        if (val === null || val === undefined) return '-';
        const num = typeof val === 'number' ? val : (parseFloat(val) || 0);
        if (num === 0) return '-';

        if (num >= 100000000) {
            const eok = Math.floor(num / 100000000);
            const rest = num % 100000000;
            if (rest >= 10000) {
                return `${eok}억 ${Math.round(rest / 10000).toLocaleString()}만`;
            }
            return `${eok}억`;
        } else if (num >= 10000) {
            return `${Math.floor(num / 10000).toLocaleString()}만`;
        }
        return Math.round(num).toLocaleString();
    };

    return (
        <div className="relative w-full h-full rounded-2xl overflow-hidden min-h-[400px] bg-slate-900 border border-white/10">
            <div ref={mapContainerRef} className="w-full h-full min-h-[400px]" />

            {isLoading && (
                <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin"></div>
                    <span className="text-xs text-white/50">지도를 로드 중입니다...</span>
                </div>
            )}

            {loadError && (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                    <MapPin className="w-10 h-10 text-rose-500 mb-3" />
                    <span className="text-sm font-bold text-white mb-1">지도 로드 실패</span>
                    <span className="text-xs text-white/40">{loadError}</span>
                </div>
            )}

            {/* Selected Info Card Overlay */}
            {selectedComp && (
                <div className="absolute bottom-4 left-4 right-4 z-10 bg-[#0f172a]/95 backdrop-blur-md border border-[#7dd3c0]/30 rounded-2xl p-4 shadow-2xl text-white">
                    <button
                        onClick={() => setSelectedComp(null)}
                        className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {selectedComp.isTarget ? (
                        <div>
                            <span className="inline-block px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded text-[10px] font-bold mb-2">분석 대상지</span>
                            <h4 className="text-sm font-bold truncate pr-6">{selectedComp.address}</h4>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2.5">
                            <div className="flex justify-between items-start pr-6">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[#7dd3c0] text-xs font-bold font-mono">#{selectedComp.index} 비교사례</span>
                                    <h4 className="text-sm font-bold truncate max-w-[240px]">
                                        {selectedComp.platPlc || selectedComp.platAddr || `${selectedComp.sggNm || ''} ${selectedComp.umdNm || ''}`.trim() || '주소 정보 없음'}
                                    </h4>
                                </div>
                                {selectedComp.distance !== undefined && (
                                    <span className="text-white/40 text-xs mt-0.5 whitespace-nowrap">대상지 거리: {Math.round(selectedComp.distance)}m</span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/5">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-white/40 text-[10px]">용도지역</span>
                                    <span className="font-semibold text-white/80">{selectedComp.zoning || '-'}</span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-white/40 text-[10px]">거래년월</span>
                                    <span className="font-semibold text-white/80">{selectedComp.dealYear}.{selectedComp.dealMonth || '?'}</span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-white/40 text-[10px]">실거래 가격</span>
                                    <span className="font-semibold text-white/80">
                                        {selectedComp.dealAmount ? formatKoreanCurrency(selectedComp.dealAmount > 1000000 ? selectedComp.dealAmount : selectedComp.dealAmount * 10000) : '-'}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-white/40 text-[10px]">보정 대입 총액</span>
                                    <span className="font-bold text-[#7dd3c0]">
                                        {selectedComp.adjustedTotal || '-'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
