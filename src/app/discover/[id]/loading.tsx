import { Sparkles } from 'lucide-react';

const MAIN_TABS = ['종합평가', '주변호재', '시장지표', '실거래가', '인구현황', '조례·동향·공급'];

const MAIN_TAB_ROW_CLASS =
  'max-w-3xl mx-auto px-4 flex items-stretch border-t border-slate-100 overflow-x-auto no-scrollbar h-12';

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 relative overflow-hidden flex flex-col">
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, black 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-teal-500/[0.02] via-transparent to-transparent pointer-events-none" />

      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-100 w-9 h-9 animate-pulse" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 w-44 bg-slate-200 rounded-md animate-pulse" />
            <div className="h-3 w-28 bg-teal-100 rounded-md animate-pulse" />
          </div>
          <div className="w-24 h-6 bg-teal-50 border border-teal-100/50 rounded-full animate-pulse" />
        </div>

        <div className={MAIN_TAB_ROW_CLASS}>
          {MAIN_TABS.map((tab, i) => (
            <div
              key={tab}
              className={`flex items-center h-full px-5 text-sm font-bold border-b-2 -mb-px shrink-0 whitespace-nowrap ${i === 0 ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400 opacity-60'
                }`}
            >
              {tab}
            </div>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 flex flex-col justify-center items-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-2 border-teal-600/10 flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full border-t-2 border-teal-600 animate-spin" />
            <div className="w-14 h-14 rounded-full border border-teal-600/20 flex items-center justify-center bg-teal-50">
              <Sparkles className="w-6 h-6 text-teal-600 animate-pulse" />
            </div>
          </div>
          <div className="absolute -inset-2 rounded-full border border-teal-600/5 animate-ping opacity-75" />
        </div>

        <div className="text-center space-y-2.5 max-w-sm">
          <h2 className="text-sm font-black tracking-tight text-slate-800">AI 투자처 발굴 리포트 로딩 중</h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            해당 지역의 종합 평가 지표, 실거래가 변동 추이, 인구 수급 현황 및 고시 데이터를 실시간으로 종합하고 있습니다.
          </p>
        </div>

        <div className="w-full mt-6 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
            <div className="flex justify-between items-center">
              <div className="h-4 w-36 bg-slate-200 rounded-md animate-pulse" />
              <div className="h-6 w-16 bg-slate-100 rounded-md animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-slate-100 rounded-md animate-pulse" />
              <div className="h-3 w-[95%] bg-slate-100 rounded-md animate-pulse" />
              <div className="h-3 w-[80%] bg-slate-100 rounded-md animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
