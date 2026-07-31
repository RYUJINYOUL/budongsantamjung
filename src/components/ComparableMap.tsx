'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, X, Eye, Map, RefreshCw } from 'lucide-react';
import { centerFromKakaoBounds } from '../lib/kakaoMapBounds';

export type ApartmentCompareMapMarker = {
    lat: number;
    lng: number;
    label: string;
    /** 비교함·표 순서 1~4 */
    index?: number;
    subtitle?: string;
    isWorkplace?: boolean;
};

interface ComparableMapProps {
    mapData: any; // ai.analysisMetadata
    category?: string;
    targetArea?: number;
    customComparables?: any[];
    className?: string;
    isFullscreen?: boolean;
    onToggleFullscreen?: () => void;
    draggable?: boolean; // 모바일 스크롤 트랩 방지를 위한 드래그 활성화 여부
    isCollapsed?: boolean; // 상위 컴포넌트의 접힘 상태
    /** target + comparables 전체가 보이도록 bounds 맞춤 */
    fitAllMarkers?: boolean;
    /** 아파트 단지 비교 — 전원 번호 마커 + 마커별 로드뷰 */
    apartmentCompareMarkers?: ApartmentCompareMapMarker[];
    /** compare 등 상단 UI와 겹칠 때 컨트롤 위치 */
    controlsPosition?: 'bottom-right' | 'top-right';
}

export default function ComparableMap({
    mapData,
    category,
    targetArea,
    customComparables,
    className = 'h-full min-h-[400px]',
    isFullscreen = false,
    onToggleFullscreen,
    draggable = true, // 기본값은 드래그 허용
    isCollapsed = false,
    fitAllMarkers = false,
    apartmentCompareMarkers,
    controlsPosition = 'bottom-right',
}: ComparableMapProps) {
    const isApartmentCompare = (apartmentCompareMarkers?.length ?? 0) > 0;
    const compareMarkersKey = apartmentCompareMarkers
        ?.map((m) => `${m.lat},${m.lng},${m.index ?? 'w'},${m.label}`)
        .join('|') ?? '';

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const roadviewContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const [map, setMap] = useState<any>(null);
    const [roadview, setRoadview] = useState<any>(null);
    const [isRoadview, setIsRoadview] = useState(false);
    const [roadviewError, setRoadviewError] = useState<string | null>(null);
    const [selectedComp, setSelectedComp] = useState<any>(null);
    const [mapReady, setMapReady] = useState(false);
    const [mapInitializing, setMapInitializing] = useState(true);
    const [roadviewLoading, setRoadviewLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [mapRetryTick, setMapRetryTick] = useState(0);
    const [roadviewFocus, setRoadviewFocus] = useState<{ lat: number; lng: number; label: string } | null>(null);

    const openRoadviewAt = useCallback((lat: number, lng: number, label: string) => {
        setRoadviewFocus({ lat, lng, label });
        setRoadviewError(null);
        setIsRoadview(true);
    }, []);

    const handleRetryMap = useCallback(() => {
        setLoadError(null);
        setMapInitializing(true);
        setMapReady(false);
        setMap(null);
        setMapRetryTick((tick) => tick + 1);
    }, []);

    const fitApartmentCompareBounds = useCallback((kakaoMap: any) => {
        const kakao = (window as any).kakao;
        if (!kakao?.maps || !apartmentCompareMarkers?.length) return;
        const bounds = new kakao.maps.LatLngBounds();
        apartmentCompareMarkers.forEach((m) => {
            bounds.extend(new kakao.maps.LatLng(m.lat, m.lng));
        });
        if (apartmentCompareMarkers.length <= 1) {
            const m = apartmentCompareMarkers[0];
            kakaoMap.setCenter(new kakao.maps.LatLng(m.lat, m.lng));
            kakaoMap.setLevel(5);
        } else {
            kakaoMap.setBounds(bounds);
        }
    }, [apartmentCompareMarkers]);

    // 로드뷰 마커 및 오버레이 인스턴스 보관 레퍼런스
    const rvMarkerRef = useRef<any>(null);
    const rvOverlayRef = useRef<any>(null);

    const target = mapData?.target || {};
    const comparables = useMemo(
        () => customComparables || (Array.isArray(mapData?.comparables) ? mapData.comparables : []),
        [customComparables, mapData?.comparables],
    );
    const comparablesKey = useMemo(
        () => comparables.map((c: any) => `${c.lat},${c.lng}`).join('|'),
        [comparables],
    );
    const targetLatKey = target?.lat != null ? `${target.lat},${target.lng}` : '';

    const directTargetArea = mapData?.targetArea !== undefined && mapData?.targetArea !== null
        ? parseFloat(mapData.targetArea.toString())
        : null;
    let resolvedTargetArea = 0;
    if (directTargetArea !== null && directTargetArea > 0) {
        resolvedTargetArea = directTargetArea;
    } else if (target) {
        resolvedTargetArea = parseFloat(target.totalArea_sqm || target.area_sqm || target.exclusiveArea_sqm || target.land?.area_sqm || '0');
    }
    const targetAreaVal = targetArea || resolvedTargetArea;

    const normalizeDealAmountWon = (raw: any): number => {
        const num = Number(raw) || 0;
        if (num <= 0) return 0;
        return num > 1000000 ? num : num * 10000;
    };

    const formatEokCompact = (won: number): string => {
        if (!won || won <= 0) return '-';
        const eok = won / 100000000;
        if (eok >= 10) return `${Math.round(eok)}억`;
        return `${eok.toFixed(1).replace(/\.0$/, '')}억`;
    };

    const formatSqmManwon = (wonPerSqm: number): string => {
        if (!wonPerSqm || wonPerSqm <= 0) return '-';
        const man = wonPerSqm >= 10000 ? wonPerSqm / 10000 : wonPerSqm;
        return `${Math.round(man).toLocaleString()}만/㎡`;
    };

    const getCompMetrics = (c: any) => {
        if (!c || c.isTarget) return null;
        const dealWon = normalizeDealAmountWon(c.dealAmount);
        const area = Number(c.area || c.plottageAr || c.excluUseAr || c.buildingAr) || 0;
        const rawSqm = Number(c.pricePerSqm) || (dealWon > 0 && area > 0 ? dealWon / area : 0);
        const adjSqm = Number(c.adjustedPricePerSqm) || rawSqm;
        const adjTotalWon = targetAreaVal > 0 ? adjSqm * targetAreaVal : 0;

        const simVal = Number(c.similarityScore || c.score) || 0;
        const simRounded = simVal > 0 ? Math.round(simVal) : 0;
        const distVal = Number(c.distance ?? c.distanceFromTarget) || 0;
        const month = String(c.dealMonth || '?').padStart(2, '0');
        const date = c.dealYear ? `${c.dealYear}.${month}` : '-';

        return {
            dealWon,
            dealEok: formatEokCompact(dealWon),
            area,
            rawSqm,
            adjSqm,
            adjTotalWon,
            adjTotalEok: formatEokCompact(adjTotalWon),
            rawSqmStr: formatSqmManwon(rawSqm),
            adjSqmStr: formatSqmManwon(adjSqm),
            simStr: simRounded > 0 ? `${simRounded}%` : '참고용',
            distStr: distVal > 0 ? `${Math.round(distVal)}m` : '-',
            date,
            zoning: c.zoning || c.landUse || '-',
            jimok: c.jimok || '',
            officialPrice: Number(c.officialPrice) || 0,
            timeAdjFactor: c.timeAdjFactor || 1,
            deductions: Array.isArray(c.deductions) ? c.deductions : [],
            isRedevelopment: c.isRedevelopment,
        };
    };

    const setSelectedCompRef = useRef(setSelectedComp);
    useEffect(() => {
        setSelectedCompRef.current = setSelectedComp;
    }, [setSelectedComp]);

    // 지도 초기화 이펙트
    useEffect(() => {
        let isMounted = true;
        const apiKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;

        const initializeMap = () => {
            if (!mapContainerRef.current) return;

            try {
                setMapInitializing(true);
                setMapReady(false);
                const kakao = (window as any).kakao;
                if (!kakao || !kakao.maps) {
                    throw new Error('Kakao Maps API not loaded');
                }

                if (mapRef.current) {
                    mapRef.current = null;
                }
                mapContainerRef.current.innerHTML = '';

                // Default coordinates (Seoul City Hall)
                let lat = 37.5665;
                let lng = 126.9780;

                const targetLat = parseFloat(target.lat);
                const targetLng = parseFloat(target.lng);

                if (isApartmentCompare && apartmentCompareMarkers![0]) {
                    lat = apartmentCompareMarkers![0].lat;
                    lng = apartmentCompareMarkers![0].lng;
                } else if (!isNaN(targetLat) && !isNaN(targetLng)) {
                    lat = targetLat;
                    lng = targetLng;
                }

                const options = {
                    center: new kakao.maps.LatLng(lat, lng),
                    level: 4,
                    draggable: draggable // 마운트 시 드래그 기능 제어
                };

                const kakaoMap = new kakao.maps.Map(mapContainerRef.current, options);
                kakaoMap.setZoomable(true);

                const addCompareApartmentMarkers = () => {
                    if (!apartmentCompareMarkers) return;
                    apartmentCompareMarkers.forEach((m) => {
                        const contentEl = document.createElement('div');
                        contentEl.style.cursor = 'pointer';
                        if (m.isWorkplace) {
                            contentEl.innerHTML = `
                            <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
                                <div style="width: 32px; height: 32px; border-radius: 50%; background-color: #818cf8; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                                    <span style="color: #fff; font-size: 11px; font-weight: 900;">직</span>
                                </div>
                                <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 7px solid #fff; margin-top: -1px;"></div>
                            </div>
                        `;
                        } else {
                            const num = m.index ?? '?';
                            contentEl.innerHTML = `
                            <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
                                <div style="width: 34px; height: 34px; border-radius: 50%; background-color: #34d399; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(52,211,153,0.45);">
                                    <span style="color: #0f172a; font-size: 13px; font-weight: 900;">${num}</span>
                                </div>
                                <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 7px solid #fff; margin-top: -1px;"></div>
                            </div>
                        `;
                        }
                        contentEl.addEventListener('click', (e) => {
                            e.stopPropagation();
                            setSelectedCompRef.current({
                                compareApartment: true,
                                lat: m.lat,
                                lng: m.lng,
                                label: m.label,
                                index: m.index,
                                subtitle: m.subtitle,
                                isWorkplace: m.isWorkplace,
                            });
                        });
                        const overlay = new kakao.maps.CustomOverlay({
                            position: new kakao.maps.LatLng(m.lat, m.lng),
                            content: contentEl,
                            yAnchor: 1.0,
                            zIndex: m.isWorkplace ? 18 : 20,
                        });
                        overlay.setMap(kakaoMap);
                    });
                };

                if (isApartmentCompare) {
                    addCompareApartmentMarkers();
                } else {
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
                }

                // Map Click Listener
                kakao.maps.event.addListener(kakaoMap, 'click', () => {
                    setSelectedComp(null);
                });

                if (fitAllMarkers || isApartmentCompare) {
                    const bounds = new kakao.maps.LatLngBounds();
                    let hasPoint = false;
                    let pointCount = 0;
                    if (isApartmentCompare && apartmentCompareMarkers) {
                        apartmentCompareMarkers.forEach((m) => {
                            bounds.extend(new kakao.maps.LatLng(m.lat, m.lng));
                            hasPoint = true;
                            pointCount += 1;
                        });
                    } else {
                        if (!isNaN(targetLat) && !isNaN(targetLng)) {
                            bounds.extend(new kakao.maps.LatLng(targetLat, targetLng));
                            hasPoint = true;
                            pointCount += 1;
                        }
                        comparables.forEach((c: any) => {
                            const cLat = parseFloat(c.lat);
                            const cLng = parseFloat(c.lng);
                            if (!isNaN(cLat) && !isNaN(cLng)) {
                                bounds.extend(new kakao.maps.LatLng(cLat, cLng));
                                hasPoint = true;
                                pointCount += 1;
                            }
                        });
                    }
                    if (hasPoint) {
                        if (pointCount <= 1) {
                            kakaoMap.setCenter(
                                centerFromKakaoBounds(bounds, kakao.maps.LatLng),
                            );
                            kakaoMap.setLevel(5);
                        } else {
                            kakaoMap.setBounds(bounds);
                        }
                    }
                }

                setMap(kakaoMap);
                mapRef.current = kakaoMap;
                setMapReady(true);
                setMapInitializing(false);
            } catch (err: any) {
                console.error('Map init error:', err);
                setLoadError('지도를 초기화하는 중 오류가 발생했습니다.');
                setMapInitializing(false);
                setMapReady(false);
            }
        };

        const loadScript = () => {
            if ((window as any).kakao && (window as any).kakao.maps) {
                initializeMap();
                return;
            }

            const existingScript = document.querySelector('script[src*="dapi.kakao.com/v2/maps/sdk.js"]');
            if (existingScript) {
                existingScript.addEventListener('load', () => {
                    const kakao = (window as any).kakao;
                    if (kakao?.maps) {
                        kakao.maps.load(() => {
                            if (isMounted) initializeMap();
                        });
                    }
                }, { once: true });
                if ((window as any).kakao?.maps) {
                    (window as any).kakao.maps.load(() => {
                        if (isMounted) initializeMap();
                    });
                }
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
                    setMapInitializing(false);
                    setMapReady(false);
                }
            };
            document.head.appendChild(script);
        };

        loadScript();

        return () => {
            isMounted = false;
        };
    }, [mapRetryTick, draggable, fitAllMarkers, compareMarkersKey, isApartmentCompare, comparablesKey, targetLatKey, apartmentCompareMarkers]);

    // 드래그 기능 동적 변경 감지 이펙트
    useEffect(() => {
        if (!map) return;
        mapRef.current = map;
        map.setDraggable(draggable);
    }, [draggable, map]);

    // 전체화면 및 맵 리사이즈 처리 이펙트
    useEffect(() => {
        if (!map) return;

        const timer = setTimeout(() => {
            map.relayout();
            if (isApartmentCompare && apartmentCompareMarkers?.length) {
                fitApartmentCompareBounds(map);
                return;
            }
            const targetLat = parseFloat(target.lat);
            const targetLng = parseFloat(target.lng);
            if (!isNaN(targetLat) && !isNaN(targetLng)) {
                map.setCenter(new (window as any).kakao.maps.LatLng(targetLat, targetLng));
            }
        }, 360);

        return () => clearTimeout(timer);
    }, [isFullscreen, map, target.lat, target.lng, isCollapsed, isApartmentCompare, apartmentCompareMarkers, fitApartmentCompareBounds]);

    const roadviewLabel = roadviewFocus?.label
        ?? (selectedComp?.compareApartment ? selectedComp.label : null)
        ?? '분석 대상지';

    // 로드뷰 이니셜라이징 및 로드 이펙트
    useEffect(() => {
        if (!isRoadview || !roadviewContainerRef.current) return;

        const kakao = (window as any).kakao;
        if (!kakao || !kakao.maps) return;

        let rvLat = NaN;
        let rvLng = NaN;

        if (roadviewFocus) {
            rvLat = roadviewFocus.lat;
            rvLng = roadviewFocus.lng;
        } else if (selectedComp?.compareApartment && selectedComp.lat != null && selectedComp.lng != null) {
            rvLat = Number(selectedComp.lat);
            rvLng = Number(selectedComp.lng);
        } else if (isApartmentCompare && apartmentCompareMarkers?.length) {
            const m = apartmentCompareMarkers.find((x) => !x.isWorkplace) ?? apartmentCompareMarkers[0];
            rvLat = m.lat;
            rvLng = m.lng;
        } else {
            rvLat = parseFloat(target.lat);
            rvLng = parseFloat(target.lng);
        }

        if (isNaN(rvLat) || isNaN(rvLng)) {
            setRoadviewError('좌표 정보가 부족하여 로드뷰를 열 수 없습니다.');
            return;
        }

        const position = new kakao.maps.LatLng(rvLat, rvLng);
        const rvLabel = roadviewFocus?.label ?? selectedComp?.label ?? '선택 지점';
        let rvInstance = roadview;

        if (!rvInstance) {
            try {
                rvInstance = new kakao.maps.Roadview(roadviewContainerRef.current);
                setRoadview(rvInstance);
            } catch (err) {
                console.error('Roadview init error:', err);
                setRoadviewError('로드뷰 뷰어를 초기화하는 중 오류가 발생했습니다.');
                return;
            }
        }

        const roadviewClient = new kakao.maps.RoadviewClient();
        setRoadviewLoading(true);
        setRoadviewError(null);

        roadviewClient.getNearestPanoId(position, 100, (panoId: any) => {
            if (panoId === null) {
                setRoadviewError('이 위치 주변 100m 이내의 로드뷰 데이터를 찾을 수 없습니다.');
                setRoadviewLoading(false);
                setTimeout(() => {
                    setIsRoadview(false);
                    setRoadviewError(null);
                }, 2500);
                return;
            }
                // 기존 로드뷰 마커 및 오버레이 제거
                if (rvMarkerRef.current) rvMarkerRef.current.setMap(null);
                if (rvOverlayRef.current) rvOverlayRef.current.setMap(null);

                // 로드뷰의 파노라마가 로딩 및 뷰어 초기화가 완료(init 이벤트)된 후에
                // 마커와 오버레이를 얹어야 로드뷰 화면 전환 후에도 지워지지 않고 정상 유지됩니다.
                const onRvInit = () => {
                    // 1. 로드뷰 내부에 대상지 마커 생성
                    const rMarker = new kakao.maps.Marker({
                        position: position,
                        map: rvInstance
                    });
                    rvMarkerRef.current = rMarker;

                    // 2. 로드뷰 내부에 '분석 대상지' 입체 오버레이 생성
                    const rOverlay = new kakao.maps.CustomOverlay({
                        position: position,
                        content: `
                            <div style="
                                padding: 6px 12px;
                                background-color: #0ea5e9;
                                color: #ffffff;
                                font-size: 11px;
                                font-weight: 800;
                                border-radius: 8px;
                                border: 2px solid #ffffff;
                                box-shadow: 0 4px 12px rgba(0,0,0,0.35);
                                white-space: nowrap;
                                text-align: center;
                            ">
                                ${rvLabel.replace(/</g, '&lt;')}
                            </div>
                        `,
                        map: rvInstance,
                        yAnchor: 2.3 // 공중 부양 앵커 설정
                    });
                    rvOverlayRef.current = rOverlay;

                    // 리스너가 중복 실행되지 않도록 일회성으로 해제해 줍니다.
                    kakao.maps.event.removeListener(rvInstance, 'init', onRvInit);
                };

                // init 리스너 선등록 후 PanoId 세팅
                kakao.maps.event.addListener(rvInstance, 'init', onRvInit);
                rvInstance.setPanoId(panoId, position);
                setRoadviewLoading(false);
        });

        // 클린업 함수
        return () => {
            if (rvMarkerRef.current) {
                rvMarkerRef.current.setMap(null);
                rvMarkerRef.current = null;
            }
            if (rvOverlayRef.current) {
                rvOverlayRef.current.setMap(null);
                rvOverlayRef.current = null;
            }
        };
    }, [isRoadview, roadviewFocus, selectedComp, target.lat, target.lng, roadview, compareMarkersKey, isApartmentCompare, apartmentCompareMarkers]);

    useEffect(() => {
        if (!isRoadview) setRoadviewLoading(false);
    }, [isRoadview]);

    // 커스텀 줌 컨트롤 핸들러
    const zoomIn = () => {
        const kakaoMap = mapRef.current;
        if (kakaoMap) {
            kakaoMap.setLevel(kakaoMap.getLevel() - 1, { animate: true });
        }
    };

    const zoomOut = () => {
        const kakaoMap = mapRef.current;
        if (kakaoMap) {
            kakaoMap.setLevel(kakaoMap.getLevel() + 1, { animate: true });
        }
    };

    const controlsPosClass =
        controlsPosition === 'top-right'
            ? 'top-14 right-3 sm:top-16 sm:right-4'
            : 'bottom-4 right-4';

    return (
        <div className={`relative w-full h-full bg-slate-900 ${className}`}>
            {/* 지도 뷰 */}
            <div ref={mapContainerRef} className={`w-full h-full ${isRoadview ? 'hidden' : 'block'}`} />

            {/* 로드뷰 뷰 */}
            <div ref={roadviewContainerRef} className={`w-full h-full bg-black ${isRoadview ? 'block' : 'hidden'}`} />

            {/* 로드뷰 안내 가이드 배너 */}
            {isRoadview && !roadviewError && !roadviewLoading && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-black/75 border border-white/10 backdrop-blur-md rounded-full shadow-lg text-[10px] sm:text-xs font-semibold text-white/95 pointer-events-none flex items-center gap-1.5 whitespace-nowrap animate-in fade-in slide-in-from-top-1.5 duration-300 max-w-[90vw]">
                    화면을 360° 돌려 <span className="text-sky-400 font-extrabold truncate max-w-[140px] sm:max-w-[200px]">{roadviewLabel}</span> 확인
                </div>
            )}

            {/* 로드뷰 에러 오버레이 */}
            {isRoadview && roadviewError && (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-20 animate-in fade-in duration-200">
                    <MapPin className="w-10 h-10 text-rose-500 mb-3 animate-bounce" />
                    <span className="text-sm font-bold text-white mb-1">로드뷰 데이터 없음</span>
                    <span className="text-xs text-white/50">{roadviewError}</span>
                    <button
                        onClick={() => {
                            setIsRoadview(false);
                            setRoadviewError(null);
                        }}
                        className="mt-4 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl text-xs transition-all active:scale-95"
                    >
                        지도 모드로 복귀
                    </button>
                </div>
            )}

            {/* 커스텀 확대/축소, 전체화면, 로드뷰 버튼 툴바 */}
            {mapReady && !loadError && (
                <div className={`absolute ${controlsPosClass} z-[45] flex flex-col gap-1.5 pointer-events-auto`}>
                    {onToggleFullscreen && (
                        <button
                            onClick={onToggleFullscreen}
                            className="w-8 h-8 rounded-lg bg-emerald-500 border border-emerald-400 flex items-center justify-center text-white hover:bg-emerald-600 hover:scale-105 active:scale-95 transition-all shadow-lg"
                            title={isFullscreen ? "기본 화면" : "전체 화면"}
                        >
                            {isFullscreen ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V3m0 6H3m6 0L3 3m12 6h6m-6 0V3m0 6L21 3m-12 12v6m0-6H3m6 0l-6 6m12-6h6m-6 0v6m0-6l6 6" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
                                </svg>
                            )}
                        </button>
                    )}
                    
                    {/* 로드뷰 전환 버튼 */}
                    <button
                        onClick={() => {
                            if (isRoadview) {
                                setIsRoadview(false);
                                setRoadviewError(null);
                                setRoadviewLoading(false);
                                return;
                            }
                            if (isApartmentCompare && apartmentCompareMarkers?.length) {
                                const sel = selectedComp?.compareApartment ? selectedComp : null;
                                const m = sel
                                    ? { lat: sel.lat, lng: sel.lng, label: sel.label as string }
                                    : (() => {
                                        const first = apartmentCompareMarkers.find((x) => !x.isWorkplace) ?? apartmentCompareMarkers[0];
                                        return { lat: first.lat, lng: first.lng, label: first.label };
                                    })();
                                openRoadviewAt(m.lat, m.lng, m.label);
                                return;
                            }
                            setRoadviewError(null);
                            setIsRoadview(true);
                        }}
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg ${
                            isRoadview 
                                ? 'bg-sky-600 border-sky-500 text-white hover:bg-sky-700' 
                                : 'bg-sky-500 border-sky-400 text-white hover:bg-sky-600'
                        }`}
                        title={isRoadview ? "지도 모드로 복귀" : "360° 로드뷰 보기"}
                    >
                        {isRoadview ? <Map className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>

                    {/* 지도 모드일 때만 줌 컨트롤 활성화 */}
                    {!isRoadview && (
                        <>
                            <button
                                onClick={zoomIn}
                                className="w-8 h-8 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/80 hover:scale-105 active:scale-95 transition-all font-bold text-lg leading-none shadow-lg"
                                title="확대"
                            >
                                +
                            </button>
                            <button
                                onClick={zoomOut}
                                className="w-8 h-8 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/80 hover:scale-105 active:scale-95 transition-all font-bold text-lg leading-none shadow-lg"
                                title="축소"
                            >
                                -
                            </button>
                        </>
                    )}
                </div>
            )}

            {mapInitializing && !isRoadview && (
                <div className="absolute inset-0 z-[25] bg-slate-950/80 flex flex-col items-center justify-center gap-3 pointer-events-none">
                    <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin"></div>
                    <span className="text-xs text-white/50">지도를 로드 중입니다...</span>
                </div>
            )}

            {roadviewLoading && isRoadview && (
                <div className="absolute inset-0 z-[25] bg-slate-950/80 flex flex-col items-center justify-center gap-3 pointer-events-none">
                    <div className="w-8 h-8 border-4 border-sky-500/20 border-t-sky-400 rounded-full animate-spin"></div>
                    <span className="text-xs text-white/50">로드뷰를 불러오는 중...</span>
                </div>
            )}


            {loadError && (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                    <MapPin className="w-10 h-10 text-rose-500 mb-3" />
                    <span className="text-sm font-bold text-white mb-1">지도 로드 실패</span>
                    <span className="text-xs text-white/40 mb-4">{loadError}</span>
                    <button
                        type="button"
                        onClick={handleRetryMap}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        지도 다시 불러오기
                    </button>
                </div>
            )}

            {/* Selected Info Card Overlay */}
            {selectedComp && (() => {
                const isTarget = !!selectedComp.isTarget;
                const m = isTarget || selectedComp.compareApartment ? null : getCompMetrics(selectedComp);
                return (
                    <div className={`absolute bottom-4 left-4 z-[40] pointer-events-auto max-w-[min(100%,20rem)] sm:max-w-sm bg-white border border-emerald-200 rounded-2xl p-4 shadow-2xl text-slate-900 animate-in slide-in-from-bottom duration-250 ${controlsPosition === 'bottom-right' && !isApartmentCompare ? 'right-4 max-w-none' : ''}`}>
                        <button
                            onClick={() => setSelectedComp(null)}
                            className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {selectedComp.compareApartment ? (
                            <div className="pr-8 text-slate-900">
                                <span className="inline-block px-2 py-0.5 bg-emerald-100 border border-emerald-200 text-emerald-800 rounded text-[10px] font-extrabold mb-1.5 uppercase tracking-wide">
                                    {selectedComp.isWorkplace ? '직장 · 목적지' : `${selectedComp.index}번 후보 단지`}
                                </span>
                                <h4 className="text-sm font-black text-slate-900">{selectedComp.label || '단지'}</h4>
                                {selectedComp.subtitle ? (
                                    <p className="text-xs text-slate-600 font-semibold mt-1">{selectedComp.subtitle}</p>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={() => openRoadviewAt(selectedComp.lat, selectedComp.lng, selectedComp.label)}
                                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-extrabold transition-all active:scale-95"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    360° 거리뷰
                                </button>
                            </div>
                        ) : isTarget ? (
                            <div>
                                <span className="inline-block px-2 py-0.5 bg-sky-50 border border-sky-100 text-sky-600 rounded text-[10px] font-extrabold mb-1.5 uppercase tracking-wide">분석 대상지</span>
                                <h4 className="text-sm font-black text-slate-900 truncate pr-6">{selectedComp.address}</h4>
                            </div>
                        ) : m ? (
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-start pr-6">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-teal-600 text-[10px] font-black tracking-wider uppercase">#{selectedComp.index} 비교사례</span>
                                        <h4 className="text-sm font-black text-slate-900 truncate max-w-[240px]">
                                            {selectedComp.platPlc || selectedComp.platAddr || `${selectedComp.sggNm || ''} ${selectedComp.umdNm || ''}`.trim() || '주소 정보 없음'}
                                        </h4>
                                    </div>
                                    {m.distStr !== '-' && (
                                        <span className="text-slate-400 text-xs mt-0.5 font-bold whitespace-nowrap">대상지 거리: {m.distStr}</span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs pt-2.5 border-t border-slate-100">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-slate-400 text-[9px] font-bold">용도지역</span>
                                        <span className="font-extrabold text-slate-800">{m.zoning}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-slate-400 text-[9px] font-bold">거래년월</span>
                                        <span className="font-extrabold text-slate-800">{m.date}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-slate-400 text-[9px] font-bold">지목 / 면적</span>
                                        <span className="font-extrabold text-slate-800">{m.jimok || '-'}{m.area > 0 ? ` / ${m.area.toLocaleString()}㎡` : ''}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-slate-400 text-[9px] font-bold">공시지가</span>
                                        <span className="font-extrabold text-slate-800">
                                            {m.officialPrice > 0 ? formatSqmManwon(m.officialPrice) : '-'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-slate-400 text-[9px] font-bold">실거래 가격</span>
                                        <span className="font-extrabold text-slate-800">{m.dealEok}원</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-slate-400 text-[9px] font-bold">실거래 단가</span>
                                        <span className="font-extrabold text-slate-800">{m.rawSqmStr}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-slate-400 text-[9px] font-bold">보정 대입 단가</span>
                                        <span className="font-extrabold text-teal-600">{m.adjSqmStr}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-slate-400 text-[9px] font-bold">보정 대입 총액</span>
                                        <span className="font-black text-teal-600 text-[13px]">{m.adjTotalEok}원</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-slate-400 text-[9px] font-bold">공시지가 유사도</span>
                                        <span className="font-extrabold text-slate-800">{m.simStr}</span>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                );
            })()}
        </div>
    );
}
