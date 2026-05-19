import { Metadata } from 'next';

export const metadata: Metadata = {
    metadataBase: new URL('https://route-analyzer.vercel.app'),
    title: '부동산 매물 분석 AI | 토지 주택 상가 프랜차이즈 지옥',
    description: '안전한 거래를 위한 필수 도구! 토지 지옥, 주택 지옥, 점포 지옥 분석 및 기획부동산, 권리금 사기 방지. 실시간 매물 정보와 AI 분석으로 안심하고 거래하세요.',
    keywords: ['부동산', '토지', '주택', '점포', '프랜차이즈', '부동산 매물 분석', '허위매물', '권리금사기', '기획부동산', '부동산 사기 방지', '상권 분석'],
    authors: [{ name: '부동산 분석 AI' }],
    creator: '부동산 분석 AI',
    publisher: '부동산 분석 AI',
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    openGraph: {
        type: 'website',
        locale: 'ko_KR',
        url: 'https://route-analyzer.vercel.app',
        siteName: '부동산 매물 분석 AI',
        title: '부동산 매물 분석 AI | 토지 주택 상가 권리금',
        description: '부동산 매물 AI 분석, 사기 탐지, 허위 방지. 안전한 거래를 위한 스마트 플랫폼',
        images: [
            {
                url: '/logo512.png',
                width: 512,
                height: 512,
                alt: '부동산 분석 AI 로고',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: '부동산 매물 분석 AI',
        description: '부동산 매물 AI 분석, 사기 탐지, 허위매물 방지',
        images: ['/logo512.png'],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    verification: {
        google: 'google-site-verification-code',
        other: {
            'naver-site-verification': 'naver-verification-code',
        },
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children;
}
