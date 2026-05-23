import React from 'react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { Zap, ShieldCheck, DollarSign, Layers, TrendingUp, ShieldAlert, CheckCircle2, Search, Gavel, MapPin, Hexagon, BarChart3, AlertCircle } from 'lucide-react';

// Typewriter 컴포넌트
const Typewriter = ({ text, delay = 30 }: { text: string; delay?: number }) => {
    const [displayedText, setDisplayedText] = React.useState('');
    const [currentIndex, setCurrentIndex] = React.useState(0);

    React.useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(prev => prev + text[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, delay);
            return () => clearTimeout(timeout);
        }
    }, [currentIndex, delay, text]);

    return <span>{displayedText}</span>;
};

// MiniBar 컴포넌트
const MiniBar = ({ score, max = 10 }: { score: number, max?: number }) => {
    const pct = (score / max) * 100;
    const color = score >= 8 ? "#22c55e" : score >= 5 ? "#eab308" : "#ef4444";
    return (
        <div className="flex items-center gap-2 w-full mt-2 mb-1">
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div style={{ width: `${pct}%`, backgroundColor: color }} className="h-full rounded-full transition-all duration-1000 ease-out" />
            </div>
            <span style={{ color }} className="text-xs font-black min-w-[20px] text-right">{score}</span>
        </div>
    );
};

// RiskGauge 컴포넌트
const RiskGauge = ({ score, grade }: { score: number, grade: string }) => {
    let color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
    let label = score >= 80 ? '안전' : score >= 50 ? '주의' : '위험';
    const radius = 60;
    const dashArray = radius * Math.PI * 2;
    const dashOffset = dashArray - (dashArray * (score / 100));

    return (
        <div className="relative w-40 h-40 flex flex-col items-center justify-center">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                <circle cx="80" cy="80" r={radius} fill="none" stroke={color} strokeWidth="12" strokeDasharray={dashArray} strokeDashoffset={dashOffset} className="transition-all duration-1000 ease-out" strokeLinecap="round" />
            </svg>
            <span className="text-3xl font-black" style={{ color }}>{score}</span>
            <span className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{label}</span>
            <div className="absolute -bottom-2 bg-slate-900 border border-slate-700 px-3 py-1 rounded-full whitespace-nowrap shadow-xl">
                <span className="text-[10px] font-bold text-white">{grade}</span>
            </div>
        </div>
    );
};

export default function AiReportView({ ai, mergedData, onTriggerAnalysis, isCheckingAccess }: any) {
    const aiStatus = mergedData?.ai_analysis_status || 'pending';

    if (aiStatus !== 'completed') {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center bg-[#0ea5e9]/5 border-2 border-[#0ea5e9]/20 rounded-[32px] p-8">
                <div className="w-20 h-20 bg-[#0ea5e9] rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(14,165,233,0.4)]">
                    <Zap className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">AI 분석 준비 완료</h3>
                <p className="text-white/70 mb-8 max-w-md text-[15px] leading-relaxed">
                    사진 6장과 가격 정보를 입력하시면<br/>
                    탐정 AI가 수익성 및 리스크를 심층 분석합니다.
                </p>
                <button
                    onClick={onTriggerAnalysis}
                    disabled={isCheckingAccess}
                    className="w-full h-[60px] bg-[#0ea5e9] hover:bg-[#0284c7] disabled:opacity-60 text-white font-[900] text-[17px] rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2"
                >
                    {isCheckingAccess ? (
                        <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>결제 확인 중...</span></>
                    ) : (
                        <>계약 전 마지막 체크! 3,900원 AI 정밀 검토하기</>
                    )}
                </button>
            </div>
        );
    }

    if (!ai || Object.keys(ai).length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center bg-[#0ea5e9]/5 border-2 border-[#0ea5e9]/20 rounded-[32px] p-8">
                <div className="w-20 h-20 bg-[#0ea5e9] rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">AI 분석 완료</h3>
                <p className="text-white/70 mb-8 max-w-md text-[15px] leading-relaxed">
                    AI 분석이 완료됐습니다.<br/>
                    리포트 로드 중 오류가 발생했습니다.<br/>
                    페이지를 새로고침해주세요.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="w-full h-[56px] bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold text-[16px] rounded-2xl transition-all"
                >
                    리포트 새로고침
                </button>
            </div>
        );
    }

    const compRisk = ai['1_comprehensiveRisk'] || {};
    const priceReas = ai['5_priceReasonableness'] || {};
    const overallScore = typeof (compRisk.totalScore || compRisk.score) === 'number' ? (compRisk.totalScore || compRisk.score) : 0;
    const riskGrade = priceReas.conclusion || compRisk.coreJudgement || '분석 중';
    const summaryText = compRisk.coreJudgement || mergedData.detectiveNote || "상세 분석 리포트가 파싱을 완료했습니다.";

    const radarMap: any = {};
    if (compRisk.scoreItems) {
        Object.entries(compRisk.scoreItems).forEach(([k, v]: [string, any]) => {
            radarMap[k] = typeof v === 'object' ? (v.score || 0) : (typeof v === 'number' ? v : 0);
        });
    }
    const radarData = Object.entries(radarMap).map(([key, value]) => {
        const labelMap: Record<string, string> = {
            'nearbySales': '인근 실거래가', 'tradeVolume': '거래량', 'amenities': '생활 편의시설',
            'regulatoryOutlook': '규제 전망', 'population': '인구 현황', 'landRegulation': '토지 이용 규제',
            'landShape': '토지 형상', 'buildingAgePhoto': '건물 노후도(사진)', 'buildingAgeRegister': '건물 노후도(대장)',
            'rentProfitability': '임대 수익성'
        };
        return { subject: labelMap[key] || key, A: value, fullMark: 10 };
    });

    const priceAnalysis = ai['3_priceAnalysisReport'] || {};
    const landShapesObj = ai['2_propertyAnalysis'] || ai['2_landShapeAnalysis'] || {};
    const landShapes = Array.isArray(landShapesObj) ? landShapesObj : Object.values(landShapesObj);
    const inDepth = ai['7_inDepthReport'] || {};
    const mustCheckObj = ai['6_mustCheckList'] || {};
    const mustCheck = Array.isArray(mustCheckObj) ? mustCheckObj : Object.values(mustCheckObj);
    const areaInfo = ai['4_areaInfo'] || {};

    const firesaleSummary = priceAnalysis.landFiresaleSummary || priceAnalysis.comparableSummary || priceAnalysis.comparableAnalysis;
    const tradeVolume = priceAnalysis.buildingTradeVolume || priceAnalysis.tradeVolume;

    const inDepthCategories: Record<string, any> = {
        'economy': { icon: BarChart3, label: '경제성 · 수익성 분석', color: '#22c55e' },
        'defects': { icon: AlertCircle, label: '구조 · 하자 리스크', color: '#f59e0b' },
        'outlook': { icon: TrendingUp, label: '미래 가치 · 전망', color: '#38bdf8' },
        'investmentValue': { icon: DollarSign, label: '투자 가치 분석', color: '#22c55e' },
        'reconstruction': { icon: Layers, label: '재건축 · 리모델링 가능성', color: '#f59e0b' },
        'landAndBuildingValue': { icon: Layers, label: '토지 + 건물 분리 가치', color: '#34d399' },
        'reconstructionOutlook': { icon: TrendingUp, label: '재건축 · 리모델링 경제성', color: '#f59e0b' },
        'rentalIncome': { icon: DollarSign, label: '다가구 임대 수익 분석', color: '#22c55e' },
        'yieldOutlook': { icon: TrendingUp, label: '임대 수익 전망 · EXIT 전략', color: '#38bdf8' },
        'investmentScenarios': { icon: Layers, label: '투자 시나리오 비교', color: '#a855f7' },
        'businessOutlook': { icon: Search, label: '업종 성공 가능성', color: '#22c55e' },
        'alternativeBusiness': { icon: MapPin, label: '대체 업종 추천 TOP 3', color: '#38bdf8' },
        'leaseProtection': { icon: ShieldCheck, label: '임대차 보호 분석', color: '#f59e0b' },
        'exitStrategy': { icon: TrendingUp, label: '폐업 · 양도 EXIT 전략', color: '#ef4444' },
        'developmentUtility': { icon: Hexagon, label: '개발 활용도 분석', color: '#22c55e' },
        'yieldAnalysis': { icon: BarChart3, label: '수익률(CAP Rate) 분석', color: '#38bdf8' },
    };

    const formatPrice = (val: any) => {
        if (!val) return '-';
        const num = typeof val === 'number' ? val : (parseFloat(val) || 0);
        if (num >= 100000000) return `${(num / 100000000).toFixed(1)}억원`;
        if (num >= 10000) return `${(num / 10000).toFixed(0)}만원`;
        return `${num.toFixed(0)}원`;
    };

    return (
        <div className="space-y-6">
            {/* 1. 종합 분석 요약 */}
            <div className="p-6 bg-[#0f172a]/40 border border-white/5 rounded-[40px]">
                <div className="flex justify-center my-4">
                    <RiskGauge score={overallScore} grade={riskGrade} />
                </div>
                <div className="text-white text-[16px] leading-[1.6] font-[600] min-h-[80px]">
                    <Typewriter text={summaryText} delay={30} />
                </div>
            </div>

            {/* 2. 세부 리스크 평가 항목 */}
            {Object.keys(radarMap).length > 0 && (
                <div className="p-6 bg-[#0f172a] rounded-[40px] border border-white/5">
                    <div className="flex items-center gap-2 mb-6">
                        <Zap className="w-4 h-4 text-[#0ea5e9]" />
                        <span className="text-[#0ea5e9] font-bold">세부 리스크 평가 항목</span>
                    </div>
                    <div className="h-[240px] w-full mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData}>
                                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                                <Radar name="Risk" dataKey="A" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.3} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-3">
                        {Object.entries(compRisk.scoreItems || {}).map(([key, item]: [string, any], idx) => {
                            const label = radarData.find(r => r.subject === (inDepthCategories[key]?.label || key))?.subject || key;
                            return (
                                <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/10">
                                    <div className="text-sm font-bold text-white mb-2">{label}</div>
                                    <MiniBar score={typeof item === 'object' ? (item.score || 0) : item} max={10} />
                                    {item.reason && <div className="text-xs text-white/50 mt-2 leading-relaxed">{item.reason}</div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 3. 예상 가격 타당성 검증 */}
            {Object.keys(priceReas).length > 0 && (
                <div className="p-6 bg-[#0f172a] rounded-3xl border border-white/5">
                    <div className="text-[#10b981] text-[16px] font-bold mb-3">예상 가격 타당성 검증</div>
                    <div className="text-white text-[15px] font-bold mb-2">{priceReas.conclusion || ''}</div>
                    {priceReas.gap && (
                        <div className="p-3 bg-white/5 rounded-xl border border-[#10b981]/20 my-2">
                            <div className="flex items-center gap-2 mb-1 text-white/50 text-xs">
                                <TrendingUp className="w-3.5 h-3.5 text-[#10b981]" /> 제시가 vs 비준가격 차이
                            </div>
                            <div className="text-[#10b981] text-xs font-bold pl-5">{priceReas.gap}</div>
                        </div>
                    )}
                    {priceReas.opinion && <div className="text-white/50 text-[13px] leading-[1.5] mt-2">{priceReas.opinion}</div>}
                </div>
            )}

            {/* 4. 실거래가 및 시세 비교 분석 */}
            {Object.keys(priceAnalysis).length > 0 && (
                <div className="p-6 bg-[#0f172a] rounded-3xl border border-blue-500/30">
                    <div className="flex items-center gap-2 mb-4 text-blue-500 font-bold text-[16px]">
                        <Search className="w-5 h-5" /> 실거래가 및 시세 비교 분석
                    </div>
                    {firesaleSummary && (
                        <div className="mb-4">
                            <div className="text-white/70 text-[12px] font-bold mb-2">실거래가 비교 및 급매 요약</div>
                            <div className="text-white text-[14px] leading-[1.5] whitespace-pre-wrap">{firesaleSummary}</div>
                        </div>
                    )}
                    {tradeVolume && (
                        <div>
                            <div className="text-white/70 text-[12px] font-bold mb-2">지역 거래량 및 시장 분석</div>
                            <div className="text-white text-[14px] leading-[1.5] whitespace-pre-wrap">{tradeVolume}</div>
                        </div>
                    )}
                </div>
            )}

            {/* 5. 토지 형태 및 개발 잠재력 */}
            {landShapes.length > 0 && (
                <div>
                    <div className="text-white text-[18px] font-bold mb-4">토지 형태 및 개발 잠재력</div>
                    {landShapes.map((shape, i) => (
                        <div key={i} className="mb-3 p-4 bg-white/5 rounded-2xl flex gap-2">
                            <Hexagon className="w-4 h-4 text-[#10b981] shrink-0" />
                            <div className="text-white/70 text-[14px]">{String(shape)}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* 6. 심층 리포트 (inDepth) */}
            {Object.keys(inDepth).length > 0 && (
                <div className="space-y-4">
                    {Object.entries(inDepth).filter(([k, v]) => v).map(([key, value], idx) => {
                        const meta = inDepthCategories[key] || { icon: Search, label: key, color: '#94a3b8' };
                        const Icon = meta.icon;
                        return (
                            <div key={idx} className="p-6 bg-[#0f172a] rounded-3xl border border-white/5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Icon className="w-5 h-5" style={{ color: meta.color }} />
                                    <div className="text-white text-[18px] font-bold">{meta.label}</div>
                                </div>
                                <div className="text-white/70 leading-[1.6] whitespace-pre-wrap">{String(value)}</div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 7. 체크리스트 */}
            {mustCheck.length > 0 && (
                <div className="w-full p-6 bg-[#0f172a] rounded-3xl">
                    <div className="text-white/50 text-[12px] font-bold mb-4">체크 리스트</div>
                    {mustCheck.map((q, i) => (
                        <div key={i} className="text-white leading-[1.5] mb-1">· {String(q)}</div>
                    ))}
                </div>
            )}

            {/* 8. 대지 정보 */}
            {Object.keys(areaInfo).length > 0 && (
                <div className="w-full p-6 bg-[#0f172a] rounded-3xl">
                    <div className="text-white/50 text-[12px] font-bold mb-4">대지 정보</div>
                    <div className="text-white mb-1">대지 면적: {areaInfo.landArea || '-'}</div>
                    <div className="text-white">연면적: {areaInfo.floorArea || '-'}</div>
                </div>
            )}

            {/* 9. 종합 분석 결과 */}
            {ai['8_finalVerdict'] && (
                <div className="p-6 bg-red-500/10 rounded-3xl border border-red-500/50">
                    <div className="flex items-center gap-2 text-red-500 font-bold text-[15px] mb-5">
                        <Gavel className="w-4.5 h-4.5" /> 종합 분석 결과
                    </div>
                    {(() => {
                        const verdict = ai['8_finalVerdict'];
                        if (typeof verdict !== 'object') return <div className="text-white text-[16px] leading-[1.6]">{String(verdict)}</div>;
                        const v = verdict.verdic || verdict.verdict || '-';
                        const grade = verdict.investmentGrade || '-';
                        const reason = verdict.reason || '-';
                        const condition = verdict.condition || '';
                        return (
                            <div>
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="px-3 py-1.5 bg-red-500 rounded-lg text-white font-bold text-[14px]">결론: {v}</div>
                                    <div className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white font-bold text-[14px]">등급: {grade}</div>
                                </div>
                                <div className="text-white/70 text-[12px] font-bold mb-2">분석 근거</div>
                                <div className="text-white text-[15px] leading-[1.6] mb-4">{reason}</div>
                                {condition && (
                                    <>
                                        <div className="text-white/70 text-[12px] font-bold mb-2">전제 조건</div>
                                        <div className="text-white/60 text-[14px] leading-[1.6] italic">{condition}</div>
                                    </>
                                )}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* 10. 데이터 출처 (analysisMetadata) */}
            {ai.analysisMetadata && (
                <div className="p-6 bg-[#0f172a] rounded-3xl border border-white/5">
                    <div className="flex items-center gap-2 mb-5">
                        <ShieldCheck className="w-4 h-4 text-white/40" />
                        <div className="text-white/40 text-[12px] font-[900] tracking-[1.5px]">데이터 출처</div>
                        <div className="ml-auto px-2.5 py-1 rounded-full text-[11px] font-[900]" style={{
                            color: ai.analysisMetadata.confidenceGrade === 'A' ? '#10b981' : ai.analysisMetadata.confidenceGrade === 'B' ? '#f59e0b' : '#ef4444',
                            backgroundColor: ai.analysisMetadata.confidenceGrade === 'A' ? 'rgba(16,185,129,0.2)' : ai.analysisMetadata.confidenceGrade === 'B' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'
                        }}>
                            {ai.analysisMetadata.confidenceGrade}등급
                        </div>
                    </div>
                    <div className="flex justify-between mb-3 text-[12px]"><span className="text-white/40">분석 방식</span><span className="text-white font-[900]">{ai.analysisMetadata.method || '-'}</span></div>
                    <div className="flex justify-between mb-3 text-[12px]"><span className="text-white/40">비교사례</span><span className="text-white font-[900]">{ai.analysisMetadata.comparableCount || '-'}건</span></div>
                    
                    {(ai.analysisMetadata.conditionRelaxLevel > 0) && (
                        <div className="mt-4 p-3 bg-[#f59e0b]/5 rounded-xl border border-[#f59e0b]/10">
                            <div className="text-[#f59e0b] text-[11px] font-[900]">조건 완화 Level {ai.analysisMetadata.conditionRelaxLevel}</div>
                            {ai.analysisMetadata.confidenceNote && <div className="text-white/40 text-[11px] mt-1">{ai.analysisMetadata.confidenceNote}</div>}
                        </div>
                    )}
                    
                    {ai.analysisMetadata.officialPriceRatio?.medianRatio && (
                        <div className="mt-4 p-3 bg-[#0ea5e9]/5 rounded-xl border border-[#0ea5e9]/10">
                            <div className="text-[#0ea5e9] text-[11px] font-[900] mb-2">📊 공시가격 배율 분석</div>
                            <div className="flex justify-between mb-1.5 text-[12px]"><span className="text-white/40">배율 (중앙값)</span><span className="text-white font-[900]">{ai.analysisMetadata.officialPriceRatio.medianRatio}배</span></div>
                            {ai.analysisMetadata.officialPriceRatio.estimatedPerPyeong && <div className="flex justify-between mb-1.5 text-[12px]"><span className="text-white/40">추정 평당가</span><span className="text-white font-[900]">{formatPrice(ai.analysisMetadata.officialPriceRatio.estimatedPerPyeong)}</span></div>}
                            {ai.analysisMetadata.officialPriceRatio.estimatedPrice && <div className="flex justify-between mb-1.5 text-[12px]"><span className="text-white/40">추정 시세</span><span className="text-white font-[900]">{formatPrice(ai.analysisMetadata.officialPriceRatio.estimatedPrice)}</span></div>}
                            <div className="flex justify-between text-[12px]"><span className="text-white/40">샘플 수</span><span className="text-white font-[900]">{ai.analysisMetadata.officialPriceRatio.sampleCount || 0}건</span></div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
