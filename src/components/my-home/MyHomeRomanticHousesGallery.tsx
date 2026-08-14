'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatMyHomePriceMan } from '../../lib/myHomeApi';
import {
  MY_HOME_ROMANTIC_HOUSE_CARDS,
  romanticHousePriceLabel,
  type MyHomeRomanticHouseCard,
} from '../../lib/myHomeRomanticHouses';

type Props = {
  avgPrice1m?: number | null;
};

function GridCard({
  card,
  avgPrice1m,
  onClick,
}: {
  card: MyHomeRomanticHouseCard;
  avgPrice1m?: number | null;
  onClick: () => void;
}) {
  const priceLabel = romanticHousePriceLabel(avgPrice1m, card, formatMyHomePriceMan);

  return (
    <button type="button" onClick={onClick} className="text-left group w-full">
      <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-slate-200 border border-slate-200/80 shadow-sm">
        <Image
          src={card.imageSrc}
          alt={card.title}
          fill
          unoptimized
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 1024px) 45vw, 12vw"
        />
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/50 text-white text-[10px] font-bold">
          {card.cityName}
        </span>
        {priceLabel && (
          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/55 text-white text-[10px] font-bold">
            {priceLabel}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <Image src={card.iconSrc} alt="" width={16} height={16} className="shrink-0" />
        <p className="text-xs font-bold text-slate-900 line-clamp-1">{card.title}</p>
      </div>
      <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug mt-0.5">{card.charmPhrase}</p>
    </button>
  );
}

function DetailModal({
  initialIndex,
  avgPrice1m,
  onClose,
}: {
  initialIndex: number;
  avgPrice1m?: number | null;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [mounted, setMounted] = useState(false);
  const card = MY_HOME_ROMANTIC_HOUSE_CARDS[index];
  const priceLabel = romanticHousePriceLabel(avgPrice1m, card, formatMyHomePriceMan);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const prev = useCallback(() => {
    setIndex((i) => (i <= 0 ? MY_HOME_ROMANTIC_HOUSE_CARDS.length - 1 : i - 1));
  }, []);

  const next = useCallback(() => {
    setIndex((i) => (i >= MY_HOME_ROMANTIC_HOUSE_CARDS.length - 1 ? 0 : i + 1));
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 lg:left-16 z-[110] bg-black/95 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`낭만 주택 · ${card.title}`}
    >
      <div className="relative z-10 flex items-center justify-between px-4 py-3 shrink-0 border-b border-white/10">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 border border-white/20 text-white text-sm font-bold hover:bg-white/25 transition-colors"
        >
          <X className="w-4 h-4" aria-hidden />
          닫기
        </button>
        <p className="text-white text-sm font-bold">
          {index + 1} / {MY_HOME_ROMANTIC_HOUSE_CARDS.length}
        </p>
        <div className="w-[72px]" />
      </div>

      <div className="flex-1 min-h-0 px-4 pb-4 flex flex-col">
        <div className="flex-1 min-h-0 flex items-center justify-center relative px-10">
          <div className="relative h-full max-h-full aspect-[4/5] w-auto max-w-full rounded-2xl overflow-hidden bg-black/30">
            <Image
              src={card.imageSrc}
              alt={card.title}
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 1024px) 90vw, 480px"
              priority
            />
            <span className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/50 text-white text-xs font-bold z-10">
              {card.cityName}
            </span>
            {priceLabel && (
              <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-bold z-10">
                {priceLabel}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={prev}
            className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 z-10"
            aria-label="이전"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 z-10"
            aria-label="다음"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        <div className="shrink-0 pt-4 text-white">
          <div className="flex items-center gap-2">
            <Image src={card.iconSrc} alt="" width={20} height={20} />
            <h3 className="text-lg font-black">{card.title}</h3>
          </div>
          <p className="text-sm text-white/75 mt-2 leading-relaxed">{card.charmPhrase}</p>
          <p className="text-[10px] text-white/40 mt-3">낭만주택 9월 오픈</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function MyHomeRomanticHousesGallery({ avgPrice1m }: Props) {
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const detailHistoryPushedRef = useRef(false);

  const closeDetail = useCallback(() => {
    if (detailHistoryPushedRef.current) {
      detailHistoryPushedRef.current = false;
      window.history.back();
      return;
    }
    setDetailIndex(null);
  }, []);

  useEffect(() => {
    if (detailIndex == null) return;

    window.history.pushState({ myHomeRomanticDetail: true }, '');
    detailHistoryPushedRef.current = true;

    const onPopState = () => {
      detailHistoryPushedRef.current = false;
      setDetailIndex(null);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [detailIndex]);

  const priceHook =
    avgPrice1m != null && avgPrice1m > 0
      ? `${formatMyHomePriceMan(avgPrice1m)}으로 누리는 자연 주택`
      : '낭만주택 9월 오픈';

  return (
    <>
      <section className="space-y-3">
        <div>
          <p className="text-[11px] font-semibold text-slate-400">{priceHook}</p>
          <h2 className="text-lg font-black text-slate-900 mt-1 leading-snug tracking-tight">
            우리집 가격으로 살 수 있는 낭만 주택
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {MY_HOME_ROMANTIC_HOUSE_CARDS.map((card, i) => (
            <GridCard
              key={card.id}
              card={card}
              avgPrice1m={avgPrice1m}
              onClick={() => setDetailIndex(i)}
            />
          ))}
        </div>

        <p className="text-[10px] text-slate-400 text-center pt-1">
          낭만주택 9월 오픈
        </p>
      </section>

      {detailIndex != null && (
        <DetailModal
          initialIndex={detailIndex}
          avgPrice1m={avgPrice1m}
          onClose={closeDetail}
        />
      )}
    </>
  );
}
