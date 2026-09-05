import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: '토지 AI 분석 UI 프로토타입 v2',
  description: '평택 서정동 report #11572 — 가치검증·호재·거래·전망 IA 목업',
  robots: { index: false, follow: false },
};

/** /prototype/land-analysis-v2 → 정적 HTML 프로토타입 */
export default function LandAnalysisV2PrototypePage() {
  redirect('/prototype/land-analysis-pyungtaek.html');
}
