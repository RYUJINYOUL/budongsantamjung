import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '분양 정보 | 청약홈 민간·공공·분양결과',
  description:
    '청약홈 공공데이터 기반 민간분양, LH 공공분양, 분양결과를 지역별로 확인하세요. 분양가, 일정, 경쟁률, 실거래 시세를 한곳에서.',
  alternates: { canonical: 'https://tamjung.me/presale' },
};

export default function PresaleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
