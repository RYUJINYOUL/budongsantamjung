import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '갑질 투표 - 용카 AI | 택배 업계 갑질 신고 투표 시스템',
  description: '택배 업계의 갑질 이슈에 대해 투표하고 의견을 나누세요. Gemini AI가 카페 글과 뉴스를 분석해 투표를 생성합니다. 용카 갑질 투표 시스템.',
  keywords: '갑질 투표, 택배 업계, 갑질 신고, 용카, AI 투표, 택배기사',
  openGraph: {
    title: '갑질 투표 - 용카 AI',
    description: '택배 업계 이슈 투표 시스템. AI가 생성하는 스마트 투표 플랫폼.',
    type: 'website',
  },
};

export default function VoteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
