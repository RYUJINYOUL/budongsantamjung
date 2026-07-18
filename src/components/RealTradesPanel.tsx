'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  Cell,
} from 'recharts';
import {
  Activity,
  Award,
  BarChart3,
  Calendar,
  Flame,
  Layers,
  MapPin,
  TrendingUp,
  ChevronDown,
  Star,
} from 'lucide-react';

const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 999px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

interface Trade {
  dealYear?: number | string;
  dealMonth?: number | string;
  dealDay?: number | string;
  floor?: number | string;
  excluUseAr?: number | string;
  area?: number | string;
  dealAmount?: string | number;
  deposit?: string | number;
  monthlyRent?: string | number;
  _isRent?: boolean;
  aptNm?: string;
  umdNm?: string;
  jibun?: string;
  jimok?: string;
  posesnNm?: string;
  dealArea?: string | number;
  landUse?: string;
  buildingUse?: string;
  houseType?: string;
  totalFloorAr?: string | number;
  mhouseNm?: string;
  offiNm?: string;
  roadNm?: string;
  sggNm?: string;
  contractType?: string;
  [key: string]: any;
}

interface RealTradesPanelProps {
  category: string;
  allTrades?: Trade[] | any[];
  nearbyTrades?: any;
  dealVolumeStats?: any[];
  targetComplexInfo?: {
    name?: string;
    area?: number | string;
    address?: string;
  };
  targetTrades?: Trade[];
}

// 억/만 단위 변환 함수
function formatPrice(amtStr: any, monthlyRentStr?: any, isRent?: boolean) {
  const cleanAmt = String(amtStr || '0').replace(/[^0-9]/g, '');
  const amt = parseFloat(cleanAmt) || 0;
  const rent = parseFloat(String(monthlyRentStr || '0').replace(/[^0-9]/g, '')) || 0;

  if (isRent) {
    if (rent > 0) {
      return `${amt.toLocaleString()}만 / 월 ${rent.toLocaleString()}만`;
    }
    if (amt >= 10000) {
      const eok = Math.floor(amt / 10000);
      const rest = Math.round(amt % 10000);
      return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만` : `${eok}억`;
    }
    return `${amt.toLocaleString()}만`;
  }

  if (amt >= 10000) {
    const eok = Math.floor(amt / 10000);
    const rest = Math.round(amt % 10000);
    return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만` : `${eok}억`;
  }
  return `${amt.toLocaleString()}만`;
}

// 그룹화된 allTrades 데이터를 평탄화하는 헬퍼 함수
function flattenTrades(rawTrades: any[]): any[] {
  if (!rawTrades || !Array.isArray(rawTrades)) return [];
  const flattened: any[] = [];
  rawTrades.forEach((item: any) => {
    if (!item) return;
    if (typeof item === 'object' && 'type' in item && Array.isArray(item.data)) {
      const type = item.type || '';
      const isRent = type.includes('전월세');
      item.data.forEach((trade: any) => {
        if (trade && typeof trade === 'object') {
          flattened.push({
            ...trade,
            _groupType: type,
            _isRent: isRent,
          });
        }
      });
    } else {
      flattened.push(item);
    }
  });
  return flattened;
}

// 다국어/다양한 필드 키 매핑 헬퍼 함수군
const getTradeDate = (t: any): string => {
  const year = t.dealYear || t.년 || t.deal_year || t.contractYear || t.contract_year || '';
  const month = t.dealMonth || t.월 || t.deal_month || t.contractMonth || t.contract_month || '';
  const day = t.dealDay || t.일 || t.deal_day || t.contractDay || t.contract_day || '';
  
  if (year && month && day) {
    return `${year}.${month}.${day}`;
  }
  if (year && month) {
    return `${year}.${month}`;
  }
  if (t.dealDate || t.계약일자 || t.deal_date) {
    return String(t.dealDate || t.계약일자 || t.deal_date);
  }
  return '일자미상';
};

const getTradeArea = (t: any): string => {
  const area = t.excluUseAr || t.area || t.전용면적 || t.exArea || t.dealArea || t.totalFloorAr || t.buildingAr || t.연면적 || t.계약면적 || t.전유면적;
  return area ? `${area}㎡` : '-';
};

const getTradeFloor = (t: any): string => {
  const floor = t.floor || t.층 || t.floor_no || '';
  return floor ? `${floor}층` : '';
};

const getTradeName = (t: any): string => {
  const name = t.aptNm || t.아파트 || t.aptName || t.mhouseNm || t.연립 || t.offiNm || t.오피스텔 || t.roadNm || t.sggNm || t.umdNm || t.법정동 || t.buildingUse || t.houseType || '지정 부동산';
  const jibun = t.jibun || t.지번 || '';
  return jibun ? `${name} ${jibun}` : name;
};

const getTradePrice = (t: any, isRent?: boolean): string => {
  const amt = t.dealAmount || t.거래금액 || t.amount || t.deposit || t.보증금 || '0';
  const rent = t.monthlyRent || t.월세 || t.monthly_rent || '0';
  const rentBool = isRent !== undefined ? isRent : (t._isRent === true || String(t._groupType || '').includes('전월세'));
  return formatPrice(amt, rent, rentBool);
};

// 지목/유형별 브랜드 컬러 칩 반환 함수
const getGroupColors = (type: string) => {
  const lower = type.toLowerCase();
  if (lower.includes('아파트') || lower.includes('apt')) {
    return {
      stroke: '#0284c7', // sky-600
      fill: '#0284c7',
      bg: 'bg-sky-50 border-sky-100',
      text: 'text-sky-700',
      iconBg: 'bg-sky-500/10 border-sky-500/20',
      iconColor: 'text-sky-600',
      gradientId: 'gradient-sky',
    };
  }
  if (lower.includes('연립') || lower.includes('다세대') || lower.includes('빌라') || lower.includes('rh')) {
    return {
      stroke: '#059669', // emerald-600
      fill: '#059669',
      bg: 'bg-emerald-50 border-emerald-100',
      text: 'text-emerald-700',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
      iconColor: 'text-emerald-600',
      gradientId: 'gradient-emerald',
    };
  }
  if (lower.includes('오피스텔') || lower.includes('offi')) {
    return {
      stroke: '#d97706', // amber-600
      fill: '#d97706',
      bg: 'bg-amber-50 border-amber-100',
      text: 'text-amber-700',
      iconBg: 'bg-amber-500/10 border-amber-500/20',
      iconColor: 'text-amber-600',
      gradientId: 'gradient-amber',
    };
  }
  if (lower.includes('상가') || lower.includes('상업') || lower.includes('store') || lower.includes('nrg')) {
    return {
      stroke: '#ea580c', // orange-600
      fill: '#ea580c',
      bg: 'bg-orange-50 border-orange-100',
      text: 'text-orange-700',
      iconBg: 'bg-orange-500/10 border-orange-500/20',
      iconColor: 'text-orange-600',
      gradientId: 'gradient-orange',
    };
  }
  return {
    stroke: '#7c3aed', // violet-600
    fill: '#7c3aed',
    bg: 'bg-violet-50 border-violet-100',
    text: 'text-violet-700',
    iconBg: 'bg-violet-500/10 border-violet-500/20',
    iconColor: 'text-violet-600',
    gradientId: 'gradient-violet',
  };
};

export default function RealTradesPanel({
  category,
  allTrades = [],
  nearbyTrades,
  dealVolumeStats = [],
  targetComplexInfo = {},
  targetTrades = [],
}: RealTradesPanelProps) {
  const [selectedChartFilter, setSelectedChartFilter] = useState('전체');
  const [selectedTargetTab, setSelectedTargetTab] = useState('매매');
  const [targetAptTradesLimit, setTargetAptTradesLimit] = useState(6);
  const [nearbyLimit, setNearbyLimit] = useState(6);

  // 1. 데이터 구조가 그룹별 구조(allTrades = [{type, data: []}])인지 평탄한 배열인지 판단
  const isGrouped = useMemo(() => {
    if (!allTrades || !Array.isArray(allTrades) || allTrades.length === 0) return false;
    const first = allTrades[0];
    return first && typeof first === 'object' && 'type' in first && Array.isArray(first.data);
  }, [allTrades]);

  // 활성 그룹 (실제 데이터가 존재하는 거래 카테고리 그룹만 노출)
  const activeGroups = useMemo(() => {
    if (!isGrouped) return [];
    return allTrades.filter(
      (group: any) => group && group.type && Array.isArray(group.data) && group.data.length > 0
    );
  }, [allTrades, isGrouped]);

  // 2. 거래량 통계 차트용 데이터 가공 (지목별)
  const filters = ['전체', '대', '도로', '임야', '전', '답'];
  
  const chartData = useMemo(() => {
    if (!dealVolumeStats || dealVolumeStats.length === 0) return [];
    
    const monthlyCounts: Record<string, number> = {};
    dealVolumeStats.forEach((item: any) => {
      const month = item.month?.toString() || '';
      const jimok = item.jimok?.toString() || '';
      const count = parseInt(item.count?.toString() || '0', 10) || 0;

      if (!month) return;
      if (selectedChartFilter !== '전체' && jimok !== selectedChartFilter) return;

      monthlyCounts[month] = (monthlyCounts[month] || 0) + count;
    });

    const sortedMonths = Object.keys(monthlyCounts).sort();
    const finalMonths = sortedMonths.slice(-12); // 최근 12개월

    return finalMonths.map((m) => {
      const parts = m.split('-');
      const label = parts.length === 2 ? `${parts[0].substring(2)}.${parseInt(parts[1], 10)}` : m;
      return {
        month: label,
        count: monthlyCounts[m],
      };
    });
  }, [dealVolumeStats, selectedChartFilter]);

  // 3. 타겟 아파트 단지 필터링
  const filteredTargetTrades = useMemo(() => {
    if (!targetTrades) return [];
    const flat = flattenTrades(targetTrades);
    const filtered = flat.filter((t) => {
      const isRent = t._isRent === true || String(t._groupType || '').includes('전월세');
      const rentAmt = parseFloat(String(t.monthlyRent || t.월세 || '0').replace(/[^0-9]/g, '')) || 0;

      if (selectedTargetTab === '매매') return !isRent;
      if (selectedTargetTab === '전세') return isRent && rentAmt === 0;
      if (selectedTargetTab === '월세') return isRent && rentAmt > 0;
      return false;
    });

    // 최신순 정렬
    return [...filtered].sort((a, b) => {
      const da = `${a.dealYear || a.년 || '0'}${String(a.dealMonth || a.월 || '0').padStart(2, '0')}${String(a.dealDay || a.일 || '0').padStart(2, '0')}`;
      const db = `${b.dealYear || b.년 || '0'}${String(b.dealMonth || b.월 || '0').padStart(2, '0')}${String(b.dealDay || b.일 || '0').padStart(2, '0')}`;
      return db.localeCompare(da);
    });
  }, [targetTrades, selectedTargetTab]);

  // 4. 토지 실거래 내역 (Firesales)
  const landFiresales = useMemo(() => {
    const raw = Array.isArray(nearbyTrades) ? nearbyTrades : nearbyTrades?.rows || allTrades || [];
    const flat = flattenTrades(raw);
    return flat.filter((t: any) => t.jimok || t.landUse || t.지목 || t.용도지역);
  }, [nearbyTrades, allTrades]);

  // 5. 평탄화된 전체 목록 (과거 리스트뷰 백업용)
  const generalTrades = useMemo(() => {
    const raw = allTrades.length > 0 ? allTrades : (Array.isArray(nearbyTrades) ? nearbyTrades : nearbyTrades?.rows || []);
    const flat = flattenTrades(raw);
    
    // 최신순 정렬
    return [...flat].sort((a, b) => {
      const ya = a.dealYear || a.년 || '0';
      const ma = String(a.dealMonth || a.월 || '0').padStart(2, '0');
      const da = String(a.dealDay || a.일 || '0').padStart(2, '0');
      const yb = b.dealYear || b.년 || '0';
      const mb = String(b.dealMonth || b.월 || '0').padStart(2, '0');
      const db = String(b.dealDay || b.일 || '0').padStart(2, '0');
      return `${yb}${mb}${db}`.localeCompare(`${ya}${ma}${da}`);
    });
  }, [allTrades, nearbyTrades]);

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />

      {/* 최상단 타이틀 */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-5 flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-50/50 to-teal-50/30">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <h3 className="font-black text-slate-900 text-lg tracking-tight">실거래가 시장 동향</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">지역 내 실제 국토교통부 실거래 체결 통계 및 리스트</p>
          </div>
          <span className="shrink-0 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
            실시간
          </span>
        </div>
      </section>

      {/* 1. 최근 거래량 추이 차트 (데이터가 없어도 항상 렌더링) */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <h4 className="font-black text-slate-900 text-sm">지목별 최근 거래량 추이</h4>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">
                {selectedChartFilter} 기준 (최근 12개월)
              </span>
            </div>

            {/* 필터 칩 */}
            <div className="flex gap-1.5 overflow-x-auto pt-4 pb-1">
              {filters.map((f) => {
                const isSelected = selectedChartFilter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setSelectedChartFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-extrabold shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-5">
            {chartData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                <p className="text-slate-400 text-xs font-semibold">거래량 데이터가 부족합니다.</p>
              </div>
            ) : (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        fontSize: '11px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                      }}
                      labelClassName="font-bold text-slate-800"
                    />
                    <Bar
                      dataKey="count"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={30}
                    >
                      {chartData.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index === chartData.length - 1 ? '#10b981' : '#cbd5e1'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>

      {/* 2. 해당 아파트 단지 실거래가 (아파트 전용 - 항상 노출) */}
      {category === 'apartment' && (
        <section className="bg-white rounded-2xl border border-sky-200 border-2 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-sky-100 bg-sky-50/50 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-500/10">
                <Award className="w-4 h-4 text-sky-600" />
              </div>
              <div>
                <span className="text-[9px] font-black text-sky-600 tracking-wider uppercase">해당 분석지 단지 정보</span>
                <h4 className="font-black text-slate-900 text-sm mt-0.5">{targetComplexInfo.name || '분석 단지 실거래가'}</h4>
              </div>
            </div>

            {/* 거래 종류 탭 */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
              {['매매', '전세', '월세'].map((t) => {
                const isSelected = selectedTargetTab === t;
                return (
                  <button
                    key={t}
                    onClick={() => {
                      setSelectedTargetTab(t);
                      setTargetAptTradesLimit(6);
                    }}
                    className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all ${
                      isSelected
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-5 space-y-3">
            {filteredTargetTrades.length === 0 ? (
              <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                <p className="text-xs font-bold text-slate-400">해당 거래 유형의 실거래 내역이 없습니다.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredTargetTrades.slice(0, targetAptTradesLimit).map((trade, i) => {
                    const price = getTradePrice(trade);
                    const area = getTradeArea(trade);
                    const floor = getTradeFloor(trade) || '-';
                    const date = getTradeDate(trade);

                    return (
                      <div
                        key={i}
                        className="p-4 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold mb-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{date}</span>
                          </div>
                          <p className="text-xs font-extrabold text-slate-700">
                            {floor} <span className="text-slate-300 mx-1">|</span> 전용 {area}
                          </p>
                        </div>
                        <span className={`text-sm font-black shrink-0 ${trade._isRent ? 'text-orange-600' : 'text-sky-600'}`}>
                          {price}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {filteredTargetTrades.length > targetAptTradesLimit && (
                  <button
                    onClick={() => setTargetAptTradesLimit((prev) => prev + 6)}
                    className="w-full py-3 mt-2 rounded-xl text-xs font-black bg-sky-50 hover:bg-sky-100 text-sky-700 transition-colors border border-sky-100 flex items-center justify-center gap-1"
                  >
                    실거래가 더보기 ({filteredTargetTrades.length - targetAptTradesLimit}개 남음)
                  </button>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* 3. 탐지된 토지 실거래 내역 (Firesales - 토지 전용/공동) */}
      {category !== 'apartment' && landFiresales.length > 0 && (
        <section className="bg-white rounded-2xl border border-orange-200 border-2 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-orange-100 bg-orange-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-500/10">
                <Flame className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <span className="text-[9px] font-black text-orange-600 tracking-wider uppercase">핵심 데이터</span>
                <h4 className="font-black text-slate-900 text-sm mt-0.5">탐지된 주변 실거래 내역</h4>
              </div>
            </div>
            <span className="text-xs font-black text-orange-700">
              {landFiresales.length}건 탐지
            </span>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {landFiresales.slice(0, 10).map((sale, i) => {
              const price = getTradePrice(sale, false);
              const jimok = sale.jimok || sale.지목 || '-';
              const address = getTradeName(sale);
              const date = getTradeDate(sale);
              const desc = `${getTradeArea(sale)} | ${sale.landUse || sale.용도지역 || '-'}`;
              const owner = sale.posesnNm ? `${sale.posesnNm} 소유` : '';

              return (
                <div
                  key={i}
                  className="p-4 bg-orange-50/30 rounded-xl border border-orange-100 hover:border-orange-200 transition-colors flex flex-col justify-between gap-3"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[9px] font-black text-orange-700 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded uppercase">
                        {jimok}
                      </span>
                      <p className="text-xs font-black text-slate-800 mt-2 truncate max-w-[180px]">
                        {address}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold bg-white border border-slate-100 px-2 py-0.5 rounded">
                      {date}
                    </span>
                  </div>

                  <div className="flex justify-between items-end gap-2 pt-2 border-t border-orange-100/50">
                    <div className="text-[10px] text-slate-500 font-bold">
                      <p>{desc}</p>
                      {owner && <p className="text-slate-400 italic mt-0.5">{owner}</p>}
                    </div>
                    <span className="text-xs font-black text-orange-600">
                      {price}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. 유형별 개별 시장 거래 현황 (AnalysisClientPage.tsx 와 완전 대치) */}
      {isGrouped && activeGroups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeGroups.map((group: any, idx: number) => {
            const isRent = (group.type || '').includes('전월세');
            const colors = getGroupColors(group.type || '');
            
            // 차트용 시계열 데이터 가공
            const groupChartData = useMemo(() => {
              const sorted = [...group.data].sort((a, b) => {
                const da = `${a.dealYear || a.년 || '0'}${String(a.dealMonth || a.월 || '0').padStart(2, '0')}${String(a.dealDay || a.일 || '0').padStart(2, '0')}`;
                const db = `${b.dealYear || b.년 || '0'}${String(b.dealMonth || b.월 || '0').padStart(2, '0')}${String(b.dealDay || b.일 || '0').padStart(2, '0')}`;
                return da.localeCompare(db);
              });
              
              return sorted.slice(-15).map((t) => {
                const amtStr = t.dealAmount || t.거래금액 || t.amount || t.deposit || t.보증금 || '0';
                const cleanAmt = parseFloat(String(amtStr).replace(/[^0-9]/g, '')) || 0;
                
                const month = t.dealMonth || t.월 || '';
                const day = t.dealDay || t.일 || '';
                
                return {
                  ...t,
                  priceVal: cleanAmt,
                  label: month && day ? `${month}.${day}` : getTradeDate(t),
                };
              });
            }, [group.data]);

            return (
              <section key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8 space-y-6 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colors.iconBg}`}>
                      <TrendingUp className={`w-5 h-5 ${colors.iconColor}`} />
                    </div>
                    <div>
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{group.type || '부동산'}</h5>
                      <p className="text-sm font-black text-slate-800 mt-1 leading-none">시세 및 거래 현황</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${colors.bg} ${colors.text}`}>
                    {group.data.length}건 수집
                  </span>
                </div>

                {/* Recharts Area Chart */}
                <div className="h-[200px] w-full">
                  {groupChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={groupChartData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                        <defs>
                          <linearGradient id={colors.gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.stroke} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={colors.stroke} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="label"
                          stroke="#94a3b8"
                          fontSize={9}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={9}
                          tickLine={false}
                          axisLine={false}
                          domain={['auto', 'auto']}
                          tickFormatter={(val) => {
                            if (val >= 10000) return `${(val / 10000).toFixed(0)}억`;
                            return `${val.toLocaleString()}만`;
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            background: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            fontSize: '11px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                          }}
                          labelFormatter={(label) => `${label} 체결 거래`}
                          formatter={(val: any) => [`${val.toLocaleString()}만원`, '금액']}
                        />
                        <Area
                          type="monotone"
                          dataKey="priceVal"
                          stroke={colors.stroke}
                          strokeWidth={3}
                          fillOpacity={1}
                          fill={`url(#${colors.gradientId})`}
                          dot={{ r: 3.5, fill: '#fff', strokeWidth: 1.5, stroke: colors.stroke }}
                          activeDot={{ r: 5, stroke: '#fff', strokeWidth: 1.5, fill: colors.stroke }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                      <p className="text-slate-400 text-xs">거래량 데이터가 부족합니다.</p>
                    </div>
                  )}
                </div>

                {/* 상세 스크롤 거래 리스트 */}
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1.5 custom-scrollbar">
                  {group.data.slice(0, 30).map((trade: any, i: number) => {
                    const priceLabel = getTradePrice(trade, isRent);
                    const nm = getTradeName(trade);
                    const floor = getTradeFloor(trade);
                    const area = getTradeArea(trade);
                    const date = getTradeDate(trade);

                    return (
                      <div
                        key={i}
                        className="p-3 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors flex items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-slate-800 truncate leading-snug">
                            {nm}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-400 font-bold">
                            <span>{date}</span>
                            {floor && (
                              <>
                                <span>|</span>
                                <span>{floor}</span>
                              </>
                            )}
                            <span>|</span>
                            <span>{area}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-xs font-black block ${isRent ? 'text-orange-600' : 'text-emerald-600'}`}>
                            {priceLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        /* 백업용 단일 실거래 목록 (allTrades 가 평탄형 배열인 경우) */
        generalTrades.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <h4 className="font-black text-slate-900 text-sm">최신 실거래 목록</h4>
              </div>
              <span className="text-xs font-bold text-slate-400">
                전체 {generalTrades.length}건
              </span>
            </div>

            <div className="p-5 space-y-3">
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
                {generalTrades.slice(0, nearbyLimit).map((trade, i) => {
                  const isRent = trade._isRent === true || String(trade._groupType || '').includes('전월세');
                  const price = getTradePrice(trade, isRent);
                  const nm = getTradeName(trade);
                  const floor = getTradeFloor(trade);
                  const area = getTradeArea(trade);
                  const date = getTradeDate(trade);

                  return (
                    <div
                      key={i}
                      className="p-4 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-xs font-black text-slate-800 leading-snug truncate max-w-[200px]">
                          {nm}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[10px] text-slate-500 font-bold">
                          <span className="flex items-center gap-0.5 text-slate-400">
                            <Calendar className="w-3.5 h-3.5" />
                            {date}
                          </span>
                          {floor && (
                            <>
                              <span className="text-slate-200">|</span>
                              <span>{floor}</span>
                            </>
                          )}
                          <span className="text-slate-200">|</span>
                          <span>{area}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-xs font-black block ${isRent ? 'text-orange-600' : 'text-emerald-600'}`}>
                          {price}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 mt-1 block">
                          {isRent ? '전월세' : '매매'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {generalTrades.length > nearbyLimit && (
                <button
                  onClick={() => setNearbyLimit((prev) => prev + 6)}
                  className="w-full py-3 mt-2 rounded-xl text-xs font-black bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors border border-slate-200 flex items-center justify-center gap-1"
                >
                  거래 목록 더보기 ({generalTrades.length - nearbyLimit}개 남음)
                </button>
              )}
            </div>
          </section>
        )
      )}

      {/* 실거래 내역이 아예 없는 경우 폴백 */}
      {!isGrouped && generalTrades.length === 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-600">실거래가 정보가 수집되지 않았습니다</p>
          <p className="text-xs text-slate-400 mt-1">해당 지역의 최신 실거래 기록이 부재하거나 수집 중입니다.</p>
        </section>
      )}
    </div>
  );
}
