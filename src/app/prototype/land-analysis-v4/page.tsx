import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: '토지 AI 분석 UI v4',
  description: '평택 서정동 #11572 — 8섹션 계층 IA 프로토타입',
  robots: { index: false, follow: false },
};

export default function LandAnalysisV4Page() {
  redirect('/prototype/land-analysis-v4.html');
}
