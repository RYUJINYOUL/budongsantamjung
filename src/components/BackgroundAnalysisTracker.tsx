'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, X, Clock, CheckCircle2 } from 'lucide-react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { buildAnalyzeReportHref, getViewingReportId } from '../lib/reportNavigation';

interface ActiveAnalysis {
    id: string;
    address: string;
    category: string;
    startedAt: number;
    status?: 'collecting' | 'completed';
}

/** localStorage에서 목록 읽기 */
function readList(): ActiveAnalysis[] {
    try {
        const stored = localStorage.getItem('active_analyses');
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

/** localStorage에 목록 저장 + storage 이벤트 발행 */
function writeList(list: ActiveAnalysis[]) {
    try {
        localStorage.setItem('active_analyses', JSON.stringify(list));
        window.dispatchEvent(new Event('storage'));
    } catch { /* noop */ }
}

function dismissItem(id: string) {
    const updated = readList().filter(a => a.id !== id);
    writeList(updated);
    return updated;
}

/** legacy wrapper — apartment ?reportId= 포함 */
function getCurrentReportId(pathname: string, reportIdParam: string | null): string | null {
    return getViewingReportId(pathname, reportIdParam);
}

/** 서버에 reportId 상태 조회 */
async function checkReportStatus(id: string, idToken?: string): Promise<'pending' | 'finished' | 'not_found' | 'error'> {
    try {
        const headers: HeadersInit = idToken ? { Authorization: `Bearer ${idToken}` } : {};
        const res = await fetch(`/api/land/detective/report/${id}`, { headers });
        if (res.status === 404 || res.status === 403) return 'not_found';
        if (!res.ok) return 'error';
        const data = await res.json();
        const status = data.report?.ai_analysis_status || data.ai_analysis_status;
        const hasRawData = !!data.rawData;
        if (status === 'completed' || status === 'failed' || (status === 'pending' && hasRawData)) {
            return 'finished';
        }
        return 'pending';
    } catch {
        return 'error';
    }
}

interface BackgroundAnalysisTrackerProps {
    embedded?: boolean;
}

export default function BackgroundAnalysisTracker({ embedded = false }: BackgroundAnalysisTrackerProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentReportId = getCurrentReportId(pathname, searchParams.get('reportId'));
    const [analyses, setAnalyses] = useState<ActiveAnalysis[]>([]);
    const [ready, setReady] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [tick, setTick] = useState(0);
    const watchedIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
        return unsubscribe;
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function initialSync() {
            const list = readList();
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

            const synced: ActiveAnalysis[] = [];
            for (const item of list) {
                if (item.status === 'completed') {
                    synced.push(item);
                    continue;
                }

                const reportStatus = await checkReportStatus(item.id, idToken);
                if (reportStatus === 'not_found') continue;
                if (reportStatus === 'finished') {
                    synced.push({ ...item, status: 'completed' });
                } else if (reportStatus === 'pending' || reportStatus === 'error') {
                    synced.push(item);
                }
            }

            if (cancelled) return;

            writeList(synced);
            setAnalyses(synced);
            setReady(true);
        }

        initialSync();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const onStorage = () => {
            if (!ready) return;
            setAnalyses(readList());
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, [ready]);

    useEffect(() => {
        if (!ready || analyses.length === 0) return;
        const id = setInterval(() => setTick(t => t + 1), 1000);
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

            let updatedList = [...readList()];
            let changed = false;

            for (let i = 0; i < updatedList.length; i++) {
                const item = updatedList[i];
                if (item.status === 'completed') continue;

                const reportStatus = await checkReportStatus(item.id, idToken);

                if (reportStatus === 'error') continue;

                if (reportStatus === 'not_found') {
                    updatedList.splice(i, 1);
                    i--;
                    changed = true;
                    watchedIds.current.delete(item.id);
                    continue;
                }

                if (reportStatus === 'finished') {
                    updatedList[i] = { ...item, status: 'completed' };
                    watchedIds.current.delete(item.id);
                    changed = true;
                } else {
                    watchedIds.current.add(item.id);
                }
            }

            if (changed && isMounted) {
                writeList(updatedList);
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
        setAnalyses(dismissItem(id));
    };

    const handleOpenReport = (item: ActiveAnalysis) => {
        router.push(buildAnalyzeReportHref(item.id));
        watchedIds.current.delete(item.id);
        setAnalyses(dismissItem(item.id));
    };

    // 현재 보고 있는 리포트 페이지의 카드는 표시하지 않음 (페이지에서 이미 확인 중)
    const visibleAnalyses = analyses.filter(
        (item) => String(item.id) !== String(currentReportId)
    );

    if (!ready || visibleAnalyses.length === 0) return null;

    const cards = visibleAnalyses.map(item => {
                const categoryLabel =
                    item.category === 'apartment' ? '아파트' :
                    item.category === 'house' ? '주택' :
                    item.category === 'store' ? '상가' :
                    item.category === 'building' ? '빌딩' : '토지';

                const isCompleted = item.status === 'completed';
                const isWatched = watchedIds.current.has(item.id);

                const elapsed = item.startedAt
                    ? Math.min(100, Math.floor((Date.now() - item.startedAt) / 1000))
                    : 0;
                const elapsedMin = Math.floor(elapsed / 60);
                const elapsedSec = elapsed % 60;

                return (
                    <div
                        key={item.id}
                        onClick={isCompleted ? () => handleOpenReport(item) : undefined}
                        className={`backdrop-blur-xl border p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-start gap-3.5 transition-all group ${
                            isCompleted
                                ? 'bg-emerald-950/90 border-emerald-500/30 hover:bg-emerald-900/95 cursor-pointer'
                                : 'bg-slate-900/90 border-white/10 cursor-default'
                        }`}
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative ${
                            isCompleted
                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                                : 'bg-sky-500/10 border border-sky-500/20 text-sky-400'
                        }`}>
                            {!isCompleted && (
                                <div className="absolute inset-0 border border-sky-500/40 rounded-xl animate-ping opacity-60" />
                            )}
                            {isCompleted
                                ? <CheckCircle2 className="w-5 h-5" />
                                : <Search className="w-5 h-5 animate-pulse" />
                            }
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                    isCompleted
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                }`}>
                                    {categoryLabel}
                                </span>
                                <span className={`text-[10px] font-medium ${
                                    isCompleted ? 'text-emerald-400' : 'text-slate-400'
                                }`}>
                                    {isCompleted ? '수집 완료' : (isWatched ? '수집 중...' : '검토 중')}
                                </span>
                            </div>
                            <p className="text-xs font-bold text-white truncate pr-4">
                                {item.address}
                            </p>
                            {!isCompleted && isWatched && (
                                <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {elapsedMin > 0 ? `${elapsedMin}분 ` : ''}{elapsedSec}초 진행 중 · 완료 후 확인 가능
                                </p>
                            )}
                            {!isCompleted && !isWatched && (
                                <p className="text-[10px] text-slate-500 mt-1">
                                    상태 확인 중 · 완료 후 카드를 눌러 확인하세요
                                </p>
                            )}
                            {isCompleted && (
                                <p className="text-[10px] text-emerald-400/80 mt-1">
                                    리포트를 확인하려면 카드를 누르세요
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
