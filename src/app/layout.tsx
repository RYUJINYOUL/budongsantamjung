import './globals.css'
import { Inter, Noto_Sans_KR } from 'next/font/google'

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

export const metadata = {
  title: '용카 라우트 - 택배 일자리 분석 | 실시간 택배 라우트 분석 결과',
  description: '택배 일자리 분석 결과를 확인하세요. 지도와 구인정보를 입력하면 AI가 실수령액, 유류비, 라우트 난이도를 분석해 드립니다. 택배기사 필수 정보!',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className={`${inter.variable} ${notoSansKR.variable}`}>
      <body className="antialiased font-noto-sans-kr">{children}</body>
    </html>
  )
}
