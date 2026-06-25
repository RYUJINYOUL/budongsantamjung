'use client';

import { useCallback, useMemo, useState } from 'react';
import { Download, Loader2, ImageDown } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    downloadAllScenePngs,
    downloadScenePng,
    getShortsSceneMeta,
    SCENE_COUNT,
    SHORTS_WIDTH,
    SHORTS_HEIGHT,
} from '../lib/shortsFrameDownload';

interface ShortsDownloadBarProps {
    analyzeId?: string | number;
    isApartment: boolean;
}

export default function ShortsDownloadBar({ analyzeId, isApartment }: ShortsDownloadBarProps) {
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState<string | null>(null);

    const scenes = useMemo(
        () => getShortsSceneMeta(isApartment, analyzeId),
        [isApartment, analyzeId],
    );

    const handleDownloadAll = useCallback(async () => {
        setDownloading(true);
        setProgress('준비 중...');
        try {
            await document.fonts?.ready;
            await new Promise((r) => setTimeout(r, 300));

            const { ok, failed } = await downloadAllScenePngs(scenes, (cur, total, label) => {
                setProgress(`${cur}/${total} ${label}`);
            });

            if (failed === 0) {
                toast.success(`${ok}장 PNG 다운로드 완료`);
            } else {
                toast.error(`${ok}장 성공, ${failed}장 실패 (지도 CORS 등 확인)`);
            }
        } catch (err: any) {
            toast.error(err?.message || '다운로드 실패');
        } finally {
            setDownloading(false);
            setProgress(null);
        }
    }, [scenes]);

    const handleDownloadOne = useCallback(async (sceneId: number, filename: string, label: string) => {
        setDownloading(true);
        setProgress(label);
        try {
            await document.fonts?.ready;
            await downloadScenePng(sceneId, filename);
            toast.success(`${label} 저장됨`);
        } catch (err: any) {
            toast.error(err?.message || `${label} 저장 실패`);
        } finally {
            setDownloading(false);
            setProgress(null);
        }
    }, []);

    return (
        <div
            className="fixed bottom-0 inset-x-0 z-[100] border-t border-white/10 bg-[#0a0a0c]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
            data-shorts-download-bar="true"
        >
            <div className="mx-auto max-w-[1080px] px-4 py-3 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-white">쇼츠 프레임 검토</p>
                        <p className="text-[11px] text-white/45 truncate">
                            #{analyzeId ?? '-'} · {SCENE_COUNT}컷 · {SHORTS_WIDTH}×{SHORTS_HEIGHT} (9:16)
                        </p>
                    </div>
                    <button
                        type="button"
                        disabled={downloading}
                        onClick={handleDownloadAll}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors shrink-0"
                    >
                        {downloading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        전체 {SCENE_COUNT}장 다운로드
                    </button>
                </div>

                <div className="flex flex-wrap gap-2">
                    {scenes.map((scene) => (
                        <button
                            key={scene.id}
                            type="button"
                            disabled={downloading}
                            onClick={() => handleDownloadOne(scene.id, scene.filename, scene.label)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40 text-[11px] font-semibold text-white/80 transition-colors"
                        >
                            <ImageDown className="w-3.5 h-3.5 text-sky-400" />
                            {scene.label}
                        </button>
                    ))}
                </div>

                {progress && (
                    <p className="text-[10px] text-sky-300/80 font-medium">{progress}</p>
                )}
            </div>
        </div>
    );
}
