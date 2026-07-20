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

    const loadReports = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const user = auth.currentUser;
            if (!user) {
                router.replace('/login');
                return;
            }
            const idToken = await user.getIdToken();
            const groupKey = resolveGroupKey(aptSeq, pnu);
            const encoded = encodeURIComponent(groupKey);
            const res = await fetch(
                `/api/land/detective/apartment-groups/${encoded}/reports?aiCompletedOnly=1`,
                { headers: { Authorization: `Bearer ${idToken}` } },
            );
            if (!res.ok) throw new Error('단지 분석 이력을 불러오지 못했습니다.');
            const data = await res.json();

            const completedList: EmbeddedApartmentReport[] = data.reports || [];
            const latestForTabs = data.latestReportId as string | null;
            const latestCompleted = data.latestCompletedReportId as string | null;

            if (!latestForTabs && completedList.length === 0) {
                setAiReports([]);
                setError('이 단지의 분석 이력이 없습니다.');
                return;
            }

            const initialId = reportIdParam && (reportIdParam === latestForTabs || completedList.some((r) => r.id === reportIdParam))
                ? reportIdParam
                : (latestCompleted || latestForTabs);

            // 최초 활성화할 리포트의 상세 데이터를 미리 조회(Pre-fetch)하여 이중 로딩 현상 방지
            if (initialId) {
                try {
                    const detailRes = await fetch(
                        `/api/land/detective/report/${initialId}`,
                        { headers: { Authorization: `Bearer ${idToken}` } }
                    );
                    if (detailRes.ok) {
                        const detailData = await detailRes.json();
                        setInitialReportData(detailData);
                    }
                } catch (e) {
                    console.error('초기 상세 리포트 Pre-fetch 실패:', e);
                }
            }

            setAiReports(completedList);
            setSelectedReportId(initialId);
            setAptName(data.aptName || completedList[0]?.bldNm || '아파트 단지');
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
            setAiReports([]);
        } finally {
            setLoading(false);
        }
    }, [aptSeq, pnu, reportIdParam, router]);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            if (user) loadReports();
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
