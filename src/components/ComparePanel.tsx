'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import DistrictSearch, { type District } from './compare/DistrictSearch';
import { 
  X, MapPin, Building, Map, Newspaper, Users, BarChart3, TrendingUp, AlertCircle, 
  ArrowRight, GraduationCap, School, ChevronRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  PANEL_CARD,
  PANEL_SECTION_LABEL,
  PANEL_SECTION_DESC,
  PAGE_SUBHEADER,
  PAGE_SUBHEADER_TITLE,
  panelStepBadge,
} from './analyzePanelFormStyles';

interface CompareData {
  data: Record<string, any>;
  verdict: string;
  summary: string;
}

interface ComparePanelProps {
  onShowResult?: (show: boolean) => void;
  hideHeader?: boolean;
}

const COLORS = ['#10B981', '#06B6D4', '#3B82F6']; 
const CATEGORY_TABS = ['아파트', '토지', '빌딩'];
const APT_SUB_TABS = ['탐정요약', '시장지표', '조례·공급', '상권·인구', '실거래가'];
const LAND_SUB_TABS = ['탐정요약', '실거래가'];
const BLDG_SUB_TABS = ['시장지표', '실거래가'];

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center h-64">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-black text-slate-800 mb-2">해당 지역은 아직 상세 분석 데이터가 없습니다.</h3>
      <p className="text-slate-500 text-sm">먼저 랭킹이나 매물 검색에서 해당 지역의 개별 분석을 진행해보세요!</p>
    </div>
  );
}

import { getVal } from '../utils/roneParser';

// ── 공통: { data, summary } 구조에서 최신값/추세 파싱 ──
function parseField(field: any) {
  if (!field) return { value: '-', trend: null, changePoints: null, changeRate: null };
  if (typeof field === 'object' && field.summary) {
    return {
      value: field.summary.latest ?? '-',
      trend: field.summary.trend || null,
      changePoints: field.summary.changePoints ?? null,
      changeRate: field.summary.changeRate ?? null
    };
  }
  if (typeof field === 'number') return { value: field, trend: null, changePoints: null, changeRate: null };
  return { value: '-', trend: null, changePoints: null, changeRate: null };
}

function TrendBadge({ trend }: { trend: string | null }) {
  if (!trend) return null;
  const map: Record<string, { icon: string; cls: string }> = {
    '상승': { icon: '▲', cls: 'text-red-500' },
    '하락': { icon: '▼', cls: 'text-blue-500' },
    '보합': { icon: '─', cls: 'text-slate-400' },
  };
  const t = map[trend] || { icon: trend, cls: 'text-slate-400' };
  return <span className={`text-xs font-bold ${t.cls}`}>{t.icon} {trend}</span>;
}

function MICard({ label, field, unit = '', decimals = 2 }: { label: string; field: ReturnType<typeof parseField>; unit?: string; decimals?: number }) {
  const fmt = (v: any) => {
    const n = parseFloat(v);
    return isNaN(n) ? '-' : n.toFixed(decimals);
  };
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <span className="block text-xs text-slate-500 mb-1">{label}</span>
          <span className="text-2xl font-black text-slate-900">
            {fmt(field.value)}
            {unit && field.value !== '-' && <span className="text-sm font-bold text-slate-400 ml-1">{unit}</span>}
          </span>
        </div>
        <div className="text-right space-y-1">
          <TrendBadge trend={field.trend} />
          {field.changePoints !== null && field.changePoints !== undefined && (
            <div className={`text-xs font-semibold ${Number(field.changePoints) >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
              {Number(field.changePoints) >= 0 ? '+' : ''}{Number(field.changePoints).toFixed(2)}p
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ComparePanel({ onShowResult, hideHeader = false }: ComparePanelProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<District[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareData | null>(null);
  const [error, setError] = useState('');
  const [budget, setBudget] = useState<number>(0);
  
  const [activeCat, setActiveCat] = useState('아파트');
  const [activeSubApt, setActiveSubApt] = useState('탐정요약');
  const [activeSubLand, setActiveSubLand] = useState('탐정요약');
  const [activeSubBldg, setActiveSubBldg] = useState('시장지표');

  // localStorage에서 호재발굴 체크박스 선택 지역 프리필
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem('briefing_prefill');
    if (!raw) return;
    try {
      const prefill = JSON.parse(raw) as Array<{ code: string; name: string; lat: number | null; lng: number | null }>;
      if (Array.isArray(prefill) && prefill.length > 0) {
        const districts: District[] = prefill.map(p => ({
          code: p.code,
          name: p.name,
          dongName: p.name,
          lat: p.lat ?? 0,
          lng: p.lng ?? 0,
        }));
        setSelected(districts);
        localStorage.removeItem('briefing_prefill'); // 1회만 사용
      }
    } catch { /* ignore */ }
  }, []);

  const [recentCompares, setRecentCompares] = useState<any[]>([]);

  // 최근 비교 기록 로드
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem('recent_district_compares');
    if (raw) {
      try {
        setRecentCompares(JSON.parse(raw));
      } catch { /* ignore */ }
    }
  }, []);

  const saveCompareToHistory = (districts: District[]) => {
    if (typeof window === 'undefined' || districts.length === 0) return;
    const item = { districts, timestamp: Date.now() };
    
    setRecentCompares(prev => {
      const dCodes = districts.map(d => d.code).sort().join(',');
      const filtered = prev.filter(x => {
        const xCodes = x.districts.map((d: District) => d.code).sort().join(',');
        return xCodes !== dCodes;
      });
      const next = [item, ...filtered].slice(0, 5);
      localStorage.setItem('recent_district_compares', JSON.stringify(next));
      return next;
    });
  };

  const handleSelect = (district: District) => {
    if (selected.length >= 3) {
      setError('최대 3개까지만 비교할 수 있습니다.');
      return;
    }
    setError('');
    setSelected([...selected, district]);
  };

  const handleRemove = (code: string) => {
    setSelected(selected.filter(d => d.code !== code));
  };

  const handleCompare = async () => {
    if (selected.length < 1) {
      setError('지역을 1개 이상 선택해주세요.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const codes = selected.map(d => d.code).join(',');
      const names = selected.map(d => encodeURIComponent(d.dongName || d.name)).join(',');
      const lats = selected.map(d => d.lat).join(',');
      const lngs = selected.map(d => d.lng).join(',');
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://34.47.121.40';
      const res = await fetch(`${BACKEND_URL}/api/land/detective/district-compare?areas=${codes}&names=${names}&lats=${lats}&lngs=${lngs}&budget=${budget}`);
      const data = await res.json();
      
      if (data.success) {
        setResult(data);
        onShowResult?.(true);
        saveCompareToHistory(selected);
      } else {
        setError(data.error || '비교 데이터를 가져오는데 실패했습니다.');
      }
    } catch (err) {
      setError('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const renderAptTab = (dist: any, data: any) => {
    if (!data) return <EmptyState />;
    
    if (activeSubApt === '탐정요약') {
      const reg = data.regulatoryData || {};
      const gosiArr = Array.isArray(reg.gosi) ? reg.gosi : [];
      const permitsArr = Array.isArray(reg.permits) ? reg.permits : [];
      const zoneArr = Array.isArray(reg.zoneChanges) ? reg.zoneChanges : [];
      const execArr = Array.isArray(reg.executionPlans) ? reg.executionPlans : [];

      const gosiCount = gosiArr.length;
      const permitCount = permitsArr.length;
      const urbanRenewalCount = gosiArr.filter((g: any) => /재개발|재건축|정비/.test(g.title || '')).length + zoneArr.length;
      const districtPlanCount = gosiArr.filter((g: any) => /지구단위/.test(g.title || '')).length;
      const implPlanCount = execArr.length + gosiArr.filter((g: any) => /실시계획|인가/.test(g.title || '')).length;

      const householdCount = data.population?.movement?.summary?.currentHouseholds || 0;
      const school = data.school || {};

      return (
        <div className="space-y-6">
          {/* 규제 현황 */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-indigo-500"/> 규제 현황 요약</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '결정시행공고', count: gosiCount },
                { label: '인허가현황', count: permitCount },
                { label: '도시정비사업', count: urbanRenewalCount },
                { label: '지구단위계획', count: districtPlanCount },
                { label: '실시계획인가', count: implPlanCount },
              ].map(item => (
                <div key={item.label} className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600">{item.label}</span>
                  <span className="text-sm font-black text-indigo-600">{item.count}건</span>
                </div>
              ))}
            </div>
          </div>
          {/* 배후 세대수 */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Users className="w-4 h-4 text-emerald-500"/> 상권 현황 요약</h4>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-slate-900">{householdCount.toLocaleString()}</span>
              <span className="text-sm font-bold text-slate-500 mb-1">가구 (배후 세대수)</span>
            </div>
          </div>
          {/* 학군 */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-blue-500"/> 학군 요약</h4>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-bold text-slate-600">전체 학교 수</span>
              <span className="text-lg font-black text-slate-900">{school.count || 0}개</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-600">학생 수 증감률</span>
              <span className={`text-lg font-black ${(school.growthRate || 0) >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                {(school.growthRate || 0) >= 0 ? '+' : ''}{(school.growthRate || 0).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    if (activeSubApt === '시장지표') {
      const mi = data.marketIndicators?.apartment || {};
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <MICard label="실거래지수" field={parseField(mi.saleIndex)} decimals={2} />
            <MICard label="가격지수" field={parseField(mi.priceIndex)} decimals={2} />
            <MICard label="월세지수" field={parseField(mi.wolseIndex)} decimals={2} />
            <MICard label="전세지수" field={parseField(mi.jeonseIndex)} decimals={2} />
          </div>
          <MICard label="거래량" field={parseField(mi.tradeVolume)} unit="건" decimals={0} />
          <MICard label="전월세전환율" field={parseField(mi.conversionRate)} unit="%" decimals={2} />
        </div>
      );
    }
    if (activeSubApt === '조례·공급') {
      const supply = data.housingSupply || {};
      const news = data.dynamicNews?.items || [];
      const planned = supply.nextYears?.planned?.count ?? 0;
      const moveIn  = supply.nextYears?.moveIn?.count ?? 0;
      const unsold  = supply.unsold?.current ?? 0;
      const unsoldTrend = supply.unsold?.trend || '-';
      const glutScore = supply.glutScore ?? '-';
      return (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><span className="block text-xs text-slate-500 font-bold mb-1">향후 분양예정</span><span className="text-xl font-black text-slate-900">{Number(planned).toLocaleString()}세대</span></div>
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><span className="block text-xs text-slate-500 font-bold mb-1">입주 예정</span><span className="text-xl font-black text-slate-900">{Number(moveIn).toLocaleString()}세대</span></div>
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><span className="block text-xs text-slate-500 font-bold mb-1">미분양 현황</span><span className="text-xl font-black text-rose-600">{Number(unsold).toLocaleString()}세대 ({unsoldTrend})</span></div>
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><span className="block text-xs text-slate-500 font-bold mb-1">공급과잉지수</span><span className="text-xl font-black text-slate-900">{glutScore}</span></div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="font-black text-sm text-slate-800 mb-3 flex items-center gap-2"><Newspaper className="w-4 h-4 text-indigo-500"/> 동적 호재 및 큐레이션</h4>
            <div className="space-y-2">
              {news.length > 0 ? news.slice(0,5).map((n:any, i:number) => (
                <div key={i} className="flex justify-between items-center text-xs p-2 hover:bg-slate-50 rounded-lg">
                  <span className="text-slate-700 font-bold truncate max-w-[80%]">{n.title}</span>
                  <span className="text-slate-400">{n.date?.substring(0,10)}</span>
                </div>
              )) : <span className="text-xs text-slate-400">관련 기사가 없습니다.</span>}
            </div>
          </div>
        </div>
      );
    }

    if (activeSubApt === '상권·인구') {
      const pop = data.population || {};
      const popTrend = pop.trend?.trend || [];
      const popMove = pop.movement?.trend || [];
      
      const popGrowth5y = popTrend.length > 1 
        ? ((popTrend[popTrend.length - 1].population - popTrend[0].population) / popTrend[0].population * 100).toFixed(1) 
        : null;
      const hhGrowth1y = popMove.length > 1 
        ? ((popMove[popMove.length - 1].households - popMove[0].households) / popMove[0].households * 100).toFixed(1) 
        : null;

      return (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="font-bold text-sm text-slate-800 mb-3">연령별 인구 특성 (상권)</h4>
            <div className="h-40 flex items-end gap-1 justify-between px-2">
               {/* 5-bar mock chart representing age groups */}
               {[20, 45, 60, 80, 50, 30].map((h, i) => (
                 <div key={i} className="w-8 bg-indigo-100 rounded-t-sm flex flex-col justify-end" style={{height: '100%'}}>
                   <div className="w-full bg-indigo-500 rounded-t-sm" style={{height: `${h}%`}}></div>
                   <div className="text-[9px] text-center mt-1 text-slate-500 font-bold">{i*10+10}대</div>
                 </div>
               ))}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="font-bold text-sm text-slate-800 mb-3">지역 인구 추이</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-xs font-bold text-slate-600">최근 5년 인구 증감</span>
                <span className={`text-sm font-black ${Number(popGrowth5y) > 0 ? 'text-red-500' : 'text-blue-500'}`}>{Number(popGrowth5y) > 0 ? '+' : ''}{popGrowth5y || '-'}%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-xs font-bold text-slate-600">최근 1년 세대수 변화</span>
                <span className={`text-sm font-black ${Number(hhGrowth1y) > 0 ? 'text-red-500' : 'text-blue-500'}`}>{Number(hhGrowth1y) > 0 ? '+' : ''}{hhGrowth1y || '-'}%</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (activeSubApt === '실거래가') {
      const aptRank = data.volumeRanking?.apartment || [];
      const trades = aptRank.reduce((sum: number, item: any) => sum + (item.count || 0), 0);
      return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
          <h4 className="text-sm font-bold text-slate-500 mb-2">아파트 매매 시군구 거래량</h4>
          <span className="text-4xl font-black text-indigo-600">{trades.toLocaleString()}건</span>
        </div>
      );
    }
    return null;
  };

  const renderLandTab = (dist: any, data: any) => {
    if (!data) return <EmptyState />;
    
    if (activeSubLand === '탐정요약') {
      const land = data.marketIndicators?.land || {};
      return (
        <div className="space-y-3">
          <MICard label="지가지수" field={parseField(land.priceIndex)} decimals={2} />
          <MICard label="거래량 (필지)" field={parseField(land.tradeVolume)} unit="건" decimals={0} />
          <MICard label="지가변동률(용도)" field={parseField(land.changeRateByUse || land.changeRateByRegion)} unit="%" decimals={2} />
        </div>
      );
    }

    if (activeSubLand === '실거래가') {
      const landRanks = data.volumeRanking?.land || [];
      return (
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <h4 className="font-bold text-sm text-slate-800 mb-4">동별 토지 매매 거래량 (상위 6개)</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {landRanks.slice(0,6).map((rank: any, idx: number) => (
              <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col items-center">
                <span className="text-xs font-bold text-slate-500 mb-1">{rank.location || `상위 ${idx+1}`}</span>
                <span className="text-lg font-black text-emerald-600">{rank.count || 0}건</span>
              </div>
            ))}
            {landRanks.length === 0 && (
              <div className="col-span-3 text-center text-sm text-slate-400 py-4">거래량 데이터가 없습니다.</div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderBldgTab = (dist: any, data: any) => {
    if (!data) return <EmptyState />;
    
    if (activeSubBldg === '시장지표') {
      const bldg = data.marketIndicators?.building || {};
      return (
        <div className="space-y-3">
          <MICard label="가격지수" field={parseField(bldg.priceIndex)} decimals={2} />
          <MICard label="임대료" field={parseField(bldg.rentAmount)} unit="천원/㎡" decimals={2} />
          <MICard label="공실률" field={parseField(bldg.vacancyRate)} unit="%" decimals={2} />
        </div>
      );
    }
    if (activeSubBldg === '실거래가') {
      const bldgRanks = data.volumeRanking?.building || [];
      const storeRanks = data.volumeRanking?.store || [];
      const trades = bldgRanks.reduce((sum: number, item: any) => sum + (item.count || 0), 0) + 
                     storeRanks.reduce((sum: number, item: any) => sum + (item.count || 0), 0);
      return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
          <h4 className="text-sm font-bold text-slate-500 mb-2">상업업무용 매매 시군구 거래량</h4>
          <span className="text-4xl font-black text-blue-600">{trades.toLocaleString()}건</span>
        </div>
      );
    }
    return null;
  };

  const resultView = result ? (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* 모바일 전용: 새 비교 시작 버튼 (좌측 패널이 숨겨져 있으므로) */}
      <div className="lg:hidden flex items-center justify-between px-4 py-2 bg-white border-b border-slate-100 shrink-0">
        <button
          onClick={() => { setResult(null); onShowResult?.(false); }}
          className="flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-indigo-600 transition-colors"
        >
          ← 새 비교 시작
        </button>
        <span className="text-[10px] font-bold text-slate-300">지역 비교 브리핑</span>
      </div>
      {/* Category Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 pt-4 shrink-0 flex justify-center gap-6">
        {CATEGORY_TABS.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCat(cat)}
            className={`pb-3 px-2 text-sm font-black border-b-2 transition-colors ${activeCat === cat ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Sub Tabs based on Category */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 shrink-0 flex gap-2 overflow-x-auto no-scrollbar">
        {(activeCat === '아파트' ? APT_SUB_TABS : activeCat === '토지' ? LAND_SUB_TABS : BLDG_SUB_TABS).map(sub => {
          const activeSub = activeCat === '아파트' ? activeSubApt : activeCat === '토지' ? activeSubLand : activeSubBldg;
          const setSub = activeCat === '아파트' ? setActiveSubApt : activeCat === '토지' ? setActiveSubLand : setActiveSubBldg;
          return (
            <button
              key={sub}
              onClick={() => setSub(sub)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeSub === sub ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
            >
              {sub}
            </button>
          );
        })}
      </div>

      {/* Grid of Regions */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className={`grid gap-6 max-w-7xl mx-auto grid-cols-1 ${selected.length === 1 ? 'max-w-2xl' : selected.length === 2 ? 'md:grid-cols-2' : 'lg:grid-cols-3 md:grid-cols-2'}`}>
          {selected.map((dist, idx) => {
            const distData = result.data[dist.code];
            return (
              <div key={dist.code} className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black tracking-tight" style={{ color: COLORS[idx] }}>
                    {distData?.name || dist.dongName || dist.name}
                  </h3>
                  {distData?.available && (
                    <button onClick={() => router.push(`/?panel=ranking&sigunguCd=${dist.code.substring(0, 5)}`)} className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 flex items-center">
                      AI 랭킹 보기 <ChevronRight className="w-3 h-3 ml-0.5" />
                    </button>
                  )}
                </div>
                
                {distData?.available ? (
                  activeCat === '아파트' ? renderAptTab(dist, distData.extractedData) :
                  activeCat === '토지' ? renderLandTab(dist, distData.extractedData) :
                  renderBldgTab(dist, distData.extractedData)
                ) : (
                  <EmptyState />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="relative flex flex-col h-full min-h-0 bg-slate-50/30">
        {!hideHeader && (
          <div className={PAGE_SUBHEADER}>
            {/* 탭 추가 */}
            <div className="flex w-full mb-4 bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
              <button 
                className="flex-1 py-2 text-sm font-bold text-slate-500 rounded-lg hover:text-slate-800 transition-colors"
                onClick={() => {
                  onShowResult?.(false);
                  setResult(null);
                  router.push('/?panel=ranking');
                }}
              >
                AI 랭킹
              </button>
              <button className="flex-1 py-2 text-sm font-extrabold text-emerald-800 bg-emerald-50 rounded-lg shadow-sm" disabled>
                지역 브리핑
              </button>
            </div>
            
            <h2 className={PAGE_SUBHEADER_TITLE}>지역 브리핑</h2>
            <p className={PANEL_SECTION_DESC}>지역별 분석 데이터를 선택하여 비교해보세요</p>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto px-4 lg:px-5 py-4 space-y-3 pb-24">
          {!result && (
            <div className={PANEL_CARD}>
              <div className="flex items-center gap-2 mb-3">
                <span className={panelStepBadge(1)}>1</span>
                <div>
                  <p className={PANEL_SECTION_LABEL}>비교 분석 지역 선택</p>
                  <p className={PANEL_SECTION_DESC}>최대 3개 지역을 동시에 선택할 수 있습니다</p>
                </div>
              </div>
              
              <DistrictSearch 
                selectedDistricts={selected} 
                onSelect={handleSelect} 
              />
              
              {selected.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {selected.map((dist) => (
                    <div key={dist.code} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100/50 rounded-xl">
                      <span className="text-xs font-extrabold text-emerald-700">{dist.name}</span>
                      <button onClick={() => handleRemove(dist.code)} className="p-0.5 rounded-full hover:bg-emerald-100 text-emerald-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {error && <p className="mt-4 text-xs font-bold text-rose-500 flex items-center gap-1"><AlertCircle className="w-4 h-4"/>{error}</p>}

              <button
                onClick={handleCompare}
                disabled={selected.length < 1 || loading}
                className={`mt-6 w-full py-3.5 rounded-xl text-sm font-black border transition-all ${(selected.length < 1 || loading)
                  ? 'bg-slate-100 border-transparent text-slate-400 cursor-not-allowed shadow-none'
                  : 'shadow-sm hover:opacity-90 active:scale-[0.98]'
                  }`}
                style={(selected.length < 1 || loading) ? undefined : { 
                  backgroundColor: '#10b98115', 
                  borderColor: '#10b98130', 
                  color: '#10b981' 
                }}
              >
                {loading ? '데이터 로딩 중...' : `${selected.length}개 지역 브리핑 보기`}
              </button>
              {/* 최근 비교 기록 */}
            {recentCompares.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-4">
                <h4 className="text-[11px] font-extrabold text-slate-500 mb-2.5">
                  ⏱️ 최근 비교 기록
                </h4>
                <div className="space-y-2">
                  {recentCompares.map((c, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelected(c.districts);
                      }}
                      className="w-full text-left p-3 bg-slate-50 hover:bg-emerald-50/40 rounded-xl border border-slate-200/50 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {c.districts.map((d, i) => {
                          const shortName = d.name.split(' ').slice(1).join(' ') || d.name;
                          return (
                            <span key={i} className="text-xs font-extrabold text-slate-800">
                              {shortName}
                              {i < c.districts.length - 1 && (
                                <span className="text-slate-300 font-normal mx-1">vs</span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {result && typeof document !== 'undefined' &&
        (() => {
          const portalEl = document.getElementById('compare-result-portal');
          if (!portalEl) return null;
          return createPortal(
            <div className="absolute inset-0 bg-white z-10 animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col">
              <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0 shadow-sm">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Region Briefing</span>
                  <h2 className="text-sm font-black text-slate-900">상세 개별 분석 리포트</h2>
                </div>
                <button 
                  onClick={() => {
                    onShowResult?.(false);
                    setResult(null);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0 relative">
                {resultView}
              </div>
            </div>,
            portalEl
          );
        })()
      }
    </>
  );
}
