'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import {
  loadCompareBasket,
  saveCompareBasket,
  dispatchCompareBasketUpdated,
  type ApartmentCompareBasketItem,
} from '../lib/apartmentCompareBasket';

type Anchor = 'map-panel' | 'viewport-bottom' | 'inline';

function BasketChip({
  count,
  onCompare,
  onClear,
}: {
  count: number;
  onCompare: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 bg-slate-900/95 text-white py-1.5 pl-1.5 pr-1 rounded-full shadow-xl border border-white/10 backdrop-blur-md">
      <button
        type="button"
        onClick={onCompare}
        className="shrink-0 bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-xs font-black px-4 py-2.5 rounded-full transition-colors"
      >
        비교하기
      </button>
      <span className="text-emerald-400 text-sm font-black tabular-nums">+{count}</span>
      <button
        type="button"
        aria-label="비교함 닫기"
        onClick={onClear}
        className="shrink-0 p-2 text-white/45 hover:text-white rounded-full"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function ApartmentCompareBasketBar({ anchor }: { anchor: Anchor }) {
  const router = useRouter();
  const [items, setItems] = useState<ApartmentCompareBasketItem[]>([]);
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(() => {
    setItems(loadCompareBasket());
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener('apartment-compare-updated', onUpdate);
    return () => window.removeEventListener('apartment-compare-updated', onUpdate);
  }, [refresh]);

  if (!mounted || items.length === 0) return null;

  const count = items.length;
  const onCompare = () => router.push('/compare/apartments');
  const onClear = () => {
    saveCompareBasket([]);
    dispatchCompareBasketUpdated();
  };

  if (anchor === 'map-panel') {
    return (
      <div className="hidden lg:flex absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
        <BasketChip count={count} onCompare={onCompare} onClear={onClear} />
      </div>
    );
  }

  if (anchor === 'inline') {
    return <BasketChip count={count} onCompare={onCompare} onClear={onClear} />;
  }

  return (
    <div className="lg:hidden fixed bottom-[calc(2rem+3.25rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-[61] pointer-events-auto">
      <BasketChip count={count} onCompare={onCompare} onClear={onClear} />
    </div>
  );
}

/** 모바일: 화면 하단 / PC: 지도 패널 내부에 map-panel 앵커 별도 마운트 */
export default function ApartmentCompareBasketBars() {
  return <ApartmentCompareBasketBar anchor="viewport-bottom" />;
}

export { ApartmentCompareBasketBar };

export function useCompareBasketKeys(): Set<string> {
  const [keys, setKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const sync = () => {
      const list = loadCompareBasket();
      setKeys(new Set(list.map((i) => i.key)));
    };
    sync();
    window.addEventListener('apartment-compare-updated', sync);
    return () => window.removeEventListener('apartment-compare-updated', sync);
  }, []);

  return keys;
}
