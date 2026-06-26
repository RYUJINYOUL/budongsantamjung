import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { parseAnalyzeSlug } from '../../../lib/slug';

const AnalysisDetailPage = dynamic(
    () => import('./AnalysisClientPage').then((mod) => mod.default),
    { ssr: false },
);

// ISR: 분석 결과는 생성 후 잘 안 바뀌므로 1시간 캐시
export const revalidate = 3600;

async function getReportData(id: string) {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://34.47.121.40';
    const url = `${backendUrl}/api/land/detective/report/${id}`;
    try {
        const res = await fetch(url, { 
            next: { revalidate: 3600 },
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (!res.ok) {
            console.error(`Failed to fetch report ${id}:`, res.statusText);
            return null;
        }
        return await res.json();
    } catch (error) {
        console.error('Error fetching report in server component:', error);
        return null;
    }
}

export async function generateMetadata({ params }: { params: { slug: string[] } }): Promise<Metadata> {
    const id = parseAnalyzeSlug(params.slug);
    const data = await getReportData(id);
    if (!data) {
        return {
            title: '부동산 매물 AI 분석 | 부동산탐정',
            description: 'AI 기술로 부동산 매물 정보를 분석하여 숨겨진 리스크와 허위 정보를 찾아냅니다.',
        };
    }

    const report = data.report || data;
    const rawJsonString =
        data.analysis?.recommendations ||
        data.report?.ai_summary ||
        (typeof data.analysis === 'string' ? data.analysis : null);

    let parsedData: any = {};
    if (rawJsonString) {
        try {
            parsedData = JSON.parse(rawJsonString);
        } catch (e) {
            // ignore
        }
    }

    const propertyTitle = parsedData?.propertyTitle || report?.address || '익명 매물';
    const riskScore = parsedData?.['1_comprehensiveRisk']?.totalScore || report?.propertyGrade?.riskScore || '분석 중';
    const detectiveNote = parsedData?.['1_comprehensiveRisk']?.coreJudgement || report?.detectiveNote || '부동산탐정 AI가 정밀 분석한 리스크 판독 보고서입니다.';

    // 거래 유형 추론: AI parsedData 우선 → report 필드로 fallback
    const transactionType: string = (() => {
        if (parsedData?.transactionType) return parsedData.transactionType;
        const price = report?.price;
        const deposit = report?.deposit;
        const monthlyRent = report?.monthly_rent;
        if (monthlyRent) return '월세';
        if (deposit && !price) return '전세';
        if (price) return '매매';
        return '';
    })();

    // title prefix: 건물명 있으면 "건물명 + 지역(시/군/읍)", 없으면 AI 생성 propertyTitle
    // address는 마스킹되지만 앞 3토큰(시·군·읍면)만 사용하므로 *** 영향 없음
    const bldNm = report?.bld_nm || null;
    const location = (report?.address || '').split(' ').slice(0, 3).join(' ');
    const titlePrefix = bldNm ? `${bldNm} ${location}` : propertyTitle;

    const title = `${titlePrefix}${transactionType ? ' ' + transactionType : ''} 분석 | AI 위험도 ${riskScore}점 | 부동산탐정`;
    const description = `[AI 위험도 점수: ${riskScore}점] ${detectiveNote}`;

    return {
        title,
        description,
        alternates: {
            canonical: `https://tamjung.me/analyze/${id}`,
        },
        openGraph: {
            title,
            description,
            type: 'website',
            url: `https://tamjung.me/analyze/${id}`,
            images: [
                {
                    url: `https://tamjung.me/api/og/${id}`,
                    width: 1200,
                    height: 630,
                    alt: `${propertyTitle} 부동산 AI 분석 | 부동산탐정`,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [`https://tamjung.me/api/og/${id}`],
        },
    };
}

export default async function Page({ params }: { params: { slug: string[] } }) {
    const id = parseAnalyzeSlug(params.slug);
    const initialData = await getReportData(id);
    
    return <AnalysisDetailPage initialData={initialData} />;
}
