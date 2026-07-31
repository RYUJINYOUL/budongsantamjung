'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, MapPin, X } from 'lucide-react';
import {
  loadCompareProfile,
  saveCompareProfile,
  type ApartmentCompareProfile,
} from '../lib/apartmentCompareBasket';
import { MORTGAGE_DISCLAIMER } from '../lib/apartmentCompareProfile';
import WorkplacePlaceSearch from './WorkplacePlaceSearch';

type CompareProfileBarProps = {
  variant?: 'home' | 'compare';
  compact?: boolean;
  theme?: 'dark' | 'light';
  showCompareTableLink?: boolean;
  showBudgetFilterToggle?: boolean;
  budgetFilter?: boolean;
  onBudgetFilterChange?: (v: boolean) => void;
  mortgageDisclaimer?: string | null;
  showMortgageFooter?: boolean;
};

function useCompareProfileState() {
  const [profile, setProfile] = useState<ApartmentCompareProfile>({ firstTimeBuyer: true });

  const sync = useCallback(() => {
    setProfile(loadCompareProfile());
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener('apartment-compare-profile-updated', sync);
    return () => window.removeEventListener('apartment-compare-profile-updated', sync);
  }, [sync]);

  return profile;
}

const summaryChipClass = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold border ${
    active
      ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
      : 'border-white/10 bg-white/[0.03] text-white/35'
  }`;

/** 비교 조건 입력 아래 — 현재 프로필 요약 칩 */
export function CompareProfileSummaryChips({ className = '' }: { className?: string }) {
  const profile = useCompareProfileState();
  const commute = profile.maxCommuteMinutes?.trim() || null;
  const workplace =
    profile.workLat != null && profile.workplaceLabel?.trim()
      ? profile.workplaceLabel.trim()
      : null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <span className={summaryChipClass(!!commute)}>
        <Clock className="w-3.5 h-3.5 shrink-0 opacity-80" />
        {commute ? `통근 ${commute}분 이내` : '통근 상한 없음'}
      </span>
      {workplace && (
        <span className={`${summaryChipClass(true)} max-w-full`}>
          <MapPin className="w-3.5 h-3.5 shrink-0 opacity-80" />
          <span className="truncate max-w-[min(100%,14rem)]">{workplace}</span>
        </span>
      )}
    </div>
  );
}

export default function CompareProfileBar({
  variant = 'compare',
  compact = false,
  theme = 'dark',
  showCompareTableLink = true,
  mortgageDisclaimer = null,
  showMortgageFooter = true,
}: CompareProfileBarProps) {
  const [profile, setProfile] = useState<ApartmentCompareProfile>({ firstTimeBuyer: true });
  const [workplaceInput, setWorkplaceInput] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const sync = useCallback(() => {
    const p = loadCompareProfile();
    setProfile(p);
    setWorkplaceInput(p.workplaceLabel ?? '');
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener('apartment-compare-profile-updated', sync);
    return () => window.removeEventListener('apartment-compare-profile-updated', sync);
  }, [sync]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const patchProfile = (patch: Partial<ApartmentCompareProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      saveCompareProfile(next);
      return next;
    });
  };

  const applyWorkplaceCoords = (label: string, lat: number, lng: number) => {
    patchProfile({ workplaceLabel: label, workLat: lat, workLng: lng });
    setWorkplaceInput(label);
    showToast('직장 위치를 저장했습니다.');
  };

  const clearWorkplace = () => {
    patchProfile({ workplaceLabel: '', workLat: undefined, workLng: undefined });
    setWorkplaceInput('');
  };

  const isLight = theme === 'light';
  const isCompare = variant === 'compare';
  const disclaimerText = (mortgageDisclaimer?.trim() || MORTGAGE_DISCLAIMER).trim();

  const shell = isCompare
    ? 'rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 sm:p-5 flex flex-col gap-4'
    : `rounded-xl border ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/[0.03]'} ${compact ? 'p-3 gap-2' : 'p-4 gap-3'} flex flex-col`;

  const fieldLabel = `text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-white/45'}`;
  const inputBase = isLight
    ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
    : 'bg-black/40 border-white/12 text-white placeholder:text-white/25';
  const inputClass = `w-full rounded-xl border px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-shadow ${inputBase}`;

  if (isCompare) {
    return (
      <div className={shell}>
        {(showCompareTableLink || toast) && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {showCompareTableLink && (
              <Link href="/compare/apartments" className="text-[10px] font-bold text-emerald-500 hover:underline">
                단지 비교표 →
              </Link>
            )}
            {toast && <p className="text-[10px] text-amber-300/90 ml-auto">{toast}</p>}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4">
          <label className="sm:col-span-4 flex flex-col gap-1.5">
            <span className={fieldLabel}>통근 시간</span>
            <div className="relative">
              <input
                type="number"
                min={1}
                placeholder="90"
                value={profile.maxCommuteMinutes ?? ''}
                onChange={(e) => patchProfile({ maxCommuteMinutes: e.target.value })}
                className={`${inputClass} pr-9`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-white/35 pointer-events-none">
                분
              </span>
            </div>
          </label>

          <label className="sm:col-span-8 flex flex-col gap-1.5">
            <span className={fieldLabel}>직장 · 목적지</span>
            <div className="relative flex gap-2">
              <div className="flex-1 min-w-0">
                <WorkplacePlaceSearch
                  theme={theme}
                  value={workplaceInput}
                  onChange={setWorkplaceInput}
                  onSelect={({ label, lat, lng }) => applyWorkplaceCoords(label, lat, lng)}
                  onNotFound={() =>
                    showToast('장소를 찾지 못했습니다. 목록에서 선택하거나 다른 키워드를 입력해 주세요.')
                  }
                  placeholder="역·건물명 또는 주소 검색"
                  inputClassName={inputClass}
                />
              </div>
              {profile.workLat != null && (
                <button
                  type="button"
                  onClick={clearWorkplace}
                  title="직장 지우기"
                  className="shrink-0 flex items-center justify-center w-11 rounded-xl border border-white/12 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </label>
        </div>

        {showMortgageFooter && (
          <p className="text-[10px] text-white/30 leading-relaxed">
            {disclaimerText}
            <span className="text-white/25"> · </span>
            대출 가능액은 표 「대출」 행에서 시세·LTV·cap 기준으로 표시됩니다
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={shell}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-white/40'}`}>
          비교 프로필
        </span>
        {showCompareTableLink && (
          <Link href="/compare/apartments" className="text-[10px] font-bold text-emerald-600 hover:underline">
            단지 비교표 →
          </Link>
        )}
      </div>
      <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-white/35'}`}>
        예산·가격 필터는 발굴 「가격」에서 설정합니다. 통근·직장은 단지 비교표에서 설정하세요.
      </p>
      {toast && <p className="text-[10px] text-amber-300/90">{toast}</p>}
    </div>
  );
}
