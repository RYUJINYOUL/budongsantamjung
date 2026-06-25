'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ShortsDownloadBar from './ShortsDownloadBar';
import ShortsNativeFrames from './shorts/ShortsNativeFrames';
import { Toaster } from 'react-hot-toast';
import { buildShortsSceneData, SHORTS_HEIGHT, SHORTS_WIDTH } from '../lib/shortsSceneData';

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

    const sceneData = useMemo(
        () => buildShortsSceneData(ai, mergedData, category, lat, lng, address),
        [ai, mergedData, category, lat, lng, address],
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

    useEffect(() => {
        if (!fontsReady) return;
        const timer = setTimeout(() => {
            document.documentElement.setAttribute('data-shorts-capture-ready', 'true');
        }, 1200);
        return () => clearTimeout(timer);
    }, [fontsReady]);

    return (
        <>
            {showPreviewUi && (
                <Toaster position="top-center" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
            )}

            <div
                className={showPreviewUi ? 'mx-auto w-full px-4 pt-6 pb-44' : 'min-h-0 bg-[#0a0a0c]'}
                data-shorts-ui={showPreviewUi ? 'preview' : 'capture'}
            >
                {showPreviewUi && (
                    <div className="mb-8 px-1 max-w-[1080px] mx-auto">
                        <p className="text-xs font-bold text-sky-400/90 uppercase tracking-widest mb-1">Shorts Native</p>
                        <h1 className="text-lg font-black text-white">쇼츠 전용 7컷 (네이티브 제작)</h1>
                        <p className="text-[11px] text-white/40 mt-1 leading-relaxed">
                            PC 리포트 축소가 아닌 {SHORTS_WIDTH}×{SHORTS_HEIGHT}px 전용 레이아웃 · 다운로드 PNG도 동일 크기
                        </p>
                    </div>
                )}

                <div
                    className={
                        showPreviewUi
                            ? 'shorts-capture-root flex flex-col items-center gap-12'
                            : 'shorts-capture-root flex flex-col items-center gap-0'
                    }
                    data-shorts-capture-root="true"
                >
                    <div
                        data-shorts-preview-wrap
                        style={
                            showPreviewUi && previewScale < 1
                                ? {
                                      transform: `scale(${previewScale})`,
                                      transformOrigin: 'top center',
                                      marginBottom: -(SHORTS_HEIGHT * (1 - previewScale)),
                                  }
                                : undefined
                        }
                    >
                        <ShortsNativeFrames data={sceneData} />
                    </div>
                </div>
            </div>

            {showPreviewUi && (
                <ShortsDownloadBar analyzeId={analyzeId} isApartment={sceneData.isApartment} />
            )}
        </>
    );
}
