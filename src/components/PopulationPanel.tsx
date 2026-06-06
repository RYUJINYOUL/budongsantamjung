'use client';

import {
  Area, CartesianGrid, ComposedChart, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { BarChart3, Building2, Users } from 'lucide-react';

function formatToMan(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}만`;
  return Math.round(value).toLocaleString();
}

function getMovementChartDomain(trend: any[]): [number, number] {
  if (!trend.length) return [0, 10000];
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (const item of trend) {
    const p = parseFloat(item.population) || 0;
    const h = parseFloat(item.households) || 0;
    minVal = Math.min(minVal, p, h);
    maxVal = Math.max(maxVal, p, h);
  }
  let padding = (maxVal - minVal) * 0.1;
  if (padding === 0) padding = 1000;
  return [Math.max(0, minVal - padding), maxVal + padding];
}

function PopStatCard({
  value,
  label,
  accent,
}: {
  value: string | number;
  label: string;
  accent: 'sky' | 'purple' | 'amber' | 'emerald' | 'rose' | 'teal';
}) {
  const styles = {
    sky: 'bg-sky-50 border-sky-100 text-sky-700',
    purple: 'bg-violet-50 border-violet-100 text-violet-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    rose: 'bg-rose-50 border-rose-100 text-rose-700',
    teal: 'bg-teal-50 border-teal-100 text-teal-700',
  };
  return (
    <div className={`py-4 px-3 rounded-2xl border text-center ${styles[accent]}`}>
      <div className="text-base sm:text-lg font-black tabular-nums">{value}</div>
      <p className="text-[10px] font-bold text-slate-500 mt-1.5">{label}</p>
    </div>
  );
}

function PopChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const formattedLabel = (() => {
    const s = String(label ?? '');
    if (s.length === 6) return `${s.substring(0, 4)}년 ${s.substring(4)}월`;
    if (s.length === 4) return `${s}년`;
    return s;
  })();
  const unitMap: Record<string, string> = { population: '명', households: '세대' };
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-lg min-w-[130px]">
      <p className="text-[10px] font-bold text-slate-400 mb-2">{formattedLabel}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
          <span className="text-[11px] font-black text-slate-900 tabular-nums">
            {Number(entry.value).toLocaleString()}{unitMap[entry.dataKey] || ''}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function PopulationPanel({
  population,
  backgroundHousehold,
  backgroundPopAge,
}: {
  population?: Record<string, any>;
  backgroundHousehold?: Record<string, any>;
  backgroundPopAge?: Record<string, any>;
}) {
  const popData = population || {};
  const trend5Yr = popData?.trend?.trend || [];
  const movementObj = popData?.movement || {};
  const trend1Yr = movementObj?.trend || [];
  const summary = movementObj?.summary || {};
  const populationChange = parseInt(summary.populationChange) || 0;
  const currentHouseholds = parseInt(summary.currentHouseholds) || 0;
  const isGrowing = summary.isGrowing === true;
  const umdComp = popData?.umdComparison;
  const [chartMin, chartMax] = getMovementChartDomain(trend1Yr);

  const currentPopulation = summary.currentPopulation || backgroundHousehold?.totalPopulation;
  const householdCount = summary.currentHouseholds || backgroundHousehold?.householdCount;
  const avgMembers = backgroundHousehold?.avgFamilyMembers || summary.hhNmpr;

  const firstPop5 = parseFloat(trend5Yr[0]?.population) || 0;
  const lastPop5 = parseFloat(trend5Yr[trend5Yr.length - 1]?.population) || 0;
  const fiveYrChange = lastPop5 - firstPop5;
  const isGrowing5Yr = fiveYrChange > 0;
  const avgChange5Yr = trend5Yr.length > 1 ? Math.round(fiveYrChange / (trend5Yr.length - 1)) : 0;

  const chartAxisStyle = { fill: '#94a3b8', fontSize: 10 };
  const chartMargin = { top: 12, right: 12, left: 0, bottom: 4 };

  const hasAnyData =
    trend5Yr.length > 0 ||
    trend1Yr.length > 0 ||
    currentPopulation ||
    householdCount ||
    umdComp?.pastPop != null ||
    backgroundPopAge?.ages?.length;

  if (!hasAnyData) {
    return (
      <section className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
        <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-600">인구 통계 데이터 없음</p>
        <p className="text-xs text-slate-400 mt-1">해당 지역의 인구·세대 정보가 제공되지 않았습니다.</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 + 핵심 요약 */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-700" />
              <h3 className="font-black text-slate-900 text-lg tracking-tight">인구 · 세대 현황</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">주민등록 및 SGIS 기반 인구 통계</p>
          </div>
          <span className="shrink-0 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full uppercase tracking-wide">
            실시간
          </span>
        </div>

        {(currentPopulation || householdCount || avgMembers) && (
          <div className="px-5 pb-5">
            <div className="grid grid-cols-3 gap-3">
              {currentPopulation != null && (
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/80 text-center">
                  <p className="text-[10px] font-bold text-slate-500 mb-1">현재 인구</p>
                  <p className="text-lg font-black text-slate-900 tabular-nums">{Number(currentPopulation).toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">명</p>
                </div>
              )}
              {householdCount != null && (
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/80 text-center">
                  <p className="text-[10px] font-bold text-slate-500 mb-1">현재 세대</p>
                  <p className="text-lg font-black text-slate-900 tabular-nums">{Number(householdCount).toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">가구</p>
                </div>
              )}
              {avgMembers != null && avgMembers !== '' && (
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/80 text-center">
                  <p className="text-[10px] font-bold text-slate-500 mb-1">평균 가구원</p>
                  <p className="text-lg font-black text-slate-900 tabular-nums">{avgMembers}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">명</p>
                </div>
              )}
            </div>
            {summary.populationChange !== undefined && (
              <div className={`mt-3 flex flex-wrap items-center gap-2 p-3 rounded-xl border ${
                isGrowing ? 'bg-emerald-50/80 border-emerald-100' : 'bg-rose-50/80 border-rose-100'
              }`}>
                <span className={`text-sm font-black tabular-nums ${isGrowing ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {populationChange >= 0 ? '▲' : '▼'} {Math.abs(populationChange).toLocaleString()}명
                </span>
                {summary.period && (
                  <span className="text-[11px] text-slate-500">{summary.period} 인구 변화</span>
                )}
                <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${
                  isGrowing ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {isGrowing ? '증가' : '감소'}
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 5년 SGIS 추이 */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-600" />
            <h4 className="font-black text-slate-900 text-sm">최근 5년 지역 인구 증감 추이 (SGIS)</h4>
          </div>
        </div>
        <div className="p-5">
          {trend5Yr.length > 0 ? (
            <>
              <div className="h-[260px] w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend5Yr} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="year" tick={chartAxisStyle} tickLine={false} axisLine={false} dy={8} />
                    <YAxis tick={chartAxisStyle} tickLine={false} axisLine={false} tickFormatter={formatToMan} width={44} />
                    <Tooltip content={<PopChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="population"
                      name="인구"
                      stroke="#0ea5e9"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <PopStatCard
                  accent={isGrowing5Yr ? 'emerald' : 'rose'}
                  value={`${fiveYrChange > 0 ? '+' : ''}${fiveYrChange.toLocaleString()}명`}
                  label="최근 5년 총 인구 증감"
                />
                <PopStatCard
                  accent="purple"
                  value={`${avgChange5Yr > 0 ? '+' : ''}${avgChange5Yr.toLocaleString()}명 / 년`}
                  label="연평균 인구 증감"
                />
                <PopStatCard
                  accent="amber"
                  value={isGrowing5Yr ? '장기 성장 지역' : '장기 감소 지역'}
                  label="5년 인구 증감 추세"
                />
              </div>
            </>
          ) : (
            <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
              <p className="text-sm text-slate-400 italic">5년 인구 통계 데이터가 부족합니다.</p>
            </div>
          )}
        </div>
      </section>

      {/* 1년 인구·세대 추이 */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <h4 className="font-black text-slate-900 text-sm">최근 1년 인구 및 세대수 변화 추이</h4>
          </div>
        </div>
        <div className="p-5">
          {trend1Yr.length > 0 ? (
            <>
              <div className="h-[260px] w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trend1Yr} margin={chartMargin}>
                    <defs>
                      <linearGradient id="discover-pop1-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="yearMonth"
                      tick={chartAxisStyle}
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                      tickFormatter={(val) => {
                        const s = String(val);
                        return s.length > 4 ? `${s.substring(4)}월` : s;
                      }}
                    />
                    <YAxis
                      domain={[chartMin, chartMax]}
                      tick={chartAxisStyle}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatToMan}
                      width={44}
                    />
                    <Tooltip content={<PopChartTooltip />} />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '10px', paddingBottom: '8px' }}
                      formatter={(value) => <span className="text-slate-500 font-bold text-[10px]">{value}</span>}
                    />
                    <Area
                      type="monotone"
                      dataKey="population"
                      name="인구"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fill="url(#discover-pop1-gradient)"
                      dot={{ r: 3, fill: '#10b981', strokeWidth: 1.5, stroke: '#fff' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="households"
                      name="세대수"
                      stroke="#f43f5e"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3, fill: '#f43f5e', strokeWidth: 1.5, stroke: '#fff' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <PopStatCard
                  accent={isGrowing ? 'emerald' : 'rose'}
                  value={`${populationChange > 0 ? '+' : ''}${populationChange.toLocaleString()}명`}
                  label="최근 1년 인구 증감"
                />
                <PopStatCard
                  accent="sky"
                  value={`${currentHouseholds.toLocaleString()}세대`}
                  label="현재 총 세대 수"
                />
                <PopStatCard
                  accent="amber"
                  value={isGrowing ? '↑' : '↓'}
                  label={isGrowing ? '인구 성장 지역' : '인구 감소 지역'}
                />
              </div>
            </>
          ) : (
            <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
              <p className="text-sm text-slate-400 italic">최근 1년 통계 데이터가 부족합니다.</p>
            </div>
          )}
        </div>
      </section>

      {/* 읍면동 비교 */}
      {umdComp?.pastPop != null && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-700" />
            <h4 className="font-black text-slate-900 text-sm truncate">
              {umdComp.dongNm || '우리 동네'} 세부 인구 변동
            </h4>
          </div>
          <div className="p-5">
            <p className="text-xs text-slate-500 mb-4">2022년 10월 대비 상세 주민등록 인구 분석입니다.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/80">
                <p className="text-[10px] font-bold text-slate-500 mb-1">2022년 10월 인구</p>
                <p className="text-base font-black text-slate-900 tabular-nums">{parseInt(umdComp.pastPop).toLocaleString()}명</p>
              </div>
              <div className="p-4 rounded-xl border border-teal-100 bg-teal-50/50">
                <p className="text-[10px] font-bold text-slate-500 mb-1">
                  최근 인구{umdComp.recentYm ? ` (${String(umdComp.recentYm).substring(4)}월)` : ''}
                </p>
                <p className="text-base font-black text-teal-700 tabular-nums">{parseInt(umdComp.recentPop).toLocaleString()}명</p>
              </div>
            </div>
            {(() => {
              const changeVal = parseInt(umdComp.change) || 0;
              const changeRateVal = parseFloat(umdComp.changeRate) || 0;
              const isGrowingUmd = changeVal >= 0;
              const sign = isGrowingUmd ? '+' : '';
              return (
                <div className={`flex items-center justify-between p-4 rounded-xl border ${
                  isGrowingUmd ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
                }`}>
                  <span className="text-xs font-bold text-slate-500">변동 내역</span>
                  <span className={`text-sm font-black tabular-nums ${isGrowingUmd ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {sign}{changeVal.toLocaleString()}명 ({sign}{changeRateVal.toFixed(2)}%)
                  </span>
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* 연령대 분포 */}
      {backgroundPopAge?.ages?.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-600" />
              <h4 className="font-black text-slate-900 text-sm">연령대별 인구 분포</h4>
            </div>
            {backgroundPopAge.mainAge && (
              <span className="text-[10px] font-black text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">
                주요 {backgroundPopAge.mainAge}
              </span>
            )}
          </div>
          <div className="p-5">
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-[11px] font-bold">
              {backgroundPopAge.youngRatio != null && (
                <span className="text-rose-600">40세 미만 {backgroundPopAge.youngRatio}%</span>
              )}
              {backgroundPopAge.seniorRatio != null && (
                <span className="text-slate-500">60세 이상 {backgroundPopAge.seniorRatio}%</span>
              )}
            </div>
            <div className="space-y-2.5">
              {backgroundPopAge.ages.map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <p className="text-[11px] font-bold text-slate-600 w-14 shrink-0">{a.label}</p>
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal-500/80 transition-all"
                      style={{ width: `${Math.min(Number(a.ratio) * 4, 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] font-black text-slate-800 w-10 text-right tabular-nums">{a.ratio}%</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
