'use client';
import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import {
  BarChart3, Landmark, Lightbulb, ListChecks, MapPin, Sparkles, Target, TrendingUp, Clock, Search
} from 'lucide-react';
import { generateMarketInsights } from '../../../lib/marketRone';

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

function Badge({ text, color }: { text: string; color: string }) {
  return <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${color}`}>{text}</span>;
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: typeof Sparkles; title: string; subtitle?: string }) {
  return (
    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
      <Icon className="w-4 h-4 text-teal-700 shrink-0" />
      <div>
        <h3 className="font-black text-slate-800 text-sm">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const style = rank === 1 ? 'bg-teal-700 text-white' : rank === 2 ? 'bg-teal-600 text-white' : rank === 3 ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-500';
  return (
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 ${style}`}>
      {rank}
    </div>
  );
}

function formatWon(n?: number) {
  if (!n) return '-';
  if (n >= 10000) return `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}억원`;
  return `${n.toLocaleString()}만원`;
}

function RawTransactionCard({
  t,
  isLoanCard,
  isRefCard,
  categoryKey,
}: {
  t: any;
  isLoanCard: boolean;
  isRefCard: boolean;
  categoryKey: string;
}) {
  if (!t || typeof t !== 'object') return null;

  const date = (t.date || t.dealDate || t.contractDate || '-').toString().trim();
  const location = t.name || t.location || '-';
  const area = parseFloat((t.area || t.totalArea || t.exArea || '0').toString()) || 0;
  const price = Number(t.price || t.dealAmount || 0);
  const pricePerPyeong = Number(t.pricePerPyeong || 0);
  const badges = (t.badges as string[]) || [];

  const cardStyle = isLoanCard
    ? 'bg-amber-50/40 border-amber-200/80 shadow-sm hover:bg-amber-50 transition-colors'
    : 'bg-white border-slate-200 shadow-sm hover:bg-slate-50 transition-colors';

  const priceColor = isLoanCard ? 'text-amber-700' : 'text-teal-700';

  return (
    <div className="rounded-2xl p-4.5 border border-slate-100 bg-white shadow-sm hover:bg-slate-50/50 transition-all p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className={`text-[11px] font-black ${isRefCard ? 'text-slate-400' : 'text-slate-500'}`}>{date}</span>
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {badges.map((b, idx) => {
              let bColor = 'text-teal-700 bg-teal-50 border-teal-200';
              if (b === '지분 거래 의심' || b.includes('의심')) {
                bColor = 'text-rose-600 bg-rose-50 border-rose-200';
              } else if (b === '대형 필지' || b.includes('대형')) {
                bColor = 'text-amber-700 bg-amber-50 border-amber-200';
              }
              return (
                <span key={idx} className={`px-2 py-0.5 rounded-md text-[9px] font-black border ${bColor}`}>
                  {b}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <h5 className="font-black text-sm text-slate-800 leading-snug">{location}</h5>

      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100/60 mt-3">
        <div>
          <p className="text-[10px] font-bold text-slate-400">거래금액</p>
          <p className={`text-sm font-black mt-1 ${priceColor}`}>{formatWon(price)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400">대지/전용면적</p>
          <p className="text-xs font-black text-slate-700 mt-1">{area.toFixed(1)}㎡</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400">
            {categoryKey === 'apartment' ? '평형 환산' : '평당 가격'}
          </p>
          <p className="text-xs font-black text-slate-700 mt-1">
            {categoryKey === 'apartment'
              ? `${(area / 3.3058).toFixed(0)}평형`
              : pricePerPyeong > 0
              ? `${pricePerPyeong.toLocaleString()}만`
              : '-'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CategoryDetailModal({ category, data, onClose }: { category: string, data: any, onClose: () => void }) {
  const [tab, setTab] = useState(0);
  const [jimokFilter, setJimokFilter] = useState('전체');
  const [selectedIndicator, setSelectedIndicator] = useState('priceIndex');

  const label = CATEGORY_LABELS[category] || category;
  const region = data.query?.sggNm || data.region || '';
  const budget = data.query?.budget;
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

  const dealVolumeStatsRaw = data.dealVolumeStats || [];

  // allTrades에서 토지매매 데이터 추출
  const landTradeGroups = (data.allTrades || []).filter((g: any) =>
    (g.type || '').includes('토지')
  );
  const landTradeFlat: any[] = landTradeGroups.flatMap((g: any) =>
    (g.data || []).map((t: any) => ({ ...t, _groupType: g.type }))
  );

  // dealVolumeStats 없으면 allTrades 토지 데이터에서 월별 생성
  const dealVolumeStats: any[] = dealVolumeStatsRaw.length > 0 ? dealVolumeStatsRaw : (() => {
    const monthly: Record<string, number> = {};
    landTradeFlat.forEach((t: any) => {
      const y = t.dealYear || ''; const m = String(t.dealMonth || '').padStart(2, '0');
      if (!y || !m) return;
      const key = `${y}-${m}`;
      monthly[key] = (monthly[key] || 0) + 1;
    });
    return Object.keys(monthly).sort().slice(-12).map(k => ({ month: k, count: monthly[k], jimok: '' }));
  })();

  // firesales: nearbyTrades 없으면 allTrades 토지 데이터 사용
  const firesales = data.nearbyTrades?.rows?.length > 0
    ? data.nearbyTrades.rows
    : landTradeFlat.slice(0, 30);


  // 나의 구매력 및 검토 구간
  const pp = data.investmentLists?.purchasingPower || catAnalysis.purchasingPower || {};
  const equity = pp.equityLabel || pp.equity || '';
  const loanRange = pp.loanRangeLabel || pp.loanRange || '';
  const ppDisclaimer = pp.disclaimer || '';

  // 신규 수혜 주목 구역
  const emergingList = data.analysis?.emergingList || data.emergingList || data.deterministicResults?.[category]?.ranking?.emerging || data.deterministicResults?.emergingList || [];

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
  const investmentGrade = catAnalysis.investmentGrade || catAnalysis.grade || '';

  const metrics: { label: string; value: string }[] = [];
  if (catAnalysis.tradeCount) metrics.push({ label: '최근 거래', value: `${catAnalysis.tradeCount}건` });
  if (catAnalysis.priceRange) metrics.push({ label: '예상 시세', value: catAnalysis.priceRange });
  if (catAnalysis.gapAnalysis) metrics.push({ label: '갭투자 분석', value: catAnalysis.gapAnalysis });

  const keyPositives = outlook.keyPositives || outlook.keyFactors || [];

  return (
    <div className="fixed inset-y-0 left-0 right-0 lg:left-16 z-40 bg-slate-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 className="font-black text-slate-800 text-lg tracking-tight">{label} 정밀 분석</h2>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 overflow-x-auto scrollbar-hide">
        <div className="max-w-3xl mx-auto w-full px-4 flex border-t border-slate-100">
          {TABS.map((t, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-all -mb-px whitespace-nowrap ${
                tab === i ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-4 py-4 pb-24 space-y-6">
        {activeTabName === '요약 및 추천' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* 유형 · 등급 히어로 카드 */}
            <div className="rounded-2xl p-5 border border-teal-100 bg-gradient-to-br from-emerald-50 to-slate-50 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-slate-500 text-xs font-bold mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-600" />
                    {label} 정밀 분석
                  </p>
                  {region && (
                    <h2 className="text-xl font-black text-slate-900 leading-tight tracking-tight">{region}</h2>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {budget && (
                      <span className="inline-flex items-center gap-1.5 bg-white text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200">
                        <Landmark className="w-3.5 h-3.5 text-teal-600" />
                        예산 {formatWon(budget)}
                      </span>
                    )}
                    {direction && (
                      <Badge text={direction} color="bg-white text-slate-700 border-slate-200" />
                    )}
                  </div>
                </div>
                {investmentGrade && (
                  <div className="shrink-0 w-14 h-14 rounded-2xl bg-teal-700 flex items-center justify-center shadow-sm">
                    <span className="text-2xl font-black text-white">{investmentGrade}</span>
                  </div>
                )}
              </div>
              {catAnalysis.outlook && (
                <div className="mt-4 bg-white/80 rounded-xl p-3 border border-slate-100">
                  <p className="text-slate-500 text-xs font-bold mb-1">투자 전망</p>
                  <p className="text-slate-800 text-sm font-semibold leading-relaxed">{catAnalysis.outlook}</p>
                </div>
              )}
            </div>

            {/* 최종 판단 */}
            {oneLineVerdict && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-teal-700" />
                  </div>
                  <h3 className="font-black text-teal-800 text-sm">최종 판단</h3>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed font-medium">{oneLineVerdict}</p>
              </div>
            )}

            {/* 나의 구매력 및 검토 구간 */}
            {equity && (
              <div className="bg-gradient-to-br from-teal-800 to-teal-950 text-white rounded-2xl p-5 shadow-md border border-teal-700/50 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <Landmark className="w-4 h-4 text-amber-400" />
                  </div>
                  <h4 className="font-black text-sm text-white">나의 구매력 및 검토 구간</h4>
                </div>
                <div className="space-y-3 pt-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-teal-200/80 font-bold">자기 자본</span>
                    <span className="font-black text-white text-sm">{equity}</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-teal-200/80 font-bold">대출 활용 시</span>
                    <span className="font-black text-amber-400 text-sm">{loanRange}</span>
                  </div>
                </div>
                {ppDisclaimer && (
                  <div className="bg-black/15 rounded-xl p-3 flex gap-2 items-start text-[10px] leading-relaxed text-teal-100/90 font-medium">
                    <span className="text-amber-400 font-bold">⚠️</span>
                    <p className="flex-1">{ppDisclaimer}</p>
                  </div>
                )}
              </div>
            )}

            {/* 핵심 지표 */}
            {metrics.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <SectionHeader icon={BarChart3} title="핵심 지표" subtitle="거래·시세 기반 분석 수치" />
                <div className="p-4 grid grid-cols-2 gap-3">
                  {metrics.map((m, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400">{m.label}</p>
                      <p className="text-sm font-black text-slate-800 mt-1 leading-snug">{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 핵심 투자 전략 */}
            {catAnalysis.strategy && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center">
                    <Target className="w-4 h-4 text-teal-700" />
                  </div>
                  <h3 className="font-black text-teal-800 text-sm">핵심 투자 전략</h3>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed font-medium">{catAnalysis.strategy}</p>
                {keyPositives.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                    {keyPositives.map((kp: string, idx: number) => (
                      <span key={idx} className="text-[11px] bg-slate-50 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg font-semibold">
                        {kp}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 과거 데이터 기반 (실측치) */}
            {outlook.marketScenarios?.historicalGrowth && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <h4 className="text-xs font-black text-slate-500">과거 데이터 기반 (실측치)</h4>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed font-bold">
                  {outlook.marketScenarios.historicalGrowth}
                </p>
                <p className="text-[10px] text-slate-400">※ 한국부동산원 임대매매지수 및 국토부 실거래가 기반</p>
              </div>
            )}

            {/* 시나리오별 예상 차익 */}
            {outlook.marketScenarios?.estimatedCapitalGain && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <SectionHeader icon={TrendingUp} title="10년 후 시나리오별 예상 차익" />
                <div className="p-4 grid grid-cols-3 gap-3">
                  {[
                    { label: '보수적', data: outlook.marketScenarios.estimatedCapitalGain.conservative, accent: 'text-slate-600' },
                    { label: '보통', data: outlook.marketScenarios.estimatedCapitalGain.normal, accent: 'text-teal-700' },
                    { label: '낙관적', data: outlook.marketScenarios.estimatedCapitalGain.optimistic, accent: 'text-sky-700' },
                  ].map((s, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                      <p className={`text-[11px] font-bold ${s.accent}`}>{s.label}</p>
                      <p className={`text-base font-black my-1.5 ${s.accent}`}>{s.data?.profitRate || '-'}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{s.data?.year10Price || '-'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 특수 가치 및 개발 이익 분석 */}
            {outlook.marketScenarios?.specialAnalysis && (
              <div className="bg-gradient-to-br from-teal-900 to-teal-950 text-white rounded-2xl p-5 shadow-md border border-teal-800/60 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-black text-white">특수 가치 및 개발 이익 분석</h4>
                </div>
                <p className="text-xs text-teal-100/90 leading-relaxed font-medium">
                  {outlook.marketScenarios.specialAnalysis}
                </p>
              </div>
            )}

            {/* AI 추천 매물 */}
            {recommendations.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <SectionHeader icon={Sparkles} title="AI 추천 매물" subtitle="예산·지역 기반 맞춤 추천" />
                <div className="divide-y divide-slate-100">
                  {recommendations.map((rec: any, idx: number) => {
                    const name = rec.name || '아파트명 미상';
                    const area = rec.area || '-';
                    const price = rec.price || '-';
                    const selfCapital = rec.selfCapital || '-';
                    const reason = rec.reason || '';
                    const rank = rec.rank || idx + 1;

                    let formattedArea = area.toString();
                    if (formattedArea !== '-' && !formattedArea.includes('㎡')) {
                      const numArea = parseFloat(formattedArea);
                      if (!isNaN(numArea)) {
                        formattedArea = `${numArea.toFixed(1)}㎡ (${(numArea / 3.3058).toFixed(1)}평)`;
                      }
                    }

                    return (
                      <div key={idx} className={`flex items-start gap-3 px-4 py-4 ${rank <= 3 ? 'bg-teal-50/40' : 'bg-white'}`}>
                        <RankBadge rank={rank} />
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm text-slate-900 truncate">{name}</p>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400">전용 면적</p>
                              <p className="text-xs font-bold text-slate-700 mt-0.5">{formattedArea}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400">실거래가</p>
                              <p className="text-xs font-bold text-teal-700 mt-0.5">{price}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[10px] font-bold text-slate-400">필요 자기자본 (LTV 70%)</p>
                              <p className="text-xs font-bold text-slate-800 mt-0.5">{selfCapital}</p>
                            </div>
                          </div>
                          {reason && (
                            <p className="text-xs text-slate-600 leading-relaxed mt-2 pt-2 border-t border-slate-100">{reason}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI 추천 탐색 조건 */}
            {searchConditions.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <SectionHeader icon={Target} title="AI 추천 탐색 조건" subtitle="실거래 기반 탐색 가이드" />
                <div className="divide-y divide-slate-100">
                  {searchConditions.map((cond: any, idx: number) => {
                    const rank = cond.rank || idx + 1;
                    return (
                      <div key={idx} className={`px-4 py-4 ${rank <= 3 ? 'bg-teal-50/40' : 'bg-white'}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <RankBadge rank={rank} />
                          <p className="font-black text-sm text-slate-900">{cond.location}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400">희망 면적</p>
                            <p className="text-xs font-bold text-slate-800 mt-0.5">{cond.areaRange || cond.area || '-'}</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400">용도/업종</p>
                            <p className="text-xs font-bold text-slate-800 mt-0.5">{cond.zoning || cond.usage || '-'}</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400">실거래 평균가</p>
                            <p className="text-xs font-bold text-slate-800 mt-0.5">{cond.avgPricePerPyeong || cond.avgPrice || '-'}</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400">예상 매입가</p>
                            <p className="text-xs font-bold text-teal-700 mt-0.5">{cond.estimatedTotalPrice || '-'}</p>
                          </div>
                        </div>
                        {cond.reason && (
                          <p className="text-xs text-slate-700 leading-relaxed font-medium">{cond.reason}</p>
                        )}
                        {cond.searchTips && (
                          <div className="mt-3 flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <Lightbulb className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[10px] font-bold text-slate-400">탐색 팁</p>
                              <p className="text-xs text-slate-600 font-medium leading-relaxed mt-0.5">{cond.searchTips}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 추가 탐색 가이드 & 리스크 분석 */}
            {catAnalysis.searchCriteria && (
              <div className="bg-slate-100/60 rounded-2xl p-5 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-black text-slate-600">추가 탐색 가이드</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">{catAnalysis.searchCriteria}</p>
              </div>
            )}

            {catAnalysis.gapAnalysis && (
              <div className="bg-amber-50/50 rounded-2xl p-5 border border-amber-100/80 space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-black text-amber-800">수익성 및 리스크 분석</span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed font-medium">{catAnalysis.gapAnalysis}</p>
              </div>
            )}

            {/* 🌱 신규 수혜 주목 구역 */}
            {emergingList.length > 0 && (
              <div className="bg-emerald-50/30 rounded-3xl p-6 border border-emerald-100/80 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-black text-emerald-900 text-base">🌱 신규 수혜 주목 구역</h4>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                  거래량은 극소수이나, 고시 호재 구역과의 높은 물리적 인접성으로 인해 직접적인 낙수 수혜가 기대되는 주목 지역군입니다.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {emergingList.map((item: any, idx: number) => {
                    const dong = item.location || item.dong || item.name || '-';
                    return (
                      <span key={idx} className="bg-white text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-sm">
                        {dong}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3단계 추천 매물 카드 섹션 */}
            {(() => {
              const mainList = data.investmentLists?.[category] || [];
              const loanList = data.investmentLists?.[`${category}Loan`] || [];
              const refList = data.investmentLists?.[`${category}Reference`] || [];

              if (mainList.length === 0 && loanList.length === 0 && refList.length === 0) {
                return null;
              }

              return (
                <div className="space-y-6">
                  {mainList.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                        <h4 className="font-black text-sm text-teal-800">추천 실투자 매물 카드 (예산 범위 내)</h4>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {mainList.map((t: any, idx: number) => (
                          <RawTransactionCard key={idx} t={t} isLoanCard={false} isRefCard={false} categoryKey={category} />
                        ))}
                      </div>
                    </div>
                  )}

                  {loanList.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2 px-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                        <h4 className="font-black text-sm text-amber-800">대출 활용 시 검토 권장 매물 (레버리지)</h4>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {loanList.map((t: any, idx: number) => (
                          <RawTransactionCard key={idx} t={t} isLoanCard={true} isRefCard={false} categoryKey={category} />
                        ))}
                      </div>
                    </div>
                  )}

                  {refList.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2 px-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                        <h4 className="font-black text-sm text-slate-800">참고용 최근 주변 실거래 내역</h4>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {refList.map((t: any, idx: number) => (
                          <RawTransactionCard key={idx} t={t} isLoanCard={false} isRefCard={true} categoryKey={category} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
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

            {/* 시장 한눈에 보기 설명 패널 */}
            {(() => {
              const ind = market;
              const insightItems = generateMarketInsights(category, ind);
              if (insightItems.length === 0) return null;

              const metaColors: Record<string, string> = {
                land: '#8B5CF6',
                apartment: '#0EA5E9',
                house: '#10B981',
                building: '#F59E0B',
                store: '#EF4444',
              };
              const accentColor = metaColors[category] || '#0EA5E9';

              return (
                <section className="bg-slate-900 border border-white/5 rounded-2xl p-5 shadow-lg space-y-4 text-white">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <div className="w-1 h-4 rounded" style={{ backgroundColor: accentColor }} />
                    <span className="text-xs font-black text-white">{CATEGORY_LABELS[category]} 시장 한눈에 보기</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {insightItems.map((item, idx) => {
                      const isUp = item.trend === '상승';
                      const isDown = item.trend === '하락';
                      const trendColor = isUp ? 'text-rose-400' : isDown ? 'text-sky-400' : 'text-slate-400';
                      const trendBg = isUp ? 'bg-rose-500/10 border-rose-500/20' : isDown ? 'bg-sky-500/10 border-sky-500/20' : 'bg-slate-500/10 border-slate-500/20';

                      return (
                        <div key={idx} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col justify-between space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <h5 className="text-[10px] font-black text-slate-300">{item.label}</h5>
                            {item.trend && (
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${trendColor} ${trendBg}`}>
                                {isUp ? '▲' : isDown ? '▼' : '─'} {item.changeLabel ? `${item.trend} ${item.changeLabel}` : item.trend}
                              </span>
                            )}
                          </div>
                          {item.headlineValue && (
                            <div className="space-y-0.5">
                              {item.subLine && <p className="text-[8px] text-slate-500 font-bold">{item.subLine}</p>}
                              <div className="flex items-baseline gap-0.5">
                                <span className="text-lg font-black text-white" style={{ color: accentColor }}>{item.headlineValue}</span>
                                {item.headlineUnit && <span className="text-[8px] font-black text-slate-400">{item.headlineUnit}</span>}
                              </div>
                            </div>
                          )}
                          <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{item.body}</p>
                        </div>
                      );
                    })}
                  </div>
                </section>
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
    </div>
  );
}
