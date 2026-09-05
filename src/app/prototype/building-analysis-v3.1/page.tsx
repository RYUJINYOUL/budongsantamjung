import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: '빌딩 AI 분석 UI v3.1',
  description: '평택 서정동 #11572 — building 카테고리 v3.1 프로토타입',
  robots: { index: false, follow: false },
};

export default function BuildingAnalysisV31Page() {
  redirect('/prototype/building-analysis-v3.1.html');
}
