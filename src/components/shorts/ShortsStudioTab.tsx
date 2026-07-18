'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Download, Film, FileText, ImageDown, Loader2, Music, X, ZoomIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { Scene9TenYearStudioCard } from './ShortsTenYearStudioCard';
import { ShortsTenYearStudioClosingCard } from './ShortsTenYearStudioClosingCard';
import { ShortsTenYearStudioIntroCard } from './ShortsTenYearStudioIntroCard';
import { ShortsTenYearStudioOutlookCard } from './ShortsTenYearStudioOutlookCard';
import type { ShortsSceneData } from '../../lib/shortsSceneData';
import { SHORTS_HEIGHT, SHORTS_WIDTH } from '../../lib/shortsSceneData';
import { downloadScenePng } from '../../lib/shortsFrameDownload';
import {
    STUDIO_BGM_PATH,
    STUDIO_VIDEO_DURATION_SEC,
    buildStudioSlideTimeline,
    buildStudioVideoFilename,
    buildStudioVideoTitle,
    formatTimelineSec,
} from '../../lib/shortsStudioTiming';
import { buildStudioVideoMp4 } from '../../lib/shortsStudioVideo';
import {
    buildStudioUploadDescription,
    buildStudioUploadDescriptionFilename,
    copyStudioUploadDescription,
    downloadStudioUploadDescription,
} from '../../lib/shortsStudioDescription';
import {
    buildTenYearStudioSlideMetas,
    hasTenYearStudioContent,
    hasTenYearStudioOutlookContent,
    type TenYearStudioSlideMeta,
} from '../../lib/shortsTenYearQuarters';

interface ShortsStudioTabProps {
    analyzeId?: string | number;
    sceneData: ShortsSceneData;
    showVideoStudio?: boolean;
}

function StudioSlidePreview({
    slide,
    sceneData,
}: {
    slide: TenYearStudioSlideMeta;
    sceneData: ShortsSceneData;
}) {
    if (slide.kind === 'intro') {
        return (
            <ShortsTenYearStudioIntroCard
                data={sceneData}
                heroImageUrl={slide.heroImageUrl}
                priceRangeLine={slide.priceRangeLine}
                taglineLine={slide.taglineLine}
                preview
            />
        );
    }

    if (slide.kind === 'outlook') {
        return (
            <ShortsTenYearStudioOutlookCard
                data={sceneData}
                cardIndex={slide.cardIndex}
                keywords={slide.keywords}
                heroImageUrl={slide.heroImageUrl}
                preview
            />
        );
    }

    if (slide.kind === 'closing') {
        return <ShortsTenYearStudioClosingCard preview />;
    }

    return (
        <Scene9TenYearStudioCard
            data={sceneData}
            cardIndex={slide.cardIndex}
            display={slide.display}
            heroImageUrl={slide.heroImageUrl}
            preview
        />
    );
}

function StudioSlideCapture({
    slide,
    sceneData,
}: {
    slide: TenYearStudioSlideMeta;
    sceneData: ShortsSceneData;
}) {
    if (slide.kind === 'intro') {
        return (
            <ShortsTenYearStudioIntroCard
                data={sceneData}
                heroImageUrl={slide.heroImageUrl}
                priceRangeLine={slide.priceRangeLine}
                taglineLine={slide.taglineLine}
            />
        );
    }

    if (slide.kind === 'outlook') {
        return (
            <ShortsTenYearStudioOutlookCard
                data={sceneData}
                cardIndex={slide.cardIndex}
                keywords={slide.keywords}
                heroImageUrl={slide.heroImageUrl}
            />
        );
    }

    if (slide.kind === 'closing') {
        return <ShortsTenYearStudioClosingCard />;
    }

    return (
        <Scene9TenYearStudioCard
            data={sceneData}
            cardIndex={slide.cardIndex}
            display={slide.display}
            heroImageUrl={slide.heroImageUrl}
        />
    );
}

const STUDIO_CARD_CLASS =
    'w-[140px] h-[249px] sm:w-[180px] sm:h-[320px] md:w-[200px] md:h-[356px]';

function StudioSlidePreviewFrame({
    slide,
    sceneData,
    zoomScale,
}: {
    slide: TenYearStudioSlideMeta;
    sceneData: ShortsSceneData;
    zoomScale?: number;
}) {
    return (
        <div
            data-shorts-preview-wrap
            className={`origin-top-left absolute pointer-events-none ${zoomScale ? '' : 'inset-0'}`}
            style={{
                width: SHORTS_WIDTH,
                height: SHORTS_HEIGHT,
                transform: zoomScale ? `scale(${zoomScale})` : 'scale(var(--shorts-scale, 0.1852))',
            }}
        >
            <StudioSlidePreview slide={slide} sceneData={sceneData} />
        </div>
    );
}

function getSlideBorderClass(kind: TenYearStudioSlideMeta['kind']): string {
    if (kind === 'intro' || kind === 'outlook') return 'border-emerald-500/25';
    if (kind === 'closing') return 'border-violet-500/25';
    return 'border-sky-500/20';
}

function getSlideTitle(slide: TenYearStudioSlideMeta): string {
    if (slide.kind === 'intro') return '인트로';
    if (slide.kind === 'year') return slide.display.yearLabel;
    if (slide.kind === 'outlook') {
        return slide.label.replace(/^2-3-2\. 현재 전망 키워드 /, '전망 ');
    }
    if (slide.kind === 'closing') return '마지막 장';
    return '';
}

function getSlideCaption(slide: TenYearStudioSlideMeta): string {
    if (slide.kind === 'intro') return slide.priceRangeLine;
    if (slide.kind === 'year') return slide.display.priceLine || slide.display.headline;
    if (slide.kind === 'outlook') {
        return slide.keywords.map((row) => row.item.label).join(' · ');
    }
    if (slide.kind === 'closing') return '부동산탐정 앱 · 웹 검색';
    return '';
}

function StudioDownloadThumb({
    slide,
    sceneData,
    disabled,
    downloading,
    onDownload,
    onZoom,
}: {
    slide: TenYearStudioSlideMeta;
    sceneData: ShortsSceneData;
    disabled: boolean;
    downloading: boolean;
    onDownload: () => void;
    onZoom: () => void;
}) {
    return (
        <div className="flex flex-col items-center gap-2 shrink-0 w-[140px] sm:w-auto">
            <div
                role="button"
                tabIndex={0}
                onClick={onZoom}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onZoom();
                    }
                }}
                className={`${STUDIO_CARD_CLASS} relative overflow-hidden rounded-2xl border border-white/10 hover:border-sky-500/50 bg-slate-950 cursor-pointer group transition-all shadow-lg ${getSlideBorderClass(slide.kind)}`}
            >
                <StudioSlidePreviewFrame slide={slide} sceneData={sceneData} />
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onZoom();
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
            <span className="text-[10px] sm:text-xs font-semibold text-white/55 text-center leading-tight w-full max-w-[140px] sm:max-w-none">
                {getSlideTitle(slide)}
            </span>
            <span className="text-[10px] text-white/40 text-center line-clamp-2 w-full min-h-[2.5em] px-0.5">
                {getSlideCaption(slide)}
            </span>
            <button
                type="button"
                disabled={disabled}
                onClick={onDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[11px] font-bold transition-all disabled:opacity-40"
            >
                {downloading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                    <ImageDown className="w-3 h-3" />
                )}
                PNG
            </button>
        </div>
    );
}

export default function ShortsStudioTab({ analyzeId, sceneData, showVideoStudio = false }: ShortsStudioTabProps) {
    const [downloadingSceneId, setDownloadingSceneId] = useState<number | null>(null);
    const [downloadingAll, setDownloadingAll] = useState(false);
    const [buildingVideo, setBuildingVideo] = useState(false);
    const [videoProgress, setVideoProgress] = useState('');
    const [isZoomOpen, setIsZoomOpen] = useState(false);
    const [carouselIndex, setCarouselIndex] = useState(0);
    const [zoomScale, setZoomScale] = useState(0.4);
    const zoomScrollRef = useRef<HTMLDivElement>(null);
    const isProgrammaticScrollRef = useRef(false);

    const updateZoomScale = useCallback(() => {
        const targetH = window.innerHeight * 0.78;
        const targetW = window.innerWidth - 16;
        const scale = Math.min(targetH / SHORTS_HEIGHT, targetW / SHORTS_WIDTH);
        setZoomScale(scale);
    }, []);

    const zoomViewerHeight = SHORTS_HEIGHT * zoomScale;
    const zoomViewerWidth = SHORTS_WIDTH * zoomScale;

    const isApartment = sceneData.isApartment;
    const story = sceneData.tenYearStory;
    const hasContent = hasTenYearStudioContent(story);
    const hasOutlook = hasTenYearStudioOutlookContent(story);

    const slideMetas = useMemo(
        () => buildTenYearStudioSlideMetas(story, analyzeId, sceneData.locationLabel),
        [story, analyzeId, sceneData.locationLabel],
    );

    const slideTimeline = useMemo(
        () => buildStudioSlideTimeline(slideMetas),
        [slideMetas],
    );

    const videoTitle = useMemo(
        () => buildStudioVideoTitle(story, slideMetas, sceneData.locationLabel),
        [story, slideMetas],
    );

    const videoFilename = useMemo(
        () => buildStudioVideoFilename(story, slideMetas, sceneData.locationLabel),
        [story, slideMetas],
    );

    const uploadDescription = useMemo(
        () => buildStudioUploadDescription(story, slideMetas, sceneData.locationLabel),
        [story, slideMetas, sceneData.locationLabel],
    );

    const uploadDescriptionFilename = useMemo(
        () => buildStudioUploadDescriptionFilename(story),
        [story],
    );

    const scrollToCarouselIndex = useCallback((idx: number, behavior: ScrollBehavior = 'auto') => {
        const container = zoomScrollRef.current;
        if (!container || slideMetas.length === 0) return;

        const clamped = Math.max(0, Math.min(idx, slideMetas.length - 1));
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
    }, [slideMetas.length]);

    const openZoom = useCallback((index: number) => {
        setCarouselIndex(index);
        setIsZoomOpen(true);
        requestAnimationFrame(() => {
            updateZoomScale();
            scrollToCarouselIndex(index, 'auto');
        });
    }, [scrollToCarouselIndex, updateZoomScale]);

    const closeZoom = useCallback(() => {
        setIsZoomOpen(false);
    }, []);

    const handleZoomCarouselScroll = useCallback(() => {
        if (isProgrammaticScrollRef.current) return;
        const container = zoomScrollRef.current;
        if (!container || slideMetas.length === 0) return;

        const slideWidth = container.clientWidth;
        if (slideWidth <= 0) return;

        const nextIndex = Math.round(container.scrollLeft / slideWidth);
        setCarouselIndex(Math.max(0, Math.min(nextIndex, slideMetas.length - 1)));
    }, [slideMetas.length]);

    const goPrevCarousel = useCallback(() => {
        scrollToCarouselIndex(carouselIndex - 1, 'smooth');
    }, [carouselIndex, scrollToCarouselIndex]);

    const goNextCarousel = useCallback(() => {
        scrollToCarouselIndex(carouselIndex + 1, 'smooth');
    }, [carouselIndex, scrollToCarouselIndex]);

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
        if (!isZoomOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isZoomOpen]);

    const activeCarouselSlide = slideMetas[carouselIndex];

    const handleDownloadOne = useCallback(async (sceneId: number, filename: string, label: string) => {
        if (downloadingSceneId !== null || downloadingAll) return;
        setDownloadingSceneId(sceneId);
        try {
            await document.fonts?.ready;
            await downloadScenePng(sceneId, filename);
            toast.success(`${label} 저장됨`);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : `${label} 저장 실패`;
            toast.error(message);
        } finally {
            setDownloadingSceneId(null);
        }
    }, [downloadingSceneId, downloadingAll]);

    const handleDownloadAll = useCallback(async () => {
        if (downloadingSceneId !== null || downloadingAll) return;
        setDownloadingAll(true);
        let ok = 0;
        let failed = 0;
        try {
            await document.fonts?.ready;
            await new Promise((r) => setTimeout(r, 300));
            for (const slide of slideMetas) {
                try {
                    await downloadScenePng(slide.sceneId, slide.filename);
                    ok += 1;
                    await new Promise((r) => setTimeout(r, 400));
                } catch {
                    failed += 1;
                }
            }
            if (failed === 0) {
                toast.success(`쇼츠 카드 ${ok}장 PNG 다운로드 완료`);
            } else {
                toast.error(`${ok}장 성공, ${failed}장 실패`);
            }
        } finally {
            setDownloadingAll(false);
        }
    }, [slideMetas, downloadingSceneId, downloadingAll]);

    const handleBuildVideo = useCallback(async () => {
        if (buildingVideo || downloadingAll || downloadingSceneId !== null) return;

        setBuildingVideo(true);
        setVideoProgress('준비 중…');
        try {
            await buildStudioVideoMp4(slideMetas, videoFilename, (progress) => {
                setVideoProgress(progress.message);
            }, videoTitle);
            toast.success(`${STUDIO_VIDEO_DURATION_SEC}초 MP4 저장됨`);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'MP4 생성 실패';
            toast.error(message);
        } finally {
            setBuildingVideo(false);
            setVideoProgress('');
        }
    }, [slideMetas, videoFilename, videoTitle, buildingVideo, downloadingAll, downloadingSceneId]);

    const handleCopyDescription = useCallback(async () => {
        try {
            await copyStudioUploadDescription(uploadDescription);
            toast.success('업로드 설명문 복사됨');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : '복사 실패';
            toast.error(message);
        }
    }, [uploadDescription]);

    const handleDownloadDescription = useCallback(() => {
        downloadStudioUploadDescription(uploadDescription, uploadDescriptionFilename);
        toast.success('설명문 txt 저장됨');
    }, [uploadDescription, uploadDescriptionFilename]);

    if (!isApartment) {
        return (
            <div className="max-w-[720px] mx-auto px-2 sm:px-0">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center">
                    <p className="text-sm text-white/50">아파트 매물에서만 5년 가격 흐름 카드를 사용할 수 있습니다.</p>
                </div>
            </div>
        );
    }

    if (!hasContent) {
        return (
            <div className="max-w-[720px] mx-auto px-2 sm:px-0">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center">
                    <p className="text-sm text-white/50">10년 시장 흐름 데이터가 없어 카드를 만들 수 없습니다.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto w-full px-2 sm:px-0 pb-8">
            <div className="rounded-2xl border border-sky-500/20 bg-sky-950/10 px-5 py-5 sm:px-6 sm:py-6 mb-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        {/* <p className="text-xs font-bold text-sky-400/80 uppercase tracking-widest mb-1">1단계</p> */}
                        <h2 className="text-lg sm:text-xl font-black text-white">
                            카드 · {slideMetas.length}장
                        </h2>
                        <p className="text-xs sm:text-sm text-white/45 mt-2 leading-relaxed">
                           카드 다운로드 후 커뮤니티 공간에 공유해 주세요. 감사합니다.
                        </p>
                    </div>
                    <button
                        type="button"
                        disabled={downloadingAll || downloadingSceneId !== null}
                        onClick={handleDownloadAll}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-bold transition-colors shrink-0"
                    >
                        {downloadingAll ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        {slideMetas.length}장 일괄 다운로드
                    </button>
                </div>
            </div>

            <p className="text-[11px] font-bold text-white/35 uppercase tracking-widest mb-3 px-1">
                다운로드 카드 · 탭하면 확대
            </p>
            <div className="shorts-capture-root flex flex-wrap justify-center gap-4 sm:gap-6 max-w-[1200px] mx-auto w-full mb-10">
                {slideMetas.map((slide, index) => (
                    <StudioDownloadThumb
                        key={slide.sceneId}
                        slide={slide}
                        sceneData={sceneData}
                        disabled={downloadingSceneId !== null || downloadingAll}
                        downloading={downloadingSceneId === slide.sceneId}
                        onDownload={() => handleDownloadOne(slide.sceneId, slide.filename, slide.label)}
                        onZoom={() => openZoom(index)}
                    />
                ))}
            </div>

            {showVideoStudio && (
            <div className="rounded-2xl border border-violet-500/20 bg-violet-950/10 px-5 py-5 sm:px-6 sm:py-6 mb-6 mt-10">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                    <div>
                        <p className="text-xs font-bold text-violet-400/80 uppercase tracking-widest mb-1">2단계</p>
                        <h2 className="text-lg sm:text-xl font-black text-white">
                            {STUDIO_VIDEO_DURATION_SEC}초 MP4 · BGM 합성
                        </h2>
                        <p className="text-xs sm:text-sm text-white/45 mt-2 leading-relaxed">
                            카드 PNG를 슬라이드쇼로 이어 붙이고, 배경음악은 {STUDIO_VIDEO_DURATION_SEC}초에서
                            잘라 페이드아웃합니다.
                        </p>
                    </div>
                    <button
                        type="button"
                        disabled={buildingVideo || downloadingAll || downloadingSceneId !== null}
                        onClick={handleBuildVideo}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white text-sm font-bold transition-colors shrink-0"
                    >
                        {buildingVideo ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Film className="w-4 h-4" />
                        )}
                        {STUDIO_VIDEO_DURATION_SEC}초 MP4 생성
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                    <div className="flex items-center gap-2 text-white/60 shrink-0">
                        <Music className="w-4 h-4 text-violet-400" />
                        <span className="text-xs font-bold">tomtommusic.mp3</span>
                    </div>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio
                        src={STUDIO_BGM_PATH}
                        controls
                        className="w-full h-9 max-w-md"
                        preload="metadata"
                    />
                    <span className="text-[11px] text-white/35 shrink-0">
                        원본 2:23 → 영상 {STUDIO_VIDEO_DURATION_SEC}초 사용
                    </span>
                </div>

                <div className="mb-5 rounded-xl border border-violet-500/15 bg-violet-950/20 px-4 py-3">
                    <p className="text-[10px] font-bold text-violet-400/70 uppercase tracking-widest mb-1.5">
                        저장 파일명 · 영상 제목
                    </p>
                    <p className="text-sm sm:text-base font-bold text-white/85 break-keep leading-snug" style={{ wordBreak: 'keep-all' }}>
                        {videoTitle}
                    </p>
                    <p className="text-[11px] text-white/35 mt-1.5 font-mono truncate" title={videoFilename}>
                        {videoFilename}
                    </p>
                </div>

                {buildingVideo && videoProgress && (
                    <p className="text-xs text-violet-300/80 mb-4 animate-pulse">{videoProgress}</p>
                )}

                <p className="text-[11px] font-bold text-white/35 uppercase tracking-widest mb-2">
                    타임라인 ({STUDIO_VIDEO_DURATION_SEC}초)
                </p>
                <div className="rounded-xl border border-white/10 overflow-hidden">
                    <div className="grid grid-cols-[72px_1fr_56px_56px] gap-2 px-3 py-2 text-[10px] font-bold text-white/35 border-b border-white/10 bg-white/[0.02]">
                        <span>구간</span>
                        <span>카드</span>
                        <span className="text-right">길이</span>
                        <span className="text-right">시작</span>
                    </div>
                    {slideTimeline.map((item) => (
                        <div
                            key={item.sceneId}
                            className="grid grid-cols-[72px_1fr_56px_56px] gap-2 px-3 py-2 text-[11px] text-white/55 border-b border-white/5 last:border-0"
                        >
                            <span className="text-violet-400/80 font-mono">
                                {formatTimelineSec(item.startSec)}~{formatTimelineSec(item.endSec)}
                            </span>
                            <span className="truncate">{item.label}</span>
                            <span className="text-right font-semibold text-white/70">{item.durationSec}s</span>
                            <span className="text-right font-mono text-white/40">{formatTimelineSec(item.startSec)}</span>
                        </div>
                    ))}
                </div>
            </div>
            )}

            <div className={`rounded-2xl border border-emerald-500/20 bg-emerald-950/10 px-5 py-5 sm:px-6 sm:py-6 mb-6 ${showVideoStudio ? '' : 'mt-10'}`}>
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                        {/* <p className="text-xs font-bold text-emerald-400/80 uppercase tracking-widest mb-1">{showVideoStudio ? '3단계' : '2단계'}</p> */}
                        <h2 className="text-lg sm:text-xl font-black text-white">설명문 · 추천태그</h2>
                        <p className="text-xs sm:text-sm text-white/45 mt-2 leading-relaxed">
                            짧은 설명문과 추천 태그입니다. 커뮤니티 공유 시 복붙 가능합니다. 
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={handleCopyDescription}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-bold transition-colors"
                        >
                            <Copy className="w-4 h-4" />
                            복사
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadDescription}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition-colors"
                        >
                            <FileText className="w-4 h-4" />
                            txt 다운로드
                        </button>
                    </div>
                </div>

                <pre
                    className="whitespace-pre-wrap break-keep rounded-xl border border-white/10 bg-black/25 px-4 py-4 text-sm text-white/80 leading-relaxed font-sans"
                    style={{ wordBreak: 'keep-all' }}
                >
                    {uploadDescription}
                </pre>
            </div>

            <div className="fixed -left-[10000px] top-0 pointer-events-none" aria-hidden>
                {slideMetas.map((slide) => (
                    <StudioSlideCapture
                        key={`capture-${slide.sceneId}`}
                        slide={slide}
                        sceneData={sceneData}
                    />
                ))}
            </div>

            {isZoomOpen && (
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
                                    {activeCarouselSlide ? getSlideTitle(activeCarouselSlide) : ''}
                                </span>
                                <span className="text-[11px] text-white/40">
                                    {carouselIndex + 1} / {slideMetas.length} · PC 화살표 · 모바일 스와이프
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
                                aria-label="이전 카드"
                                className="hidden sm:flex absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-11 h-11 rounded-full bg-black/55 hover:bg-black/75 border border-white/20 text-white disabled:opacity-25 disabled:pointer-events-none transition-all"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button
                                type="button"
                                onClick={goNextCarousel}
                                disabled={carouselIndex >= slideMetas.length - 1}
                                aria-label="다음 카드"
                                className="hidden sm:flex absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-11 h-11 rounded-full bg-black/55 hover:bg-black/75 border border-white/20 text-white disabled:opacity-25 disabled:pointer-events-none transition-all"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>

                            <div
                                ref={zoomScrollRef}
                                onScroll={handleZoomCarouselScroll}
                                className="shorts-zoom-scroll h-full w-full overflow-x-scroll overflow-y-hidden flex snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                                style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain', touchAction: 'pan-x' }}
                            >
                                {slideMetas.map((slide) => (
                                    <div
                                        key={`zoom-${slide.sceneId}`}
                                        className="h-full w-full flex-[0_0_100%] shrink-0 snap-center snap-always flex justify-center items-center px-2 sm:px-4"
                                    >
                                        <div
                                            className="rounded-[24px] sm:rounded-[32px] overflow-hidden border border-white/20 relative shadow-2xl bg-slate-950"
                                            style={{
                                                height: zoomViewerHeight,
                                                width: zoomViewerWidth,
                                            }}
                                        >
                                            <StudioSlidePreviewFrame
                                                slide={slide}
                                                sceneData={sceneData}
                                                zoomScale={zoomScale}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {activeCarouselSlide && (
                            <div className="shrink-0 flex justify-center px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                                <button
                                    type="button"
                                    disabled={downloadingSceneId !== null || downloadingAll}
                                    onClick={() => handleDownloadOne(
                                        activeCarouselSlide.sceneId,
                                        activeCarouselSlide.filename,
                                        activeCarouselSlide.label,
                                    )}
                                    className="px-6 py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-bold flex items-center gap-2 shadow-xl transition-all"
                                >
                                    {downloadingSceneId === activeCarouselSlide.sceneId ? (
                                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                                    ) : (
                                        <ImageDown className="w-4.5 h-4.5" />
                                    )}
                                    이 카드 PNG 다운로드
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
