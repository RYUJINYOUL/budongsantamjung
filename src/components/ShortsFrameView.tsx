'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ShortsDownloadBar from './ShortsDownloadBar';
import ShortsNativeFrames, {
    Scene1Map,
    Scene2AiSummary,
    Scene2_2Valuation,
    Scene3Content,
    Scene4Market,
    Scene5HousingSupply,
    Scene6Population,
    Scene7MustCheck,
} from './shorts/ShortsNativeFrames';
import { Toaster, toast } from 'react-hot-toast';
import { ImageDown, Loader2, ZoomIn, X } from 'lucide-react';
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
}
 
export default function ShortsFrameView({
    ai,
    mergedData,
    category,
    lat,
    lng,
    address,
    analyzeId,
}: ShortsFrameViewProps) {
    const searchParams = useSearchParams();
    const showPreviewUi = searchParams.get('preview') === '1';
    const [fontsReady, setFontsReady] = useState(false);
    const [previewScale, setPreviewScale] = useState(1);
    const [downloadingSceneId, setDownloadingSceneId] = useState<number | null>(null);
    const [activeZoomSceneId, setActiveZoomSceneId] = useState<number | null>(null);
    const [zoomScale, setZoomScale] = useState(0.4);
    const [windowHeight, setWindowHeight] = useState(800);
 
    const sceneData = useMemo(
        () => buildShortsSceneData(ai, mergedData, category, lat, lng, address),
        [ai, mergedData, category, lat, lng, address],
    );
 
    const scenes = useMemo(
        () => getShortsSceneMeta(sceneData.isApartment, analyzeId),
        [sceneData.isApartment, analyzeId],
    );
 
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
 
        const updateScale = () => {
            setWindowHeight(window.innerHeight);
            if (!showPreviewUi) {
                setPreviewScale(1);
                return;
            }
            const pad = 32;
            const maxW = window.innerWidth - pad;
            setPreviewScale(Math.min(1, maxW / SHORTS_WIDTH));
        };
        updateScale();
        window.addEventListener('resize', updateScale);
 
        return () => {
            document.documentElement.removeAttribute('data-shorts-capture');
            window.removeEventListener('resize', updateScale);
        };
    }, [analyzeId, showPreviewUi]);
 
    // 확대보기 줌 스케일 계산
    useEffect(() => {
        if (activeZoomSceneId === null) return;
        const updateZoomScale = () => {
            const targetH = window.innerHeight * 0.8;
            setZoomScale(targetH / SHORTS_HEIGHT);
            setWindowHeight(window.innerHeight);
        };
        updateZoomScale();
        window.addEventListener('resize', updateZoomScale);
        return () => window.removeEventListener('resize', updateZoomScale);
    }, [activeZoomSceneId]);
 
    useEffect(() => {
        if (!fontsReady) return;
        const timer = setTimeout(() => {
            document.documentElement.setAttribute('data-shorts-capture-ready', 'true');
        }, 1200);
        return () => clearTimeout(timer);
    }, [fontsReady]);
 
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
 
    // 각 씬의 메타정보와 컴포넌트를 매핑하는 유틸
    const renderSceneComponent = (sceneId: number) => {
        switch (sceneId) {
            case 1: return <Scene1Map data={sceneData} />;
            case 2: return <Scene2AiSummary data={sceneData} />;
            case 8: return <Scene2_2Valuation data={sceneData} />;
            case 3: return <Scene3Content data={sceneData} />;
            case 4: return <Scene4Market data={sceneData} />;
            case 5: return <Scene5HousingSupply data={sceneData} />;
            case 6: return <Scene6Population data={sceneData} />;
            case 7: return <Scene7MustCheck data={sceneData} />;
            default: return null;
        }
    };

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
                    `}</style>
                </>
            )}

            <div
                className={showPreviewUi ? 'mx-auto w-full px-4 pt-6 pb-44' : 'min-h-0 bg-[#0a0a0c]'}
                data-shorts-ui={showPreviewUi ? 'preview' : 'capture'}
            >
                {showPreviewUi && (
                    <div className="mb-8 px-1 max-w-[1200px] mx-auto">
                        <p className="text-xs font-bold text-sky-400/90 uppercase tracking-widest mb-1">탐정 뷰어</p>
                        <h1 className="text-lg font-black text-white">광고 영상 만들기(네이티브 제작)</h1>
                        <p className="text-[11px] text-white/40 mt-1 leading-relaxed">
                            PC 리포트 축소가 아닌 {SHORTS_WIDTH}×{SHORTS_HEIGHT}px 전용 레이아웃 · 썸네일을 클릭하여 크게 보거나 다운로드할 수 있습니다.
                        </p>
                    </div>
                )}

                {showPreviewUi ? (
                    /* ── [미리보기 모드] 가로 5열 그리드 레이아웃 ── */
                    <div className="shorts-capture-root flex flex-wrap justify-center gap-6 max-w-[1200px] mx-auto">
                        {scenes.map((scene) => (
                            <div key={scene.id} className="flex flex-col items-center gap-2">
                                <div
                                    onClick={() => setActiveZoomSceneId(scene.id)}
                                    className="w-[140px] h-[249px] sm:w-[180px] sm:h-[320px] md:w-[200px] md:h-[356px] relative overflow-hidden rounded-2xl border border-white/10 hover:border-sky-500/50 transition-all cursor-pointer group bg-slate-950 shadow-lg"
                                >
                                    {/* 1080x1920 원본 씬을 반응형 비율로 scale 다운 */}
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

                                    {/* 마우스 호버 시 확대보기 / 다운로드 2개 버튼 분기 노출 */}
                                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-3">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveZoomSceneId(scene.id);
                                            }}
                                            className="w-28 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <ZoomIn className="w-3.5 h-3.5 text-sky-400" />
                                            확대보기
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownloadOne(scene.id, scene.filename, scene.label);
                                            }}
                                            className="w-28 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                        >
                                            {downloadingSceneId === scene.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <ImageDown className="w-3.5 h-3.5" />
                                            )}
                                            다운로드
                                        </button>
                                    </div>
                                </div>
                                <span className="text-[10px] sm:text-xs font-semibold text-white/50">{scene.label}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* ── [캡처 모드] 세로로 길게 쭉 쌓기 (html-to-image 캡처용) ── */
                    <div className="shorts-capture-root flex flex-col items-center gap-0" data-shorts-capture-root="true">
                        <div data-shorts-preview-wrap>
                            <ShortsNativeFrames data={sceneData} />
                        </div>
                    </div>
                )}
            </div>

            {/* ── 🔍 [확대보기 모달] ── */}
            {showPreviewUi && activeZoomSceneId !== null && (() => {
                const activeScene = scenes.find((s) => s.id === activeZoomSceneId);
                return (
                    <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                        <div className="relative flex flex-col items-center gap-5 max-h-[95vh] w-full">
                            {/* 닫기 헤더 영역 */}
                            <div className="flex justify-between items-center w-[calc(80vh*9/16)] max-w-full text-white px-2">
                                <span className="text-sm font-black text-white/80">{activeScene?.label}</span>
                                <button
                                    type="button"
                                    onClick={() => setActiveZoomSceneId(null)}
                                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                                    title="닫기"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* 9:16 비율 뷰어 (높이 화면의 80vh 고정) */}
                            <div
                                className="rounded-[32px] overflow-hidden border border-white/20 relative shadow-2xl bg-slate-950"
                                style={{
                                    height: windowHeight * 0.8,
                                    width: (windowHeight * 0.8) * (SHORTS_WIDTH / SHORTS_HEIGHT),
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
                                    {renderSceneComponent(activeZoomSceneId)}
                                </div>
                            </div>

                            {/* 하단 다운로드 버튼 */}
                            {activeScene && (
                                <button
                                    type="button"
                                    disabled={downloadingSceneId !== null}
                                    onClick={() => handleDownloadOne(activeScene.id, activeScene.filename, activeScene.label)}
                                    className="px-6 py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-bold flex items-center gap-2 shadow-xl transition-all"
                                >
                                    {downloadingSceneId === activeScene.id ? (
                                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                                    ) : (
                                        <ImageDown className="w-4.5 h-4.5" />
                                    )}
                                    이 컷 고화질 다운로드
                                </button>
                            )}
                        </div>
                    </div>
                );
            })()}

            {showPreviewUi && (
                <ShortsDownloadBar analyzeId={analyzeId} isApartment={sceneData.isApartment} />
            )}
        </>
    );
}
