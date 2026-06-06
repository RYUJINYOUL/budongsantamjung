import './globals.css'
import { Noto_Sans_KR } from 'next/font/google'
import type { Metadata } from 'next'
import Script from 'next/script'

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans-kr',
  display: 'swap',
})

const SITE_URL = 'https://tamjung.me'

const SITE_DESCRIPTION =
  '주소 클릭만으로 30종 이상의 공공데이터(실거래가·건축물대장·인구·토지규제 등)를 AI가 자동 분석합니다. ' +
  '허위매물·위험 요소·적정 가치를 빠르게 진단하고, 아파트·주택·상가·토지·빌딩 맞춤 분석과 계약 전 체크리스트를 제공합니다. ' +
  '계약 전, 부동산탐정으로 먼저 확인하세요.'

// 메타데이터: 부동산탐정 (tamjung.me)
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '부동산탐정 | 공공데이터와 AI가 만나 모든 부동산 분석합니다',
    template: '%s | 부동산탐정',
  },
  description: SITE_DESCRIPTION,
  keywords: [
    '부동산탐정',
    '부동산 분석',
    'AI 부동산',
    '공공데이터',
    '실거래가',
    '건축물대장',
    '허위매물',
    '토지 분석',
    '상가 분석',
    '입지 분석',
    '부동산 리스크',
    '매물 분석',
    '지역 분석',
    '계약 전 체크리스트',
  ],
  authors: [{ name: '부동산탐정' }],
  creator: '부동산탐정',
  publisher: '부동산탐정',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    siteName: '부동산탐정',
    title: '부동산탐정 | 공공데이터·AI 기반 부동산 분석',
    description: SITE_DESCRIPTION,
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
    title: '부동산탐정 | 공공데이터·AI 기반 부동산 분석',
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/logo512.png`],
  },
  icons: {
    icon: '/logo512.png',
    shortcut: '/logo512.png',
    apple: '/logo512.png',
  },
  alternates: {
    canonical: SITE_URL,
  },
  verification: {
    google: 'google6c1fb46f0a5faeec',
    other: {
      'naver-site-verification': '051964ad639f99a8f0f410850b88f316',
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // JSON-LD 구조화 데이터 수정
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '부동산탐정',
    alternateName: ['부동산 탐정', 'tamjung', 'tamjung.me'],
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/?panel=analyze&q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: '부동산탐정',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo512.png`,
      },
    },
  }

  return (
    <html lang="ko" className={notoSansKr.variable}>
      <head>
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased font-noto-sans-kr">
        {children}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', '${process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID}');
          `}
        </Script>
      </body>
    </html>
  )
}