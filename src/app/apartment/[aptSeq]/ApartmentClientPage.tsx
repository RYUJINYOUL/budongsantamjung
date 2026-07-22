'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import AnalysisDetailPage, {
    type EmbeddedApartmentReport,
} from '../../analyze/[...slug]/AnalysisClientPage';

function resolveGroupKey(aptSeq: string, pnu?: string | null) {
    if (aptSeq === 'pnu' && pnu) return `pnu:${encodeURIComponent(pnu)}`;
    if (aptSeq && aptSeq !== 'pnu') return `apt:${aptSeq}`;
    if (pnu) return `pnu:${encodeURIComponent(pnu)}`;
    return `apt:${aptSeq}`;
}

async function buildAuthHeaders(): Promise<Record<string, string>> {
    const user = auth.currentUser;
    if (!user) return {};
    try {
        const idToken = await user.getIdToken();
        return { Authorization: `Bearer ${idToken}` };
    } catch {
        return {};
    }
}

export default function ApartmentClientPage({ aptSeq }: { aptSeq: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pnu = searchParams.get('pnu');
    const reportIdParam = searchParams.get('reportId');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [aiReports, setAiReports] = useState<EmbeddedApartmentReport[]>([]);
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const [aptName, setAptName] = useState('아파트 단지');
    const [initialReportData, setInitialReportData] = useState<any>(null);

    const redirectToLogin = useCallback(() => {
        const returnUrl = typeof window !== 'undefined'
            ? `${window.location.pathname}${window.location.search}`
            : '/';
        router.replace(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
    }, [router]);

    const prefetchReportDetail = useCallback(async (
        reportId: string,
        headers: Record<string, string>,
    ) => {
        const detailRes = await fetch(`/api/land/detective/report/${reportId}`, { headers });
        if (detailRes.status === 403) {
            redirectToLogin();
            return null;
        }
        if (!detailRes.ok) return null;
        return detailRes.json();
    }, [redirectToLogin]);

    const loadReports = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const headers = await buildAuthHeaders();
            const groupKey = resolveGroupKey(aptSeq, pnu);
            const encoded = encodeURIComponent(groupKey);

            const res = await fetch(
                `/api/land/detective/apartment-groups/${encoded}/reports?aiCompletedOnly=1`,
                { headers },
            );

            let completedList: EmbeddedApartmentReport[] = [];
            let latestForTabs: string | null = null;
            let latestCompleted: string | null = null;
            let groupAptName = '아파트 단지';

            if (res.ok) {
                const data = await res.json();
                completedList = data.reports || [];
                latestForTabs = data.latestReportId ?? null;
                latestCompleted = data.latestCompletedReportId ?? null;
                groupAptName = data.aptName || completedList[0]?.bldNm || groupAptName;
            }

            const reportInList = reportIdParam && completedList.some((r) => r.id === reportIdParam);
            const initialId = reportIdParam && (reportIdParam === latestForTabs || reportInList)
                ? reportIdParam
                : (latestCompleted || latestForTabs || reportIdParam);

            // URL reportId 직접 접근(공유 링크·시크릿): public 리포트는 비로그인 조회
            if (reportIdParam && !reportInList && !latestForTabs && completedList.length === 0) {
                const detailData = await prefetchReportDetail(reportIdParam, headers);
                if (detailData) {
                    setInitialReportData(detailData);
                    setSelectedReportId(reportIdParam);
                    setAptName(
                        detailData.report?.bld_nm
                        || detailData.report?.propertyTitle
                        || groupAptName,
                    );
                    setAiReports([]);
                    return;
                }
            }

            if (!latestForTabs && completedList.length === 0 && !reportIdParam) {
                setAiReports([]);
                setError('이 단지의 분석 이력이 없습니다.');
                return;
            }

            if (!initialId) {
                setAiReports([]);
                setError('분석 이력을 불러올 수 없습니다.');
                return;
            }

            if (initialId) {
                const detailData = await prefetchReportDetail(initialId, headers);
                if (detailData === null && !res.ok) {
                    throw new Error('단지 분석 이력을 불러오지 못했습니다.');
                }
                if (detailData) {
                    setInitialReportData(detailData);
                }
            }

            setAiReports(completedList);
            setSelectedReportId(initialId);
            setAptName(groupAptName);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
            setAiReports([]);
        } finally {
            setLoading(false);
        }
    }, [aptSeq, pnu, reportIdParam, prefetchReportDetail]);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, () => {
            loadReports();
        });
        return () => unsub();
    }, [loadReports]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !selectedReportId) {
        return (
            <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col items-center justify-center p-8">
                <p className="text-slate-400 text-sm mb-4 text-center">{error || '분석 이력을 불러올 수 없습니다.'}</p>
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="text-emerald-400 text-sm font-bold"
                >
                    ← 돌아가기
                </button>
            </div>
        );
    }

    return (
        <AnalysisDetailPage
            overrideReportId={selectedReportId}
            initialData={initialReportData}
            embeddedInApartment
            embeddedApartmentReports={aiReports}
            embeddedSelectedReportId={selectedReportId}
            onEmbeddedReportSelect={setSelectedReportId}
            embeddedAptName={aptName}
        />
    );
}
