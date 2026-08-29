'use client';

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import {
  ENTRANCE_OPTIONS,
  HEATING_OPTIONS,
  SORT_OPTIONS,
  type ApartmentDiscoverFilters,
  type ApartmentDealMode,
} from '../lib/apartmentDiscoverFilters';
import { PYEONG_FILTER_MAX } from '../lib/aptDiscoverArea';
import { PRICE_FILTER_MAX_EOK, isPriceFilterActive } from '../lib/aptDiscoverPrice';

type Props = {
  open: boolean;
  scrollSection?: string | null;
  filters: ApartmentDiscoverFilters;
  onClose: () => void;
  onApply: (f: ApartmentDiscoverFilters) => void;
  /** 추천 등 — 해당 섹션만 UI에서 숨김 (코드·로직 유지) */
  hiddenSections?: readonly string[];
};

const DEAL_MODES: { id: ApartmentDealMode; label: string }[] = [
  { id: 'sale', label: '매매' },
  { id: 'jeonse', label: '전세' },
  { id: 'wolse', label: '월세' },
];

function SectionHeader({
  title,
  onReset,
}: {
  title: string;
  onReset?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-[15px] font-black text-slate-900">{title}</h4>
      {onReset && (
        <button type="button" className="text-[13px] font-bold text-violet-600" onClick={onReset}>
          초기화
        </button>
      )}
    </div>
  );
}

const DUAL_RANGE_INPUT_CLASS =
  'absolute w-[calc(100%-0.5rem)] left-1 h-10 pointer-events-auto bg-transparent appearance-none cursor-pointer ' +
  '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:bg-transparent ' +
  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 ' +
  '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:border-2 ' +
  '[&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:mt-[-5px] ' +
  '[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:bg-transparent ' +
  '[&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full ' +
  '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-slate-900 ' +
  '[&::-moz-range-thumb]:shadow-sm';

function DualRangeRow({
  min,
  max,
  floor,
  ceil,
  step,
  format,
  onChange,
}: {
  min: number;
  max: number;
  floor: number;
  ceil: number;
  step: number;
  format: (n: number) => string;
  onChange: (min: number, max: number) => void;
}) {
  const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null);

  const span = Math.max(ceil - floor, step);
  const minPct = Math.min(100, Math.max(0, ((min - floor) / span) * 100));
  const maxPct = Math.min(100, Math.max(0, ((max - floor) / span) * 100));
  const midPct = Math.min(98, Math.max(2, (minPct + maxPct) / 2));

  useEffect(() => {
    const end = () => setActiveThumb(null);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, []);

  const handleMinChange = (raw: number) => {
    const clamped = Math.min(raw, max);
    onChange(clamped, max);
  };

  const handleMaxChange = (raw: number) => {
    const clamped = Math.max(raw, min);
    onChange(min, clamped);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-bold text-slate-400 px-0.5">
        <span>{format(floor)}</span>
        <span>{format(ceil)}</span>
      </div>
      <div className="relative h-10 flex items-center px-1 touch-none">
        <div
          className="absolute left-1 right-1 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-slate-200 pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-slate-800 pointer-events-none"
          aria-hidden
          style={{
            left: `calc(0.25rem + (100% - 0.5rem) * ${minPct / 100})`,
            width: `calc((100% - 0.5rem) * ${Math.max(0, maxPct - minPct) / 100})`,
          }}
        />
        <input
          type="range"
          min={floor}
          max={ceil}
          step={step}
          value={min}
          onChange={(e) => handleMinChange(Number(e.target.value))}
          onPointerDown={() => setActiveThumb('min')}
          className={DUAL_RANGE_INPUT_CLASS}
          style={{
            zIndex: activeThumb === 'min' ? 5 : activeThumb === 'max' ? 1 : 3,
            clipPath: `inset(-4px ${100 - midPct}% -4px 0)`,
          }}
        />
        <input
          type="range"
          min={floor}
          max={ceil}
          step={step}
          value={max}
          onChange={(e) => handleMaxChange(Number(e.target.value))}
          onPointerDown={() => setActiveThumb('max')}
          className={DUAL_RANGE_INPUT_CLASS}
          style={{
            zIndex: activeThumb === 'max' ? 5 : activeThumb === 'min' ? 1 : 4,
            clipPath: `inset(-4px 0 -4px ${midPct}%)`,
          }}
        />
      </div>
      <p className="text-center text-xs font-bold text-slate-700">
        {format(min)} ~ {format(max)}
      </p>
    </div>
  );
}

function TogglePills({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) onChange(selected.filter((s) => s !== opt));
    else onChange([...selected, opt]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={[
            'px-4 py-2.5 rounded-xl text-[13px] font-bold border',
            selected.includes(opt)
              ? 'bg-slate-900 border-slate-900 text-white'
              : 'bg-white border-slate-200 text-slate-800',
          ].join(' ')}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function ApartmentDiscoverFilterSheet({
  open,
  scrollSection,
  filters,
  onClose,
  onApply,
  hiddenSections,
}: Props) {
  const [draft, setDraft] = useState(filters);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hidden = new Set(hiddenSections ?? []);
  const showSection = (id: string) => !hidden.has(id);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  useEffect(() => {
    if (!open || !scrollSection || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-section="${scrollSection}"]`);
    if (el instanceof HTMLElement) {
      requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }, [open, scrollSection]);

  if (!mounted || !open) return null;

  const priceFilterActive = isPriceFilterActive(draft.priceMinEok, draft.priceMaxEok);

  const jeonseMin = draft.minJeonseRatePercent ?? 0;
  const jeonseMax = draft.maxJeonseRatePercent ?? 150;
  const gapMinEok = (draft.minGapMan ?? 0) / 10000;
  const gapMaxEok = (draft.maxGapMan ?? 120000) / 10000;
  const parkMin = draft.minParkingPerHousehold ?? 0;
  const parkMax = draft.maxParkingPerHousehold ?? 3;

  const resetAll = () => {
    onApply({
      ...draft,
      pyeongMin: 0,
      pyeongMax: PYEONG_FILTER_MAX,
      priceMinEok: 0,
      priceMaxEok: PRICE_FILTER_MAX_EOK,
      minJeonseRatePercent: null,
      maxJeonseRatePercent: null,
      minGapMan: null,
      maxGapMan: null,
      minHouseholds: null,
      maxBuildingAgeYears: null,
      minParkingPerHousehold: null,
      maxParkingPerHousehold: null,
      maxElementaryNavMinutes: null,
      entranceTypes: [],
      heatingTypes: [],
      sortBy: 'default',
    });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/45" aria-label="닫기" onClick={onClose} />
      <div
        ref={scrollRef}
        className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-black text-slate-900">아파트 필터</h3>
          <button type="button" className="text-sm font-bold text-slate-500" onClick={onClose}>
            닫기
          </button>
        </div>

        <div className="px-5 py-4 space-y-8 pb-32">
          {showSection('deal') && (
          <section data-section="deal">
            <SectionHeader title="매매 · 전월세" />
            <div className="flex gap-2">
              {DEAL_MODES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDraft({ ...draft, dealMode: d.id })}
                  className={[
                    'flex-1 py-3 rounded-xl text-sm font-black border',
                    draft.dealMode === d.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200',
                  ].join(' ')}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </section>
          )}

          {showSection('price') && (
          <section data-section="price">
            <SectionHeader
              title="가격"
              onReset={() =>
                setDraft({
                  ...draft,
                  priceMinEok: 0,
                  priceMaxEok: PRICE_FILTER_MAX_EOK,
                })
              }
            />
            <DualRangeRow
              floor={0}
              ceil={PRICE_FILTER_MAX_EOK}
              step={1}
              min={draft.priceMinEok}
              max={draft.priceMaxEok}
              format={(n) => (n >= PRICE_FILTER_MAX_EOK ? '최대' : `${n}억`)}
              onChange={(lo, hi) =>
                setDraft({
                  ...draft,
                  priceMinEok: lo,
                  priceMaxEok: hi >= PRICE_FILTER_MAX_EOK ? PRICE_FILTER_MAX_EOK : hi,
                })
              }
            />
            <p className="text-[10px] text-slate-400 mt-2">
              {priceFilterActive
                ? `${draft.priceMinEok}억 ~ ${draft.priceMaxEok >= PRICE_FILTER_MAX_EOK ? '최대' : `${draft.priceMaxEok}억`} · 최근 1개월 평균 매매가 기준`
                : '전체 구간 · 슬라이더를 조절하면 매매가로 필터합니다'}
            </p>
          </section>
          )}

          {showSection('area') && (
          <section data-section="area">
            <SectionHeader
              title="평형"
              onReset={() => setDraft({ ...draft, pyeongMin: 0, pyeongMax: PYEONG_FILTER_MAX })}
            />
            <DualRangeRow
              floor={0}
              ceil={PYEONG_FILTER_MAX}
              step={1}
              min={draft.pyeongMin}
              max={draft.pyeongMax}
              format={(n) => (n >= PYEONG_FILTER_MAX ? '최대' : `${n}평`)}
              onChange={(lo, hi) =>
                setDraft({
                  ...draft,
                  pyeongMin: lo,
                  pyeongMax: hi >= PYEONG_FILTER_MAX ? PYEONG_FILTER_MAX : hi,
                })
              }
            />
            <p className="text-[10px] text-slate-400 mt-2">
              전용면적 기준 · 구간에 해당 거래가 없으면 목록에서 제외 · 넓은 구간은 구간 내 최고 평형 시세
            </p>
          </section>
          )}

          {showSection('jeonse') && (
          <section data-section="jeonse">
            <SectionHeader
              title="전세가율"
              onReset={() => setDraft({ ...draft, minJeonseRatePercent: null, maxJeonseRatePercent: null })}
            />
            <DualRangeRow
              floor={0}
              ceil={150}
              step={5}
              min={jeonseMin}
              max={jeonseMax}
              format={(n) => `${n}%`}
              onChange={(lo, hi) =>
                setDraft({
                  ...draft,
                  minJeonseRatePercent: lo <= 0 ? null : lo,
                  maxJeonseRatePercent: hi >= 150 ? null : hi,
                })
              }
            />
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              6개월 batch 매매·전세로 추정한 가율입니다. 전세가율이 없는 단지는 구간 필터 시 목록에서
              빠집니다.
            </p>
          </section>
          )}

          {showSection('gap') && (
          <section data-section="gap">
            <SectionHeader
              title="갭가격"
              onReset={() => setDraft({ ...draft, minGapMan: null, maxGapMan: null })}
            />
            <DualRangeRow
              floor={0}
              ceil={12}
              step={0.5}
              min={gapMinEok}
              max={Math.min(gapMaxEok, 12)}
              format={(n) => `${n}억`}
              onChange={(lo, hi) =>
                setDraft({
                  ...draft,
                  minGapMan: lo <= 0 ? null : Math.round(lo * 10000),
                  maxGapMan: hi >= 12 ? null : Math.round(hi * 10000),
                })
              }
            />
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              매매·전세 추정이 모두 있어야 갭이 계산됩니다. 갭이 없는 단지는 필터 시 제외됩니다.
            </p>
          </section>
          )}

          {showSection('households') && (
          <section data-section="households">
            <SectionHeader title="세대수" onReset={() => setDraft({ ...draft, minHouseholds: null })} />
            <input
              type="range"
              min={0}
              max={2000}
              step={50}
              value={draft.minHouseholds ?? 0}
              onChange={(e) => {
                const v = Number(e.target.value);
                setDraft({ ...draft, minHouseholds: v <= 0 ? null : v });
              }}
              className="w-full accent-slate-800"
            />
            <p className="text-center text-xs font-bold text-slate-700 mt-1">
              {draft.minHouseholds != null ? `${draft.minHouseholds}세대 이상` : '전체'}
            </p>
          </section>
          )}

          {showSection('age') && (
          <section data-section="age">
            <SectionHeader title="입주년차" onReset={() => setDraft({ ...draft, maxBuildingAgeYears: null })} />
            <input
              type="range"
              min={0}
              max={40}
              step={1}
              value={draft.maxBuildingAgeYears ?? 40}
              onChange={(e) => {
                const v = Number(e.target.value);
                setDraft({ ...draft, maxBuildingAgeYears: v >= 40 ? null : v });
              }}
              className="w-full accent-slate-800"
            />
            <p className="text-center text-xs font-bold text-slate-700 mt-1">
              {draft.maxBuildingAgeYears != null ? `${draft.maxBuildingAgeYears}년 이하` : '전체'}
            </p>
          </section>
          )}

          {showSection('parking') && (
          <section data-section="parking">
            <SectionHeader
              title="주차공간"
              onReset={() =>
                setDraft({ ...draft, minParkingPerHousehold: null, maxParkingPerHousehold: null })
              }
            />
            <DualRangeRow
              floor={0}
              ceil={3}
              step={0.1}
              min={parkMin}
              max={parkMax}
              format={(n) => (n === 0 ? '세대당' : `${n.toFixed(1)}대`)}
              onChange={(lo, hi) =>
                setDraft({
                  ...draft,
                  minParkingPerHousehold: lo <= 0 ? null : lo,
                  maxParkingPerHousehold: hi >= 3 ? null : hi,
                })
              }
            />
          </section>
          )}

          {showSection('school') && (
          <section data-section="school">
            <SectionHeader
              title="초등학교(도보)"
              onReset={() => setDraft({ ...draft, maxElementaryNavMinutes: null })}
            />
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={draft.maxElementaryNavMinutes ?? 30}
              onChange={(e) => {
                const v = Number(e.target.value);
                setDraft({ ...draft, maxElementaryNavMinutes: v >= 30 ? null : v });
              }}
              className="w-full accent-slate-800"
            />
            <p className="text-center text-xs font-bold text-slate-700 mt-1">
              {draft.maxElementaryNavMinutes != null ? `${draft.maxElementaryNavMinutes}분 이내` : '전체'}
            </p>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              가까운 초등학교까지 도보 경로 기준입니다. discover 카드에 통학 시간이 없으면 필터가 적용되지 않을 수 있습니다.
            </p>
          </section>
          )}

          {showSection('entrance') && (
          <section data-section="entrance">
            <SectionHeader title="현관구조" onReset={() => setDraft({ ...draft, entranceTypes: [] })} />
            <TogglePills
              options={ENTRANCE_OPTIONS}
              selected={draft.entranceTypes}
              onChange={(entranceTypes) => setDraft({ ...draft, entranceTypes })}
            />
          </section>
          )}

          {showSection('heating') && (
          <section data-section="heating">
            <SectionHeader title="난방방식" onReset={() => setDraft({ ...draft, heatingTypes: [] })} />
            <TogglePills
              options={HEATING_OPTIONS}
              selected={draft.heatingTypes}
              onChange={(heatingTypes) => setDraft({ ...draft, heatingTypes })}
            />
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              선택한 방식과 일치하거나, 난방 정보가 없는 단지도 포함합니다(미등록 = 모름).
            </p>
          </section>
          )}

          {showSection('sort') && (
          <section data-section="sort">
            <SectionHeader title="정렬" onReset={() => setDraft({ ...draft, sortBy: 'default' })} />
            <div className="grid grid-cols-2 gap-2">
              {SORT_OPTIONS.filter((s) => s.id !== 'default').map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setDraft({ ...draft, sortBy: s.id })}
                  className={[
                    'py-2.5 rounded-xl text-[11px] font-bold border',
                    draft.sortBy === s.id
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-white border-slate-200 text-slate-700',
                  ].join(' ')}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </section>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 flex gap-2">
          <button
            type="button"
            className="flex-1 py-3.5 rounded-xl bg-slate-100 font-bold text-slate-700"
            onClick={resetAll}
          >
            초기화
          </button>
          <button
            type="button"
            className="flex-[2] py-3.5 rounded-xl bg-slate-900 font-black text-white"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            적용
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
