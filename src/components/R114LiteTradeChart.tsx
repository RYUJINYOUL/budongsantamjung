'use client';

import { useId, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { R114TradeType } from '../lib/r114LiteTypes';
import type { TradeChartPoint } from '../lib/r114LiteTrades';

type Theme = 'light' | 'dark';

const CHART_COLORS: Record<R114TradeType, { stroke: string; label: string }> = {
  sale: { stroke: '#10b981', label: '매매' },
  jeonse: { stroke: '#3b82f6', label: '전세' },
  wolse: { stroke: '#8b5cf6', label: '월세' },
};

function formatYAxisTick(val: number): string {
  if (val >= 10000) return `${(val / 10000).toFixed(0)}억`;
  return `${val.toLocaleString()}만`;
}

function formatTooltipValue(val: number, kind: R114TradeType): string {
  if (kind === 'wolse' && val < 10000) return `${val.toLocaleString()}만원/월`;
  return `${val.toLocaleString()}만원`;
}

export default function R114LiteTradeChart({
  data,
  kind,
  theme = 'light',
  height = 180,
}: {
  data: TradeChartPoint[];
  kind: R114TradeType;
  theme?: Theme;
  height?: number;
}) {
  const gradientId = useId().replace(/:/g, '');
  const colors = CHART_COLORS[kind];
  const gridStroke = theme === 'light' ? '#f1f5f9' : 'rgba(255,255,255,0.06)';
  const axisStroke = theme === 'light' ? '#94a3b8' : '#71717a';
  const emptyBorder = theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/[0.02]';
  const emptyText = theme === 'light' ? 'text-slate-400' : 'text-zinc-500';

  const chartData = useMemo(() => data, [data]);

  if (chartData.length === 0) {
    return (
      <div
        style={{ height }}
        className={`flex items-center justify-center rounded-xl border border-dashed ${emptyBorder}`}
      >
        <p className={`text-xs ${emptyText}`}>차트에 표시할 거래가 없습니다.</p>
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.stroke} stopOpacity={0.22} />
              <stop offset="95%" stopColor={colors.stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
          <XAxis
            dataKey="label"
            stroke={axisStroke}
            fontSize={9}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke={axisStroke}
            fontSize={9}
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
            tickFormatter={formatYAxisTick}
          />
          <Tooltip
            contentStyle={{
              background: theme === 'light' ? '#fff' : '#18181b',
              border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontSize: '11px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              color: theme === 'light' ? '#0f172a' : '#fafafa',
            }}
            labelFormatter={(label) => `${label} 계약`}
            formatter={(val: number) => [formatTooltipValue(val, kind), colors.label]}
          />
          <Area
            type="monotone"
            dataKey="priceVal"
            stroke={colors.stroke}
            strokeWidth={2.5}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
            dot={{ r: 3, fill: theme === 'light' ? '#fff' : '#18181b', strokeWidth: 1.5, stroke: colors.stroke }}
            activeDot={{ r: 4.5, stroke: theme === 'light' ? '#fff' : '#18181b', strokeWidth: 1.5, fill: colors.stroke }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
