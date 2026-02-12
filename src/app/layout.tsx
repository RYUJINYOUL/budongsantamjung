import './globals.css'
import { Inter, Noto_Sans_KR } from 'next/font/google'
import type { Metadata } from 'next'
import Script from 'next/script'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter'
})

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-noto-sans-kr'
})

export const metadata: Metadata = {
  metadataBase: new URL('https://yongcar.com'),
  title: {
    default: '용카 - 택배 일자리 분석 | 쿠팡택배 CJ대한통운 롯데택배 구인정보',
    template: '%s | 용카'
  },
  description: '택배기사 필수 앱 용카! 택배 일자리 분석, 쿠팡택배 후기, 택배 갑질 제보, 지입사기 방지. 실시간 구인정보와 AI 분석으로 안전한 택배 일자리를 찾으세요.',
  keywords: ['택배 일자리', '쿠팡택배', '택배기사', '택배 구인', '택배 사기', '지입사기', '택배 갑질', 'CJ대한통운', '롯데택배', '한진택배', '택배 어때요', '택배기사 후기', '배달 갑질', '고객갑질', '택배 분석'],
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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '용카',
    alternateName: ['택배 일자리 분석', '용카 택배'],
    url: 'https://yongcar.com',
    description: '택배기사를 위한 AI 일자리 분석 및 갑질 제보 플랫폼',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://yongcar.com/vote?search={search_term_string}',
      'query-input': 'required name=search_term_string'
    },
    publisher: {
      '@type': 'Organization',
      name: '용카',
      logo: {
        '@type': 'ImageObject',
        url: 'https://yongcar.com/logo512.png'
      }
    }
  }

  return (
    <html lang="ko" className={`${inter.variable} ${notoSansKR.variable}`}>
      <head>
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
