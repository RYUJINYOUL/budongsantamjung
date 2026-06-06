import { Metadata } from 'next';
import DiscoverDetailPage from './DiscoverDetailClient';

const SITE_URL = 'https://tamjung.me';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://34.47.121.40';

async function getDiscoveryData(id: string) {
  const url = `${BACKEND_URL}/api/land/detective/discovery/global/${id}`;
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      console.error(`Failed to fetch discovery ${id}:`, res.statusText);
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error('Error fetching discovery in server component:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const data = await getDiscoveryData(params.id);
  if (!data || !data.success) {
    return {
      title: '투자처 발견 리포트 | 부동산탐정',
      description: 'AI가 공공데이터 30종 이상을 분석하여 발견한 투자처 리포트입니다. 지역 시장지표, 호재, 실거래가 등을 종합적으로 분석합니다.',
    };
  }

  const region = data.query?.sggNm || data.region || '투자처';
  const outlook = data.analysis?.regionalOutlook;
  const grade = outlook?.overallGrade || '';
  const direction = outlook?.direction || '';
  const reasoning = outlook?.reasoning || '';
  const budget = data.query?.budget;

  const budgetText = budget
    ? budget >= 10000
      ? `${(budget / 10000).toFixed(budget % 10000 === 0 ? 0 : 1)}억원`
      : `${budget.toLocaleString()}만원`
    : '';

  const title = `${region} 투자처 발견 리포트${grade ? ` (${grade}등급)` : ''} | 부동산탐정`;

  const descParts = [];
  if (direction) descParts.push(direction);
  if (budgetText) descParts.push(`예산 ${budgetText}`);
  if (reasoning) descParts.push(reasoning.substring(0, 120));
  const description =
    descParts.length > 0
      ? descParts.join(' · ')
      : `${region} 지역의 AI 투자처 분석 리포트입니다. 시장지표, 호재, 실거래가 등을 종합적으로 분석합니다.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${SITE_URL}/discover/${params.id}`,
      images: [
        {
          url: `${SITE_URL}/logo512.png`,
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
      images: [`${SITE_URL}/logo512.png`],
    },
    alternates: {
      canonical: `${SITE_URL}/discover/${params.id}`,
    },
  };
}

export default function Page() {
  return <DiscoverDetailPage />;
}
