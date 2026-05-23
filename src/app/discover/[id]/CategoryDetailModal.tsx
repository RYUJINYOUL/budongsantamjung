'use client';
import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const CATEGORY_LABELS: Record<string, string> = {
  apartment: '아파트',
  land: '토지',
  store: '상가',
  building: '빌딩'
};

const INDICATORS: Record<string, Record<string, { label: string, color: string, icon: string }>> = {
  land: {
    priceIndex: { label: '지가지수', color: '#8B5CF6', icon: '📈' },
    priceChangeRate: { label: '지가변동률', color: '#EC4899', icon: '🔥' },
    tradeVolume: { label: '거래필지수', color: '#10B981', icon: '🏞️' }
  },
  apartment: {
    saleIndex: { label: '매매지수', color: '#0EA5E9', icon: '📈' },
    jeonseIndex: { label: '전세지수', color: '#F59E0B', icon: '🏠' },
    wolseIndex: { label: '월세지수', color: '#10B981', icon: '🔑' }
  },
  store: {
    rentIndex: { label: '임대가격지수', color: '#EF4444', icon: '🏪' },
    vacancyRate: { label: '공실률', color: '#EC4899', icon: '🚪' },
    rentPrice: { label: '임대료', color: '#10B981', icon: '🪙' }
  },
  building: {
    rentIndex: { label: '임대가격지수', color: '#EF4444', icon: '🏢' },
    vacancyRate: { label: '공실률', color: '#EC4899', icon: '🚪' },
    rentPrice: { label: '임대료', color: '#10B981', icon: '🪙' }
  }
};

function gradeColorClass(g: string) {
  const upper = g.toUpperCase();
  if (upper.startsWith('S')) return 'bg-amber-100 text-amber-800 border-amber-300';
  if (upper.startsWith('A')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  if (upper.startsWith('B')) return 'bg-blue-100 text-blue-800 border-blue-300';
  return 'bg-slate-100 text-slate-600 border-slate-300';
}

function gradeColorHex(g: string) {
  const upper = g.toUpperCase();
  if (upper.startsWith('S')) return '#CA8A04';
  if (upper.startsWith('A')) return '#0F766E';
  if (upper.startsWith('B')) return '#0284C7';
  return '#64748B';
}

function formatWon(n?: number) {
  if (!n) return '-';
  if (n >= 10000) return `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}억원`;
  return `${n.toLocaleString()}만원`;
}

export default function CategoryDetailModal({ category, data, onClose }: { category: string, data: any, onClose: () => void }) {
  const [tab, setTab] = useState(0);
  const [jimokFilter, setJimokFilter] = useState('전체');
  const [selectedIndicator, setSelectedIndicator] = useState('priceIndex');

  const label = CATEGORY_LABELS[category] || category;
  const catAnalysis = data.analysis?.[category] || {};
  const outlook = data.analysis?.regionalOutlook || {};
  const oneLineVerdict = data.analysis?.oneLineVerdict;
  const market = data.marketIndicators?.[category] || {};

  const trades = (data.allTrades || []).filter((group: any) => {
    const type = (group.type || '').toLowerCase();
    if (category === 'apartment') return type.includes('아파트');
    if (category === 'store') return type.includes('상업') || type.includes('상가') || type.includes('단독') || type.includes('업무용');
    if (category === 'building') return type.includes('빌딩') || type.includes('업무') || type.includes('상업') || type.includes('오피스');
    return true;
  });

  const investmentList = data.investmentLists?.[category] || [];
  const searchConditions = catAnalysis.searchConditions || [];
  const recommendations = catAnalysis.recommendations || [];

  const dealVolumeStats = data.dealVolumeStats || [];
  const firesales = data.nearbyTrades?.rows || [];

  // Reset selected indicator based on category
  useEffect(() => {
    if (category === 'apartment') setSelectedIndicator('saleIndex');
    else if (category === 'store' || category === 'building') setSelectedIndicator('rentIndex');
    else setSelectedIndicator('priceIndex');
  }, [category]);

  let TABS: string[] = [];
  if (category === 'land') {
    TABS = ['요약 및 추천', '지목별 거래량', '토지 실거래내역', '시장동향 및 공식지표'];
  } else if (category === 'apartment') {
    TABS = ['요약 및 추천', '아파트 매매전월세', '시장동향 및 공식지표'];
  } else {
    TABS = ['요약 및 추천', '상업업무용 매매', '시장동향 및 공식지표'];
  }

  const activeTabName = TABS[tab] || TABS[0];

  const getIndicatorData = (key: string) => {
    if (key === 'saleIndex') return market.saleIndex || market.priceIndex;
    if (key === 'priceChangeRate') return market.priceChangeRate || market.changeRateByRegion || market.changeRateByUse;
    if (key === 'rentIndex') return market.rentIndex || market.priceIndex;
    if (key === 'rentPrice') return market.rentPrice || market.rentAmount;
    return market[key];
  };

  const processVolumeStats = () => {
    const monthly: Record<string, number> = {};
    dealVolumeStats.forEach((item: any) => {
      const month = item.month || item.date;
      const count = parseInt(item.count || item.volume || '0', 10);
      const jimok = item.jimok || '';
      
      if (jimokFilter !== '전체' && jimok !== jimokFilter) return;
      if (month) monthly[month] = (monthly[month] || 0) + count;
    });
    return Object.keys(monthly).sort().map(k => ({ date: k, value: monthly[k] })).slice(-12);
  };

  const direction = outlook.direction || '';
  const dirColorClass = (dir: string) => {
    if (dir.includes('적극') || dir.includes('매수') || dir.includes('상승')) return 'bg-teal-50 text-teal-700 border-teal-200';
    if (dir.includes('관망') || dir.includes('중립')) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  const metrics: { label: string; value: string; color: string; icon: string }[] = [];
  if (catAnalysis.tradeCount) metrics.push({ label: '최근 거래', value: `${catAnalysis.tradeCount}건`, color: '#0F766E', icon: '📈' });
  if (catAnalysis.priceRange) metrics.push({ label: '예상 시세', value: catAnalysis.priceRange, color: '#EA580C', icon: '🏷️' });
  if (catAnalysis.gapAnalysis) metrics.push({ label: '갭투자 분석', value: catAnalysis.gapAnalysis, color: '#0284C7', icon: '📊' });
  if (catAnalysis.investmentGrade) metrics.push({ label: '투자 등급', value: `${catAnalysis.investmentGrade} Grade`, color: gradeColorHex(catAnalysis.investmentGrade), icon: '✅' });

  const keyPositives = outlook.keyPositives || outlook.keyFactors || [];

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="font-black text-slate-800 text-lg tracking-tight">{label} 정밀 분석</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 overflow-x-auto scrollbar-hide">
        <div className="flex px-2 w-max">
          {TABS.map((t, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                tab === i ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTabName === '요약 및 추천' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* AI 분석 결과 카드 */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-teal-700 font-extrabold text-lg">AI 분석 결과</h3>
                <div className="flex gap-2">
                  {catAnalysis.investmentGrade && (
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${gradeColorClass(catAnalysis.investmentGrade)}`}>
                      투자등급: {catAnalysis.investmentGrade}
                    </span>
                  )}
                  {direction && (
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${dirColorClass(direction)}`}>
                      {direction}
                    </span>
                  )}
                </div>
              </div>

              {/* 최종 판단 */}
              {oneLineVerdict && (
                <div className="bg-teal-50/50 border border-teal-100 text-teal-900 rounded-2xl p-4 flex items-start gap-3 mb-4 animate-in fade-in duration-300">
                  <span className="text-teal-600 text-base mt-0.5">⚖️</span>
                  <div>
                    <span className="font-extrabold text-xs text-teal-800">최종 판단</span>
                    <p className="font-black text-sm text-teal-950 mt-1 leading-relaxed">{oneLineVerdict}</p>
                  </div>
                </div>
              )}

              {/* 메트릭 리스트 */}
              {metrics.length > 0 && (
                <div className="space-y-3 mb-4">
                  {metrics.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl border" style={{ backgroundColor: `${m.color}08`, borderColor: `${m.color}20` }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm border" style={{ borderColor: `${m.color}25` }}>
                        <span className="text-lg">{m.icon}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold block" style={{ color: m.color }}>{m.label}</span>
                        <p className="text-slate-800 font-black text-sm mt-0.5 leading-snug">{m.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 핵심 투자 전략 */}
              {catAnalysis.strategy && (
                <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-amber-600 text-sm">⭐</span>
                    <span className="font-black text-amber-700 text-xs">핵심 투자 전략</span>
                  </div>
                  <p className="text-slate-800 font-bold text-sm leading-relaxed">{catAnalysis.strategy}</p>

                  {/* 호재 및 투자 요인 리스트 */}
                  {keyPositives.length > 0 && (
                    <div className="mt-4 flex flex-col gap-2 pt-3 border-t border-amber-200/40">
                      {keyPositives.map((kp: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 bg-white/60 p-2.5 rounded-xl border border-amber-100 text-xs text-slate-700 font-extrabold shadow-sm leading-relaxed">
                          <span className="text-amber-600 shrink-0">🔥</span>
                          <span>{kp}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 시나리오별 시세차익 분석 */}
            {outlook.marketScenarios?.estimatedCapitalGain && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-teal-600">📊</span>
                  <h4 className="font-black text-slate-800 text-base">10년 후 시나리오별 예상 차익</h4>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: '보수적', data: outlook.marketScenarios.estimatedCapitalGain.conservative, color: '#64748B' },
                    { label: '보통', data: outlook.marketScenarios.estimatedCapitalGain.normal, color: '#0F766E' },
                    { label: '낙관적', data: outlook.marketScenarios.estimatedCapitalGain.optimistic, color: '#0284C7' }
                  ].map((s, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center flex flex-col justify-between">
                      <span className="text-xs font-bold" style={{ color: s.color }}>{s.label}</span>
                      <div className="font-black text-base my-2" style={{ color: s.color }}>
                        {s.data?.profitRate || '-'}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{s.data?.year10Price || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI 추천 매물 (전통적 아파트 방식) */}
            {recommendations.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-teal-600">✨</span>
                  <h4 className="font-black text-slate-800 text-base">AI 추천 매물</h4>
                </div>
                <div className="space-y-4">
                  {recommendations.map((rec: any, idx: number) => {
                    const name = rec.name || '아파트명 미상';
                    const area = rec.area || '-';
                    const price = rec.price || '-';
                    const selfCapital = rec.selfCapital || '-';
                    const reason = rec.reason || '';
                    
                    let formattedArea = area.toString();
                    if (formattedArea !== '-' && !formattedArea.includes('㎡')) {
                      const numArea = parseFloat(formattedArea);
                      if (!isNaN(numArea)) {
                        formattedArea = `${numArea.toFixed(1)}㎡ (${(numArea / 3.3058).toFixed(1)}평)`;
                      }
                    }

                    return (
                      <div key={idx} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="bg-teal-700 text-white px-2 py-0.5 rounded text-[10px] font-black">
                            {rec.rank || idx + 1}위 추천
                          </span>
                          <span className="font-black text-slate-800 text-base">{name}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 block">전용 면적</span>
                            <span className="text-xs font-extrabold text-slate-800">{formattedArea}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 block">실거래가</span>
                            <span className="text-xs font-extrabold text-slate-800">{price}</span>
                          </div>
                          <div className="col-span-2 mt-2 pt-2 border-t border-slate-200/50">
                            <span className="text-[9px] font-bold text-slate-400 block">필요 자기자본 (LTV 70%)</span>
                            <span className="text-xs font-extrabold text-teal-700">{selfCapital}</span>
                          </div>
                        </div>
                        <div className="text-xs text-slate-700 leading-relaxed font-semibold">
                          <span className="text-[10px] font-bold text-slate-400 block mb-1">투자 근거</span>
                          {reason}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 추천 탐색 조건 (신규 토지/상가/빌딩 방식) */}
            {searchConditions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-teal-600">🎯</span>
                  <h4 className="font-black text-slate-800 text-base">AI 추천 탐색 조건</h4>
                </div>
                <div className="space-y-4">
                  {searchConditions.map((cond: any, idx: number) => (
                    <div key={idx} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="bg-teal-700 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black">
                          {cond.rank || idx + 1}
                        </span>
                        <span className="font-black text-slate-800 text-sm">{cond.location}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block">희망 면적</span>
                          <span className="text-xs font-extrabold text-slate-800">{cond.areaRange || cond.area || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block">용도/업종</span>
                          <span className="text-xs font-extrabold text-slate-800">{cond.zoning || cond.usage || '-'}</span>
                        </div>
                        <div className="mt-2">
                          <span className="text-[9px] font-bold text-slate-400 block">실거래 평균가</span>
                          <span className="text-xs font-extrabold text-slate-800">{cond.avgPricePerPyeong || cond.avgPrice || '-'}</span>
                        </div>
                        <div className="mt-2">
                          <span className="text-[9px] font-bold text-slate-400 block">예상 매입가</span>
                          <span className="text-xs font-extrabold text-teal-700">{cond.estimatedTotalPrice || '-'}</span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed font-semibold mb-3">
                        <span className="text-[10px] font-bold text-slate-400 block mb-1">투자 포인트</span>
                        {cond.reason}
                      </div>
                      {cond.searchTips && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-2">
                          <span className="text-xs mt-0.5">💡</span>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block">탐색 팁</span>
                            <p className="text-xs text-slate-600 font-medium leading-relaxed mt-0.5">{cond.searchTips}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 예산 내 최근 실거래 */}
            {investmentList.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-teal-600">📋</span>
                  <h4 className="font-black text-slate-800 text-base">예산 내 최근 실거래</h4>
                </div>
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-left">
                        <th className="p-3 text-[10px] font-extrabold text-slate-400">거래일</th>
                        <th className="p-3 text-[10px] font-extrabold text-slate-400">대상 정보</th>
                        <th className="p-3 text-[10px] font-extrabold text-slate-400 text-right">거래가</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {investmentList.slice(0, 15).map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 text-xs text-slate-500 font-medium whitespace-nowrap">{(item.date || '-').replace('.00', '').trim()}</td>
                          <td className="p-3">
                            <div className="text-xs font-black text-slate-800">{item.name || item.location}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{item.area ? `${item.area}㎡` : ''} / {item.floor || item.jimok || '-'}</div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="text-xs font-black text-rose-600">{formatWon(item.price)}</div>
                            {item.pricePerPyeong && <div className="text-[9px] text-slate-400 mt-0.5">평당 {item.pricePerPyeong}만</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {(activeTabName === '아파트 매매전월세' || activeTabName === '상업업무용 매매') && (
           <div className="space-y-6 animate-in fade-in duration-300">
            {trades.length > 0 ? (
              trades.map((group: any, idx: number) => {
                const isRent = (group.type || '').includes('전월세') || (group.type || '').includes('임대');
                const dataList = group.data || [];
                
                // Parse chart data for the Line Chart
                const chartData = [...dataList]
                  .slice(-15)
                  .map((item: any, i: number) => {
                    const priceKey = isRent ? 'deposit' : 'dealAmount';
                    const priceStr = String(item[priceKey] || '0').replace(/,/g, '');
                    const priceVal = parseFloat(priceStr) || 0;
                    return {
                      date: item.dealDay || `${item.dealMonth}.${item.dealDay}` || String(i),
                      value: priceVal
                    };
                  });

                return (
                  <div key={idx} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-6">
                    {/* Group Header */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                          <span className="text-teal-700 font-bold text-lg">📈</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">{group.type || '부동산 거래'}</span>
                          <h4 className="font-black text-slate-800 text-sm leading-tight">지역 시세 및 거래 현황</h4>
                        </div>
                      </div>
                      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-black">
                        {dataList.length}건
                      </span>
                    </div>

                    {/* Chart Container */}
                    {chartData.length > 0 && (
                      <div className="bg-[#0F172A] text-white p-4 rounded-2xl relative overflow-hidden">
                        <div className="text-[9px] font-black text-slate-500 mb-4">최근 거래 시세 추이</div>
                        <div className="h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                              <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} />
                              <YAxis 
                                domain={['auto', 'auto']}
                                tickFormatter={(v) => v >= 10000 ? `${(v/10000).toFixed(1)}억` : `${v.toLocaleString()}`}
                                tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.3)' }}
                                tickLine={false}
                                axisLine={false}
                              />
                              <RechartsTooltip 
                                contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                                labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', fontWeight: 'bold' }}
                                itemStyle={{ color: '#10B981', fontSize: '11px', fontWeight: 'black' }}
                                formatter={(value: any) => [
                                  isRent 
                                    ? `보증금: ${parseFloat(value).toLocaleString()}만원`
                                    : `거래가: ${parseFloat(value).toLocaleString()}만원`,
                                  '금액'
                                ]}
                              />
                              <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2.5} dot={{ r: 2, fill: '#fff', stroke: '#10B981' }} activeDot={{ r: 4 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Trades List */}
                    <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
                      {dataList.map((trade: any, i: number) => {
                        const depositStr = String(trade.deposit || '0').replace(/,/g, '');
                        const depositVal = parseFloat(depositStr) || 0;
                        const monthlyRent = trade.monthlyRent || '0';
                        const dealAmountStr = String(trade.dealAmount || '0').replace(/,/g, '');
                        const dealAmountVal = parseFloat(dealAmountStr) || 0;

                        const priceText = isRent
                          ? `보증금 ${depositVal.toLocaleString()}만원${monthlyRent !== '0' && monthlyRent !== 0 ? ` / 월 ${monthlyRent}` : ''}`
                          : `${dealAmountVal.toLocaleString()}만원`;

                        let nameText = '';
                        let infoText = '';

                        if (group.type === '상업업무용매매') {
                          nameText = `${trade.umdNm || ''} ${trade.buildingUse || '상업용건물'}`;
                          infoText = `${trade.dealYear}.${trade.dealMonth}.${trade.dealDay} | ${trade.landUse || '-'} | 연면적 ${trade.buildingAr || '-'}㎡`;
                        } else if (group.type === '단독다가구전월세') {
                          nameText = `${trade.umdNm || ''} ${trade.houseType || '단독다가구'}`;
                          const areaSize = trade.totalFloorAr || trade.area || '-';
                          infoText = `${trade.dealYear}.${trade.dealMonth}.${trade.dealDay} | ${trade.buildYear ? `${trade.buildYear}년` : '건립미상'} | 면적 ${areaSize}㎡`;
                        } else {
                          nameText = trade.aptNm || trade.mhouseNm || trade.offiNm || trade.roadNm || trade.sggNm || '지정 건축물';
                          const floorInfo = trade.floor ? `${trade.floor}층` : trade.buildYear ? `${trade.buildYear}년` : '다중건물';
                          const areaSize = trade.excluUseAr || trade.exArea || trade.area || '-';
                          infoText = `${trade.dealYear}.${trade.dealMonth}.${trade.dealDay} | ${floorInfo} | 전용 ${areaSize}㎡`;
                        }

                        return (
                          <div key={i} className="py-3 flex justify-between items-start gap-4">
                            <div className="min-w-0">
                              <div className="font-extrabold text-slate-800 text-xs truncate">{nameText}</div>
                              <div className="text-[10px] text-slate-400 font-bold mt-1">{infoText}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-black text-teal-700 text-xs">{priceText}</div>
                              <div className="text-[9px] text-slate-400 font-bold mt-0.5">{trade.contractType || '일반거래'}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white p-10 rounded-2xl text-center text-slate-500 text-sm font-medium shadow-sm border border-slate-100">
                최근 거래 내역이 없습니다.
              </div>
            )}
          </div>
        )}

        {activeTabName === '지목별 거래량' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {dealVolumeStats.length > 0 ? (
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                    <span>📊</span> 지목별 최근 거래량 추이
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold">{jimokFilter} 기준 (12개월)</span>
                </div>

                {/* Filter Selector */}
                <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-6 pb-1">
                  {['전체', '대', '도로', '임야', '전', '답'].map(f => {
                    const isSelected = jimokFilter === f;
                    return (
                      <button
                        key={f}
                        onClick={() => setJimokFilter(f)}
                        className={`px-3 py-1.5 rounded-full text-xs font-black transition-all border whitespace-nowrap ${
                          isSelected 
                            ? 'bg-teal-50 text-teal-700 border-teal-300 shadow-sm' 
                            : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        {f}
                      </button>
                    );
                  })}
                </div>

                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processVolumeStats()} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} minTickGap={20} />
                      <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} labelStyle={{ color: '#64748B', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }} itemStyle={{ color: '#0F766E', fontSize: '13px', fontWeight: 'black' }} />
                      <Bar dataKey="value" name="거래건수" fill="#0F766E" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="bg-white p-10 rounded-2xl text-center text-slate-500 text-sm font-medium shadow-sm border border-slate-100">
                거래량 통계 데이터가 없습니다.
              </div>
            )}
          </div>
        )}

        {activeTabName === '토지 실거래내역' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {firesales.length > 0 ? firesales.map((sale: any, i: number) => (
              <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                   <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded text-[10px] font-bold">{sale.jimok || '토지'}</span>
                   <span className="font-black text-amber-600">{sale.dealAmount ? `${sale.dealAmount}만원` : '-'}</span>
                </div>
                <div className="font-bold text-slate-800 text-sm mb-2">{sale.umdNm} {sale.jibun}</div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{sale.landUse || '-'}</span>
                  <span>{sale.dealYear}.{sale.dealMonth} | {sale.area || sale.dealArea || sale.landArea || '-'}㎡</span>
                </div>
              </div>
            )) : (
              <div className="bg-white p-10 rounded-2xl text-center text-slate-500 text-sm font-medium shadow-sm border border-slate-100">
                탐지된 토지 실거래 내역이 없습니다.
              </div>
            )}
          </div>
        )}

        {activeTabName === '시장동향 및 공식지표' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex justify-between items-center px-1">
              <h4 className="font-black text-slate-800 text-base">시장 동향 및 공식 지표</h4>
              <span className="text-[10px] font-extrabold text-teal-700 bg-teal-50 px-2 py-1 rounded border border-teal-200">한국부동산원</span>
            </div>

            {/* 보드판 (Grid Board) */}
            {(() => {
              const list = INDICATORS[category] || {};
              return (
                <div className="grid grid-cols-3 gap-2">
                  {Object.keys(list).map(key => {
                    const info = list[key];
                    const series = getIndicatorData(key);
                    if (!series) return null;
                    
                    const dataList = series.data || [];
                    if (dataList.length === 0) return null;
                    
                    const latest = dataList[dataList.length - 1];
                    const val = typeof latest === 'object' ? (latest.value !== undefined ? latest.value.toFixed(2) : '-') : latest.toFixed(2);
                    
                    const summary = series.summary || {};
                    const trend = summary.trend || '';
                    const changeVal = summary.change !== undefined ? `${summary.change > 0 ? '+' : ''}${summary.change.toFixed(2)}%` : '';
                    
                    const isSelected = selectedIndicator === key;
                    const isUp = trend === '상승';
                    const isDown = trend === '하락';
                    const trendColor = isUp ? 'text-rose-500' : isDown ? 'text-sky-500' : 'text-slate-400';
                    const trendIcon = isUp ? '▲' : isDown ? '▼' : '●';

                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedIndicator(key)}
                        className={`p-3 rounded-2xl border text-left transition-all duration-200 ${
                          isSelected 
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-102' 
                            : 'bg-white text-slate-800 border-slate-100 shadow-sm hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-1.5 text-[9px] font-bold text-slate-400">
                          <span>{info.icon}</span>
                          <span className={isSelected ? 'text-slate-300' : 'text-slate-500'}>{info.label}</span>
                        </div>
                        <div className="text-base font-black mb-1 leading-none">{val}</div>
                        <div className={`text-[9px] font-black leading-none mt-1 ${trendColor}`}>
                          {trendIcon} {changeVal || trend}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* 그래프 (Selected Indicator Chart) */}
            {(() => {
              const info = (INDICATORS[category] || {})[selectedIndicator];
              if (!info) return null;
              
              const series = getIndicatorData(selectedIndicator);
              const dataList = series?.data || [];
              if (dataList.length === 0) return null;

              return (
                <div className="bg-[#0F172A] text-white p-5 rounded-3xl shadow-lg border border-white/5 relative overflow-hidden animate-in fade-in duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <span className="text-[8px] font-black text-slate-500 tracking-wider">SELECTED INDICATOR</span>
                      <h4 className="font-black text-sm text-white flex items-center gap-1.5 mt-0.5">
                        <span>{info.icon}</span> {info.label}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-black text-slate-500">최신 실측치</span>
                      <p className="text-base font-black" style={{ color: info.color }}>{dataList[dataList.length - 1]?.value?.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dataList} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.3)' }} 
                          tickLine={false} 
                          axisLine={false} 
                          minTickGap={20} 
                        />
                        <YAxis 
                          domain={['auto', 'auto']} 
                          tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.3)' }} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)' }}
                          labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', fontWeight: 'bold', marginBottom: '4px' }}
                          itemStyle={{ color: info.color, fontSize: '12px', fontWeight: 'black' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          name={info.label} 
                          stroke={info.color} 
                          strokeWidth={2.5} 
                          dot={false} 
                          activeDot={{ r: 4, fill: '#fff', stroke: info.color, strokeWidth: 1.5 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}

            {Object.keys(market).length === 0 && (
              <div className="bg-white p-10 rounded-2xl text-center text-slate-500 text-sm font-medium shadow-sm border border-slate-100">
                시장 지표 데이터가 없습니다.
              </div>
            )}
            {Object.keys(market).length > 0 && (
               <div className="text-[10px] text-slate-400 font-bold bg-slate-50 p-4 rounded-xl border border-slate-100 text-center mt-4">
                 Data : 한국부동산원 임대매매지수, 국토교통부 실거래가 시스템
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
