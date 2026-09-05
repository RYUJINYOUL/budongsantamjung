import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: '토지 AI 분석 UI v3.1',
  description: '평택 서정동 #11572 — wide + 상세 접기 프로토타입',
  robots: { index: false, follow: false },
};

export default function LandAnalysisV31Page() {
  redirect('/prototype/land-analysis-v3.1.html');
}
