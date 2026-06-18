import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI 투자처 발견 | 지역·예산·유형 맞춤 부동산 투자 분석',
  description:
    '지역, 예산, 투자 유형을 설정하면 AI가 30종 이상의 공공데이터를 분석하여 최적의 투자처를 추천합니다. 아파트, 토지, 상가, 빌딩 등 모든 유형의 부동산 투자처를 발견하세요.',
  keywords: [
    'AI 투자처 발견',
    '부동산 투자',
    '투자처 추천',
    '부동산 AI 분석',
    '토지 투자',
    '아파트 투자',
    '상가 투자',
    '빌딩 투자',
    '부동산탐정',
    // '부동산탐정',
  ],
  openGraph: {
    title: 'AI 투자처 발견 | 지역·예산·유형 맞춤 분석 - 부동산탐정',
    description:
      '지역·예산·유형을 설정하면 AI가 공공데이터를 분석하여 최적의 투자처를 추천합니다.',
    type: 'website',
    url: 'https://tamjung.me/discover',
    images: ['/logo512.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI 투자처 발견 - 부동산탐정',
    description:
      '지역·예산·유형을 설정하면 AI가 최적 투자처를 추천합니다.',
    images: ['/logo512.png'],
  },
  alternates: {
    canonical: 'https://tamjung.me/discover',
  },
}

export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
