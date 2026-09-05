import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: '토지 AI 분석 UI 프로토타입',
  description: '평택 서정동 #11572 — v3.1 / v4 비교',
  robots: { index: false, follow: false },
};

/** v3.1 · v4 비교 인덱스 */
export default function LandAnalysisV3Page() {
  redirect('/prototype/land-analysis-v3.html');
}
