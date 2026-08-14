'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, MapPin, X } from 'lucide-react';
import {
  searchKakaoPlaceSuggestions,
  suggestionToCoords,
} from '../../lib/kakaoResolvePlaceQuery';
import { loadKakaoMapsSdk } from '../../lib/loadKakaoMapsSdk';
import type { MyHomeWorkplace } from '../../lib/myHomeTypes';
import WorkplacePlaceSearch from '../WorkplacePlaceSearch';

type Props = {
  workplace: MyHomeWorkplace;
  onSave: (next: MyHomeWorkplace) => void;
  compact?: boolean;
};

export default function MyHomeWorkplaceField({ workplace, onSave, compact }: Props) {
  const [input, setInput] = useState(workplace.workplaceLabel ?? '');
  const geocodingRef = useRef(false);

  useEffect(() => {
    setInput(workplace.workplaceLabel ?? '');
  }, [workplace.workplaceLabel]);

  const isSet = workplace.workLat != null && workplace.workLng != null;

  /** 라벨만 저장된 경우(좌표 누락) — 1회 자동 보정 */
  useEffect(() => {
    const label = workplace.workplaceLabel?.trim();
    if (!label || isSet || geocodingRef.current) return;

    geocodingRef.current = true;
    let cancelled = false;

    void (async () => {
      try {
        await loadKakaoMapsSdk().catch(() => {});
        const list = await searchKakaoPlaceSuggestions(label);
        if (cancelled || !list[0]) return;
        const coords = suggestionToCoords(list[0]);
        if (!coords) return;
        onSave({
          workplaceLabel: list[0].place_name || label,
          workLat: coords.lat,
          workLng: coords.lng,
        });
      } finally {
        if (!cancelled) geocodingRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [workplace.workplaceLabel, isSet, onSave]);

  const clearWorkplace = () => {
    setInput('');
    onSave({});
  };

  const handleSave = useCallback(
    (next: MyHomeWorkplace) => {
      onSave(next);
    },
    [onSave],
  );

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-shadow';

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2.5">
      <div className="flex items-center gap-1.5">
        <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
        <h3 className="text-sm font-black text-slate-900">직장 · 목적지</h3>
        {isSet && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            <CheckCircle2 className="w-3 h-3" />
            저장됨
          </span>
        )}
      </div>
      {!compact && (
        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
          출근 시간 비교를 위해 직장 주소지를 입력하세요.
        </p>
      )}
      <div className="flex gap-2 items-start">
        <div className="flex-1 min-w-0">
          <WorkplacePlaceSearch
            key={`${workplace.workplaceLabel ?? ''}:${workplace.workLat ?? ''}:${workplace.workLng ?? ''}`}
            theme="light"
            value={input}
            onChange={setInput}
            onSelect={({ label, lat, lng }) => {
              setInput(label);
              handleSave({ workplaceLabel: label, workLat: lat, workLng: lng });
            }}
            placeholder="역·건물명 또는 주소 검색"
            inputClassName={inputClass}
          />
        </div>
        {isSet && (
          <button
            type="button"
            onClick={clearWorkplace}
            title="직장 지우기"
            className="shrink-0 flex items-center justify-center w-11 h-[42px] rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </section>
  );
}
