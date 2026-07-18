'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ShortsDownloadBar from './ShortsDownloadBar';
import ShortsStudioTab from './shorts/ShortsStudioTab';
import ShortsStudioCapture from './shorts/ShortsStudioCapture';
import ShortsNativeFrames, {
    Scene1Map,
    Scene2AiSummary,
    Scene9TenYearCombined,
    Scene11TenYearOutlook,
    Scene3Content,
    Scene4Market,
    Scene5SupplyPopulation,
    Scene7MustCheck,
} from './shorts/ShortsNativeFrames';
import { Toaster, toast } from 'react-hot-toast';
import { ChevronLeft, ChevronRight, ImageDown, Loader2, ZoomIn, X } from 'lucide-react';
import { buildShortsSceneData, SHORTS_HEIGHT, SHORTS_WIDTH } from '../lib/shortsSceneData';
import { downloadScenePng, getShortsSceneMeta } from '../lib/shortsFrameDownload';

interface ShortsFrameViewProps {
    ai: any;
    mergedData: any;
    category?: string;
    lat?: number | string | null;
    lng?: number | string | null;
    address?: string | null;
    analyzeId?: string | number;
    showVideoStudio?: boolean;
}

export default function ShortsFrameView({
    ai,
    mergedData,
    category,
    lat,
    lng,
    address,
    analyzeId,
    showVideoStudio = false,
}: ShortsFrameViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const showPreviewUi = searchParams.get('preview') === '1';
    const cafeStudioCapture = searchParams.get('cafeStudio') === '1';
    const activeTab = searchParams.get('tab') === 'studio' ? 'studio' : 'cards';

    const switchTab = useCallback((tab: 'cards' | 'studio') => {
        if (!analyzeId) return;
        const base = `/analyze/${analyzeId}?shorts=1&preview=1`;
        router.replace(tab === 'studio' ? `${base}&tab=studio` : base);
    }, [analyzeId, router]);
    const [fontsReady, setFontsReady] = useState(false);
    const [downloadingSceneId, setDownloadingSceneId] = useState<number | null>(null);
    const [isZoomOpen, setIsZoomOpen] = useState(false);
    const [carouselIndex, setCarouselIndex] = useState(0);
    const [zoomScale, setZoomScale] = useState(0.4);
    const zoomScrollRef = useRef<HTMLDivElement>(null);
    const isProgrammaticScrollRef = useRef(false);

    const sceneData = useMemo(
        () => buildShortsSceneData(ai, mergedData, category, lat, lng, address),
        [ai, mergedData, category, lat, lng, address],
    );

    const scenes = useMemo(
        () => getShortsSceneMeta(sceneData.isApartment, analyzeId, {
            tenYearStory: sceneData.tenYearStory,
        }),
        [sceneData.isApartment, sceneData.tenYearStory, analyzeId],
    );

    const updateZoomScale = useCallback(() => {
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const targetH = vh * 0.78;
        const targetW = vw - 16;
        const scale = Math.min(targetH / SHORTS_HEIGHT, targetW / SHORTS_WIDTH);
        setZoomScale(scale);
    }, []);

    const zoomViewerHeight = SHORTS_HEIGHT * zoomScale;
    const zoomViewerWidth = SHORTS_WIDTH * zoomScale;

    useEffect(() => {
        document.documentElement.setAttribute('data-shorts-capture', '1');
        document.title = `Shorts Capture #${analyzeId ?? ''}`;

        let meta = document.querySelector('meta[name="robots"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'robots');
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', 'noindex,nofollow');

        const markReady = () => setFontsReady(true);
        if (document.fonts?.ready) {
            document.fonts.ready.then(markReady).catch(markReady);
        } else {
            setTimeout(markReady, 800);
        }

        return () => {
            document.documentElement.removeAttribute('data-shorts-capture');
        };
    }, [analyzeId]);

    const scrollToCarouselIndex = useCallback((idx: number, behavior: ScrollBehavior = 'auto') => {
        const container = zoomScrollRef.current;
        if (!container || scenes.length === 0) return;

        const clamped = Math.max(0, Math.min(idx, scenes.length - 1));
        const slideWidth = container.clientWidth;
        if (slideWidth <= 0) return;

        isProgrammaticScrollRef.current = true;
        setCarouselIndex(clamped);
        container.scrollTo({ left: slideWidth * clamped, behavior });

        const resetProgrammaticFlag = () => {
            isProgrammaticScrollRef.current = false;
        };

        if ('onscrollend' in container) {
            container.addEventListener('scrollend', resetProgrammaticFlag, { once: true });
        } else {
            window.setTimeout(resetProgrammaticFlag, behavior === 'smooth' ? 450 : 80);
        }
    }, [scenes.length]);

    useEffect(() => {
        if (!isZoomOpen) return;

        updateZoomScale();

        const onResize = () => {
            updateZoomScale();
            scrollToCarouselIndex(carouselIndex, 'auto');
        };

        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [isZoomOpen, carouselIndex, updateZoomScale, scrollToCarouselIndex]);

    useEffect(() => {
        if (!showPreviewUi || !isZoomOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [showPreviewUi, isZoomOpen]);

    useEffect(() => {
        if (!fontsReady || cafeStudioCapture) return;
        const timer = setTimeout(() => {
            document.documentElement.setAttribute('data-shorts-capture-ready', 'true');
        }, 1200);
        return () => clearTimeout(timer);
    }, [fontsReady, cafeStudioCapture]);

    const handleZoomCarouselScroll = useCallback(() => {
        if (isProgrammaticScrollRef.current) return;

        const container = zoomScrollRef.current;
        if (!container || scenes.length === 0) return;

        const slideWidth = container.clientWidth;
        if (slideWidth <= 0) return;

        const idx = Math.round(container.scrollLeft / slideWidth);
        const clamped = Math.max(0, Math.min(idx, scenes.length - 1));
        setCarouselIndex(clamped);
    }, [scenes.length]);

    const openZoom = (sceneId: number) => {
        const idx = scenes.findIndex((s) => s.id === sceneId);
        setIsZoomOpen(true);
        requestAnimationFrame(() => {
            scrollToCarouselIndex(idx >= 0 ? idx : 0, 'auto');
        });
    };

    const closeZoom = () => {
        setIsZoomOpen(false);
    };

    const goPrevCarousel = useCallback(() => {
        scrollToCarouselIndex(carouselIndex - 1, 'smooth');
    }, [carouselIndex, scrollToCarouselIndex]);

    const goNextCarousel = useCallback(() => {
        scrollToCarouselIndex(carouselIndex + 1, 'smooth');
    }, [carouselIndex, scrollToCarouselIndex]);

    useEffect(() => {
        if (!isZoomOpen) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                goPrevCarousel();
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                goNextCarousel();
            } else if (event.key === 'Escape') {
                closeZoom();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isZoomOpen, goPrevCarousel, goNextCarousel]);

    const handleDownloadOne = async (sceneId: number, filename: string, label: string) => {
        if (downloadingSceneId !== null) return;
        setDownloadingSceneId(sceneId);
        try {
            await document.fonts?.ready;
            await downloadScenePng(sceneId, filename);
            toast.success(`${label} 저장됨`);
        } catch (err: any) {
            toast.error(err?.message || `${label} 저장 실패`);
        } finally {
            setDownloadingSceneId(null);
        }
    };

    const renderSceneComponent = (sceneId: number) => {
        switch (sceneId) {
            case 1: return <Scene1Map data={sceneData} />;
            case 2: return <Scene2AiSummary data={sceneData} />;
            case 9: return <Scene9TenYearCombined data={sceneData} />;
            case 11: return <Scene11TenYearOutlook data={sceneData} />;
            case 3: return <Scene3Content data={sceneData} />;
            case 4: return <Scene4Market data={sceneData} />;
            case 5: return <Scene5SupplyPopulation data={sceneData} />;
            case 7: return <Scene7MustCheck data={sceneData} />;
            default: return null;
        }
    };

    const activeCarouselScene = scenes[carouselIndex];

    return (
        <>
            {showPreviewUi && (
                <>
                    <Toaster position="top-center" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
                    <style>{`
                        :root {
                            --shorts-scale: 0.1296; /* 140/1080 */
                        }
                        @media (min-width: 640px) {
                            :root {
                                --shorts-scale: 0.1667; /* 180/1080 */
                            }
                        }
                        @media (min-width: 768px) {
                            :root {
                                --shorts-scale: 0.1852; /* 200/1080 */
                            }
                        }
                        .shorts-zoom-scroll {
                            -webkit-overflow-scrolling: touch;
                            overscroll-behavior-x: contain;
                            touch-action: pan-x;
                            scroll-snap-type: x mandatory;
                        }
                        .shorts-zoom-scroll::-webkit-scrollbar {
                            display: none;
                        }
                    `}</style>
                </>
            )}

            <div
                className={showPreviewUi ? 'mx-auto w-full px-2 sm:px-4 pt-4 sm:pt-6 pb-32' : 'min-h-0 bg-[#0a0a0c]'}
                data-shorts-ui={showPreviewUi ? 'preview' : 'capture'}
            >
                {showPreviewUi && (
                    <div className="mb-4 sm:mb-6 max-w-[1200px] mx-auto">
                        <div className="flex items-start justify-between gap-3 sm:gap-4 mb-4">
                            <div className="min-w-0">
                                {/* <p className="text-xs font-bold text-sky-400/90 uppercase tracking-widest mb-1">탐정 뷰어</p> */}
                                <h1 className="text-lg font-black text-white">간편 카드 보기</h1>
                                <p className="text-[11px] text-white/40 mt-1 leading-relaxed">
                                    카드 클릭 후 확대 후 좌우 스크롤로 검토하세요 - 다운로드 가능
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (typeof window !== 'undefined' && analyzeId) {
                                        window.location.replace(`/analyze/${analyzeId}`);
                                    } else {
                                        window.history.back();
                                    }
                                }}
                                className="shrink-0 group flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/80 hover:text-white transition-all text-xs font-bold shadow-lg"
                            >
                                <X className="w-4 h-4 text-white/60 group-hover:text-white group-hover:scale-110 transition-all" />
                                닫기
                            </button>
                        </div>

                        <div
                            className="inline-flex w-full sm:w-auto rounded-xl border border-white/10 bg-white/[0.03] p-1 gap-1"
                            role="tablist"
                            aria-label="리포트 이미지 스크랩 탭"
                        >
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeTab === 'cards'}
                                onClick={() => switchTab('cards')}
                                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                                    activeTab === 'cards'
                                        ? 'bg-sky-500/20 text-sky-200 border border-sky-500/30 shadow-sm'
                                        : 'text-white/45 hover:text-white/70 border border-transparent'
                                }`}
                            >
                                전체 요약 보기
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeTab === 'studio'}
                                onClick={() => switchTab('studio')}
                                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                                    activeTab === 'studio'
                                        ? 'bg-violet-500/20 text-violet-200 border border-violet-500/30 shadow-sm'
                                        : 'text-white/45 hover:text-white/70 border border-transparent'
                                }`}
                            >
                                10년 동향 보기
                            </button>
                        </div>
                    </div>
                )}

                {showPreviewUi && activeTab === 'studio' ? (
                    <ShortsStudioTab
                        analyzeId={analyzeId}
                        sceneData={sceneData}
                        showVideoStudio={showVideoStudio}
                    />
                ) : showPreviewUi ? (
                    <div className="shorts-capture-root flex flex-wrap justify-center gap-4 sm:gap-6 max-w-[1200px] mx-auto w-full">
                        {scenes.map((scene) => (
                            <div key={scene.id} className="flex flex-col items-center gap-2">
                                <div
                                    onClick={() => openZoom(scene.id)}
                                    className="w-[140px] h-[249px] sm:w-[180px] sm:h-[320px] md:w-[200px] md:h-[356px] relative overflow-hidden rounded-2xl border border-white/10 hover:border-sky-500/50 transition-all cursor-pointer group bg-slate-950 shadow-lg"
                                >
                                    <div
                                        data-shorts-preview-wrap
                                        className="origin-top-left absolute inset-0 pointer-events-none"
                                        style={{
                                            width: SHORTS_WIDTH,
                                            height: SHORTS_HEIGHT,
                                            transform: 'scale(var(--shorts-scale, 0.1852))',
                                        }}
                                    >
                                        {renderSceneComponent(scene.id)}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openZoom(scene.id);
                                        }}
                                        className="absolute bottom-2 right-2 sm:bottom-auto sm:right-auto sm:inset-0 sm:flex sm:items-center sm:justify-center sm:bg-black/70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 p-2 sm:p-0 rounded-full sm:rounded-none bg-black/55 border border-white/15 sm:border-0"
                                        aria-label="확대보기"
                                    >
                                        <span className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold">
                                            <ZoomIn className="w-3.5 h-3.5 text-sky-400" />
                                            확대보기
                                        </span>
                                        <ZoomIn className="w-4 h-4 text-sky-300 sm:hidden" />
                                    </button>
                                </div>
                                <span className="text-[10px] sm:text-xs font-semibold text-white/50 text-center max-w-[140px] sm:max-w-none leading-tight">
                                    {scene.label}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : cafeStudioCapture ? (
                    <ShortsStudioCapture analyzeId={analyzeId} sceneData={sceneData} />
                ) : (
                    <div className="shorts-capture-root flex flex-col items-center gap-0" data-shorts-capture-root="true">
                        <div data-shorts-preview-wrap>
                            <ShortsNativeFrames data={sceneData} />
                        </div>
                    </div>
                )}
            </div>

            {showPreviewUi && isZoomOpen && (
                <div
                    className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex flex-col"
                    onClick={closeZoom}
                >
                    <div
                        className="flex flex-col flex-1 min-h-0 w-full max-h-[100vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center text-white px-3 sm:px-4 py-3 shrink-0">
                            <div className="min-w-0">
                                <span className="text-sm font-black text-white/90 block truncate">
                                    {activeCarouselScene?.label}
                                </span>
                                <span className="text-[11px] text-white/40">
                                    {carouselIndex + 1} / {scenes.length} · PC 화살표 · 모바일 스와이프
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={closeZoom}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all shrink-0 ml-3"
                                title="닫기"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="relative flex-1 min-h-0 min-w-0 w-full">
                            <button
                                type="button"
                                onClick={goPrevCarousel}
                                disabled={carouselIndex <= 0}
                                aria-label="이전 컷"
                                className="hidden sm:flex absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-11 h-11 rounded-full bg-black/55 hover:bg-black/75 border border-white/20 text-white disabled:opacity-25 disabled:pointer-events-none transition-all"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button
                                type="button"
                                onClick={goNextCarousel}
                                disabled={carouselIndex >= scenes.length - 1}
                                aria-label="다음 컷"
                                className="hidden sm:flex absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-11 h-11 rounded-full bg-black/55 hover:bg-black/75 border border-white/20 text-white disabled:opacity-25 disabled:pointer-events-none transition-all"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>

                            <div
                                ref={zoomScrollRef}
                                onScroll={handleZoomCarouselScroll}
                                className="shorts-zoom-scroll h-full w-full overflow-x-scroll overflow-y-hidden flex snap-x snap-mandatory [scrollbar-width:none]"
                            >
                                {scenes.map((scene) => (
                                    <div
                                        key={scene.id}
                                        id={`zoom-slide-${scene.id}`}
                                        className="h-full w-full flex-[0_0_100%] shrink-0 snap-center snap-always flex justify-center items-center px-2 sm:px-4"
                                    >
                                        <div
                                            className="rounded-[24px] sm:rounded-[32px] overflow-hidden border border-white/20 relative shadow-2xl bg-slate-950"
                                            style={{
                                                height: zoomViewerHeight,
                                                width: zoomViewerWidth,
                                            }}
                                        >
                                            <div
                                                data-shorts-preview-wrap
                                                className="origin-top-left absolute"
                                                style={{
                                                    width: SHORTS_WIDTH,
                                                    height: SHORTS_HEIGHT,
                                                    transform: `scale(${zoomScale})`,
                                                }}
                                            >
                                                {renderSceneComponent(scene.id)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {activeCarouselScene && (
                            <div className="shrink-0 flex justify-center px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                                <button
                                    type="button"
                                    disabled={downloadingSceneId !== null}
                                    onClick={() => handleDownloadOne(
                                        activeCarouselScene.id,
                                        activeCarouselScene.filename,
                                        activeCarouselScene.label,
                                    )}
                                    className="px-6 py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-bold flex items-center gap-2 shadow-xl transition-all"
                                >
                                    {downloadingSceneId === activeCarouselScene.id ? (
                                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                                    ) : (
                                        <ImageDown className="w-4.5 h-4.5" />
                                    )}
                                    이 컷 고화질 다운로드
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showPreviewUi && (
                <ShortsDownloadBar
                    analyzeId={analyzeId}
                    isApartment={sceneData.isApartment}
                    tenYearStory={sceneData.tenYearStory}
                    activeTab={activeTab}
                    locationLabel={sceneData.locationLabel}
                />
            )}
        </>
    );
}
