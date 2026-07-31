'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Download, ImageDown, Loader2, ZoomIn, X } from 'lucide-react';
import {
  buildCompareMetricCards,
  type CompareMetricCard,
} from '../lib/apartmentCompareMomentumBreakdown';
import type { CompareScoringItem } from '../lib/apartmentCompareScoring';
import {
  computeShortsZoomScale,
  computeShortsZoomScaleFromViewport,
  SHORTS_HEIGHT,
  SHORTS_WIDTH,
} from '../lib/shortsSceneData';
import {
  downloadAllScenePngs,
  downloadScenePng,
} from '../lib/shortsFrameDownload';
import { getCompareScoreSceneMeta } from '../lib/compareScoreCardScenes';
import { COMPARE_SCORE_COVER_SCENE_ID, type CompareScoreCoverContext } from '../lib/compareScoreCoverCard';
import { CompareScoreCoverScene, CompareScoreMetricScene } from './compare/CompareScoreNativeFrames';

interface CompareScoreFrameViewProps {
  items: CompareScoringItem[];
  filenamePrefix?: string;
  cover?: CompareScoreCoverContext | null;
  onClose?: () => void;
}

export default function CompareScoreFrameView({
  items,
  filenamePrefix,
  cover,
  onClose,
}: CompareScoreFrameViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showPreviewUi = searchParams.get('preview') === '1';

  const [fontsReady, setFontsReady] = useState(false);
  const [downloadingSceneId, setDownloadingSceneId] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [zoomScale, setZoomScale] = useState(0.4);
  const zoomScrollRef = useRef<HTMLDivElement>(null);
  const zoomStageRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef(false);

  const { metricCards, hasAnyScore } = useMemo(() => buildCompareMetricCards(items), [items]);

  const scenes = useMemo(
    () => getCompareScoreSceneMeta(metricCards, filenamePrefix, cover),
    [metricCards, filenamePrefix, cover],
  );

  const cardBySceneId = useMemo(() => {
    const map = new Map<number, CompareMetricCard>();
    metricCards.forEach((card) => {
      const scene = scenes.find((s) => s.key === card.metric.key);
      if (scene) map.set(scene.id, card);
    });
    return map;
  }, [metricCards, scenes]);

  const updateZoomScale = useCallback(() => {
    const stage = zoomStageRef.current;
    if (stage && stage.clientWidth > 0 && stage.clientHeight > 0) {
      setZoomScale(computeShortsZoomScale(stage.clientWidth, stage.clientHeight));
      return;
    }
    setZoomScale(computeShortsZoomScaleFromViewport());
  }, []);

  const zoomViewerHeight = SHORTS_HEIGHT * zoomScale;
  const zoomViewerWidth = SHORTS_WIDTH * zoomScale;

  useEffect(() => {
    document.documentElement.setAttribute('data-compare-score-capture', '1');
    document.title = '단지 비교 · 점수 카드';

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
      document.documentElement.removeAttribute('data-compare-score-capture');
    };
  }, []);

  useEffect(() => {
    if (!fontsReady) return;
    const timer = setTimeout(() => {
      document.documentElement.setAttribute('data-compare-score-capture-ready', 'true');
    }, 1200);
    return () => clearTimeout(timer);
  }, [fontsReady]);

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

  useLayoutEffect(() => {
    if (!isZoomOpen) return;

    updateZoomScale();
    const stage = zoomStageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      updateZoomScale();
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [isZoomOpen, updateZoomScale]);

  useEffect(() => {
    if (!showPreviewUi || !isZoomOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showPreviewUi, isZoomOpen]);

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
      requestAnimationFrame(() => {
        updateZoomScale();
        scrollToCarouselIndex(idx >= 0 ? idx : 0, 'auto');
      });
    });
  };

  const closeZoom = () => setIsZoomOpen(false);

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
  };

  const handleDownloadAll = async () => {
    if (downloadingAll || downloadingSceneId !== null) return;
    setDownloadingAll(true);
    setDownloadProgress('준비 중…');
    try {
      await document.fonts?.ready;
      await new Promise((r) => setTimeout(r, 300));
      const { ok, failed } = await downloadAllScenePngs(scenes, (cur, total, label) => {
        setDownloadProgress(`${cur}/${total} ${label}`);
      });
      if (failed === 0) {
        toast.success(`${ok}장 PNG 다운로드 완료`);
      } else {
        toast.error(`${ok}장 성공, ${failed}장 실패`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '다운로드 실패';
      toast.error(message);
    } finally {
      setDownloadingAll(false);
      setDownloadProgress(null);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.replace('/compare/apartments');
  };

  const renderScene = (sceneId: number) => {
    if (sceneId === COMPARE_SCORE_COVER_SCENE_ID && cover) {
      return <CompareScoreCoverScene cover={cover} />;
    }
    const card = cardBySceneId.get(sceneId);
    if (!card) return null;
    return <CompareScoreMetricScene card={card} />;
  };

  const activeCarouselScene = scenes[carouselIndex];

  if (!hasAnyScore || metricCards.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <p className="text-white font-bold mb-2">점수 카드를 만들 수 없습니다</p>
          <p className="text-white/45 text-sm mb-6">비교 점수 데이터가 없습니다.</p>
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-bold"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {showPreviewUi && (
        <>
          <Toaster position="top-center" toastOptions={{ style: { background: '#1e293b', color: '#fff', zIndex: 9999 } }} />
          <style>{`
            :root {
              --shorts-scale: 0.1296;
            }
            @media (min-width: 640px) {
              :root {
                --shorts-scale: 0.1667;
              }
            }
            @media (min-width: 768px) {
              :root {
                --shorts-scale: 0.1852;
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
        data-compare-score-ui={showPreviewUi ? 'preview' : 'capture'}
      >
        {showPreviewUi && (
          <div className="mb-4 sm:mb-6 max-w-[1200px] mx-auto">
            <div className="flex items-start justify-between gap-3 sm:gap-4 mb-4">
              <div className="min-w-0">
                <h1 className="text-lg font-black text-white">간편 카드 보기</h1>
                <p className="text-[11px] text-white/40 mt-1 leading-relaxed">
                  종합 점수 내역 · 카드 클릭 후 확대 · 좌우 스크롤 · PNG 다운로드
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="shrink-0 group flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/80 hover:text-white transition-all text-xs font-bold shadow-lg"
              >
                <X className="w-4 h-4 text-white/60 group-hover:text-white group-hover:scale-110 transition-all" />
                닫기
              </button>
            </div>
          </div>
        )}

        {showPreviewUi ? (
          <div className="shorts-capture-root flex flex-wrap justify-center gap-4 sm:gap-6 max-w-[1200px] mx-auto w-full">
            {scenes.map((scene) => (
              <div key={scene.id} className="flex flex-col items-center gap-2">
                <div
                  onClick={() => openZoom(scene.id)}
                  className="w-[140px] h-[249px] sm:w-[180px] sm:h-[320px] md:w-[200px] md:h-[356px] relative overflow-hidden rounded-2xl border border-white/10 hover:border-emerald-500/50 transition-all cursor-pointer group bg-slate-950 shadow-lg"
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
                    {renderScene(scene.id)}
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
                      <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
                      확대보기
                    </span>
                    <ZoomIn className="w-4 h-4 text-emerald-300 sm:hidden" />
                  </button>
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-white/50 text-center max-w-[140px] sm:max-w-none leading-tight">
                  {scene.label}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="compare-score-capture-root flex flex-col items-center gap-0" data-compare-score-capture-root="true">
            <div data-shorts-preview-wrap>
              {cover && <CompareScoreCoverScene cover={cover} />}
              {metricCards.map((card) => (
                <CompareScoreMetricScene key={card.metric.key} card={card} />
              ))}
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

            <div ref={zoomStageRef} className="relative flex-1 min-h-0 min-w-0 w-full">
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
                    id={`compare-zoom-slide-${scene.id}`}
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
                        {renderScene(scene.id)}
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
                  disabled={downloadingSceneId !== null || downloadingAll}
                  onClick={() => handleDownloadOne(
                    activeCarouselScene.id,
                    activeCarouselScene.filename,
                    activeCarouselScene.label,
                  )}
                  className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 text-sm font-bold flex items-center gap-2 shadow-xl transition-all"
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

      {showPreviewUi && !isZoomOpen && (
        <div className="fixed bottom-0 inset-x-0 z-[100] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/95 to-transparent">
          <div className="max-w-lg mx-auto">
            <button
              type="button"
              disabled={downloadingAll || downloadingSceneId !== null}
              onClick={handleDownloadAll}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 text-sm font-black flex items-center justify-center gap-2 shadow-xl transition-all"
            >
              {downloadingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {downloadProgress ?? `전체 ${scenes.length}장 PNG 다운로드`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
