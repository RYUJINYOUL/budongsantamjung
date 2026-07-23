'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { X, Clock, CheckCircle2, Sparkles } from 'lucide-react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { AI_ANALYSIS_STEPS, getAiStepIndexFromElapsed } from '../lib/aiAnalysisSteps';
import {
    ActiveAiAnalysis,
    buildAiReportHref,
    dismissActiveAiAnalysis,
    getViewingReportId,
    readActiveAiAnalyses,
    writeActiveAiAnalyses,
} from '../lib/activeAiAnalyses';

async function checkAiAnalysisStatus(
    id: string,
    idToken?: string,
): Promise<'analyzing' | 'completed' | 'failed' | 'not_found' | 'error'> {
    try {
        const headers: HeadersInit = idToken ? { Authorization: `Bearer ${idToken}` } : {};
        const res = await fetch(`/api/land/detective/report/${id}`, { headers });
        if (res.status === 404 || res.status === 403) return 'not_found';
        if (!res.ok) return 'error';
        const data = await res.json();
        const status = data.report?.ai_analysis_status || data.ai_analysis_status;
        if (status === 'completed') return 'completed';
        if (status === 'failed') return 'failed';
        return 'analyzing';
    } catch {
        return 'error';
    }
}

interface BackgroundAiAnalysisTrackerProps {
    embedded?: boolean;
}

export default function BackgroundAiAnalysisTracker({ embedded = false }: BackgroundAiAnalysisTrackerProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const viewingReportId = getViewingReportId(pathname, searchParams.get('reportId'));
    const [analyses, setAnalyses] = useState<ActiveAiAnalysis[]>([]);
    const [ready, setReady] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [, setTick] = useState(0);
    const watchedIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
        return unsubscribe;
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function initialSync() {
            const list = readActiveAiAnalyses();
            if (list.length === 0) {
                setReady(true);
                return;
            }

            let idToken: string | undefined;
            try {
                if (auth.currentUser) {
                    idToken = await auth.currentUser.getIdToken();
                }
            } catch { /* noop */ }

            const synced: ActiveAiAnalysis[] = [];
            for (const item of list) {
                if (item.status === 'completed' || item.status === 'failed') {
                    synced.push(item);
                    continue;
                }

                const reportStatus = await checkAiAnalysisStatus(item.id, idToken);
                if (reportStatus === 'not_found') continue;
                if (reportStatus === 'completed') {
                    synced.push({ ...item, status: 'completed' });
                } else if (reportStatus === 'failed') {
                    synced.push({ ...item, status: 'failed' });
                } else {
                    synced.push(item);
                }
            }

            if (cancelled) return;
            writeActiveAiAnalyses(synced);
            setAnalyses(synced);
            setReady(true);
        }

        initialSync();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const onChange = () => {
            if (!ready) return;
            setAnalyses(readActiveAiAnalyses());
        };
        window.addEventListener('active-ai-analyses-changed', onChange);
        window.addEventListener('storage', onChange);
        return () => {
            window.removeEventListener('active-ai-analyses-changed', onChange);
            window.removeEventListener('storage', onChange);
        };
    }, [ready]);

    useEffect(() => {
        if (!ready || analyses.length === 0) return;
        const id = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, [ready, analyses.length]);

    useEffect(() => {
        if (!ready || analyses.length === 0) return;

        let isMounted = true;

        const interval = setInterval(async () => {
            let idToken: string | undefined;
            try {
                if (user) idToken = await user.getIdToken();
            } catch { /* noop */ }

            let updatedList = [...readActiveAiAnalyses()];
            let changed = false;

            for (let i = 0; i < updatedList.length; i++) {
                const item = updatedList[i];
                if (item.status === 'completed' || item.status === 'failed') continue;

                const reportStatus = await checkAiAnalysisStatus(item.id, idToken);
                if (reportStatus === 'error') continue;

                if (reportStatus === 'not_found') {
                    updatedList.splice(i, 1);
                    i--;
                    changed = true;
                    watchedIds.current.delete(item.id);
                    continue;
                }

                if (reportStatus === 'completed') {
                    updatedList[i] = { ...item, status: 'completed' };
                    watchedIds.current.delete(item.id);
                    changed = true;
                } else if (reportStatus === 'failed') {
                    updatedList[i] = { ...item, status: 'failed' };
                    watchedIds.current.delete(item.id);
                    changed = true;
                } else {
                    watchedIds.current.add(item.id);
                }
            }

            if (changed && isMounted) {
                writeActiveAiAnalyses(updatedList);
                setAnalyses(updatedList);
            }
        }, 5000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [ready, analyses, user]);

    const handleDismiss = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        watchedIds.current.delete(id);
        dismissActiveAiAnalysis(id);
        setAnalyses(readActiveAiAnalyses());
    };

    const handleOpenReport = (item: ActiveAiAnalysis) => {
        router.push(buildAiReportHref(item));
        watchedIds.current.delete(item.id);
        dismissActiveAiAnalysis(item.id);
        setAnalyses(readActiveAiAnalyses());
    };

    const visibleAnalyses = analyses.filter(
        (item) => String(item.id) !== String(viewingReportId),
    );

    if (!ready || visibleAnalyses.length === 0) return null;

    const cards = visibleAnalyses.map((item) => {
        const isCompleted = item.status === 'completed';
        const isFailed = item.status === 'failed';
        const isAnalyzing = !isCompleted && !isFailed;
        const isWatched = watchedIds.current.has(item.id);

        const elapsed = item.startedAt
            ? Math.floor((Date.now() - item.startedAt) / 1000)
            : 0;
        const elapsedMin = Math.floor(elapsed / 60);
        const elapsedSec = elapsed % 60;
        const stepIndex = item.currentStep ?? getAiStepIndexFromElapsed(elapsed);
        const currentStep = AI_ANALYSIS_STEPS[Math.min(stepIndex, AI_ANALYSIS_STEPS.length - 1)];

        return (
            <div
                key={item.id}
                onClick={isCompleted ? () => handleOpenReport(item) : undefined}
                className={`backdrop-blur-xl border p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-start gap-3.5 transition-all group ${
                    isCompleted
                        ? 'bg-emerald-950/90 border-emerald-500/30 hover:bg-emerald-900/95 cursor-pointer'
                        : isFailed
                        ? 'bg-red-950/90 border-red-500/30 cursor-default'
                        : 'bg-violet-950/90 border-violet-500/25 cursor-default'
                }`}
            >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative overflow-hidden ${
                    isCompleted
                        ? 'bg-emerald-500/10 border border-emerald-500/30'
                        : isFailed
                        ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                        : 'bg-violet-500/10 border border-violet-500/25'
                }`}>
                    {!isCompleted && !isFailed && (
                        <div className="absolute inset-0 border border-violet-400/40 rounded-xl animate-ping opacity-60" />
                    )}
                    {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : isFailed ? (
                        <X className="w-5 h-5 text-red-400" />
                    ) : currentStep?.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={currentStep.icon} alt="" className="w-6 h-6 object-contain relative z-10" />
                    ) : (
                        <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            isCompleted
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : isFailed
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : 'bg-violet-500/10 text-violet-300 border-violet-500/20'
                        }`}>
                            AI 분석
                        </span>
                        <span className={`text-[10px] font-medium ${
                            isCompleted ? 'text-emerald-400' : isFailed ? 'text-red-400' : 'text-violet-300/80'
                        }`}>
                            {isCompleted ? '분석 완료' : isFailed ? '분석 실패' : (isWatched ? '분석 중...' : '연결 중...')}
                        </span>
                    </div>
                    <p className="text-xs font-bold text-white truncate pr-4">
                        {item.address}
                    </p>
                    {isAnalyzing && isWatched && currentStep && (
                        <p className="text-[10px] text-violet-300/70 mt-1 truncate">
                            {currentStep.label}
                        </p>
                    )}
                    {isAnalyzing && isWatched && (
                        <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {elapsedMin > 0 ? `${elapsedMin}분 ` : ''}{elapsedSec}초 · 완료 후 확인 가능
                        </p>
                    )}
                    {isAnalyzing && !isWatched && (
                        <p className="text-[10px] text-slate-500 mt-1">
                            서버 연결 중 · 완료되면 알려드립니다
                        </p>
                    )}
                    {isCompleted && (
                        <p className="text-[10px] text-emerald-400/80 mt-1">
                            AI 리포트를 확인하려면 카드를 누르세요
                        </p>
                    )}
                    {isFailed && (
                        <p className="text-[10px] text-red-400/80 mt-1">
                            분석에 실패했습니다. 다시 시도해 주세요
                        </p>
                    )}
                </div>

                {isCompleted ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenReport(item);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 transition-colors shrink-0"
                    >
                        보기
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={(e) => handleDismiss(item.id, e)}
                        className="p-1 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        );
    });

    if (embedded) {
        return <>{cards}</>;
    }

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-auto">
            {cards}
        </div>
    );
}
