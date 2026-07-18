import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '이용후기 | 부동산탐정 실제 사용자 리뷰',
  description:
    '부동산탐정을 실제로 사용해 본 사용자들의 생생한 후기입니다. AI 부동산 분석 서비스의 정확도와 활용 사례를 확인하세요.',
  keywords: [
    '부동산탐정 후기',
    '부동산 분석 리뷰',
    'AI 부동산 분석 후기',
    '부동산탐정 이용후기',
  ],
  openGraph: {
    title: '이용후기 | 부동산탐정 실제 사용자 리뷰',
    description:
      '부동산탐정 실제 사용자들의 생생한 후기를 확인하세요.',
    type: 'website',
    url: 'https://tamjung.me/reviews',
    images: ['/logo512.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: '이용후기 - 부동산탐정',
    description: '부동산탐정 실제 사용자들의 생생한 후기',
    images: ['/logo512.png'],
  },
  alternates: {
    canonical: 'https://tamjung.me/reviews',
  },
}

export default function ReviewsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
