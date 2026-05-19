import './globals.css'
import { Inter, Noto_Sans_KR, Share_Tech_Mono } from 'next/font/google'
import type { Metadata } from 'next'
import Script from 'next/script'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap'
})

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-noto-sans-kr',
  display: 'swap'
})

const shareTechMono = Share_Tech_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-share-tech-mono',
  display: 'swap'
})

// 메타데이터 수정: '부동산탐정' 컨셉 반영
export const metadata: Metadata = {
  metadataBase: new URL('https://tomjungup.web.app'),
  title: {
    default: '부동산탐정 | 입지와 리스크를 꿰뚫어 보는 AI 부동산 분석',
    template: '%s | 부동산탐정'
  },
  description: '과장된 매물 광고, 숨겨진 리스크를 AI가 전문적으로 판독해 드립니다. 깨끗하고 투명한 부동산 거래를 위한 부동산탐정 리포트.',
  keywords: ['부동산탐정', '부동산 분석', '상권 분석', '허위매물', '권리금 분석', '부동산 AI 리포트'],
  authors: [{ name: '부동산탐정 AI' }],
  creator: '부동산탐정 AI',
  publisher: '부동산탐정 AI',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://tomjungup.web.app',
    siteName: '부동산탐정',
    title: '부동산탐정 | 팩트 기반 매물 AI 판독서',
    description: '허위 매물과 사기 없는 투명한 부동산 정보. AI 탐정이 입지를 분석하고 현실적인 수익성과 위험도를 파헤쳐 드립니다.',
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
    title: '부동산탐정 | 현실적인 매물 분석',
    description: '매물 광고의 행간을 읽는 AI 탐정의 객관적인 분석 보고서.',
    images: ['/logo512.png'],
  },
  icons: {
    icon: '/logo512.png',
    shortcut: '/logo512.png',
    apple: '/logo512.png',
  },
  verification: {
    google: 'google6c1fb46f0a5faeec',
    other: {
      'naver-site-verification': '958054b4c4b6f0526ecf800c27d3e258',
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
    alternateName: ['부동산 탐정', 'AI 부동산 리포트'],
    url: 'https://tomjungup.web.app',
    description: 'AI를 활용한 객관적인 부동산 매물 리스크 분석 서비스',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://tomjungup.web.app/search?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    },
    publisher: {
      '@type': 'Organization',
      name: '부동산탐정',
      logo: {
        '@type': 'ImageObject',
        url: 'https://tomjungup.web.app/logo512.png'
      }
    }
  }

  return (
    <html lang="ko" className={`${inter.variable} ${notoSansKR.variable} ${shareTechMono.variable}`}>
      <head>
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
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased font-noto-sans-kr">{children}</body>
    </html>
  )
}