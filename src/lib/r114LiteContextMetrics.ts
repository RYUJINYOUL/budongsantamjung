import type { LucideIcon } from 'lucide-react';
import { Activity, BarChart3, Building2, Home, TrendingUp } from 'lucide-react';
import type { R114LiteContextDetails, R114LiteContextRow } from './r114LiteTypes';

export type LiteRegionMetric = {
  key: string;
  label: string;
  value: string;
  icon: LucideIcon;
  colorClass: string;
  iconBgClass: string;
  insight: { trend: string; body: string } | null;
};

const REGION_ROW_IDS = [
  'rone_price',
  'rone_jeonse',
  'rone_volume',
  'supply_unsold',
  'supply_movein',
  'supply_planned',
] as const;

function parseFirstNumber(raw: string): number | null {
  const m = raw.match(/([\d,.]+)/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function parseTrend(raw: string): string {
  if (/상승/.test(raw)) return '상승';
  if (/하락/.test(raw)) return '하락';
  if (/보합/.test(raw)) return '보합';
  return '보합';
}

function getSaleDesc(val: number) {
  const diff = val - 100;
  const diffAbsStr = Math.abs(diff).toFixed(2);
  if (Math.abs(diff) < 0.005) {
    return '기준 시점의 아파트 값(100)과 비교했을 때 현재 가격이 변동 없이 보합세를 보이며 제자리걸음을 걷고 있다는 뜻이에요.';
  }
  const word = diff > 0 ? '상승' : '하락';
  const detail =
    Math.abs(diff) < 0.5 ? `미세하게 ${word}하며 제자리걸음을 걷고` : `${word}하며 변동이 나타나고`;
  return `기준 시점의 아파트 값(100)과 비교했을 때 현재 가격이 ${diffAbsStr}% ${detail} 있다는 뜻이에요.`;
}

function getJeonseDesc(val: number) {
  const diff = val - 100;
  const diffAbsStr = Math.abs(diff).toFixed(2);
  if (Math.abs(diff) < 0.005) {
    return '기준 시점 대비 전세가가 보합세를 유지하고 있어, 임대차 시장이 큰 변동 없이 안정적이라는 의미예요.';
  }
  const word = diff > 0 ? '상승' : '하락';
  return `기준 시점 대비 전세가가 ${diffAbsStr}% ${word}하여, 세입자들의 전세 보증금 부담이 ${diff > 0 ? '커지고' : '줄어들고'} 있다는 의미예요.`;
}

function getVolumeDesc(val: number, trend: string) {
  const valStr = val.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (trend === '상승') {
    return `최근 시군구 아파트 거래량이 ${valStr}건 수준으로 늘어나 시장 활성도가 높아지고 있다는 뜻이에요.`;
  }
  if (trend === '하락') {
    return `최근 시군구 아파트 거래량이 ${valStr}건 수준으로 줄어들어 시장이 한산해지고 있다는 뜻이에요.`;
  }
  return `최근 시군구 아파트 거래량이 ${valStr}건 수준으로, 매매 시장이 큰 변동 없이 이어지고 있다는 뜻이에요.`;
}

function getUnsoldDesc(count: number) {
  if (count <= 0) {
    return '현재 미분양 물량이 없어, 새로 공급된 물량이 시장에 잘 소화되고 있다는 긍정적 신호예요.';
  }
  if (count < 50) {
    return `미분양 ${count.toLocaleString()}세대로 아직 관리 가능한 수준이지만, 향후 분양 물량과 함께 주시할 필요가 있어요.`;
  }
  return `미분양 ${count.toLocaleString()}세대로 공급 과잉 우려가 커질 수 있어, 해당 지역의 가격·수급 흐름을 함께 봐야 해요.`;
}

function getSupplyPipelineDesc(label: string, count: number) {
  if (count <= 0) {
    return `${label} 물량이 거의 없어, 단기적으로 대규모 공급 충격은 제한적이라는 뜻이에요.`;
  }
  return `${label} ${count.toLocaleString()}세대가 예정되어 있어, 향후 입주·분양 물량이 시장 수급과 가격에 영향을 줄 수 있어요.`;
}

function metricFromRow(row: R114LiteContextRow): LiteRegionMetric | null {
  if (row.empty || !row.value?.trim()) return null;

  switch (row.id) {
    case 'rone_price': {
      const num = parseFirstNumber(row.value);
      const trend = parseTrend(row.value);
      return {
        key: row.id,
        label: num != null ? `매매지수 ${num.toFixed(2)}` : row.label,
        value: `매매시장 흐름 : ${trend}`,
        icon: TrendingUp,
        colorClass: 'text-sky-500',
        iconBgClass: 'bg-sky-500/10',
        insight: num != null
          ? { trend: `최근 추이: ${trend}`, body: getSaleDesc(num) }
          : { trend: `최근 추이: ${trend}`, body: '부동산원 매매가격지수로, 해당 시군구 아파트 가격 수준의 변화를 보여줍니다.' },
      };
    }
    case 'rone_jeonse': {
      const num = parseFirstNumber(row.value);
      const trend = parseTrend(row.value);
      return {
        key: row.id,
        label: num != null ? `전세지수 ${num.toFixed(2)}` : row.label,
        value: `임대차시장 흐름 : ${trend}`,
        icon: Home,
        colorClass: 'text-emerald-500',
        iconBgClass: 'bg-emerald-500/10',
        insight: num != null
          ? { trend: `최근 추이: ${trend}`, body: getJeonseDesc(num) }
          : { trend: `최근 추이: ${trend}`, body: '부동산원 전세가격지수로, 해당 시군구 전세 시장의 변화를 보여줍니다.' },
      };
    }
    case 'rone_volume': {
      const num = parseFirstNumber(row.value);
      const trend = parseTrend(row.value);
      const display = num != null ? num.toLocaleString(undefined, { maximumFractionDigits: 1 }) : row.value;
      return {
        key: row.id,
        label: `거래량 ${display}`,
        value: `거래 동향 : ${trend}`,
        icon: BarChart3,
        colorClass: 'text-amber-500',
        iconBgClass: 'bg-amber-500/10',
        insight: num != null
          ? { trend: `최근 추이: ${trend}`, body: getVolumeDesc(num, trend) }
          : { trend: `최근 추이: ${trend}`, body: '부동산원 아파트 매매 거래량으로, 지역 시장의 활성도를 가늠할 수 있어요.' },
      };
    }
    case 'supply_unsold': {
      const count = parseFirstNumber(row.value) ?? 0;
      return {
        key: row.id,
        label: `미분양 ${count.toLocaleString()}세대`,
        value: count <= 0 ? '미분양 없음' : '미분양 존재',
        icon: Building2,
        colorClass: 'text-purple-500',
        iconBgClass: 'bg-purple-500/10',
        insight: { trend: '공급 현황', body: getUnsoldDesc(count) },
      };
    }
    case 'supply_movein': {
      const count = parseFirstNumber(row.value) ?? 0;
      return {
        key: row.id,
        label: `입주예정 ${count.toLocaleString()}세대`,
        value: count <= 0 ? '단기 입주 물량 적음' : '입주 물량 예정',
        icon: Activity,
        colorClass: 'text-teal-500',
        iconBgClass: 'bg-teal-500/10',
        insight: { trend: '공급 일정', body: getSupplyPipelineDesc('입주예정', count) },
      };
    }
    case 'supply_planned': {
      const count = parseFirstNumber(row.value) ?? 0;
      return {
        key: row.id,
        label: `분양예정 ${count.toLocaleString()}세대`,
        value: count <= 0 ? '단기 분양 물량 적음' : '분양 물량 예정',
        icon: Activity,
        colorClass: 'text-indigo-500',
        iconBgClass: 'bg-indigo-500/10',
        insight: { trend: '공급 일정', body: getSupplyPipelineDesc('분양예정', count) },
      };
    }
    default:
      return null;
  }
}

export function buildLiteRegionMetrics(rows: R114LiteContextRow[]): LiteRegionMetric[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  return REGION_ROW_IDS.map((id) => byId.get(id))
    .filter((r): r is R114LiteContextRow => !!r && !r.empty)
    .map((r) => metricFromRow(r))
    .filter((m): m is LiteRegionMetric => m != null);
}

export function formatAcademySummary(details?: R114LiteContextDetails, row?: R114LiteContextRow) {
  const w1 = details?.academy?.within1km;
  const w2 = details?.academy?.within2km;
  if (w1 != null || w2 != null) {
    return {
      within1km: w1 ?? null,
      within2km: w2 ?? null,
      label: [w1 != null ? `1km ${w1.toLocaleString()}개` : null, w2 != null ? `2km ${w2.toLocaleString()}개` : null]
        .filter(Boolean)
        .join(' · '),
    };
  }
  if (row?.value?.trim()) {
    return { within1km: null, within2km: null, label: row.value };
  }
  return null;
}
