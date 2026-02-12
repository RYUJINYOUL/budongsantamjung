import { Metadata } from 'next';

export const metadata: Metadata = {
    metadataBase: new URL('https://yongcar.com'),
    title: '용카 - 택배 일자리 분석 | 쿠팡택배 CJ대한통운 롯데택배 구인정보',
    description: '택배기사 필수 앱 용카! 택배 일자리 분석, 쿠팡택배 후기, 택배 갑질 제보, 지입사기 방지. 실시간 구인정보와 AI 분석으로 안전한 택배 일자리를 찾으세요.',
    keywords: ['택배 일자리', '쿠팡택배', '택배기사', '택배 구인', '택배 사기', '지입사기', '택배 갑질', 'CJ대한통운', '롯데택배', '한진택배', '택배 어때요', '택배기사 후기'],
    authors: [{ name: '용카' }],
    creator: '용카',
    publisher: '용카',
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    openGraph: {
        type: 'website',
        locale: 'ko_KR',
        url: 'https://yongcar.com',
        siteName: '용카 - 택배기사 필수 앱',
        title: '용카 - 택배 일자리 분석 | 쿠팡택배 CJ대한통운 구인정보',
        description: '택배 일자리 AI 분석, 갑질 제보, 지입사기 방지. 배달 기사를 위한 스마트 플랫폼',
        images: [
            {
                url: '/logo512.png',
                width: 512,
                height: 512,
                alt: '용카 로고',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: '용카 - 택배 일자리 분석',
        description: '택배 일자리 AI 분석, 갑질 제보, 지입사기 방지',
        images: ['/logo512.png'],
        creator: '@yongcar',
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
