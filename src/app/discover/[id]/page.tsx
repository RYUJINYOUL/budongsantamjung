'use client';
import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SideNav from '../../../components/SideNav';
import { auth } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface DiscoveryResult {
  success: boolean;
  region?: string;
  query?: { sggNm?: string; budget?: number; category?: string };
  analysis?: {
    regionalOutlook?: {
      direction?: string;
      reasoning?: string;
      keyPositives?: string[];
      keyFactors?: string[];
      overallGrade?: string;
    };
    land?: Record<string, any>;
    apartment?: Record<string, any>;
    store?: Record<string, any>;
    building?: Record<string, any>;
    raw?: string;
  };
  volumeRanking?: Record<string, any[]>;
  marketIndicators?: Record<string, any>;
  macroIndicators?: Record<string, any>;
  unsold?: Record<string, any>;
  construction?: Record<string, any>;
  allTrades?: any[];
  created_at?: string;
}

const CATEGORY_TABS = [
  { key: 'apartment', label: '아파트', icon: '🏢' },
  { key: 'land', label: '토지', icon: '🏞️' },
  { key: 'store', label: '상가', icon: '🏪' },
  { key: 'building', label: '빌딩', icon: '🏗️' },
];

const MAIN_TABS = ['종합평가', '주변호재', '시장지표', '인구현황', '조례·동향·공급'];

function formatWon(n?: number) {
  if (!n) return '-';
  if (n >= 10000) return `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}억원`;
  return `${n.toLocaleString()}만원`;
}

function Badge({ text, color }: { text: string; color: string }) {
  return <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${color}`}>{text}</span>;
}

function DiscoverDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<DiscoveryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState(0);
  const [rankTab, setRankTab] = useState('apartment');

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const res = await fetch(`/api/land/detective/discovery/${id}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
        const json = await res.json();
        if (json.success) setData(json);
        else setError(json.error || '데이터를 불러올 수 없습니다.');
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    };
    const unsub = onAuthStateChanged(auth, () => load());
    return () => unsub();
  }, [id]);

  const region = data?.query?.sggNm || data?.region || '투자처 상세';
  const outlook = data?.analysis?.regionalOutlook || {};
  const analysis = data?.analysis || {};
  const ranking = data?.volumeRanking || {};
  const rankRows = (ranking[rankTab] as any[]) || [];

  const gradeColor = (g?: string) => {
    if (!g) return 'bg-slate-100 text-slate-500 border-slate-200';
    const upper = g.toUpperCase();
    if (['A+', 'A', 'A-'].some(x => upper.startsWith(x))) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (['B+', 'B', 'B-'].some(x => upper.startsWith(x))) return 'bg-sky-50 text-sky-700 border-sky-200';
    if (['C+', 'C', 'C-'].some(x => upper.startsWith(x))) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SideNav />
      <div className="lg:pl-16 min-h-screen flex flex-col">

        {/* 헤더 */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-black text-slate-900 truncate">{region}</h1>
              <p className="text-[10px] font-bold text-teal-600 tracking-widest">AI 투자처 발굴 결과</p>
            </div>
            {data?.query?.budget && (
              <span className="shrink-0 text-xs font-bold bg-teal-50 text-teal-700 px-3 py-1 rounded-full border border-teal-100">
                예산 {formatWon(data.query.budget)}
              </span>
            )}
          </div>

          {/* 메인 탭 */}
          {!loading && !error && (
            <div className="max-w-3xl mx-auto px-4 flex border-t border-slate-100">
              {MAIN_TABS.map((t, i) => (
                <button key={t} onClick={() => setMainTab(i)}
                  className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-all -mb-px ${mainTab === i ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                  {t}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* 바디 */}
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 pb-24">
          {loading ? (
            <div className="flex flex-col items-center py-24 gap-4">
              <div className="w-12 h-12 relative">
                <div className="absolute inset-0 rounded-full border-2 border-teal-100" />
                <div className="absolute inset-0 rounded-full border-t-2 border-teal-600 animate-spin" />
              </div>
              <p className="text-xs font-bold text-teal-600 tracking-widest">결과 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="text-center py-24">
              <p className="text-4xl mb-4">⚠️</p>
              <p className="font-bold text-slate-800 mb-2">불러오기 실패</p>
              <p className="text-slate-500 text-sm mb-4">{error}</p>
              <button onClick={() => router.back()} className="px-5 py-2 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700">돌아가기</button>
            </div>
          ) : mainTab === 0 ? (
            /* ── 종합평가 ── */
            <div className="space-y-4">
              {/* 지역 + 예산 카드 */}
              <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-5 text-white shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-teal-200 text-xs font-bold mb-1">📍 분석 지역</p>
                    <h2 className="text-xl font-black leading-tight">{region}</h2>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {data?.query?.budget && <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">예산 {formatWon(data.query.budget)}</span>}
                      {data?.query?.category && data.query.category !== 'all' && <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">{data.query.category}</span>}
                    </div>
                  </div>
                  {outlook.overallGrade && (
                    <div className="shrink-0 w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <span className="text-2xl font-black">{outlook.overallGrade}</span>
                    </div>
                  )}
                </div>
                {outlook.direction && (
                  <div className="mt-4 bg-white/10 rounded-xl p-3">
                    <p className="text-teal-100 text-xs font-bold mb-1">투자 방향</p>
                    <p className="text-white text-sm font-semibold leading-relaxed">{outlook.direction}</p>
                  </div>
                )}
              </div>

              {/* AI 핵심 요약 */}
              {(outlook.reasoning || analysis.raw) && (
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
                      <span>✨</span>
                    </div>
                    <h3 className="font-black text-teal-700 text-sm">AI 분석 핵심 요약</h3>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    {outlook.reasoning || (analysis as any).raw}
                  </p>
                  {((outlook.keyPositives || outlook.keyFactors) as string[] | undefined)?.length && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {((outlook.keyPositives || outlook.keyFactors) as string[]).map((f, i) => (
                        <span key={i} className="text-[11px] bg-teal-50 text-teal-700 border border-teal-100 px-2.5 py-1 rounded-full font-bold">{f}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 유형별 분석 요약 */}
              {/* 유형별 분석 요약 */}
              {CATEGORY_TABS.filter(c => analysis[c.key as keyof typeof analysis]).length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <h3 className="font-black text-slate-800 text-sm">유형별 AI 분석</h3>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {CATEGORY_TABS.filter(c => analysis[c.key as keyof typeof analysis]).map(cat => {
                      const catData = analysis[cat.key as keyof typeof analysis] as any;
                      const grade = catData?.investmentGrade || catData?.grade || 'B';
                      const strategy = catData?.strategy || catData?.summary || '';
                      const outlookDesc = catData?.outlook || '';
                      return (
                        <div key={cat.key} className="px-4 py-4">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-black text-sm text-slate-800">{cat.icon} {cat.label}</span>
                            <Badge text={`등급 ${grade}`} color={gradeColor(grade)} />
                          </div>
                          {strategy && <p className="text-sm text-slate-700 leading-relaxed font-semibold mb-2">{strategy}</p>}
                          {outlookDesc && <p className="text-xs text-slate-500 leading-relaxed font-medium">{outlookDesc}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 지역별 투자 지표 요약 (거시경제 + 순위) */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-5">
                <h3 className="font-black text-slate-800 text-lg mb-1">지역별 투자 지표 요약</h3>
                <p className="text-xs text-slate-500 mb-4">거래량 및 실거래가 기반 분석</p>
                
                {/* 거시경제 지표 5종 */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {data?.macroIndicators?.cpi && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-rose-500 mb-1">📈 소비자물가지수</p>
                      <p className="text-lg font-black text-slate-800">{data.macroIndicators.cpi.value} <span className="text-[10px] text-slate-400 font-normal">{data.macroIndicators.cpi.unit}</span></p>
                    </div>
                  )}
                  {data?.macroIndicators?.constructCostIndex && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-amber-500 mb-1">🏗️ 건설공사비지수</p>
                      <p className="text-lg font-black text-slate-800">{data.macroIndicators.constructCostIndex.value} <span className="text-[10px] text-slate-400 font-normal">{data.macroIndicators.constructCostIndex.unit}</span></p>
                    </div>
                  )}
                  {data?.macroIndicators?.loanRate && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-teal-600 mb-1">🏦 가계대출금리</p>
                      <p className="text-lg font-black text-slate-800">{data.macroIndicators.loanRate.value} <span className="text-[10px] text-slate-400 font-normal">%</span></p>
                    </div>
                  )}
                  {data?.unsold && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-indigo-500 mb-1">🏢 시도 미분양</p>
                      <p className="text-lg font-black text-slate-800">{data.unsold.count?.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">세대</span></p>
                    </div>
                  )}
                  {data?.construction?.start && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-sky-600 mb-1">🏗️ 건축착공</p>
                      <p className="text-lg font-black text-slate-800">{data.construction.start.count?.toLocaleString() || '-'} <span className="text-[10px] text-slate-400 font-normal">동</span></p>
                    </div>
                  )}
                  {data?.construction?.permit && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-purple-600 mb-1">📋 건축허가</p>
                      <p className="text-lg font-black text-slate-800">{data.construction.permit.count?.toLocaleString() || '-'} <span className="text-[10px] text-slate-400 font-normal">동</span></p>
                    </div>
                  )}
                </div>

                {/* 순위 탭 */}
                <div className="flex gap-2 flex-wrap mb-3">
                  {CATEGORY_TABS.map(c => (
                    <button key={c.key} onClick={() => setRankTab(c.key)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${rankTab === c.key ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-teal-300'}`}>
                      {c.label}
                    </button>
                  ))}
                </div>

                {rankRows.length > 0 ? (
                  <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2">
                    {rankRows.slice(0, 5).map((row: any, i: number) => (
                      <div key={i} className={`flex items-center gap-3 py-2.5 ${i < 3 ? 'bg-teal-50/30 -mx-5 px-5' : ''}`}>
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black shrink-0 ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          {row.rank || i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-slate-800 truncate">{row.location || row.name || '-'}</p>
                        </div>
                        <div className="text-right">
                          {row.avgPrice && <p className="text-xs text-slate-600 font-bold">{formatWon(row.avgPrice)}</p>}
                          {row.count && <p className="text-[10px] text-teal-600 font-semibold">{row.count}건 거래</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-400 text-xs font-medium">순위 데이터 없음</p>
                  </div>
                )}
              </div>
            </div>
          ) : mainTab === 1 ? (
            /* ── 주변호재 ── */
            <div className="space-y-4">
              {/* 호재 항목이 있는 것 */}
              {Object.entries((data as any)?.classifiedFactors || {})
                .filter(([, cat]: any) => cat.found === true)
                .map(([key, cat]: any) => (
                  <div key={key} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">✅</span>
                      <h4 className="font-black text-slate-800 text-sm">{cat.label}</h4>
                      <span className="ml-auto text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-100 px-2 py-0.5 rounded-full">{cat.items?.length || 0}건</span>
                    </div>
                    <div className="space-y-2">
                      {cat.items?.map((item: any, j: number) => (
                        <div key={j} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="font-semibold text-xs text-slate-800 leading-relaxed mb-1">{item.title}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.source && <span className="text-[10px] bg-sky-50 text-sky-600 border border-sky-100 px-1.5 py-0.5 rounded font-bold">{item.source}</span>}
                            {(item.date) && <span className="text-[10px] text-slate-400">{typeof item.date === 'string' ? item.date.slice(0, 10) : ''}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              }
              {/* 데이터 없음 */}
              {Object.values((data as any)?.classifiedFactors || {}).every((c: any) => !c.found) && (
                <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center shadow-sm">
                  <p className="text-3xl mb-2">🔍</p>
                  <p className="font-bold text-slate-800 text-sm">확인된 호재가 없습니다</p>
                  <p className="text-xs text-slate-500 mt-1">해당 지역의 주요 투자 호재가 감지되지 않았습니다.</p>
                </div>
              )}
              {!((data as any)?.classifiedFactors) && (
                <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center shadow-sm">
                  <p className="text-xs text-slate-400">데이터를 불러오는 중...</p>
                </div>
              )}
            </div>
          ) : mainTab === 2 ? (
            /* ── 시장지표 ── */
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {CATEGORY_TABS.map(c => (
                  <button key={c.key} onClick={() => setRankTab(c.key)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${rankTab === c.key ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-teal-300'}`}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
              {(() => {
                const catData = data?.marketIndicators?.[rankTab] as any;
                if (!catData) return <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center"><p className="text-xs text-slate-400">해당 유형의 지표 데이터가 없습니다.</p></div>;
                const INDICATOR_LABELS: Record<string, string> = {
                  priceIndex: '매매가격지수',
                  jeonseIndex: '전세가격지수',
                  saleIndex: '실거래지수',
                  tradeVolume: '거래량',
                  supplyDemand: '수급지수',
                  medianSaleRatio: '매매실족률',
                  conversionRate: '전월세전환율',
                  wolseIndex: '월세지수',
                  saleAgeIndex: '명도지수',
                  saleSizeIndex: '규모지수',
                  quintile: '아파트맨로분위수',
                  primarySupply: '주택분양지구지수',
                };
                const trendColor = (t?: string) => t === '상승' ? 'text-rose-600' : t === '하락' ? 'text-sky-600' : 'text-slate-500';
                return (
                  <div className="space-y-3">
                    {Object.entries(catData)
                      .filter(([k]) => !['category', 'txType'].includes(k) && (catData[k] as any)?.summary)
                      .map(([k, ind]: any, i) => {
                        const s = ind.summary;
                        return (
                          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-black text-sm text-slate-800">{INDICATOR_LABELS[k] || k}</p>
                                {s.period && <p className="text-[10px] text-slate-400 mt-0.5">{s.period}</p>}
                              </div>
                              {s.trend && <span className={`text-xs font-black px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 ${trendColor(s.trend)}`}>{s.trend}</span>}
                            </div>
                            <div className="flex items-end gap-3">
                              <p className="text-2xl font-black text-slate-900">{typeof s.latest === 'number' ? s.latest.toFixed(1) : (s.latest || '-')}</p>
                              {s.change !== undefined && (
                                <p className={`text-sm font-bold mb-1 ${s.change > 0 ? 'text-rose-500' : s.change < 0 ? 'text-sky-500' : 'text-slate-400'}`}>
                                  {s.change > 0 ? '+' : ''}{typeof s.change === 'number' ? s.change.toFixed(1) : s.change}
                                </p>
                              )}
                              <p className="text-[10px] text-slate-400 mb-1">{ind.summary?.unit || ''}</p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                );
              })()}
            </div>
          ) : mainTab === 3 ? (
            /* ── 인구현황 ── */
            <div className="space-y-4">
              {/* 요약 카드 */}
              {(() => {
                const mv = (data as any)?.population?.movement?.summary;
                const bg = (data as any)?.backgroundHousehold;
                const ageData = (data as any)?.backgroundPopAge;
                return (
                  <>
                    {/* 현황 요약 */}
                    {(mv || bg) && (
                      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-5 text-white shadow-lg">
                        <p className="text-indigo-200 text-xs font-bold mb-3">👥 인구 현황 요약</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-white/10 rounded-xl p-3 text-center">
                            <p className="text-indigo-200 text-[10px] font-bold mb-1">현재 인구</p>
                            <p className="text-white font-black text-base">{(mv?.currentPopulation || bg?.totalPopulation)?.toLocaleString()}</p>
                            <p className="text-indigo-300 text-[9px]">명</p>
                          </div>
                          <div className="bg-white/10 rounded-xl p-3 text-center">
                            <p className="text-indigo-200 text-[10px] font-bold mb-1">현재 세대</p>
                            <p className="text-white font-black text-base">{(mv?.currentHouseholds || bg?.householdCount)?.toLocaleString()}</p>
                            <p className="text-indigo-300 text-[9px]">가구</p>
                          </div>
                          <div className="bg-white/10 rounded-xl p-3 text-center">
                            <p className="text-indigo-200 text-[10px] font-bold mb-1">평균 가구원</p>
                            <p className="text-white font-black text-base">{bg?.avgFamilyMembers || mv?.hhNmpr || '-'}</p>
                            <p className="text-indigo-300 text-[9px]">명</p>
                          </div>
                        </div>
                        {mv?.populationChange !== undefined && (
                          <div className="mt-3 bg-white/10 rounded-xl p-2.5 flex items-center gap-2">
                            <span className={`text-sm font-black ${mv.populationChange >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                              {mv.populationChange >= 0 ? '▲' : '▼'} {Math.abs(mv.populationChange).toLocaleString()}명
                            </span>
                            <span className="text-indigo-200 text-[10px]">{mv.period} 인구 변화</span>
                            <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${mv.isGrowing ? 'bg-emerald-500/30 text-emerald-200' : 'bg-rose-500/30 text-rose-200'}`}>
                              {mv.isGrowing ? '증가' : '감소'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 연령대 분포 */}
                    {ageData?.ages && (
                      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-black text-slate-800 text-sm">연령대별 인구 분포</h4>
                          <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full font-bold">주요 {ageData.mainAge}</span>
                        </div>
                        <div className="flex gap-3 mb-3 text-[10px] font-bold">
                          <span className="text-rose-500">40세 미만 비율: {ageData.youngRatio}%</span>
                          <span className="text-slate-400">|</span>
                          <span className="text-slate-500">60세 이상 비율: {ageData.seniorRatio}%</span>
                        </div>
                        <div className="space-y-2">
                          {ageData.ages.map((a: any, i: number) => (
                            <div key={i} className="flex items-center gap-2">
                              <p className="text-[11px] font-bold text-slate-600 w-16 shrink-0">{a.label}</p>
                              <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-indigo-500 transition-all"
                                  style={{ width: `${Math.min(a.ratio * 4, 100)}%` }}
                                />
                              </div>
                              <p className="text-[11px] font-black text-slate-800 w-10 text-right">{a.ratio}%</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 월별 인구 이동 */}
                    {(data as any)?.population?.movement?.trend?.length > 0 && (
                      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                        <h4 className="font-black text-slate-800 text-sm mb-3">월별 인구 이동 추이</h4>
                        <div className="space-y-2">
                          {(data as any).population.movement.trend.slice().reverse().slice(0, 12).map((t: any, i: number) => {
                            const ym = t.yearMonth;
                            const label = ym ? `${ym.slice(0, 4)}.${ym.slice(4, 6)}` : '-';
                            return (
                              <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="font-bold text-xs text-slate-600">{label}</p>
                                <div className="flex gap-4">
                                  <div className="text-right">
                                    <p className="text-[10px] text-slate-400">인구</p>
                                    <p className="font-black text-xs text-slate-800">{t.population?.toLocaleString()}명</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] text-slate-400">세대</p>
                                    <p className="font-black text-xs text-slate-800">{t.households?.toLocaleString()}가구</p>
                                  </div>
                                  {t.hhNmpr && (
                                    <div className="text-right">
                                      <p className="text-[10px] text-slate-400">가구원</p>
                                      <p className="font-black text-xs text-slate-800">{t.hhNmpr}명</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 연도별 인구수 */}
                    {(data as any)?.population?.trend?.trend?.length > 0 && (
                      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                        <h4 className="font-black text-slate-800 text-sm mb-3">연도별 인구수 (구/군/시)</h4>
                        <div className="space-y-2">
                          {(data as any).population.trend.trend.map((t: any, i: number) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <p className="font-bold text-xs text-slate-600">{t.year}년</p>
                              <p className="font-black text-sm text-slate-800">{t.population?.toLocaleString()}명</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            /* ── 조례·동향·공급 ── */
            <div className="space-y-4">
              {/* 주택 공급 */}
              {(() => {
                const hs = (data as any)?.housingSupply;
                return hs && (
                  <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                    <h4 className="font-black text-slate-800 text-sm mb-3">호주택 공급 현황</h4>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-[10px] font-bold text-teal-600 mb-1">항향 분양 계획</p>
                        <p className="text-lg font-black text-slate-800">{hs.nextYears?.planned?.count?.toLocaleString() || 0} <span className="text-[10px] text-slate-400 font-normal">세대</span></p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-[10px] font-bold text-sky-600 mb-1">항향 입주예정</p>
                        <p className="text-lg font-black text-slate-800">{hs.nextYears?.moveIn?.count?.toLocaleString() || 0} <span className="text-[10px] text-slate-400 font-normal">세대</span></p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-[10px] font-bold text-rose-500 mb-1">현재 미분양</p>
                        <p className="text-lg font-black text-slate-800">{hs.unsold?.current?.toLocaleString() || 0} <span className="text-[10px] text-slate-400 font-normal">세대</span></p>
                        {hs.unsold?.trend && <p className="text-[10px] text-slate-500 mt-0.5">{hs.unsold.trend}</p>}
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-[10px] font-bold text-amber-500 mb-1">건축허가 (12개월)</p>
                        <p className="text-lg font-black text-slate-800">{hs.permits?.last12months?.toLocaleString() || 0} <span className="text-[10px] text-slate-400 font-normal">동</span></p>
                      </div>
                    </div>
                    {hs.glutScore > 0 && (
                      <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                        <span className="text-amber-600 text-sm">⚠️</span>
                        <p className="text-xs text-amber-700 font-semibold">공급과잌 위험 점수: {hs.glutScore}점</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 동향 뉴스 */}
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <h4 className="font-black text-slate-800 text-sm mb-3">지역 개발 동향 뉴스</h4>
                <div className="space-y-3">
                  {(data as any)?.dynamicNews?.items?.length > 0 ? (
                    (data as any).dynamicNews.items.map((n: any, i: number) => {
                      const isHigh = n.confidence === 'high';
                      const mag = n.impact?.magnitude;
                      return (
                        <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-start gap-2 mb-1.5">
                            <p className="font-semibold text-xs text-slate-800 leading-relaxed flex-1">{n.title}</p>
                            {isHigh && <span className="shrink-0 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded font-black">확실</span>}
                          </div>
                          {n.impact?.description && (
                            <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2 mb-1.5">{n.impact.description}</p>
                          )}
                          {n.impact?.area && (
                            <p className="text-[10px] text-teal-600 font-bold mb-1">📍 {n.impact.area}</p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            {n.source && !n.source.startsWith('http') && (
                              <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-100 px-1.5 py-0.5 rounded font-bold">{n.source}</span>
                            )}
                            {mag && <span className="text-[10px] text-slate-500 font-bold">영향: {mag}</span>}
                            {n.date && <span className="text-[10px] text-slate-400">{new Date(n.date).toLocaleDateString('ko-KR')}</span>}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-4">지역 동향 다이터가 없습니다.</p>
                  )}
                </div>
              </div>

              {/* 조례 */}
              {(data as any)?.ordinance?.ordinances?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                  <h4 className="font-black text-slate-800 text-sm mb-3">시군구 조례</h4>
                  <div className="space-y-2">
                    {(data as any).ordinance.ordinances.map((o: any, i: number) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="font-semibold text-xs text-slate-800">{o.title || o.name || '-'}</p>
                        {o.date && <p className="text-[10px] text-slate-400 mt-0.5">{o.date}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function DiscoverDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-10 h-10 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <DiscoverDetailContent />
    </Suspense>
  );
}
