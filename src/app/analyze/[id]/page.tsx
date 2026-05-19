import { Metadata } from 'next';
import AnalysisDetailPage from './AnalysisClientPage';

async function getReportData(id: string) {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://34.47.121.40';
    const url = `${backendUrl}/api/land/detective/report/${id}`;
    try {
        const res = await fetch(url, { 
            cache: 'no-store',
            // API의 응답 속도 향상을 위해 적절한 헤더 설정
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

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const data = await getReportData(params.id);
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

    const title = `${propertyTitle} AI 리스크 판독서 | 부동산탐정`;
    const description = `[AI 위험도 점수: ${riskScore}점] ${detectiveNote}`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'website',
            url: `https://tomjungup.web.app/analyze/${params.id}`,
            images: [
                {
                    url: '/logo512.png',
                    width: 512,
                    height: 512,
                    alt: '부동산탐정 로고',
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: ['/logo512.png'],
        },
    };
}

export default async function Page({ params }: { params: { id: string } }) {
    const initialData = await getReportData(params.id);
    
    return <AnalysisDetailPage initialData={initialData} />;
}
