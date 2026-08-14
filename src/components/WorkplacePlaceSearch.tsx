'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  searchKakaoPlaceSuggestions,
  suggestionToCoords,
  type KakaoPlaceSuggestion,
} from '../lib/kakaoResolvePlaceQuery';
import { loadKakaoMapsSdk } from '../lib/loadKakaoMapsSdk';

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSelect: (payload: { label: string; lat: number; lng: number }) => void;
  onNotFound?: () => void;
  placeholder?: string;
  theme?: 'dark' | 'light';
  inputClassName?: string;
};

export default function WorkplacePlaceSearch({
  value,
  onChange,
  onSelect,
  onNotFound,
  placeholder = '역·건물명, 주소 검색 (홈 검색과 동일)',
  theme = 'dark',
  inputClassName,
}: Props) {
  const [suggestions, setSuggestions] = useState<KakaoPlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const seqRef = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  /** 부모에서 value를 동기화할 때(새로고침·Firestore) 자동 검색하지 않음 */
  const userEditedRef = useRef(false);
  const isLight = theme === 'light';

  useEffect(() => {
    loadKakaoMapsSdk().catch(() => {});
  }, []);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      if (!q) userEditedRef.current = false;
      return;
    }
    if (!userEditedRef.current) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const seq = ++seqRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const list = await searchKakaoPlaceSuggestions(q);
        if (seq !== seqRef.current) return;
        setSuggestions(list);
        setOpen(list.length > 0);
      } finally {
        if (seq === seqRef.current) setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = useCallback(
    (s: KakaoPlaceSuggestion) => {
      const coords = suggestionToCoords(s);
      if (!coords) return;
      const label = s.place_name || s.road_address_name || s.address_name;
      onChange(label);
      onSelect({ label, lat: coords.lat, lng: coords.lng });
      userEditedRef.current = false;
      setOpen(false);
      setSuggestions([]);
    },
    [onChange, onSelect],
  );

  const applyFirst = async () => {
    const q = value.trim();
    if (q.length < 2) return;
    if (suggestions[0]) {
      pick(suggestions[0]);
      return;
    }
    setLoading(true);
    try {
      const list = await searchKakaoPlaceSuggestions(q);
      if (list[0]) pick(list[0]);
      else onNotFound?.();
    } finally {
      setLoading(false);
    }
  };

  const defaultInputClass = isLight
    ? 'bg-white border-slate-200 text-slate-900'
    : 'bg-black/30 border-white/15';

  return (
    <div ref={wrapRef} className="relative w-full">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          userEditedRef.current = true;
          onChange(e.target.value);
        }}
        onFocus={() => {
          if (userEditedRef.current && suggestions.length > 0) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            applyFirst();
          }
        }}
        className={inputClassName ?? `border rounded-lg px-3 py-2 text-sm w-full ${defaultInputClass}`}
      />
      {loading && (
        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
          …
        </span>
      )}
      {open && suggestions.length > 0 && (
        <div
          className={`absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-xl border shadow-lg ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/15'
          }`}
        >
          {suggestions.map((s, i) => (
            <button
              key={`${s.x}-${s.y}-${i}`}
              type="button"
              onClick={() => pick(s)}
              className={`w-full text-left px-3 py-2.5 border-b last:border-0 text-xs ${
                isLight ? 'hover:bg-emerald-50 border-slate-100' : 'hover:bg-white/5 border-white/10'
              }`}
            >
              <div className={`font-bold truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>
                {s.place_name || s.address_name}
              </div>
              <div className={`truncate ${isLight ? 'text-slate-500' : 'text-white/45'}`}>
                {s.road_address_name || s.address_name}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
