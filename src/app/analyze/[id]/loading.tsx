import { Sparkles } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#090d16] text-white relative overflow-hidden flex flex-col">
      {/* 고대비 프리미엄 데이타 백그라운드 그리드 효과 */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-teal-500/5 via-transparent to-transparent pointer-events-none" />

      {/* 헤더 스켈레톤 */}
      <header className="sticky top-0 z-40 bg-[#090d16]/80 backdrop-blur-md border-b border-white/5 shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/5 text-slate-500 w-9 h-9 animate-pulse" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 w-40 bg-white/10 rounded-md animate-pulse" />
            <div className="h-3 w-24 bg-teal-500/20 rounded-md animate-pulse" />
          </div>
          <div className="w-20 h-6 bg-teal-500/10 border border-teal-500/20 rounded-full animate-pulse" />
        </div>
      </header>

      {/* 메인 탭 영역 스켈레톤 */}
      <div className="border-b border-white/5 bg-[#090d16]">
        <div className="max-w-3xl mx-auto px-4 flex gap-4 overflow-x-auto no-scrollbar py-2">
          {['종합평가', '주변호재', '시장지표', '실거래가', '인구현황', '조례·동향·공급'].map((tab, i) => (
            <div key={i} className="px-5 py-2 text-sm font-bold text-slate-500 shrink-0 relative">
              <span className="opacity-40">{tab}</span>
              {i === 0 && <div className="absolute bottom-0 left-5 right-5 h-0.5 bg-teal-500/40" />}
            </div>
          ))}
        </div>
      </div>

      {/* 바디 로더 및 스켈레톤 */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 flex flex-col justify-center items-center gap-6">
        <div className="relative">
          {/* 스핀 레이더 효과 */}
          <div className="w-20 h-20 rounded-full border-2 border-teal-500/10 flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full border-t-2 border-teal-400 animate-spin" />
            <div className="w-14 h-14 rounded-full border border-teal-500/20 flex items-center justify-center bg-teal-500/5">
              <Sparkles className="w-6 h-6 text-teal-400 animate-pulse" />
            </div>
          </div>
          {/* 퍼지는 파동 */}
          <div className="absolute -inset-2 rounded-full border border-teal-500/5 animate-ping opacity-75" />
        </div>

        <div className="text-center space-y-2.5 max-w-sm">
          <h2 className="text-sm font-black tracking-tight text-white/90">
            부동산탐정 AI 분석서 로딩 중
          </h2>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            건축물대장, 토지대장, 주변 실거래가 및 미래 호재 데이터를 기반으로 딥러닝 리스크 분석 보고서를 불러오고 있습니다.
          </p>
        </div>

        {/* 하단 세부 스켈레톤 카드 */}
        <div className="w-full mt-6 space-y-4">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-4 w-32 bg-white/10 rounded-md animate-pulse" />
              <div className="h-6 w-12 bg-white/10 rounded-md animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-white/5 rounded-md animate-pulse" />
              <div className="h-3 w-[90%] bg-white/5 rounded-md animate-pulse" />
              <div className="h-3 w-[75%] bg-white/5 rounded-md animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
