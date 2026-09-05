'use client';

import type {
  ListingLiteBuildingMetrics,
  ListingLiteBuildingPastTrade,
  ListingLiteBuildingSpec,
  ListingLiteLandSpec,
} from '@/lib/listingInventory';

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
      <span className="text-[11px] text-slate-500 font-semibold shrink-0">{label}</span>
      <span className="text-[13px] font-bold text-slate-900 text-right">{value}</span>
    </div>
  );
}

function formatWonPerPyeong(won: number | null | undefined): string {
  if (won == null || !Number.isFinite(won) || won <= 0) return '-';
  return `${won.toLocaleString()}원/평`;
}

function formatCompactWon(won: number | null | undefined): string {
  if (won == null || !Number.isFinite(won) || won <= 0) return '-';
  if (won >= 100_000_000) {
    const eok = won / 100_000_000;
    return eok >= 10 ? `${Math.round(eok)}억` : `${eok.toFixed(1).replace(/\.0$/, '')}억`;
  }
  if (won >= 10_000_000) {
    return `${(won / 10_000_000).toFixed(1).replace(/\.0$/, '')}천`;
  }
  if (won >= 10_000) {
    return `${Math.round(won / 10_000)}만`;
  }
  return won.toLocaleString();
}

function formatDealAmount(man: number | null | undefined): string {
  if (man == null || !Number.isFinite(man) || man <= 0) return '-';
  if (man >= 10_000) {
    const eok = man / 10_000;
    return eok % 1 === 0 ? `${eok}억` : `${eok.toFixed(1)}억`;
  }
  return `${man.toLocaleString()}만`;
}

function formatPctChange(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return '-';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct}%`;
}

function MetricCell({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'land' | 'building';
}) {
  const toneClass = tone === 'land'
    ? 'bg-amber-50 border-amber-200'
    : tone === 'building'
      ? 'bg-sky-50 border-sky-200'
      : 'bg-slate-50 border-slate-200';

  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <p className="text-[10px] font-bold text-slate-500">{label}</p>
      <p className="text-sm font-black text-slate-900 mt-1 leading-snug">{value}</p>
    </div>
  );
}

export default function ListingBuildingLiteSections({
  variant = 'building',
  metrics,
  landSpec,
  buildingSpec,
  pastTrades = [],
}: {
  variant?: 'building' | 'store' | 'house';
  metrics?: ListingLiteBuildingMetrics | null;
  landSpec?: ListingLiteLandSpec | null;
  buildingSpec?: ListingLiteBuildingSpec | null;
  pastTrades?: ListingLiteBuildingPastTrade[];
}) {
  const isStore = variant === 'store';
  const isHouse = variant === 'house';
  const specTitle = isHouse ? '주택 스펙' : isStore ? '상가 스펙' : '빌딩 스펙';
  const areaLabel = isHouse || isStore ? '전용면적' : '총 연면적';
  const unitLabel = isHouse ? '전용평당' : isStore ? '평당가' : '건물단가';
  const scaleLabel = isStore ? '층' : '규모';
  const scaleValue = isStore
    ? (metrics?.floor || metrics?.scale || buildingSpec?.scale || '-')
    : (metrics?.scale || buildingSpec?.scale || '-');
  const pastTradesEmpty = isHouse
    ? '동일 지번 단독·연립 실거래 이력이 없습니다.'
    : '동일 지번 상업업무용 실거래 이력이 없습니다.';
  const buildingInfoTitle = isStore ? '점포·건물정보' : '건물정보';
  const changeLabel = isHouse ? '전용평당' : '토지단가당';
  const landUnitColLabel = isHouse ? '대지평당(3.3㎡)' : '토지단가(3.3㎡)';
  const buildingUnitColLabel = isHouse ? '전용평당(3.3㎡)' : '건물단가(3.3㎡)';
  const landPyeongLabel = metrics?.landPyeong != null
    ? `${metrics.landPyeong.toLocaleString()}평`
    : landSpec?.pyeong != null
      ? `${landSpec.pyeong.toLocaleString()}평`
      : '-';

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-xs font-extrabold text-slate-900 mb-3">{specTitle}</h3>
        <div className="grid grid-cols-2 gap-2">
          <MetricCell label="토지면적" value={landPyeongLabel} tone="land" />
          <MetricCell
            label="토지단가"
            value={formatWonPerPyeong(metrics?.landUnitPricePerPyeongWon)}
            tone="land"
          />
          <MetricCell
            label={areaLabel}
            value={metrics?.totalFloorPyeong != null
              ? `${metrics.totalFloorPyeong.toLocaleString()}평`
              : '-'}
            tone="building"
          />
          <MetricCell
            label={unitLabel}
            value={formatWonPerPyeong(metrics?.buildingUnitPricePerPyeongWon)}
            tone="building"
          />
          <MetricCell label={scaleLabel} value={scaleValue} />
          <MetricCell label="노후" value={metrics?.ageLabel || buildingSpec?.ageLabel || '-'} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-xs font-extrabold text-slate-900 mb-3">과거 거래내역</h3>
        {pastTrades.length === 0 ? (
          <p className="text-xs text-slate-500 font-semibold py-2 text-center">
            {pastTradesEmpty}
          </p>
        ) : (
          <div className="space-y-2">
            {pastTrades.slice(0, 5).map((trade) => (
              <div
                key={trade.label}
                className="rounded-xl border border-slate-100 bg-slate-50 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-black w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
                      {trade.label}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {trade.buildingUse || '-'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                        {trade.dealDateShort || '-'}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-emerald-600 shrink-0">
                    {formatDealAmount(trade.dealAmountMan)}
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200/80 grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <p className="text-slate-400 font-bold">{changeLabel}</p>
                    <p className="font-extrabold text-amber-700 mt-0.5">
                      {formatPctChange(trade.landPriceChangePct)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold">{landUnitColLabel}</p>
                    <p className="font-extrabold text-slate-800 mt-0.5">
                      {formatCompactWon(trade.landPricePerPyeongWon)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold">{buildingUnitColLabel}</p>
                    <p className="font-extrabold text-slate-800 mt-0.5">
                      {formatCompactWon(trade.buildingPricePerPyeongWon)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-xs font-extrabold text-slate-900 mb-2">토지정보</h3>
        <div>
          {landSpec?.jimok && <SpecRow label="지목" value={landSpec.jimok} />}
          {landSpec?.zoning && <SpecRow label="용도지역" value={landSpec.zoning} />}
          {(landSpec?.pyeong != null || landSpec?.areaM2 != null) && (
            <SpecRow
              label="면적"
              value={[
                landSpec.pyeong != null ? `${landSpec.pyeong.toLocaleString()}평` : null,
                landSpec.areaM2 != null ? `${landSpec.areaM2.toLocaleString()}㎡` : null,
              ].filter(Boolean).join(' · ')}
            />
          )}
          {landSpec?.roadCondition && (
            <SpecRow label="도로조건" value={landSpec.roadCondition} />
          )}
          {landSpec?.officialPricePerPyeong != null && (
            <SpecRow
              label="공시지가"
              value={formatWonPerPyeong(landSpec.officialPricePerPyeong)}
            />
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-xs font-extrabold text-slate-900 mb-2">{buildingInfoTitle}</h3>
        {buildingSpec?.dongName && (
          <p className="text-[11px] font-bold text-slate-600 mb-2">{buildingSpec.dongName}</p>
        )}
        <div>
          {buildingSpec?.mainPurpose && (
            <SpecRow label="주용도" value={buildingSpec.mainPurpose} />
          )}
          {buildingSpec?.approvalDate && (
            <SpecRow label="사용승인" value={buildingSpec.approvalDate} />
          )}
          {buildingSpec?.structure && (
            <SpecRow label="주구조" value={buildingSpec.structure} />
          )}
          {buildingSpec?.archAreaPyeong != null && (
            <SpecRow
              label="건축면적"
              value={`${buildingSpec.archAreaPyeong.toLocaleString()}평`}
            />
          )}
          {buildingSpec?.coverageRatio != null && (
            <SpecRow
              label="건폐율"
              value={`${Number(buildingSpec.coverageRatio).toFixed(1)}%`}
            />
          )}
          {buildingSpec?.totalFloorPyeong != null && (
            <SpecRow
              label="연면적"
              value={`${buildingSpec.totalFloorPyeong.toLocaleString()}평`}
            />
          )}
          {buildingSpec?.floorAreaRatio != null && (
            <SpecRow
              label="용적률"
              value={`${Number(buildingSpec.floorAreaRatio).toFixed(2)}%`}
            />
          )}
          {buildingSpec?.officialHousePricePerPyeong != null && (
            <SpecRow
              label="공시주택가"
              value={formatWonPerPyeong(buildingSpec.officialHousePricePerPyeong)}
            />
          )}
        </div>
      </section>
    </>
  );
}
