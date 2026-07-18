'use client';

import { useCallback, useMemo, useState } from 'react';
import { Download, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    downloadAllScenePngs,
    downloadScenePng,
    getShortsSceneMeta,
    SHORTS_WIDTH,
    SHORTS_HEIGHT,
} from '../lib/shortsFrameDownload';
import type { TenYearStorySummary } from '../lib/shortsSceneData';
import {
    buildTenYearStudioSlideMetas,
    hasTenYearStudioContent,
} from '../lib/shortsTenYearQuarters';

interface ShortsDownloadBarProps {
    analyzeId?: string | number;
    isApartment: boolean;
    tenYearStory?: TenYearStorySummary | null;
    activeTab?: 'cards' | 'studio';
    locationLabel?: string;
}

export default function ShortsDownloadBar({
    analyzeId,
    isApartment,
    tenYearStory,
    activeTab = 'cards',
    locationLabel,
}: ShortsDownloadBarProps) {
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState<string | null>(null);

    const isStudioTab = activeTab === 'studio';

    const cardScenes = useMemo(
        () => getShortsSceneMeta(isApartment, analyzeId, { tenYearStory }),
        [isApartment, tenYearStory, analyzeId],
    );

    const studioSlides = useMemo(
        () => buildTenYearStudioSlideMetas(tenYearStory, analyzeId, locationLabel),
        [tenYearStory, analyzeId, locationLabel],
    );

    const hasStudioSlides = isApartment && hasTenYearStudioContent(tenYearStory) && studioSlides.length > 0;

    const handleDownloadAllCards = useCallback(async () => {
        setDownloading(true);
        setProgress('준비 중...');
        try {
            await document.fonts?.ready;
            await new Promise((r) => setTimeout(r, 300));

            const { ok, failed } = await downloadAllScenePngs(cardScenes, (cur, total, label) => {
                setProgress(`${cur}/${total} ${label}`);
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
            setDownloading(false);
            setProgress(null);
        }
    }, [cardScenes]);

    const handleBuildStudioShorts = useCallback(async () => {
        if (!hasStudioSlides) return;

        setDownloading(true);
        setProgress('준비 중...');
        let ok = 0;
        let failed = 0;
        try {
            await document.fonts?.ready;
            await new Promise((r) => setTimeout(r, 300));

            for (let i = 0; i < studioSlides.length; i++) {
                const slide = studioSlides[i]!;
                setProgress(`${i + 1}/${studioSlides.length} ${slide.label}`);
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
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : '다운로드 실패';
            toast.error(message);
        } finally {
            setDownloading(false);
            setProgress(null);
        }
    }, [hasStudioSlides, studioSlides]);

    const sceneCount = isStudioTab ? studioSlides.length : cardScenes.length;
    const title = isStudioTab ? '쇼츠 제작' : '프레임 검토';

    return (
        <div
            className="fixed bottom-0 inset-x-0 z-[100] border-t border-white/10 bg-[#0a0a0c]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
            data-shorts-download-bar="true"
        >
            <div className="mx-auto max-w-[1080px] px-4 py-3 flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-white">{title}</p>
                        <p className="text-[11px] text-white/45 truncate">
                            #{analyzeId ?? '-'} · {sceneCount}컷 · {SHORTS_WIDTH}×{SHORTS_HEIGHT} (9:16)
                        </p>
                    </div>
                    {isStudioTab ? (
                        <button
                            type="button"
                            disabled={downloading || !hasStudioSlides}
                            onClick={handleBuildStudioShorts}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors shrink-0"
                        >
                            {downloading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Sparkles className="w-4 h-4" />
                            )}
                            쇼츠 만들기
                        </button>
                    ) : (
                        <button
                            type="button"
                            disabled={downloading}
                            onClick={handleDownloadAllCards}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors shrink-0"
                        >
                            {downloading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            전체 {cardScenes.length}장 다운로드
                        </button>
                    )}
                </div>

                {progress && (
                    <p className="text-[10px] text-sky-300/80 font-medium">{progress}</p>
                )}
            </div>
        </div>
    );
}
