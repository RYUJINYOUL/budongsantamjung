'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  EVENT_CATEGORY_LABELS,
} from '../../lib/developmentEventDisplay';
import {
  TrendingUp, MapPin, FileText, Sparkles, Info, ExternalLink, BarChart3,
} from 'lucide-react';

const GosiMap = dynamic(() => import('../GosiMap'), { ssr: false });

type ClassifiedItem = {
  title?: string;
  date?: string;
  gosiDate?: string;
  url?: string;
  lat?: number | null;
  lng?: number | null;
  projectType?: string;
  propertyTier?: string;
  propertyTierLabel?: string;
  propertyTierMethod?: string;
  distKm?: number;
  distLabel?: string;
};

type TierInfo = {
  tier: string;
  label: string;
  method?: string;
  distLabel?: string;
};

function formatDate(raw?: string) {
  if (!raw) return '';
  const s = String(raw).replace(/[^0-9]/g, '');
  if (s.length >= 8) return `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}`;
  if (s.length >= 6) return `${s.slice(0, 4)}.${s.slice(4, 6)}`;
  return raw;
}

function flattenRegionalFactors(regional?: Record<string, { label?: string; items?: ClassifiedItem[] }>) {
  const rows: Array<{
    title: string;
    categoryLabel: string;
    gosiDate: string;
    url: string;
    lat: number | null;
    lng: number | null;
    projectType: string;
    propertyTier?: string;
    propertyTierLabel?: string;
    propertyTierMethod?: string;
    distLabel?: string;
  }> = [];

  if (!regional) return rows;

  Object.values(regional).forEach((factor) => {
    (factor.items || []).forEach((item) => {
      if (!item.title) return;
      rows.push({
        title: item.title,
        categoryLabel: factor.label || item.projectType || '개발 호재',
        gosiDate: item.gosiDate || item.date || '',
        url: item.url || '',
        lat: item.lat ?? null,
        lng: item.lng ?? null,
        projectType: item.projectType || factor.label || '개발계획',
        propertyTier: item.propertyTier,
        propertyTierLabel: item.propertyTierLabel,
        propertyTierMethod: item.propertyTierMethod,
        distLabel: item.distLabel,
      });
    });
  });

  return rows.sort((a, b) => String(b.gosiDate).localeCompare(String(a.gosiDate)));
}

function buildTierByTitle(
  propertyHits: Array<{ title?: string; tier?: string; method?: string; distKm?: number }> = [],
  filtered?: Record<string, { items?: ClassifiedItem[] }>,
): Map<string, TierInfo> {
  const map = new Map<string, TierInfo>();

  propertyHits.forEach((h) => {
    if (!h.title) return;
    map.set(h.title, {
      tier: h.tier || 'unknown',
      label: h.tier === 'direct' ? '직접수혜' : h.tier === 'indirect' ? '간접' : h.tier === 'weak' ? '약한' : '근접',
      method: h.method,
      distLabel: h.distKm != null ? `약 ${h.distKm}km` : undefined,
    });
  });

  if (filtered) {
    Object.values(filtered).forEach((group) => {
      (group.items || []).forEach((item) => {
        if (!item.title || !item.propertyTier) return;
        if (map.has(item.title)) return;
        map.set(item.title, {
          tier: item.propertyTier,
          label: item.propertyTierLabel || item.propertyTier,
          method: item.propertyTierMethod,
          distLabel: item.distLabel,
        });
      });
    });
  }

  return map;
}

function TierBadge({ tierInfo }: { tierInfo?: TierInfo }) {
  if (!tierInfo) {
    return (
      <span className="text-[9px] font-bold text-slate-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
        지역
      </span>
    );
  }
  const t = tierInfo.tier;
  const cls = t === 'direct'
    ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
    : t === 'indirect'
      ? 'text-sky-300 bg-sky-500/15 border-sky-500/30'
      : t === 'weak'
        ? 'text-amber-300 bg-amber-500/15 border-amber-500/30'
        : 'text-teal-300 bg-teal-500/15 border-teal-500/30';
  return (
    <span className={`text-[9px] font-black border px-2 py-0.5 rounded-md ${cls}`}>
      {tierInfo.label}
      {tierInfo.method === 'zone' ? ' · zone' : ''}
      {tierInfo.distLabel ? ` · ${tierInfo.distLabel}` : ''}
    </span>
  );
}

function PriceBenchmarkCard({ bench }: { bench?: Record<string, any> }) {
  if (!bench) return null;

  const target = bench.targetPyeongMan;
  const areaBasisLabel = bench.areaBasis === 'supply'
    ? '공급㎡'
    : bench.areaBasis === 'exclusive'
      ? '전용㎡'
      : null;
  const levels = [
    { key: 'dong', label: bench.dong?.name || '동' },
    { key: 'sigungu', label: bench.sigungu?.name || '구' },
  ].filter((l) => bench[l.key]?.pyeongMan != null);

  if (!levels.length && target == null) return null;

  const maxVal = Math.max(
    target || 0,
    ...levels.map((l) => bench[l.key]?.pyeongMan || 0),
  ) || 1;

  return (
    <section className="bg-slate-900 border border-white/5 rounded-[32px] p-6 shadow-xl">
      <div className="flex items-center gap-2 mb-5">
        <BarChart3 className="w-5 h-5 text-sky-400" />
        <h4 className="text-sm font-black text-slate-200">평당가 비교</h4>
        {areaBasisLabel && (
          <span className="text-[10px] font-bold text-sky-400/70">{areaBasisLabel} 기준</span>
        )}
        {bench.fallbackApplied && (
          <span className="text-[10px] font-bold text-amber-400/80 ml-auto">12개월 기준</span>
        )}
      </div>
      {target != null && (
        <p className="text-xs text-slate-400 mb-4">
          이 매물 추정 <span className="text-white font-black">{target.toLocaleString()}만/평</span>
        </p>
      )}
      <div className="space-y-4">
        {levels.map(({ key, label }) => {
          const val = bench[key].pyeongMan as number;
          const ratio = bench[key].ratio;
          const pct = Math.round((val / maxVal) * 100);
          const isHigh = ratio != null && ratio > 1.05;
          const isLow = ratio != null && ratio < 0.95;
          return (
            <div key={key}>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="font-bold text-slate-300">{label}</span>
                <span className={`font-black ${isHigh ? 'text-rose-400' : isLow ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {val.toLocaleString()}만/평
                  {ratio != null && ` (${ratio}x)`}
                </span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${isHigh ? 'bg-rose-500/70' : isLow ? 'bg-emerald-500/70' : 'bg-sky-500/50'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function describeRankInterpretation(
  rank: number,
  total: number,
  kind: 'proximity' | 'volume',
) {
  if (!total || rank < 1) return null;
  const isTop = rank <= Math.ceil(total * 0.25);
  const isBottom = rank >= Math.ceil(total * 0.75);

  if (kind === 'proximity') {
    if (isTop) {
      return `${total}개 읍·면·동 중 ${rank}위 — 시군구 내에서 개발 호재(교통·산업단지·개발구역 등)와 가깝고 수혜를 많이 받는 편에 속합니다.`;
    }
    if (isBottom) {
      return `${total}개 읍·면·동 중 ${rank}위 — 시군구 내 다른 지역에 비해 개발 호재와의 거리·수혜가 상대적으로 먼 편에 속합니다.`;
    }
    return `${total}개 읍·면·동 중 ${rank}위 — 시군구 내 중간 수준의 호재 근접·수혜 입지입니다.`;
  }

  if (isTop) {
    return `${total}개 읍·면·동 중 ${rank}위 — 시군구 내 거래가 활발한 상위권 지역입니다.`;
  }
  if (isBottom) {
    return `${total}개 읍·면·동 중 ${rank}위 — 시군구 내 거래량이 상대적으로 적은 하위권 지역입니다.`;
  }
  return `${total}개 읍·면·동 중 ${rank}위 — 시군구 내 거래량 중간 수준 지역입니다.`;
}

function DongRankingCard({ ctx }: { ctx?: Record<string, any> }) {
  const vol = ctx?.dongRanking?.tradeVolumeRank;
  const prox = ctx?.dongRanking?.proximityRank;
  if (!vol && !prox) return null;

  const dongLabel = ctx?.umdNm || '해당 지역';
  const regionName = ctx?.guidelineContext?.regionName || ctx?.dataConfidence?.regionName || '';

  return (
    <section className="bg-slate-900 border border-white/5 rounded-[32px] p-6 shadow-xl space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-teal-400" />
        <h4 className="text-sm font-black text-slate-200">동 내 상대 위치</h4>
        {dongLabel && (
          <span className="text-[10px] font-bold text-teal-400/80 ml-auto">{dongLabel}</span>
        )}
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        이 매물이 속한 <span className="text-slate-300 font-bold">{dongLabel}</span>
        {regionName ? `(${regionName})` : ''}이 시군구 내 다른 읍·면·동과 비교했을 때
        거래 활성도·개발 호재 근접 측면에서 어느 정도 상대적 입지·투자 맥락에 있는지 보여주는 참고 지표입니다.
      </p>

      <div className="rounded-2xl bg-white/[0.02] border border-white/5 px-4 py-3 space-y-2 text-[11px] text-slate-400 leading-relaxed">
        <p><span className="text-slate-300 font-bold">동 내 상대 위치</span> — 시군구 내 읍·면·동 단위로, 이 지역의 상대적 순위·점수입니다.</p>
        <p><span className="text-slate-300 font-bold">{dongLabel}</span> — 매물이 속한 행정구역(읍·면·동) 이름입니다.</p>
        <p><span className="text-slate-300 font-bold">호재 근접</span> — 교통, 산업단지, 개발구역 등 주변 개발 호재와의 거리·수혜를 반영한 순위입니다.</p>
        <p><span className="text-slate-300 font-bold">거래량 순위</span> — 최근 실거래 건수 기준, 시군구 내 거래가 얼마나 활발한지 순위입니다.</p>
        <p><span className="text-slate-300 font-bold">N/M 표기</span> — 시군구 내 비교 대상 {prox?.total || vol?.total || '-'}개 읍·면·동 중 순위입니다. <span className="text-teal-300/90 font-bold">1위가 가장 유리</span>합니다.</p>
      </div>

      <div className="space-y-3 text-sm">
        {vol?.rank != null && (
          <div className="rounded-xl bg-white/[0.02] border border-white/5 px-4 py-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400 text-[11px] font-bold">거래량 순위</span>
              <span className="font-black text-slate-200">
                {vol.rank}/{vol.total}
                {vol.percentile != null && (
                  <span className="text-teal-400/80 text-[11px] ml-1.5">(상위 {vol.percentile}%)</span>
                )}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {describeRankInterpretation(vol.rank, vol.total, 'volume')}
            </p>
          </div>
        )}
        {prox?.rank != null && (
          <div className="rounded-xl bg-white/[0.02] border border-white/5 px-4 py-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400 text-[11px] font-bold">호재 근접</span>
              <span className="font-black text-slate-200">
                {prox.rank}/{prox.total}
                {prox.percentile != null && (
                  <span className="text-teal-400/80 text-[11px] ml-1.5">(상위 {prox.percentile}%)</span>
                )}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {describeRankInterpretation(prox.rank, prox.total, 'proximity')}
            </p>
          </div>
        )}
        {prox?.score != null && prox.rank == null && (
          <div className="rounded-xl bg-white/[0.02] border border-white/5 px-4 py-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400 text-[11px] font-bold">호재 근접 점수</span>
              <span className="font-black text-slate-200">{prox.score}</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              읍·면·동 단위 호재 근접·수혜 점수입니다. 순위 산출에 필요한 비교 대상이 부족할 때 점수만 표시됩니다.
            </p>
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-500 pt-2 border-t border-white/5 leading-relaxed">
        해석 참고: 순위는 <span className="text-slate-400">1위 = 가장 유리</span> 방식입니다.
        {prox?.rank != null && prox.total != null && prox.rank >= Math.ceil(prox.total * 0.75) && (
          <> 예를 들어 호재 근접 {prox.rank}/{prox.total}은 시군구 내 다른 지역 대비 호재 수혜가 상대적으로 먼 편에 해당합니다.</>
        )}
        {' '}개별 매물 단위가 아닌 <span className="text-slate-400">읍·면·동(지역) 단위</span> 비교이며, 가격·수익률 예측이 아닙니다.
      </p>
    </section>
  );
}

function BuildingLayerCard({
  buildingLayer,
  marketContext,
}: {
  buildingLayer?: Record<string, any> | null;
  marketContext?: Record<string, any> | null;
}) {
  if (!buildingLayer?.totalValueMan) return null;

  const vacancy = marketContext?.vacancy?.latest ?? marketContext?.vacancy;
  const cap = marketContext?.capRate;

  return (
    <section className="bg-slate-900 border border-violet-500/20 rounded-[32px] p-6 shadow-xl">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-violet-400" />
        <h4 className="text-sm font-black text-slate-200">건물 레이어</h4>
        <span className="text-[10px] font-bold text-violet-400/70 ml-auto">토지 SSOT와 분리</span>
      </div>
      <p className="text-lg font-black text-white mb-3">
        Nts 잔존 {(buildingLayer.totalValueMan / 10000).toFixed(1)}억
      </p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-slate-500 text-xs">준공·구조</p>
          <p className="font-bold text-slate-200">
            {buildingLayer.buildYear || '-'} · {buildingLayer.structure || '-'}
          </p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">용도</p>
          <p className="font-bold text-slate-200">{buildingLayer.usage || '-'}</p>
        </div>
        {vacancy != null && (
          <div>
            <p className="text-slate-500 text-xs">공실</p>
            <p className="font-bold text-slate-200">{vacancy}%</p>
          </div>
        )}
        {cap != null && (
          <div>
            <p className="text-slate-500 text-xs">CAP</p>
            <p className="font-bold text-slate-200">{cap}%</p>
          </div>
        )}
      </div>
      {buildingLayer.note && (
        <p className="text-[11px] text-slate-500 mt-3">{buildingLayer.note}</p>
      )}
    </section>
  );
}

function describeCsiLevel(value: number) {
  if (value >= 100) return 'positive';
  if (value >= 90) return 'neutral';
  return 'negative';
}

function describeCsiVsBaseline(value: number, regionLabel: string) {
  const level = describeCsiLevel(value);
  if (level === 'positive') {
    return `${regionLabel} ${value} — 기준선(100) 이상으로, 상승·개선 쪽으로 보는 사람이 더 많습니다.`;
  }
  if (level === 'neutral') {
    return `${regionLabel} ${value} — 기준선(100)보다 다소 낮지만, 극단적으로 위축된 수준은 아닙니다.`;
  }
  return `${regionLabel} ${value} — 기준선(100)보다 낮아, 하락·악화 쪽으로 보는 사람이 더 많습니다.`;
}

function describeCsiTrend(trend?: string) {
  if (!trend || trend === '데이터 부족') return '최근 추세를 판단하기에 데이터가 부족합니다.';
  if (trend.includes('↑')) return '최근 3개월 흐름은 소비 심리가 오르는 상승세입니다.';
  if (trend.includes('↓')) return '최근 3개월 흐름은 소비 심리가 내려가는 하락세입니다.';
  return '최근 3개월 흐름은 큰 변동 없이 보합입니다.';
}

function SentimentCard({ sentiment }: { sentiment?: Record<string, any> | null }) {
  if (!sentiment?.nationwide) return null;

  const nationwide = Number(sentiment.nationwide);
  const sidoValue = sentiment.sido?.value != null ? Number(sentiment.sido.value) : null;
  const sidoName = sentiment.sido?.name as string | undefined;
  const asOf = sentiment.asOf as string | undefined;
  const trend = sentiment.trend as string | undefined;

  const indexLabel =
    sentiment.indexKey === 'land'
      ? '토지시장 CSI'
      : sentiment.indexKey === 'housing'
        ? '주택시장 CSI'
        : '주택매매 CSI';

  return (
    <section className="bg-slate-900 border border-white/5 rounded-[32px] p-6 shadow-xl space-y-4">
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
          CSI · 소비자동향지수 (참고)
        </p>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          소비자가 체감하는 경기·집값·물가 등에 대한 심리를 0~200 숫자로 나타낸 통계입니다.
          기준선 <span className="text-slate-300 font-bold">100</span>을 넘으면 긍정(상승·개선) 전망이,
          100 미만이면 부정(하락·악화) 전망이 더 많다는 뜻입니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 px-4 py-3">
          <p className="text-[10px] font-bold text-slate-500 mb-1">전국</p>
          <p className={`text-2xl font-black ${
            describeCsiLevel(nationwide) === 'positive' ? 'text-emerald-300' : 'text-slate-200'
          }`}>
            {nationwide}
          </p>
        </div>
        {sidoValue != null && sidoName && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/5 px-4 py-3">
            <p className="text-[10px] font-bold text-slate-500 mb-1">{sidoName}</p>
            <p className={`text-2xl font-black ${
              describeCsiLevel(sidoValue) === 'positive' ? 'text-emerald-300' : 'text-slate-200'
            }`}>
              {sidoValue}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2 text-[11px] text-slate-300 leading-relaxed">
        <p>{describeCsiVsBaseline(nationwide, '전국')}</p>
        {sidoValue != null && sidoName && (
          <p>
            {describeCsiVsBaseline(sidoValue, sidoName)}
            {sidoValue < nationwide && ' 전국 평균보다 소비 심리·경기 전망이 조금 더 위축되어 있습니다.'}
            {sidoValue > nationwide && ' 전국 평균보다 소비 심리·경기 전망이 조금 더 낫습니다.'}
          </p>
        )}
        {(asOf || trend) && (
          <p className="text-slate-400">
            {asOf && <span className="font-bold text-slate-300">{asOf}</span>}
            {asOf && trend && ' · '}
            {trend && <span className="font-bold text-sky-300/90">{trend}</span>}
            {(asOf || trend) && ` — ${describeCsiTrend(trend)}`}
          </p>
        )}
      </div>

      <p className="text-[10px] text-slate-500 pt-2 border-t border-white/5">
        {indexLabel} · KOSIS 통계 기준. 개별 매물 가격 예측이 아닌 거시 참고 지표입니다.
      </p>
    </section>
  );
}

export default function InvestmentInsightPanel({
  rawData,
}: {
  rawData?: Record<string, any> | null;
}) {
  const insight = rawData?.investmentInsight;
  const ctx = rawData?.investmentContext || insight?.investmentContext;
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);

  const regional = ctx?.regionalClassifiedFactors || ctx?.classifiedFactors;
  const developmentEvents = ctx?.developmentEvents?.items || [];
  const deSummary = ctx?.developmentEvents?.summary;

  const gosiCount = ctx?.dataConfidence?.gosiCount ?? 0;
  const directCount = deSummary?.direct ?? ctx?.directFactorCount ?? 0;
  const zoneDirect = ctx?.zoneDirectCount ?? 0;
  const propertyHits = ctx?.propertyHits || [];

  const indirectCount = deSummary?.indirect ?? propertyHits.filter((h: { tier?: string }) => h.tier === 'indirect').length;
  const weakCount = deSummary?.weak ?? propertyHits.filter((h: { tier?: string }) => h.tier === 'weak').length;

  const tierByTitle = useMemo(
    () => buildTierByTitle(propertyHits, ctx?.classifiedFactors),
    [propertyHits, ctx?.classifiedFactors],
  );

  const gosiItems = useMemo(() => flattenRegionalFactors(regional), [regional]);

  const gosiMarkers = useMemo(() => {
    const seen = new Set<string>();
    return gosiItems
      .filter((g) => g.lat != null && g.lng != null)
      .map((g, idx) => {
        const key = `${g.title}|${g.lat}|${g.lng}`;
        if (seen.has(key)) return null;
        seen.add(key);
        return {
          lat: g.lat as number,
          lng: g.lng as number,
          title: g.categoryLabel,
          originalTitle: g.title,
          id: `inv-gosi-${idx}`,
        };
      })
      .filter(Boolean) as Array<{ lat: number; lng: number; title: string; originalTitle: string; id: string }>;
  }, [gosiItems]);

  const propertyLocation = useMemo(() => {
    const lat = ctx?.lat ?? rawData?.coordinates?.lat;
    const lng = ctx?.lng ?? rawData?.coordinates?.lng;
    if (lat == null || lng == null) return null;
    const nLat = Number(lat);
    const nLng = Number(lng);
    if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return null;
    return { lat: nLat, lng: nLng };
  }, [ctx, rawData]);

  const propertyCenter = useMemo(() => {
    if (propertyLocation) return propertyLocation;
    if (gosiMarkers.length) return { lat: gosiMarkers[0].lat, lng: gosiMarkers[0].lng };
    return { lat: 37.5665, lng: 126.978 };
  }, [propertyLocation, gosiMarkers]);

  const mapMarkers = useMemo(() => {
    const propertyTitle = rawData?.address || rawData?.bldNm || rawData?.propertyTitle || '분석 매물';
    const items: Array<{
      lat: number;
      lng: number;
      title: string;
      originalTitle?: string;
      id: string;
      isProperty?: boolean;
    }> = [];

    if (propertyLocation) {
      items.push({
        lat: propertyLocation.lat,
        lng: propertyLocation.lng,
        title: propertyTitle,
        id: 'property-target',
        isProperty: true,
      });
    }

    items.push(...gosiMarkers);
    return items;
  }, [propertyLocation, gosiMarkers, rawData]);

  const gc = ctx?.guidelineContext;
  const grade = ctx?.gradeBreakdown?.grade;
  const hardwareTags = insight?.hardwareTags || [];
  const summary = insight?.summary || insight?.headline;
  const tags = insight?.tags || [];

  if (!ctx && !insight) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 opacity-40">
        <Info className="w-10 h-10 text-slate-400" />
        <p className="text-sm font-bold text-slate-400">투자 인사이트는 분석 수집 후 제공됩니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤드라인 */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-white/10 rounded-[32px] p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-teal-400/90 uppercase tracking-widest mb-2">투자 인사이트</p>
            <h3 className="text-lg sm:text-xl font-black text-white leading-relaxed">
              {summary || '시군구 투자 맥락을 확인해 보세요.'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              동·시군구 거래·호재 데이터를 바탕으로 한 참고 요약입니다.
            </p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map((t: string, i: number) => (
                  <span
                    key={i}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                      t.includes('고평가')
                        ? 'text-rose-300 bg-rose-500/10 border-rose-500/25'
                        : t.includes('저평가')
                          ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25'
                          : t.includes('적정')
                            ? 'text-sky-300 bg-sky-500/10 border-sky-500/25'
                            : 'text-slate-300 bg-white/5 border-white/10'
                    }`}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
          {grade && (
            <div className="shrink-0 w-14 h-14 rounded-2xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center">
              <span className="text-2xl font-black text-teal-300">{grade}</span>
            </div>
          )}
        </div>

        {hardwareTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
            {hardwareTags.map((tag: { id: string; label: string }) => (
              <span key={tag.id} className="text-[11px] font-bold text-sky-200/90 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-lg">
                {tag.label}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* 매물 tier 요약 — 숨김 아님, 참고용 */}
      <section className="bg-slate-900/60 border border-white/5 rounded-2xl px-5 py-4">
        <p className="text-xs text-slate-400 leading-relaxed">
          {developmentEvents.length > 0 ? (
            <>
              <span className="text-slate-200 font-bold">주변 개발호재 {developmentEvents.length}건</span>
              {' '}(반경 {ctx?.developmentEvents?.radiusKm ?? 1.5}km)
              {' · '}
              <span className="text-emerald-400 font-bold">직접 {directCount}건</span>
              {' · '}
              <span className="text-sky-400 font-bold">간접 {indirectCount}건</span>
              {weakCount > 0 && <> · <span className="text-amber-400 font-bold">약한 {weakCount}건</span></>}
            </>
          ) : (
            <>
              <span className="text-slate-200 font-bold">지역 고시 {gosiItems.length || gosiCount}건</span>
              {' '}전체를 표시합니다.
              {' '}이 매물 기준{' '}
              <span className="text-emerald-400 font-bold">직접 {directCount}건</span>
              {zoneDirect > 0 && <span className="text-teal-400"> (zone {zoneDirect})</span>}
              {' · '}
              <span className="text-sky-400 font-bold">간접 {indirectCount}건</span>
              {weakCount > 0 && <> · <span className="text-amber-400 font-bold">약한 {weakCount}건</span></>}
              {' '}(참고)
            </>
          )}
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PriceBenchmarkCard bench={insight?.priceBenchmark} />
        <div className="space-y-6">
          <BuildingLayerCard
            buildingLayer={insight?.buildingLayer}
            marketContext={ctx?.marketContext}
          />
          <DongRankingCard ctx={ctx} />
          <SentimentCard sentiment={insight?.sentiment} />
        </div>
      </div>

      {/* guideline — direct 없어도 표시 */}
      {gc && (
        <section className="bg-slate-900 border border-white/5 rounded-[32px] p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-teal-400" />
            <h4 className="text-sm font-black text-slate-200">호재 조합 (매물 기준)</h4>
          </div>
          {gc.sanitizedOutput?.display?.range_text ? (
            <p className="text-sm font-bold text-emerald-300/90 mb-3">{gc.sanitizedOutput.display.range_text}</p>
          ) : (
            <p className="text-sm text-slate-500 mb-3">
              매물 직접수혜 호재 구간 없음 — 아래 지역 고시를 참고하세요.
            </p>
          )}
          {(gc.appliedGuidelines || []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {gc.appliedGuidelines.map((g: { label: string; range?: string }, i: number) => (
                <span key={i} className="text-[11px] font-bold text-slate-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                  {g.label} {g.range}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 지도 — 분석 매물 + 좌표 있는 고시 */}
      {mapMarkers.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-400" />
            <h4 className="text-sm font-black text-slate-200">
              호재 · 매물 지도
              {propertyLocation && gosiMarkers.length > 0 && (
                <span className="text-slate-400 font-bold text-xs ml-1">
                  (매물 + 고시 {gosiMarkers.length}건)
                </span>
              )}
              {propertyLocation && gosiMarkers.length === 0 && (
                <span className="text-slate-400 font-bold text-xs ml-1">(분석 매물)</span>
              )}
              {!propertyLocation && gosiMarkers.length > 0 && (
                <span className="text-slate-400 font-bold text-xs ml-1">(고시 {gosiMarkers.length}건)</span>
              )}
            </h4>
          </div>
          <div className={`bg-slate-900 border border-white/5 ${mapExpanded ? 'h-[360px]' : 'rounded-[32px] h-[360px] relative overflow-hidden'}`}>
            <GosiMap
              markers={mapMarkers}
              initialCenter={propertyCenter}
              sigCd={ctx?.sigunguCd || ''}
              isExpanded={mapExpanded}
              onToggleExpand={() => setMapExpanded(!mapExpanded)}
              onMarkerClick={(marker: { originalTitle?: string }) => {
                if (marker?.originalTitle) setSelectedTitle(marker.originalTitle);
              }}
            />
          </div>
        </section>
      )}

      {developmentEvents.length > 0 && (
        <section className="bg-slate-900 border border-white/5 rounded-[32px] p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-5 h-5 text-teal-400" />
            <h4 className="text-sm font-black text-slate-200">주변 개발호재</h4>
            <span className="ml-auto text-[10px] font-black text-teal-400/70">{developmentEvents.length}건</span>
          </div>
          <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">
            전망점수는 진행·호재 강도 참고치이며, 가격·수익률 예측이 아닙니다.
          </p>
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
            {developmentEvents.map((ev: {
              id: number;
              canonical_name: string;
              ui_label?: string;
              event_category?: string;
              tier_label?: string;
              dist_label?: string;
              progress_score?: number | null;
            }) => (
              <div
                key={ev.id}
                className="p-4 rounded-2xl border bg-white/[0.02] border-white/5"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-[9px] font-black text-teal-400/90 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
                    {ev.ui_label || EVENT_CATEGORY_LABELS[ev.event_category || ''] || ev.event_category}
                  </span>
                  {ev.tier_label && (
                    <span className="text-[9px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                      {ev.tier_label}
                    </span>
                  )}
                  {ev.dist_label && (
                    <span className="text-[10px] text-slate-500 font-bold ml-auto">{ev.dist_label}</span>
                  )}
                </div>
                <p className="text-[13px] font-bold text-slate-100 leading-snug">{ev.canonical_name}</p>
                {ev.progress_score != null && (
                  <p className="text-[11px] text-teal-300/90 font-bold mt-2">
                    전망점수 {ev.progress_score}
                    <span className="text-slate-500 font-medium"> (진행·호재 강도)</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 전체 고시 목록 — 읽기 SSOT */}
      <section className="bg-slate-900 border border-white/5 rounded-[32px] p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="w-5 h-5 text-orange-400" />
          <h4 className="text-sm font-black text-slate-200">시군구 고시 · 개발 호재</h4>
          <span className="ml-auto text-[10px] font-black text-orange-400/70">{gosiItems.length}건</span>
        </div>

        {gosiItems.length === 0 ? (
          <div className="py-12 text-center opacity-40">
            <p className="text-sm font-bold text-slate-400">이 시군구 batch 고시 데이터가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2 custom-scrollbar">
            {gosiItems.map((g, i) => {
              const tierInfo = tierByTitle.get(g.title);
              const isSelected = selectedTitle === g.title;
              return (
                <div
                  key={`${g.title}-${i}`}
                  onClick={() => setSelectedTitle(g.title)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-orange-500/10 border-orange-500/30'
                      : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-[9px] font-black text-orange-400/90 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
                      {g.categoryLabel}
                    </span>
                    <TierBadge tierInfo={tierInfo} />
                    {g.gosiDate && (
                      <span className="text-[10px] text-slate-500 font-bold ml-auto">{formatDate(g.gosiDate)}</span>
                    )}
                  </div>
                  <p className="text-[13px] font-bold text-slate-100 leading-snug">{g.title}</p>
                  {g.url && (
                    <a
                      href={g.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-orange-400 hover:text-orange-300"
                    >
                      <ExternalLink className="w-3 h-3" />
                      고시 원문
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
