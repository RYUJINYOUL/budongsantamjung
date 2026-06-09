import React from 'react';
import { motion } from 'framer-motion';
import RiskBubbleChart from './RiskBubbleChart';
import PremiumRiskGauge from './PremiumRiskGauge';
import {
    Zap, ShieldCheck, DollarSign, Layers, TrendingUp, ShieldAlert,
    CheckCircle2, Search, Gavel, MapPin, Hexagon, BarChart3,
    AlertCircle, Sparkles, LogOut, Wrench, Percent, Coins,
    Compass, Lock, Award, Building, Activity, Info, ExternalLink,
    HelpCircle, CheckSquare, RefreshCw, Eye, Shield,
    List, ChevronRight, Store, ArrowRightLeft, Calendar, FileText,
    Milestone, Play, Map, X
} from 'lucide-react';
import ComparableMap from './ComparableMap';

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
const MiniBar = ({ label, score, reason, max = 10, customColor }: { label: string, score: number, reason?: string, max?: number, customColor?: string }) => {
    const pct = (score / max) * 100;
    const color = customColor || (score >= 8 ? "#22c55e" : score >= 5 ? "#eab308" : "#ef4444");
    return (
        <div className="bg-white/5 p-4 rounded-[20px] border border-white/10 transition-all">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-white">{label}</span>
                <span style={{ color }} className="text-xs font-black font-mono">{score} / {max}점</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mt-2 mb-1">
                <div style={{ width: `${pct}%`, backgroundColor: color }} className="h-full rounded-full transition-all duration-1000 ease-out" />
            </div>
            {reason && (
                <div className="mt-2 text-xs text-white/50 leading-relaxed font-semibold">
                    {reason}
                </div>
            )}
        </div>
    );
};

// MultiplierTile 컴포넌트
const MultiplierTile = ({
    indexStr,
    name,
    factor,
    desc,
    infoText,
    customDescElement
}: {
    indexStr: string;
    name: string;
    factor: number;
    desc: string;
    infoText: string;
    customDescElement?: React.ReactNode;
}) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const isUp = factor > 1.001;
    const isDown = factor < 0.999;
    const badgeColor = isUp ? "rgba(16,185,129,0.12)" : isDown ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.06)";
    const textColor = isUp ? "#10b981" : isDown ? "#f59e0b" : "rgba(255,255,255,0.38)";
    const strokeColor = isUp ? "rgba(16,185,129,0.2)" : isDown ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.1)";

    return (
        <div className="p-3 bg-white/20 border border-white/5 rounded-2xl flex flex-col gap-2 transition-all">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-1.5">
                    <span className="text-[#c5dedd] text-xs font-bold">{indexStr}</span>
                    <span className="text-white text-xs font-bold">{name}</span>
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-0.5 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white flex items-center justify-center shrink-0"
                        title="보정 설명 보기"
                    >
                        <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                </div>
                <div style={{ backgroundColor: badgeColor, color: textColor, borderColor: strokeColor }} className="px-2 py-1 rounded-lg border text-[11px] font-black font-mono">
                    {factor.toFixed(3)}x
                </div>
            </div>

            {isOpen && (
                <div className="text-[10px] text-[#c5dedd] bg-white/5 border border-white/5 p-2.5 rounded-xl leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                    {infoText}
                </div>
            )}

            {!customDescElement && <span className="text-white/50 text-[11px] leading-relaxed">{desc}</span>}
            {customDescElement}
        </div>
    );
};

// 한국 원화 포맷터 (예: 1억 2,000만)
const formatKoreanCurrency = (val: any) => {
    if (val === null || val === undefined) return '-';
    const num = typeof val === 'number' ? val : (parseFloat(val) || 0);
    if (num === 0) return '-';

    if (num >= 100000000) {
        const eok = Math.floor(num / 100000000);
        const rest = num % 100000000;
        if (rest >= 10000) {
            return `${eok}억 ${Math.round(rest / 10000).toLocaleString()}만`;
        }
        return `${eok}억`;
    } else if (num >= 10000) {
        return `${Math.floor(num / 10000).toLocaleString()}만`;
    }
    return Math.round(num).toLocaleString();
};

/** 서버 marketSummary 등 텍스트에 포함된 이모지 제거 */
const stripEmojis = (text: string): string => {
    const cleaned = Array.from(text)
        .filter((ch) => {
            const code = ch.codePointAt(0) ?? 0;
            if (code === 0xfe0f || code === 0x200d) return false;
            if (code >= 0x1f300 && code <= 0x1faff) return false;
            if (code >= 0x2600 && code <= 0x27bf) return false;
            return true;
        })
        .join('');
    return cleaned.replace(/\s+/g, ' ').trim();
};

// 폰트나 추정가 포맷터 (단순 억원/만원 형태)
const formatPrice = (val: any) => {
    if (val === null || val === undefined) return '-';
    const num = typeof val === 'number' ? val : (parseFloat(val) || 0);
    if (num === 0) return '-';
    if (num >= 100000000) {
        return `${(num / 100000000).toFixed(1)}억원`;
    } else if (num >= 10000) {
        return `${(num / 10000).toFixed(0)}만원`;
    }
    return `${Math.round(num).toLocaleString()}원`;
};

// helper: find deep nested value in object
const findDeepValue = (map: any, key: string): any => {
    if (!map) return null;
    if (map[key] !== undefined && map[key] !== null) {
        const val = map[key];
        if (typeof val === 'string' && val.trim() === '') return null;
        return val;
    }
    const nestedKeys = ['storeData', 'rawData', 'report', 'vitals', 'analysis', 'userSubmittedData'];
    for (const nestedKey of nestedKeys) {
        const sub = map[nestedKey];
        if (sub && typeof sub === 'object') {
            const val = findDeepValue(sub, key);
            if (val !== null && val !== undefined) return val;
        }
    }
    return null;
};

// helper: filter items based on category
const shouldHideItem = (keyOrLabel: string, category: string): boolean => {
    const lower = keyOrLabel.toLowerCase().replace(/\s+/g, '');
    const cat = (category || 'land').toLowerCase().trim();
    const isLand = cat === 'land' || cat === '토지';
    const isApartment = cat === 'apartment' || cat === '아파트';

    if (isLand) {
        if (lower.includes('노후도') ||
            lower.includes('임대') ||
            lower.includes('수익성') ||
            lower.includes('수익률') ||
            lower.includes('건물노후') ||
            lower.includes('하자') ||
            lower.includes('rental') ||
            lower.includes('yield') ||
            lower.includes('defect')) {
            return true;
        }
    }
    if (isApartment) {
        if (lower.includes('토지형상') ||
            lower.includes('토지형태') ||
            lower.includes('이용규제') ||
            lower.includes('토지이용') ||
            lower.includes('임대') ||
            lower.includes('수익성') ||
            lower.includes('수익률') ||
            lower.includes('검증원장') ||
            lower.includes('토지가치') ||
            lower.includes('valuationledger') ||
            lower.includes('rental') ||
            lower.includes('yield') ||
            lower.includes('shape') ||
            lower.includes('regulatory') ||
            lower.includes('zoning')) {
            return true;
        }
    }
    return false;
};


export default function AiReportView({ ai, mergedData, onTriggerAnalysis, isCheckingAccess }: any) {
    const aiStatus = mergedData?.ai_analysis_status || 'pending';
    const [isMapModalOpen, setIsMapModalOpen] = React.useState(false);

    const renderPriceSpectrumSection = (spectrum: any) => {
        if (!spectrum) return null;
        const narrative = spectrum.narrative || '';
        const buildingFloorVal = spectrum.buildingFloor || '';

        const meta = ai.analysisMetadata || {};
        const comparables = Array.isArray(meta.comparables) ? meta.comparables : [];
        const attachedTrades = Array.isArray(meta.uiAttachedRegionalTrades) ? meta.uiAttachedRegionalTrades : [];
        const attachedMultiplier = meta.uiAttachedMultiplier;
        const categoryStr = String(mergedData?.category || 'land');

        // Target Area Calculation
        let targetArea = 0;
        try {
            const t = meta.target || {};
            const directTargetArea = meta.targetArea !== undefined && meta.targetArea !== null
                ? parseFloat(meta.targetArea.toString())
                : null;
            if (directTargetArea !== null && directTargetArea > 0) {
                targetArea = directTargetArea;
            } else if (categoryStr === 'building') {
                targetArea = parseFloat(t.totalArea_sqm || mergedData?.totalArea_sqm || t.area_sqm || mergedData?.area || '0');
            } else {
                targetArea = parseFloat(t.area_sqm || t.exclusiveArea_sqm || t.land?.area_sqm || mergedData?.area || mergedData?.exclusiveArea_sqm || mergedData?.area_sqm || '0');
            }
        } catch (_) {}

        return (
            <div className="p-5 bg-white/[0.02] border border-white/10 rounded-3xl flex flex-col gap-4 mt-2">
                <div className="flex items-center gap-2">
                    <List className="w-4 h-4 text-[#c5dedd]" />
                    <span className="text-white text-sm font-bold">인근 유사 비교사례 가치 대입 리스트</span>
                </div>

                {comparables.length === 0 ? (
                    <span className="text-white/38 text-xs">분석된 비교사례가 없습니다.</span>
                ) : (
                    <div className="flex flex-col gap-2.5">
                        {comparables.map((c: any, index: number) => {
                            const platPlc = c.platPlc || '';
                            const platAddr = c.platAddr || '';
                            const sggNm = c.sggNm || '';
                            const umdNm = c.umdNm || '';
                            const addr = umdNm || platPlc.split(' ').pop() || platAddr.split(' ').pop() || `사례 #${index + 1}`;
                            
                            const simVal = Number(c.similarityScore || c.score) || 0;
                            const simStr = simVal > 0 ? `${simVal.toFixed(0)}%` : '90%';

                            const distVal = Number(c.distance || c.distanceFromTarget) || 0;
                            const distStr = distVal > 0 ? `${distVal.toFixed(0)}m` : '-';

                            const date = `${c.dealYear || '?'}.${c.dealMonth || '?'}`;

                            const dealAmountVal = Number(c.dealAmount) || 0;
                            const dealAmountManwon = dealAmountVal > 1000000 ? dealAmountVal / 10000 : dealAmountVal;
                            const dealAmountStr = dealAmountManwon > 0 
                                ? `${(dealAmountManwon / 10000).toFixed(1)}억원`
                                : '-';

                            const rawPricePerSqm = Number(c.adjustedPricePerSqm || c.pricePerSqm) || 0;
                            const adjPricePerSqmManwon = rawPricePerSqm > 10000 ? rawPricePerSqm / 10000 : rawPricePerSqm;
                            const adjTotalManwon = targetArea > 0 ? adjPricePerSqmManwon * targetArea : 0;
                            const adjTotalStr = adjTotalManwon > 0 
                                ? `${(adjTotalManwon / 10000).toFixed(1)}억원`
                                : '계산불가';

                            return (
                                <div key={index} className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-white text-xs font-bold">#{index + 1} {addr}</span>
                                        <span className="text-white/40 text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg">
                                            유사도 {simStr} · 거리 {distStr}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs mt-1">
                                        <span className="text-white/30 text-[11px]">거래 정보 ({date})</span>
                                        <span className="text-white/70 font-semibold">{dealAmountStr}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs pt-1 border-t border-white/5">
                                        <span className="text-white/50 font-bold">보정 후 대입 가치</span>
                                        <span className="text-[#7dd3c0] font-black text-sm">{adjTotalStr}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {buildingFloorVal && (
                    <div className="pt-3 border-t border-white/5 flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-1.5 text-white/50">
                                <Building className="w-3.5 h-3.5" />
                                <span>건축물 잔존가 하한선 (원가법)</span>
                            </div>
                            <span className="text-[#c5dedd] font-bold">{buildingFloorVal}</span>
                        </div>
                        <span className="text-white/30 text-[10px]">※ 국세청 신축가격기준액을 준용한 최소 원가 기준이며, 시장 가격이 아닙니다.</span>
                    </div>
                )}

                {attachedMultiplier && (
                    <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-white/50 text-xs">
                            <Layers className="w-3.5 h-3.5" />
                            <span>공시지가 배율 추정 (사례 부족 시)</span>
                        </div>
                        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col gap-1 text-xs">
                            <span className="text-white/70">용도지역: {attachedMultiplier.zoning || '-'}</span>
                            <span className="text-white/70">
                                적용 배율: {attachedMultiplier.minMult || '-'}~{attachedMultiplier.maxMult || '-'}배 (중간값 {attachedMultiplier.midMult || '-'}배)
                            </span>
                            <span className="text-[#c5dedd] font-bold text-sm mt-1">
                                추정 범위: {formatKoreanCurrency(Number(attachedMultiplier.minTotal) || 0)} ~ {formatKoreanCurrency(Number(attachedMultiplier.maxTotal) || 0)}
                            </span>
                        </div>
                    </div>
                )}

                {attachedTrades.length > 0 && (
                    <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-white/50 text-xs">
                            <List className="w-3.5 h-3.5" />
                            <span>인근 거래사례 참고 리스트</span>
                        </div>
                        <div className="flex flex-col gap-3">
                            {attachedTrades.map((group: any, idx: number) => {
                                const items = Array.isArray(group.data) ? group.data : [];
                                if (items.length === 0) return null;
                                return (
                                    <div key={idx} className="flex flex-col gap-1.5">
                                        <span className="text-white/40 text-[10px] font-bold">{group.type} ({items.length}건)</span>
                                        <div className="flex flex-col gap-1 pl-2">
                                            {items.slice(0, 5).map((t: any, i: number) => {
                                                const addr = `${t.sggNm || t.시군구 || ''} ${t.umdNm || t.법정동 || ''} ${t.jibun || t.지번 || ''}`.trim();
                                                const year = t.dealYear || t.년 || '';
                                                const month = t.dealMonth || t.월 || '';
                                                const dateStr = year ? `${year}.${month}` : '-';

                                                const deposit = t.deposit || t.보증금액;
                                                const monthly = t.monthlyRent || t.월세금액;
                                                const dealAmt = t.dealAmount || t.거래금액;

                                                let priceStr = '';
                                                if (deposit !== undefined && deposit !== null) {
                                                    priceStr = monthly !== undefined && monthly !== null && monthly.toString() !== '0'
                                                        ? `보증금 ${deposit}만 / 월세 ${monthly}만`
                                                        : `전세 ${deposit}만`;
                                                } else {
                                                    const priceNum = parseInt(String(dealAmt).replace(/,/g, '')) || 0;
                                                    priceStr = `매매 ${priceNum.toLocaleString()}만`;
                                                }

                                                return (
                                                    <span key={i} className="text-white/60 text-[11px] leading-relaxed">
                                                        - {dateStr} [{addr}] → {priceStr}
                                                    </span>
                                                );
                                            })}
                                            {items.length > 5 && (
                                                <span className="text-white/30 text-[10px] pl-2">... 외 {items.length - 5}건</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {narrative && (
                    <div className="pt-3 border-t border-white/5 text-white/70 text-xs leading-relaxed">
                        {narrative}
                    </div>
                )}
            </div>
        );
    };

    if (aiStatus !== 'completed') {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-[#0f172a]/50 border border-white/[0.06] rounded-[32px] px-6">
                <div className="w-16 h-16 bg-[#0ea5e9]/15 rounded-full flex items-center justify-center mb-5">
                    <Zap className="w-8 h-8 text-sky-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">AI 정밀 분석</h3>
                <p className="text-white/50 max-w-md text-sm leading-relaxed">
                    사진 6장과 가격 정보를 입력하시면 탐정 AI가 수익성 및 리스크를 심층 분석합니다.
                    <br />
                    화면 하단 버튼에서 분석을 시작할 수 있습니다.
                </p>
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
                    AI 분석이 완료됐습니다.<br />
                    리포트 로드 중 오류가 발생했습니다.<br />
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

    // ──────────────────────────────────────────
    // 📊 카테고리 추출
    // ──────────────────────────────────────────
    const categoryStr = String(mergedData?.category || 'land');
    const isLand = categoryStr.toLowerCase().trim() === 'land' || categoryStr.trim() === '토지';
    const isApartment = categoryStr.toLowerCase().trim() === 'apartment' || categoryStr.trim() === '아파트';

    const compRisk = ai['1_comprehensiveRisk'] || {};
    const priceReas = ai['5_priceReasonableness'] || {};
    const overallScore = typeof (compRisk.totalScore || compRisk.score) === 'number' ? (compRisk.totalScore || compRisk.score) : 0;
    const riskGrade = priceReas.conclusion || compRisk.coreJudgement || '분석 중';
    const summaryText = compRisk.coreJudgement || mergedData?.detectiveNote || "상세 분석 리포트가 파싱을 완료했습니다.";

    // ──────────────────────────────────────────
    // 📊 레이더 차트 및 미니바 데이터 필터링
    // ──────────────────────────────────────────
    const radarMap: any = {};
    if (compRisk.scoreItems) {
        Object.entries(compRisk.scoreItems).forEach(([k, v]: [string, any]) => {
            if (!shouldHideItem(k, categoryStr)) {
                radarMap[k] = typeof v === 'object' ? (v.score || 0) : (typeof v === 'number' ? v : 0);
            }
        });
    }

    const labelMap: Record<string, string> = {
        'nearbySales': '인근 실거래가', 'tradeVolume': '거래량', 'amenities': '생활 편의시설',
        'regulatoryOutlook': '규제 전망', 'population': '인구 현황', 'landRegulation': '토지 이용 규제',
        'landShape': '토지 형상', 'buildingAgePhoto': '건물 노후도(사진)', 'buildingAgeRegister': '건물 노후도(대장)',
        'rentProfitability': '임대 수익성'
    };

    const scoreItemDescriptions: Record<string, string> = {
        'nearbySales': '대상지 주변의 실제 실거래 사례들과의 단가 비교를 통해 호가의 적정성을 분석한 리스크 평가 지수입니다.',
        'tradeVolume': '해당 필지 인근의 토지 거래 빈도와 최근 시장 유동성 수준을 분석한 거래 활성 지수입니다.',
        'amenities': '대형 마트, 병원, 은행, 상권, 공원 등 주변 생활 밀착형 인프라에 대한 접근성 및 편리함을 나타냅니다.',
        'regulatoryOutlook': '지자체 개발 계획, 도시계획조례 방향 및 미래 용도지구 지정 가능성에 대한 전망을 분석한 지수입니다.',
        'population': '배후 가구수 변화, 전입/전출 유동 인구 현황 및 연령대 분포를 분석해 수요 안정성을 평가합니다.',
        'landRegulation': '용도지역/지구 한도 내 건폐율, 용적률 제한 및 공법상 개발 행위 제한 리스크를 평가한 지수입니다.',
        'landShape': '토지의 모양(장방형, 부정형 등), 고저, 지세 경사도 및 도로 접면 폭에 따른 개발 유용성 점수입니다.',
        'buildingAgePhoto': '현장 실사 사진 상의 외벽 크랙, 설비 및 시설물 손상도 등을 분석해 실제 건물 노후 수준을 측정합니다.',
        'buildingAgeRegister': '건축물대장 상 승인 연도 및 법적 경과 연수 기준 잔존 내구 연한을 가치 감가로 산출한 지수입니다.',
        'rentProfitability': '인근 공실률 동향과 평균 월세 시세를 종합 분석하여 기대 임대 소득 안정성을 평가합니다.'
    };

    const radarData = Object.entries(radarMap).map(([key, value]) => {
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

    // 심층 리포트 카테고리 매핑
    const inDepthCategories: Record<string, any> = {
        'economy': { icon: BarChart3, label: '경제성 · 수익성 분석', color: '#c5dedd' },
        'defects': { icon: ShieldAlert, label: '구조 · 하자 리스크', color: '#eddcd2' },
        'outlook': { icon: TrendingUp, label: '미래 가치 · 전망', color: '#bcd4e6' },
        'investmentValue': { icon: DollarSign, label: '투자 가치 분석', color: '#c5dedd' },
        'reconstruction': { icon: Layers, label: '재건축 · 리모델링 가능성', color: '#eddcd2' },
        'landAndBuildingValue': { icon: Layers, label: '토지 + 건물 분리 가치', color: '#c5dedd' },
        'reconstructionOutlook': { icon: Milestone, label: '재건축 · 리모델링 경제성', color: '#eddcd2' },
        'rentalIncome': { icon: DollarSign, label: '다가구 임대 수익 분석', color: '#c5dedd' },
        'yieldOutlook': { icon: Coins, label: '임대 수익 전망 · EXIT 전략', color: '#bcd4e6' },
        'investmentScenarios': { icon: ArrowRightLeft, label: '투자 시나리오 비교', color: '#fad2e1' },
        'businessOutlook': { icon: Store, label: '업종 성공 가능성', color: '#c5dedd' },
        'alternativeBusiness': { icon: Sparkles, label: '대체 업종 추천 TOP 3', color: '#bcd4e6' },
        'leaseProtection': { icon: Lock, label: '임대차 보호 분석', color: '#eddcd2' },
        'exitStrategy': { icon: LogOut, label: '폐업 · 양도 EXIT 전략', color: '#fde2e4' },
        'developmentUtility': { icon: Wrench, label: '개발 활용도 분석', color: '#c5dedd' },
        'yieldAnalysis': { icon: Percent, label: '수익률(CAP Rate) 분석', color: '#bcd4e6' },
    };

    // 파스텔 색상 목록 (미니바용)
    const pastelColors = [
        '#EDDCD2', // Warm Beige
        '#C5DEDD', // Pale Mint
        '#FFF1E6', // Peach White
        '#D6E2E9', // Soft Sky Blue
        '#FDE2E4', // Soft Pink
        '#DBE7E4', // Soft Gray Green
        '#FAD2E1', // Lavender Pink
        '#BCD4E6', // Beau Blue
        '#F0EFEB', // Parchment Gray
    ];

    // ──────────────────────────────────────────
    // 🛠️ [입력한 상세 정보 Section]
    // ──────────────────────────────────────────
    const renderUserDetailedInfoSection = () => {
        const txType = findDeepValue(mergedData, 'transactionType') || findDeepValue(mergedData, 'transaction_type');
        const priceVal = findDeepValue(mergedData, 'price') || findDeepValue(mergedData, 'sale_price');
        const deposit = findDeepValue(mergedData, 'deposit');
        const monthlyRent = findDeepValue(mergedData, 'monthlyRent') || findDeepValue(mergedData, 'monthly_rent');
        const floor = findDeepValue(mergedData, 'floor');
        const area = findDeepValue(mergedData, 'area');

        // 상가 전용
        const premium = findDeepValue(mergedData, 'premium');
        const currentBusiness = findDeepValue(mergedData, 'currentBusiness') || findDeepValue(mergedData, 'current_business');
        const desiredBusiness = findDeepValue(mergedData, 'desiredBusiness') || findDeepValue(mergedData, 'desired_business');
        const monthlyRevenue = findDeepValue(mergedData, 'monthly_revenue') || findDeepValue(mergedData, 'monthlyRevenue');
        const monthlyProfit = findDeepValue(mergedData, 'monthly_profit') || findDeepValue(mergedData, 'monthlyProfit');

        const formatVal = (val: any) => {
            if (val === null || val === undefined) return '-';
            const num = parseFloat(val.toString());
            if (isNaN(num) || num === 0) return '-';
            return formatKoreanCurrency(num);
        };

        const getPriceText = () => {
            if (!txType) return '미입력';
            if (txType === '매매') {
                return priceVal ? `${formatVal(priceVal)}` : '미입력';
            } else if (txType === '전세') {
                return deposit ? `보증금 ${formatVal(deposit)}` : '보증금 미입력';
            } else if (txType === '월세') {
                const depText = deposit ? `보증금 ${formatVal(deposit)}` : '보증금 -';
                const rentText = monthlyRent ? `월세 ${formatVal(monthlyRent)}` : '월세 -';
                return `${depText} / ${rentText}`;
            }
            return '미입력';
        };

        const detailsList = [];
        detailsList.push({ label: '거래 유형', value: txType?.toString() || '미입력', icon: ArrowRightLeft });
        detailsList.push({ label: '가격 정보', value: getPriceText(), icon: DollarSign });

        const floorText = floor ? `${floor}층` : '-층';
        const areaText = area ? `${parseFloat(area.toString()).toFixed(1)}㎡` : '-㎡';
        detailsList.push({ label: '층수 / 면적', value: `${floorText} | 전용 ${areaText}`, icon: Layers });

        if (premium || currentBusiness || desiredBusiness || monthlyRevenue || monthlyProfit) {
            if (premium) detailsList.push({ label: '권리금', value: formatVal(premium), icon: Award });
            if (currentBusiness || desiredBusiness) {
                detailsList.push({ label: '업종 현황', value: `현재: ${currentBusiness || '-'} | 희망: ${desiredBusiness || '-'}`, icon: Store });
            }
            if (monthlyRevenue || monthlyProfit) {
                detailsList.push({ label: '운영 수익', value: `매출 ${formatVal(monthlyRevenue)} / 수익 ${formatVal(monthlyProfit)}`, icon: TrendingUp });
            }
        }

        return (
            <div className="p-6 bg-[#0f172a]/55 rounded-[40px] border border-[#0ea5e9]/15 shadow-[0_0_25px_rgba(14,165,233,0.04)]">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 rounded-xl">
                        <FileText className="w-4 h-4 text-[#0ea5e9]" />
                    </div>
                    <span className="text-white text-base font-bold tracking-tight">입력한 상세 정보</span>
                </div>
                <div className="flex flex-col gap-3">
                    {detailsList.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                            <div key={idx} className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2 text-white/40">
                                    <Icon className="w-4 h-4" />
                                    <span>{item.label}</span>
                                </div>
                                <span className="font-bold text-white text-right">{item.value}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // ──────────────────────────────────────────
    // 📊 [토지 가치 정밀 검증 원장 Section]
    // ──────────────────────────────────────────
    const renderValuationLedgerSection = () => {
        const meta = ai.analysisMetadata;
        if (!meta || Object.keys(meta).length === 0) return null;

        const comparables = Array.isArray(meta.comparables) ? meta.comparables : [];
        const areaAdj = meta.areaAdjustment || {};
        const zoningAdj = meta.zoningAdjustment || {};
        const roadAdj = meta.roadAdjustment || {};
        const stationAdj = meta.stationPremium || {};
        const hosaeAdj = meta.hosaeAdjustment || {};

        let avgTimeFactor = 1.0;
        if (comparables.length > 0) {
            const sum = comparables.reduce((acc, curr) => acc + (curr.timeAdjFactor || 1.0), 0);
            avgTimeFactor = sum / comparables.length;
        }

        const cbdEst = meta.cbdMultiplierEstimate;
        const cbdGrade = meta.cbdGrade?.grade || cbdEst?.grade || 'GENERAL';
        const cbdScore = meta.cbdGrade?.score || 0;
        const zoningChangeComment = meta.zoningChangeComment || '주변 5년 이내 상업/숙박 용도변경 이력 없음';

        const isBuilding = categoryStr === 'building';
        const isHouse = categoryStr === 'house';

        const ledgerTitle = isBuilding
            ? '빌딩 가치 정밀 검증 원장'
            : isHouse
            ? '주택 가치 정밀 검증 원장'
            : '토지 가치 정밀 검증 원장';

        const step1Title = isBuilding
            ? '1단계: 선별된 유사 상업건물 비교 (Comparables)'
            : isHouse
            ? '1단계: 선별된 유사 주택 비교 (Comparables)'
            : '1단계: 선별된 유사 필지 비교 (Comparables)';

        const step3Title = (isBuilding || isHouse)
            ? '3단계: 입지 등급 분석'
            : '3단계: 입지 등급 및 CBD 프리미엄 범위';

        const pyeongLabel = isBuilding
            ? '연면적 평당'
            : isHouse
            ? '전용면적 평당'
            : '대지면적 평당';

        const stepHeader = (stepNum, title) => (
            <div className="flex items-center gap-2 mt-6 mb-3">
                <div className="w-[18px] h-[18px] flex items-center justify-center bg-[#c5dedd] text-[#0f172a] rounded-full text-[10px] font-black">{stepNum}</div>
                <span className="text-white text-[13px] font-bold">{title}</span>
            </div>
        );

        const renderHosaeDetails = () => {
            if (!hosaeAdj || !hosaeAdj.details || hosaeAdj.details.length === 0) return null;
            const totalRate = hosaeAdj.totalRate ? (hosaeAdj.totalRate * 100).toFixed(1) : '0';
            return (
                <div className="flex flex-col gap-2 mt-1">
                    {hosaeAdj.details.map((detail, i) => {
                        const hasLink = !!detail.url;
                        return (
                            <div key={i} className="p-2.5 bg-white/5 border border-white/5 rounded-xl flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="px-1.5 py-0.5 bg-[#10b981]/15 text-[#10b981] rounded text-[9px] font-bold">
                                        {detail.certaintyLabel || '감지'}
                                    </span>
                                    <span className="text-white text-[11px] font-bold">{detail.label} {detail.ratePercent}</span>
                                </div>
                                {detail.title && (
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-white/30 text-[10px] truncate max-w-[85%]">{detail.title}</span>
                                        {hasLink && (
                                            <a href={detail.url} target="_blank" rel="noopener noreferrer" className="p-1 bg-[#7dd3c0]/10 rounded hover:bg-[#7dd3c0]/20 transition-all text-[#7dd3c0]">
                                                <ExternalLink className="w-2.5 h-2.5" />
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <span className="text-[#c5dedd] text-[11px] font-bold mt-1">
                        호재 총합: +{totalRate}%{hosaeAdj.capped ? ' (상한 +10.0% cap 적용)' : ''}
                    </span>
                </div>
            );
        };

        // 보정 항목 타일 동적 구성
        const tiles = [];
        tiles.push({
            name: "면적 보정 (Area)",
            factor: areaAdj.factor || 1.0,
            desc: areaAdj.applied
                ? `대상지(${areaAdj.targetArea}㎡)와 사례평균(${areaAdj.avgComparableArea}㎡) 면적 격차 보정 (${areaAdj.reason})`
                : '비교 사례와 대지 규모 유사로 보정 없음',
            infoText: "대상 토지의 면적 크기에 따른 가치 격차를 보정합니다. 일반적으로 대규모 필지는 개발 효율성은 높지만 평당 단가는 낮아지며, 소규모 필지는 평당 단가가 높아지는 경향이 있습니다."
        });

        // 토지일 때만 용도 보정과 도로 보정 적용
        if (isLand) {
            tiles.push({
                name: "용도 보정 (Zoning)",
                factor: zoningAdj.factor || 1.0,
                desc: zoningAdj.applied
                    ? `대상지 ${zoningAdj.targetZoning} vs 사례평균 ${zoningAdj.avgComparableRank}등급 격차 보정 (${zoningAdj.reason})`
                    : '비교 사례와 용도지역 동일로 보정 없음',
                infoText: "대상지와 비교 대상 사례 간의 용도지역 등급(상업지역 > 준주거 > 주거지역 등) 차이를 보정하여 토지의 이용 효용성을 일치시킵니다."
            });

            tiles.push({
                name: "도로 보정 (Road)",
                factor: roadAdj.factor || 1.0,
                desc: roadAdj.applied
                    ? `${roadAdj.name || ''} 접면 (${roadAdj.status || ''})에 따른 감점 -${roadAdj.discountPercent || 0}% 반영`
                    : '비교 사례와 도로 조건 유사로 보정 없음',
                infoText: "토지가 접하고 있는 도로의 폭, 접면 상태(광대로, 중로, 세로, 맹지 등)에 따른 개발 가능 여부 및 접근 편의성을 보정합니다."
            });
        }

        tiles.push({
            name: "역세권 보정 (Station)",
            factor: stationAdj.factor || 1.0,
            desc: stationAdj.applied
                ? `${stationAdj.stationName || ''} ${stationAdj.distance || 0}m (${stationAdj.label || ''}) 프리미엄 +${stationAdj.premiumPercent || 0}% 반영`
                : '역세권 범위(500m) 외 지역으로 프리미엄 없음',
            infoText: "인근 지하철역/철도역과의 거리에 따른 접근성 가치를 보정합니다. (일반적으로 500m 이내를 초역세권/역세권으로 판단하여 프리미엄을 반영)"
        });

        tiles.push({
            name: "시점 보정 (Time)",
            factor: avgTimeFactor,
            desc: "한국부동산원 지가변동률 지수 및 거래월 기준 시계열 변동 반영",
            infoText: "거래가 발생한 과거 시점과 현재 시점 사이의 한국부동산원 지가변동률 지수 변화를 반영하여 현재 가치로 환산합니다."
        });

        // 주택/빌딩일 때 건축연도 보정 추가
        if (isBuilding || isHouse) {
            const buildYearAdj = meta.buildYearAdjustment || {};
            tiles.push({
                name: "건축연도 보정 (Build Year)",
                factor: buildYearAdj.factor || 1.0,
                desc: buildYearAdj.applied
                    ? `대상 연식(${buildYearAdj.targetAge}년)과 사례평균(${buildYearAdj.avgComparableAge}년) 차이 보정 (${buildYearAdj.reason})`
                    : buildYearAdj.reason || '건축연도 차이 미미로 보정 없음',
                infoText: "대상 건물과 비교 대상 사례 건물의 승인 연도 및 경과 연수 차이에 따른 감가 및 가치 차이를 보정합니다."
            });
        }

        if (hosaeAdj) {
            tiles.push({
                name: "호재 보정 (Hosae)",
                factor: hosaeAdj.applied ? (hosaeAdj.factor || 1.0) : 1.0,
                desc: hosaeAdj.applied ? '' : '인근 호재 미감지 — 보정 없음',
                infoText: "개발 계획, 교통망 신설, 구역 지정 등 인근 지역의 미래 가치 상승 요인(호재)에 따른 가치 상승분을 보정하여 반영합니다.",
                customDescElement: hosaeAdj.applied ? renderHosaeDetails() : undefined
            });
        }

        return (
            <div className="p-6 bg-[#0f172a]/55 border border-[#c5dedd]/20 rounded-[40px] shadow-[0_0_25px_rgba(197,222,221,0.04)]">
                {/* Header */}
                <div className="flex justify-between items-center w-full pb-4 border-b border-white/5 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#c5dedd]/12 border border-[#c5dedd]/30 rounded-xl">
                            <List className="w-4 h-4 text-[#c5dedd]" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white text-base font-bold tracking-tight">{ledgerTitle}</span>
                            <span className="text-white/38 text-[11px] font-medium">Valuation Ledger (Pro Premium)</span>
                        </div>
                    </div>
                    {comparables.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setIsMapModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#c5dedd]/10 hover:bg-[#c5dedd]/20 border border-[#c5dedd]/25 text-[#c5dedd] hover:text-white rounded-xl text-xs font-bold transition-all"
                        >
                            <Map className="w-3.5 h-3.5" />
                            <span>지도 보기</span>
                        </button>
                    )}
                </div>

                {/* Step 1: 유사 필지 비교 (Comparables) */}
                {stepHeader('1', step1Title)}
                {comparables.length === 0 ? (
                    <div className="text-white/38 text-xs py-4">유사한 실거래 비교 사례가 없습니다.</div>
                ) : (
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
                        {comparables.map((c, index) => {
                            const addr = c.platPlc || c.platAddr || `${c.sggNm || ''} ${c.umdNm || ''}`.trim() || '주소 정보 없음';
                            const dateStr = `${c.dealYear || '?'}.${c.dealMonth || '?'}`;
                            const rawPriceStr = c.pricePerPyeong ? `${Math.round(c.pricePerPyeong / 10000).toLocaleString()}만원` : '-';
                            const adjPriceStr = c.adjustedPricePerPyeong ? `${Math.round(c.adjustedPricePerPyeong / 10000).toLocaleString()}만원` : '-';

                            return (
                                <div key={index} className="min-w-[220px] max-w-[220px] p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-2 shrink-0 snap-center">
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-white text-[12px] font-bold truncate">#{index + 1} {addr}</span>
                                        <span className="text-white/30 text-[10px]">{dateStr}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-white/50 text-[10px]">보정후 {pyeongLabel}</span>
                                        <span className="text-[#c5dedd] text-[13px] font-black">{adjPriceStr}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/30 text-[10px]">보정전 {pyeongLabel}</span>
                                        <span className="text-white/50 text-xs line-through">{rawPriceStr}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1 pt-1.5 border-t border-white/5">
                                        <span className="text-white/30 text-[9px] truncate">
                                            {isBuilding 
                                                ? `연 ${c.buildingAr || c.area || '-'}㎡/대 ${c.plottageAr || '-'}㎡ · ${c.buildingUse || c.zoning || '-'}`
                                                : isHouse
                                                ? `전 ${c.area || '-'}㎡/대 ${c.plottageAr || '-'}㎡ · ${c.zoning || '-'}`
                                                : `${c.area ? `${c.area}㎡` : '-'} · ${c.zoning || '-'}`
                                            }
                                        </span>
                                        <span className="text-white/30 text-[9px]">시점 x{(c.timeAdjFactor || 1.0).toFixed(3)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Step 2: Multipliers */}
                {stepHeader('2', '2단계: 개별 요인 보정 계수 (Multipliers)')}
                <div className="flex flex-col gap-2">
                    {tiles.map((tile, i) => {
                        const indexMap = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"];
                        return (
                            <MultiplierTile
                                key={i}
                                indexStr={indexMap[i] || `${i + 1}`}
                                name={tile.name}
                                factor={tile.factor}
                                desc={tile.desc}
                                infoText={tile.infoText}
                                customDescElement={tile.customDescElement}
                            />
                        );
                    })}
                </div>

                {/* Step 3: Location rank (토지일 때만 노출) */}
                {isLand && stepHeader('3', step3Title)}
                {isLand && (
                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <span className="text-white text-xs font-bold">입지 등급: {cbdGrade}</span>
                            <div className="px-2 py-0.5 bg-[#c5dedd]/15 text-[#c5dedd] rounded text-[10px] font-bold">점수: {cbdScore}점</div>
                        </div>
                        {cbdEst ? (() => {
                            const minTotalVal = cbdEst.multiplier?.min || 1.0;
                            const maxTotalVal = cbdEst.multiplier?.max || 1.0;
                            const officialPricePerSqm = cbdEst.officialPerSqm || 0;
                            const targetArea = meta.areaAdjustment?.targetArea || 0;
                            const minTotal = Math.round((officialPricePerSqm * minTotalVal * targetArea) / 10000);
                            const maxTotal = Math.round((officialPricePerSqm * maxTotalVal * targetArea) / 10000);

                            return (
                                <div className="text-white/70 text-xs leading-relaxed flex flex-col gap-1.5">
                                    <span>· 일반 용도/주거 기준 (배율 {minTotalVal.toFixed(1)}~{maxTotalVal.toFixed(1)}배):</span>
                                    <span className="text-white font-bold text-[13px] pl-2">{minTotal.toLocaleString()}만원 ~ {maxTotal.toLocaleString()}만원</span>
                                    <span>· 상업화 및 개발 성공 시: 공시지가의 3.5배 ~ 5.0배 범위 적용 가능 (잠재 가치)</span>
                                </div>
                            );
                        })() : (
                            <span className="text-white/70 text-xs leading-relaxed">
                                · 빌딩/주택 실거래가에는 입지 프리미엄이 이미 반영되어 있으므로 별도 CBD 배율 산출 불필요
                            </span>
                        )}
                    </div>
                )}

                {/* Step 4: Surrounding zoning change comment (토지일 때만 노출) */}
                {isLand && stepHeader('4', '4단계: 최근 5년 이내 인접 필지 용도변경 허가 이력')}
                {isLand && (
                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                        <span className="text-white/70 text-xs leading-relaxed">{zoningChangeComment}</span>
                    </div>
                )}
            </div>
        );
    };

    // ──────────────────────────────────────────
    // 🏢 [아파트 가치 정밀 검증 원장 Section]
    // ──────────────────────────────────────────
    const renderApartmentValuationLedgerSection = () => {
        const meta = ai.analysisMetadata;
        if (!meta || Object.keys(meta).length === 0) return null;

        const comparables = Array.isArray(meta.comparables) ? meta.comparables : [];
        const aptTarget = meta.apartmentTarget || {};
        const marketSummary = Array.isArray(meta.marketSummary) ? meta.marketSummary : [];

        const estPerSqm = meta.estimatedPricePerSqm || 0;
        const estPerPyeong = meta.estimatedPricePerPyeong || 0;
        const weightedPerSqm = meta.weightedPricePerSqm || estPerSqm;
        const weightedPerPyeong = meta.weightedPricePerPyeong || estPerPyeong;

        const estimatedTotal = meta.estimatedTotalPrice || 0;
        const weightedTotal = meta.weightedTotalPrice || 0;
        const priceGap = meta.priceGapPercent || 0;
        const userPriceWon = meta.userPriceWon || 0;

        const confidenceGrade = meta.confidenceGrade || '-';
        const confidenceScore = meta.confidenceScore || 0;
        const sampleCount = meta.priceSampleCount || comparables.length;

        const accentColor = '#7dd3c0';

        const stepHeader = (stepNum: string, title: string) => (
            <div className="flex items-center gap-2 mt-6 mb-3">
                <div style={{ backgroundColor: accentColor }} className="w-[18px] h-[18px] flex items-center justify-center text-[#0f172a] rounded-full text-[10px] font-black">{stepNum}</div>
                <span className="text-white text-[13px] font-bold">{title}</span>
            </div>
        );

        const aptPriceRow = (label: string, perSqm: number, perPyeong: number, isPrimary: boolean) => {
            const perSqmStr = perSqm > 0 ? `${Math.round(perSqm).toLocaleString()}원/㎡` : '-';
            const perPyeongStr = perPyeong > 0 ? `${Math.round(perPyeong / 10000).toLocaleString()}만원/평` : '-';

            return (
                <div className="flex justify-between items-center text-sm">
                    <div className="flex flex-col">
                        <span style={{ fontWeight: isPrimary ? 'bold' : 'normal', color: isPrimary ? 'white' : 'rgba(255,255,255,0.6)' }}>{label}</span>
                        <span className="text-white/35 text-[10px]">{perSqmStr}</span>
                    </div>
                    <span style={{ color: isPrimary ? accentColor : 'rgba(255,255,255,0.6)', fontWeight: isPrimary ? '900' : '600' }} className="text-base">
                        {perPyeongStr}
                    </span>
                </div>
            );
        };

        return (
            <div className="p-6 bg-[#0f172a]/55 border border-[#7dd3c0]/20 rounded-[40px] shadow-[0_0_25px_rgba(125,211,192,0.04)]">
                {/* Header */}
                <div className="flex justify-between items-center gap-2 pb-4 border-b border-white/5 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#7dd3c0]/12 border border-[#7dd3c0]/30 rounded-xl">
                            <Building className="w-4 h-4 text-[#7dd3c0]" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white text-base font-bold tracking-tight">아파트 가치 정밀 검증 원장</span>
                            <span className="text-white/38 text-[11px] font-medium">Apartment Valuation Ledger · {aptTarget.aptName || ''}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {comparables.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setIsMapModalOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7dd3c0]/10 hover:bg-[#7dd3c0]/20 border border-[#7dd3c0]/25 text-[#7dd3c0] hover:text-white rounded-xl text-xs font-bold transition-all"
                            >
                                <Map className="w-3.5 h-3.5" />
                                <span>지도 보기</span>
                            </button>
                        )}
                        <div style={{
                            borderColor: confidenceGrade === 'A' ? '#007f5f' : confidenceGrade === 'B' ? accentColor : '#f59e0b',
                            color: confidenceGrade === 'A' ? '#10b981' : confidenceGrade === 'B' ? accentColor : '#f59e0b',
                            backgroundColor: confidenceGrade === 'A' ? 'rgba(0,127,95,0.15)' : confidenceGrade === 'B' ? 'rgba(125,211,192,0.12)' : 'rgba(245,158,11,0.12)'
                        }} className="px-2 py-1 rounded-lg border text-[9px] font-black whitespace-nowrap">
                            신뢰도 {confidenceGrade} ({confidenceScore}점)
                        </div>
                    </div>
                </div>

                {/* Step 1: 비교사례 요약 */}
                {stepHeader('1', `1단계: 비교사례 요약 (${sampleCount}건)`)}
                {comparables.length === 0 ? (
                    <div className="text-white/38 text-xs py-4">유사한 실거래 비교 사례가 없습니다.</div>
                ) : (
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
                        {comparables.map((c: any, index: number) => {
                            const dateStr = `${c.dealYear || '?'}.${String(c.dealMonth || '?').padStart(2, '0')}`;
                            const floor = c.floor ? `${c.floor}층` : '-';
                            const areaStr = c.area ? `${parseFloat(c.area.toString()).toFixed(1)}㎡` : '-';
                            const score = c.similarityScore || 0;
                            const isSame = c.isSameDanji === true;

                            const dealAmountWon = c.dealAmount || 0;
                            const dealAmountStr = dealAmountWon > 0 ? formatKoreanCurrency(dealAmountWon) : '-';
                            const adjPriceStr = c.adjustedPricePerPyeong ? `${Math.round(c.adjustedPricePerPyeong / 10000).toLocaleString()}만원` : '-';
                            const timeFactor = c.timeAdjFactor || 1.0;

                            const deductions = Array.isArray(c.deductions) ? c.deductions : [];
                            const deductionText = deductions.length > 0
                                ? deductions.slice(0, 2).map((d: any) => `${d.item}${d.penalty ? `(${d.penalty})` : ''}`).join(', ')
                                : '';

                            const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? accentColor : '#f59e0b';

                            return (
                                <div key={index} style={{ borderColor: isSame ? 'rgba(125,211,192,0.2)' : 'rgba(255,255,255,0.08)' }} className="min-w-[210px] max-w-[210px] p-4 bg-white/5 border rounded-2xl flex flex-col gap-2 shrink-0 snap-center">
                                    <div className="flex justify-between items-center gap-1.5">
                                        <div className="flex items-center gap-1 min-w-[70%]">
                                            {isSame && (
                                                <span style={{ color: accentColor, backgroundColor: 'rgba(125,211,192,0.15)' }} className="px-1 py-0.5 rounded text-[8px] font-bold">동일</span>
                                            )}
                                            <span className="text-white text-[12px] font-bold truncate">{c.aptName || dateStr}</span>
                                        </div>
                                        <div style={{ color: scoreColor, backgroundColor: `${scoreColor}1c` }} className="px-1.5 py-0.5 rounded text-[9px] font-black shrink-0">
                                            {score}점
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-white/50 text-[10px] mt-1">
                                        <span>{dateStr} · {floor}</span>
                                        <span>{areaStr}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-white/50 text-[10px]">보정후 평당</span>
                                        <span style={{ color: accentColor }} className="text-[13px] font-black">{adjPriceStr}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] text-white/30 pt-1.5 border-t border-white/5">
                                        <span>거래가 {dealAmountStr}</span>
                                        <span>시점 x{timeFactor.toFixed(3)}</span>
                                    </div>
                                    {deductionText && (
                                        <span className="text-white/20 text-[9px] truncate mt-0.5">{deductionText}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Step 2: 추정 단가 산출 */}
                {stepHeader('2', '2단계: 추정 단가 산출 (시점수정 적용)')}
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-3">
                    {aptPriceRow('중위값 (Median)', estPerSqm, estPerPyeong, true)}
                    <div className="h-px bg-white/5" />
                    {aptPriceRow('가중평균 (Weighted Avg)', weightedPerSqm, weightedPerPyeong, false)}
                    <div className="flex items-center gap-1.5 mt-1">
                        <Info className="w-3.5 h-3.5 text-white/25" />
                        <span className="text-white/30 text-[10px]">{sampleCount}건의 실거래 비교사례 · 매매가격지수 기반 시점수정 적용</span>
                    </div>
                </div>

                {/* Step 3: 최종 추정가 */}
                {stepHeader('3', '3단계: 최종 추정가 산출')}
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-3">
                    <span className="text-white/50 text-[11px]">대상 면적 {aptTarget.exclusiveArea ? parseFloat(aptTarget.exclusiveArea.toString()).toFixed(1) : '-'}㎡ × 추정 단가</span>
                    <div className="flex items-end gap-2 mt-1">
                        <span className="text-white/60 text-xs mb-0.5">추정가</span>
                        <span style={{ color: accentColor }} className="text-2xl font-black leading-none select-all">
                            {estimatedTotal > 0 ? formatKoreanCurrency(estimatedTotal) : '-'}
                        </span>
                    </div>
                    {weightedTotal > 0 && Math.abs(weightedTotal - estimatedTotal) > 1000 && (
                        <span className="text-white/35 text-[10px]">가중평균 기준: {formatKoreanCurrency(weightedTotal)}</span>
                    )}

                    {userPriceWon > 0 && estimatedTotal > 0 && (
                        <div style={{
                            borderColor: priceGap > 5 ? 'rgba(245,158,11,0.15)' : priceGap < -5 ? 'rgba(0,127,95,0.15)' : 'rgba(255,255,255,0.05)',
                            backgroundColor: priceGap > 5 ? 'rgba(245,158,11,0.06)' : priceGap < -5 ? 'rgba(0,127,95,0.06)' : 'rgba(255,255,255,0.02)'
                        }} className="mt-2 p-3 border rounded-xl flex justify-between items-center gap-2">
                            <div className="flex flex-col gap-0.5 text-[11px] text-white/60">
                                <span className="truncate">제시가 {formatKoreanCurrency(userPriceWon)}</span>
                                <span className="truncate">비준가 {formatKoreanCurrency(estimatedTotal)}</span>
                            </div>
                            <div style={{
                                color: priceGap > 5 ? '#f59e0b' : priceGap < -5 ? '#10b981' : 'rgba(255,255,255,0.7)',
                                backgroundColor: priceGap > 5 ? 'rgba(245,158,11,0.1)' : priceGap < -5 ? 'rgba(0,127,95,0.1)' : 'rgba(255,255,255,0.05)'
                            }} className="px-2.5 py-1 rounded-lg text-xs font-black shrink-0">
                                {priceGap > 0 ? `+${priceGap.toFixed(1)}% 고평가` : priceGap < 0 ? `${priceGap.toFixed(1)}% 저평가` : '적정 수준'}
                            </div>
                        </div>
                    )}
                </div>

                {/* Step 4: 시장 분석 코멘트 */}
                {stepHeader('4', '4단계: 시장 분석 코멘트')}
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-2">
                    {marketSummary.length === 0 ? (
                        <span className="text-white/38 text-xs">시장 분석 데이터가 없습니다.</span>
                    ) : (
                        marketSummary.map((textVal: any, idx: number) => {
                            const text = stripEmojis(String(textVal));
                            if (!text) return null;

                            return (
                                <div key={idx} className="flex gap-2 items-start text-xs leading-relaxed text-white/65">
                                    <div style={{ backgroundColor: accentColor }} className="w-1 h-1 rounded-full mt-1.5 shrink-0 opacity-50" />
                                    <span className="flex-1">{text}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    };

    const priceSubCard = (icon: any, title: string, content: string, color: string, isMonospace?: boolean) => {
        const Icon = icon;
        return (
            <div
                style={{
                    background: `linear-gradient(to bottom right, ${color}14, ${color}05)`,
                    borderColor: `${color}33`
                }}
                className="w-full p-4 rounded-2xl border flex flex-col gap-2"
            >
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color }} />
                    <span className="text-xs font-bold" style={{ color }}>{title}</span>
                </div>
                {isMonospace ? (
                    <div className="overflow-x-auto scrollbar-none mt-1">
                        <pre className="text-[11px] font-mono text-white/70 leading-relaxed">{content}</pre>
                    </div>
                ) : (
                    <span className="text-xs text-white/70 leading-relaxed">{content}</span>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">


            {/* 1. 종합 분석 요약 */}
            <div className="relative overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#0f172a]/50 p-6 lg:p-8">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/[0.04] via-transparent to-transparent" />
                <div className="absolute top-0 inset-x-10 h-px bg-gradient-to-r from-transparent via-sky-400/25 to-transparent" />
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-10">
                    <div className="shrink-0 flex justify-center">
                        <PremiumRiskGauge score={overallScore} grade={riskGrade} />
                    </div>
                    <div className="flex-1 min-w-0 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 mb-4">
                            <Sparkles className="w-3.5 h-3.5 text-sky-400/60" />
                            <span className="text-xs font-semibold text-white/45">AI 탐정 종합 판독</span>
                        </div>
                        <div className="text-white/90 text-[15px] lg:text-base leading-[1.75] font-medium min-h-[72px]">
                            <Typewriter text={summaryText} delay={30} />
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. 입력 상세 정보 */}
            {renderUserDetailedInfoSection()}

            {/* 3. 세부 리스크 평가 항목 */}
            {Object.keys(radarMap).length > 0 && (
                <div className="p-6 bg-[#0f172a] rounded-[40px] border border-white/5 shadow-[0_0_25px_rgba(14,165,233,0.04)]">
                    <div className="flex items-center gap-2 mb-6">
                        <Zap className="w-4 h-4 text-[#0ea5e9]" />
                        <span className="text-white text-base font-bold">세부 리스크 평가 항목</span>
                    </div>
                    <div className="h-[240px] lg:h-[320px] w-full mb-6">
                        <RiskBubbleChart
                            items={Object.entries(radarMap).map(([key, value]) => ({
                                label: labelMap[key] || inDepthCategories[key]?.label || key,
                                score: typeof value === 'number' ? value : 0,
                            }))}
                        />
                    </div>
                    <div className="flex flex-col gap-3">
                        {Object.entries(compRisk.scoreItems || {}).filter(([key]) => !shouldHideItem(key, categoryStr)).map(([key, item]: [string, any], idx) => {
                            const label = radarData.find(r => r.subject === (inDepthCategories[key]?.label || key))?.subject || key;
                            const customColor = pastelColors[idx % pastelColors.length];
                            return (
                                <MiniBar
                                    key={idx}
                                    label={label}
                                    score={typeof item === 'object' ? (item.score || 0) : item}
                                    reason={typeof item === 'object' ? item.reason : undefined}
                                    max={10}
                                    customColor={customColor}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 4. 예상 가격 타당성 검증 */}
            {Object.keys(priceReas).length > 0 && (
                <div className="p-6 bg-[#0f172a] rounded-[40px] border border-[#c5dedd]/20 shadow-[0_0_25px_rgba(197,222,221,0.04)] flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#c5dedd]/12 border border-[#c5dedd]/30 rounded-xl">
                            <DollarSign className="w-4 h-4 text-[#c5dedd]" />
                        </div>
                        <span className="text-white text-base font-bold tracking-tight">예상 가격 타당성 검증</span>
                    </div>

                    <span className="text-white text-sm font-bold leading-relaxed">{priceReas.conclusion || ''}</span>

                    {priceReas.gap && (
                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-2 text-white/50 text-xs">
                                <TrendingUp className="w-4 h-4 text-[#10b981]" />
                                <span>제시가 vs 비준가격 차이</span>
                            </div>
                            <span className="text-[#10b981] text-sm font-black">{priceReas.gap}</span>
                        </div>
                    )}

                    {priceReas.priceSpectrum && renderPriceSpectrumSection(priceReas.priceSpectrum)}

                    {priceReas.opinion && <span className="text-white/50 text-xs leading-relaxed">{priceReas.opinion}</span>}

                    {/* Sub-Cards for CBD, zoning notes, etc. */}
                    {isLand && priceReas.cbdEstimate && (
                        priceSubCard(MapPin, '도심 중심업무지구(CBD) 추정', String(priceReas.cbdEstimate), '#bcd4e6')
                    )}

                    {isLand && priceReas.zoningChangeNote && (
                        priceSubCard(TrendingUp, '토지 용도지역 변경 동향', String(priceReas.zoningChangeNote), '#eddcd2')
                    )}

                    {isApartment && priceReas.estimatedTotalPriceNote && (
                        priceSubCard(Calculator, '최종 추정가 산출', String(priceReas.estimatedTotalPriceNote), '#7dd3c0')
                    )}

                    {isApartment && priceReas.marketSummaryComment && (
                        priceSubCard(BarChart3, '시장 분석 코멘트', stripEmojis(String(priceReas.marketSummaryComment)), '#90e0ef')
                    )}
                </div>
            )}

            {/* 5. 토지 정밀 검증 원장 (Land Valuation Ledger) */}
            {!isApartment && renderValuationLedgerSection()}

            {/* 6. 아파트 정밀 검증 원장 (Apartment Valuation Ledger) */}
            {isApartment && renderApartmentValuationLedgerSection()}

            {/* 7. 실거래가 및 시세 비교 분석 */}
            {Object.keys(priceAnalysis).length > 0 && (
                <div className="p-6 bg-[#0f172a]/55 border border-[#bcd4e6]/20 rounded-[40px] shadow-[0_0_25px_rgba(188,212,230,0.04)]">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-[#bcd4e6]/12 border border-[#bcd4e6]/30 rounded-xl">
                            <BarChart3 className="w-4 h-4 text-[#bcd4e6]" />
                        </div>
                        <span className="text-white text-base font-bold tracking-tight">실거래가 및 시세 비교 분석</span>
                    </div>

                    {firesaleSummary && (
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 mb-3 flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 text-white/50 text-[11px] font-bold">
                                <Zap className="w-3.5 h-3.5 text-[#bcd4e6]" />
                                <span>실거래가 비교 및 급매 요약</span>
                            </div>
                            <span className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap">{firesaleSummary}</span>
                        </div>
                    )}

                    {tradeVolume && (
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 text-white/50 text-[11px] font-bold">
                                <BarChart3 className="w-3.5 h-3.5 text-[#c5dedd]" />
                                <span>지역 거래량 및 시장 분석</span>
                            </div>
                            <span className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap">{tradeVolume}</span>
                        </div>
                    )}
                </div>
            )}

            {/* 8. 토지 형태 및 개발 잠재력 */}
            {landShapes.length > 0 && !isApartment && (
                <div className="p-6 bg-[#0f172a]/55 border border-[#eddcd2]/20 rounded-[40px] shadow-[0_0_25px_rgba(237,220,210,0.04)]">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-[#eddcd2]/12 border border-[#eddcd2]/30 rounded-xl">
                            <Hexagon className="w-4 h-4 text-[#eddcd2]" />
                        </div>
                        <span className="text-white text-base font-bold tracking-tight">토지 형태 및 개발 잠재력</span>
                    </div>
                    <div className="flex flex-col gap-3">
                        {landShapes.map((shape, i) => (
                            <div key={i} className="p-4 bg-white/2 border border-white/5 rounded-2xl flex gap-3 items-start">
                                <Hexagon className="w-4 h-4 text-[#eddcd2] shrink-0 mt-0.5" />
                                <span className="text-white/70 text-xs leading-relaxed">{String(shape)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 9. 심층 리포트 */}
            {Object.keys(inDepth).length > 0 && (
                <div className="flex flex-col gap-4">
                    {Object.entries(inDepth).filter(([k, v]) => {
                        if (!v || String(v).trim() === '') return false;
                        const meta = inDepthCategories[k];
                        const label = meta?.label || k;
                        return !shouldHideItem(k, categoryStr) && !shouldHideItem(label, categoryStr);
                    }).map(([key, value], idx) => {
                        const meta = inDepthCategories[key] || { icon: Search, label: key, color: '#94a3b8' };
                        const Icon = meta.icon;
                        return (
                            <div key={idx} className="p-6 bg-[#0f172a] rounded-[40px] border border-white/5">
                                <div className="flex items-center gap-2.5 mb-4">
                                    <Icon className="w-5 h-5" style={{ color: meta.color }} />
                                    <h3 className="text-white text-[15px] font-bold">{meta.label}</h3>
                                </div>
                                <span className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap">{String(value)}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 10. 중요 체크 리스트 */}
            {mustCheck.length > 0 && (
                <div className="p-6 bg-[#0f172a]/55 border border-[#fde2e4]/20 rounded-[40px] shadow-[0_0_25px_rgba(253,226,228,0.04)]">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-[#fde2e4]/12 border border-[#fde2e4]/30 rounded-xl">
                            <CheckSquare className="w-4 h-4 text-[#fde2e4]" />
                        </div>
                        <span className="text-white text-base font-bold tracking-tight">중요 체크 리스트</span>
                    </div>
                    <div className="flex flex-col gap-3">
                        {mustCheck.map((q, i) => (
                            <div key={i} className="p-4 bg-white/2 border border-white/5 rounded-2xl flex gap-3 items-start">
                                <CheckSquare className="w-4 h-4 text-[#fde2e4] shrink-0 mt-0.5" />
                                <span className="text-white/70 text-xs leading-relaxed">{String(q)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 11. 대지 정보 규격 */}
            {Object.keys(areaInfo).length > 0 && (
                <div className="p-6 bg-[#0f172a]/55 border border-[#fad2e1]/20 rounded-[40px] shadow-[0_0_25px_rgba(250,210,225,0.04)]">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-[#fad2e1]/12 border border-[#fad2e1]/30 rounded-xl">
                            <Layers className="w-4 h-4 text-[#fad2e1]" />
                        </div>
                        <span className="text-white text-base font-bold tracking-tight">대지 정보 규격</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-white/2 border border-white/5 rounded-2xl flex flex-col gap-1.5">
                            <span className="text-white/38 text-[11px] font-bold">대지 면적</span>
                            <span className="text-white text-sm font-black">{areaInfo.landArea || '-'}</span>
                        </div>
                        <div className="p-4 bg-white/2 border border-white/5 rounded-2xl flex flex-col gap-1.5">
                            <span className="text-white/38 text-[11px] font-bold">연면적</span>
                            <span className="text-white text-sm font-black">{areaInfo.floorArea || '-'}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* 12. 종합 최종 분석 판정 */}
            {ai['8_finalVerdict'] && (
                <div className="p-6 lg:p-7 bg-[#0f172a]/55 border border-[#FFFB3F]/20 rounded-[32px]">
                    <div className="flex items-center gap-3 mb-6 pb-5 border-b border-white/[0.06]">
                        <div className="p-2 bg-[#FFFB3F]/10 border border-[#FFFB3F]/25 rounded-xl">
                            <Gavel className="w-4 h-4 text-[#FFFB3F]" />
                        </div>
                        <span className="text-white text-base font-bold tracking-tight">종합 최종 분석 판정</span>
                    </div>

                    {(() => {
                        const verdict = ai['8_finalVerdict'];
                        if (typeof verdict !== 'object') {
                            return <span className="text-white/90 text-sm leading-relaxed">{String(verdict)}</span>;
                        }

                        const v = verdict.verdic || verdict.verdict || '-';
                        const grade = verdict.investmentGrade || '-';
                        const reason = verdict.reason || '-';
                        const condition = verdict.condition || '';

                        return (
                            <div className="flex flex-col gap-5">
                                <div className="flex flex-wrap gap-2.5">
                                    <div className="px-3.5 py-1.5 bg-[#FFFB3F] text-[#0f172a] font-black text-xs rounded-lg">
                                        결론: {v}
                                    </div>
                                    <div className="px-3.5 py-1.5 bg-white/[0.06] border border-white/15 text-white font-bold text-xs rounded-lg">
                                        등급: {grade}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <span className="text-white/45 text-[11px] font-semibold">분석 근거</span>
                                    <span className="text-white/90 text-sm leading-relaxed">{reason}</span>
                                </div>
                                {condition && (
                                    <div className="flex flex-col gap-2 pt-4 border-t border-white/[0.06]">
                                        <span className="text-white/45 text-[11px] font-semibold">전제 조건</span>
                                        <span className="text-white/55 text-xs leading-relaxed italic">{condition}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* 13. 데이터 출처 */}
            {ai.analysisMetadata && (
                <div className="p-6 lg:p-7 bg-[#0f172a]/50 border border-white/[0.06] rounded-[32px]">
                    <div className="flex justify-between items-center pb-5 mb-5 border-b border-white/[0.06]">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-emerald-500/10">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            </div>
                            <span className="text-white text-sm font-bold">데이터 출처</span>
                        </div>
                        <div style={{
                            color: ai.analysisMetadata.confidenceGrade === 'A' ? '#34d399' : ai.analysisMetadata.confidenceGrade === 'B' ? '#fbbf24' : '#eddcd2',
                            backgroundColor: ai.analysisMetadata.confidenceGrade === 'A' ? 'rgba(52,211,153,0.12)' : ai.analysisMetadata.confidenceGrade === 'B' ? 'rgba(251,191,36,0.12)' : 'rgba(237,220,210,0.12)',
                        }} className="px-2.5 py-1 rounded-full text-[11px] font-bold">
                            {ai.analysisMetadata.confidenceGrade}등급
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 text-xs mb-5">
                        <div className="flex justify-between items-center py-1">
                            <span className="text-white/40">분석 방식</span>
                            <span className="text-white font-semibold">{ai.analysisMetadata.method || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-white/40">비교사례</span>
                            <span className="text-white font-semibold">{ai.analysisMetadata.comparableCount || '-'}건</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-white/40">신뢰도</span>
                            <span className="text-white font-semibold">{ai.analysisMetadata.confidenceGrade || '-'}등급</span>
                        </div>
                    </div>

                    {ai.analysisMetadata.conditionRelaxLevel > 0 && (
                        <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl flex flex-col gap-1.5 mb-4">
                            <span className="text-[#eddcd2] text-[11px] font-semibold">조건 완화 Level {ai.analysisMetadata.conditionRelaxLevel}</span>
                            {ai.analysisMetadata.confidenceNote && (
                                <span className="text-white/40 text-[11px] leading-relaxed">{ai.analysisMetadata.confidenceNote}</span>
                            )}
                        </div>
                    )}

                    {ai.analysisMetadata.officialPriceRatio && ai.analysisMetadata.officialPriceRatio.medianRatio && (
                        <div className="p-4 bg-emerald-500/[0.04] border border-emerald-500/10 rounded-xl flex flex-col gap-2.5">
                            <span className="text-emerald-400/90 text-[11px] font-semibold">공시가격 배율 분석</span>
                            {(ai.analysisMetadata.officialPriceRatio.targetOfficialPerSqm || ai.analysisMetadata.officialPriceRatio.targetOfficialPrice) && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-white/40">공시가격</span>
                                    <span className="text-white font-semibold">
                                        {formatPrice(ai.analysisMetadata.officialPriceRatio.targetOfficialPerSqm || ai.analysisMetadata.officialPriceRatio.targetOfficialPrice)}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between text-xs">
                                <span className="text-white/40">배율 (중앙값)</span>
                                <span className="text-white font-semibold">{ai.analysisMetadata.officialPriceRatio.medianRatio}배</span>
                            </div>
                            {ai.analysisMetadata.officialPriceRatio.estimatedPerPyeong && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-white/40">추정 평당가</span>
                                    <span className="text-white font-semibold">{formatPrice(ai.analysisMetadata.officialPriceRatio.estimatedPerPyeong)}</span>
                                </div>
                            )}
                            {ai.analysisMetadata.officialPriceRatio.estimatedPrice && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-white/40">추정 시세</span>
                                    <span className="text-white font-semibold">{formatPrice(ai.analysisMetadata.officialPriceRatio.estimatedPrice)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-xs">
                                <span className="text-white/40">샘플 수</span>
                                <span className="text-white font-semibold">{ai.analysisMetadata.officialPriceRatio.sampleCount || 0}건</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Comparable Map Modal */}
            {isMapModalOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                    {/* Background Overlay */}
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMapModalOpen(false)} />
                    {/* Modal Content */}
                    <div className="relative w-full max-w-4xl h-[80vh] bg-slate-950 border border-white/10 rounded-[32px] overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-slate-900/50">
                            <div className="flex items-center gap-2">
                                <Map className="w-5 h-5 text-sky-400" />
                                <span className="text-white text-base font-bold">비교사례 위치 시각화 지도</span>
                            </div>
                            <button
                                onClick={() => setIsMapModalOpen(false)}
                                className="p-1 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {/* Map Body */}
                        <div className="flex-1 p-4 bg-slate-950">
                            <ComparableMap mapData={ai.analysisMetadata} category={categoryStr} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Dummy Calculator variable used above (if we imported custom icons, it needs to be imported or defined)
const Calculator = Building;
