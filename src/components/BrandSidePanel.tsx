import Link from 'next/link';
import { BarChart3, MapPinned, ScanSearch, type LucideIcon } from 'lucide-react';

const FEATURES: { icon: LucideIcon; text: string }[] = [
  { icon: ScanSearch, text: 'AI 매물 정밀 분석' },
  { icon: MapPinned, text: '투자처 발굴 · 리뷰' },
  { icon: BarChart3, text: '실거래 · 공시가 연동' },
];

type BrandSidePanelProps = {
  showHomeLink?: boolean;
  className?: string;
};

export default function BrandSidePanel({ showHomeLink = true, className = '' }: BrandSidePanelProps) {
  return (
    <div
      className={`flex flex-col justify-between min-h-full p-8 lg:p-10 xl:p-12 bg-gradient-to-br from-emerald-600 via-emerald-700 to-slate-900 text-white ${className}`}
    >
      <div>
        {showHomeLink && (
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white text-xs font-bold transition-colors mb-10 lg:mb-16"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            홈으로
          </Link>
        )}

        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm p-1.5 shadow-lg border border-white/20 shrink-0">
            <img src="/logo512.png" alt="부동산탐정" className="w-full h-full rounded-xl object-cover" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl lg:text-2xl font-black tracking-tight">부동산탐정</h1>
            <p className="text-emerald-100/90 text-sm font-semibold mt-0.5">AI 부동산 분석 플랫폼</p>
          </div>
        </div>

        <p className="text-base lg:text-lg font-bold leading-relaxed text-white/95">
          데이터로 읽는 부동산,
          <br />
          공공데이터와 AI가 만나다.
        </p>
        <p className="mt-2 text-sm font-semibold text-emerald-100/80 leading-relaxed">
          대한민국 모든 부동산을 분석합니다.
        </p>
      </div>

      <ul className="space-y-3 mt-8 lg:mt-0">
        {FEATURES.map(({ icon: Icon, text }) => (
          <li
            key={text}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm"
          >
            <Icon className="w-5 h-5 text-white/90 shrink-0" strokeWidth={2} />
            <span className="text-sm font-bold text-white/95">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
