'use client';

import Image from 'next/image';
import { ArrowRight, BarChart3 } from 'lucide-react';
import { formatMyHomePriceMan } from '../../lib/myHomeApi';

export type MyHomeLeftView = 'compare' | 'romantic';

type Props = {
  view: MyHomeLeftView;
  avgPrice1m?: number | null;
  onToggle: () => void;
  disabled?: boolean;
};

export default function MyHomeViewToggleCta({ view, avgPrice1m, onToggle, disabled }: Props) {
  const isRomantic = view === 'romantic';

  const romanticHook =
    avgPrice1m != null && avgPrice1m > 0
      ? `${formatMyHomePriceMan(avgPrice1m)}으로 누리는 자연 주택`
      : '9월 오픈 · 상상 전용';

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={[
        'w-full text-left rounded-2xl overflow-hidden transition-opacity',
        'bg-gradient-to-br from-emerald-400 to-emerald-600',
        'shadow-lg shadow-emerald-400/25',
        disabled ? 'opacity-50 pointer-events-none' : 'hover:from-emerald-500 hover:to-emerald-700 active:scale-[0.99]',
      ].join(' ')}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="w-11 h-11 shrink-0 rounded-xl bg-white/20 flex items-center justify-center">
          {isRomantic ? (
            <BarChart3 className="w-5 h-5 text-white" aria-hidden />
          ) : (
            <Image src="/house/forest1.png" alt="" width={28} height={28} className="w-7 h-7" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-white/90 leading-snug">
            {isRomantic ? '비교표 · 직장 · 시세 하이라이트' : romanticHook}
          </p>
          <p className="text-sm font-black text-white mt-0.5 leading-snug tracking-tight">
            {isRomantic ? '우리집과 희망 매물 비교' : '우리집 가격으로 살 수 있는 낭만 주택'}
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-white/90 shrink-0" aria-hidden />
      </div>
    </button>
  );
}
