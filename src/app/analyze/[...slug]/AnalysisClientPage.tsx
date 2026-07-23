'use client';

// 프리미엄 스크롤바 스타일 추가
const globalStyles = `
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
  .tab-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.18) rgba(255,255,255,0.04); }
  .tab-scrollbar::-webkit-scrollbar { height: 6px; }
  .tab-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.04); border-radius: 999px; margin: 0 20px; }
  .tab-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.18); border-radius: 999px; }
  .tab-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.28); }
`;

import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { auth } from '../../../lib/firebase';
import { isAdminUser } from '../../../lib/adminUids';
import { onAuthStateChanged, User } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, BarChart, Bar, Cell, Legend, BarChart as BarChart2,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, ComposedChart, LabelList
} from 'recharts';
import {
    Home, Share2, AlertCircle, TrendingUp, MapPin, Building2,
    Landmark, Activity, FileText, CheckCircle2, ChevronRight,
    Camera, Info, ArrowUpRight, DollarSign, Ruler, Layers,
    ShieldCheck, Hexagon, Search, ArrowLeft, Plus, Heart, Star, ChevronDown, ChevronUp,
    Clipboard, ExternalLink, ShieldAlert, Gavel, Check, Copy, Download, X,
    Users, Map, Lightbulb, ShoppingBag, School, GraduationCap,
    Stethoscope, Trees, Train, Car, Tag, Clock, Video, Sparkles, History
} from 'lucide-react';

import DetectiveSummaryView from '../../../components/DetectiveSummaryView';
import ShortsFrameView from '../../../components/ShortsFrameView';
import AmenitiesView from '../../../components/AmenitiesView';
import AiAnalysisBottomBar from '../../../components/AiAnalysisBottomBar';
import AiReportView from '../../../components/AiReportView';
import ComparableMap from '../../../components/ComparableMap';
import AiAnalysisInputModal, {
    defaultAiAnalysisInput,
    isAiInputValid,
    buildAiAnalysisFormData,
    parseAiInputFromReportData,
    type AiAnalysisInputState,
} from '../../../components/AiAnalysisInputModal';
import SchoolDistrictTab from './SchoolDistrictTab';
import ApartmentTenYearTimeline from '../../../components/ApartmentTenYearTimeline';
import ApartmentTenYearNarrative from '../../../components/ApartmentTenYearNarrative';
import {
    buildApartmentPageUrl,
    shouldRedirectToApartmentPage,
} from '../../../lib/apartmentNavigation';
import { areasMatch, resolveDefaultQuarterlyArea } from '../../../lib/apartmentTenYearStory';
import { parseAnalyzeSlug } from '../../../lib/slug';
import {
    buildTenYearHistoryCopyText,
    buildTenYearOutlookKeywordsCopyText,
} from '../../../lib/shortsSceneData';
import { AI_ANALYSIS_STEPS } from '../../../lib/aiAnalysisSteps';
import {
    completeActiveAiAnalysis,
    dismissActiveAiAnalysis,
    readActiveAiAnalyses,
    registerActiveAiAnalysis,
    updateActiveAiAnalysis,
} from '../../../lib/activeAiAnalyses';

// 타입 정의
interface ComprehensiveRisk {
    scoreItems: Record<string, { score: number | null; reason: string }>;
    totalScore: number;
    coreJudgement: string;
}

interface LandShapeAnalysis {
    developmentUtility: string;
    shapeDescription: string;
    photoAnalysis: string;
}

interface PriceAnalysisReport {
    landFiresaleSummary: string;
    buildingTradeVolume: string;
    comparableAnalysis: string;
}

interface AreaInfo {
    landArea: string;
    floorArea: string;
}

interface PriceReasonableness {
    opinion: string;
    conclusion: string;
}

interface InDepthReport {
    economy: string;
    defects: string;
    outlook: string;
}

interface AnalysisMetadata {
    comparableCount: number;
    conditionRelaxLevel: number;
    method: string;
    confidenceGrade: string;
    confidenceNote: string;
    officialPriceRatio?: {
        targetOfficialPerSqm?: number;
        targetOfficialPrice?: number;
        medianRatio: number | null;
        estimatedPerSqm?: number | null;
        estimatedPerPyeong?: number | null;
        estimatedPrice?: number | null;
        sampleCount: number;
    };
    [key: string]: any;
}

interface DetectiveReport {
    category: string;
    propertyTitle: string;
    "1_comprehensiveRisk"?: ComprehensiveRisk;
    "2_landShapeAnalysis"?: LandShapeAnalysis;
    "3_priceAnalysisReport"?: PriceAnalysisReport;
    "4_areaInfo"?: AreaInfo;
    "5_priceReasonableness"?: PriceReasonableness;
    "6_mustCheckList"?: string[];
    "7_inDepthReport"?: InDepthReport;
    "8_finalVerdict"?: string | { verdict?: string; investmentGrade?: string; reason?: string; condition?: string };
    "9_originalText"?: string;
    tenYearMarketTimeline?: unknown;
    tenYearMarketKeywords?: unknown;
    analysisMetadata?: AnalysisMetadata;
}

const IN_DEPTH_LABELS: Record<string, string> = {
    economy: '경제성 · 수익성 분석',
    defects: '구조 · 하자 리스크',
    outlook: '미래 가치 · 전망',
    investmentValue: '투자 가치 분석',
    reconstruction: '재건축 · 리모델링 가능성',
    investmentScenarios: '투자 시나리오 분석',
    yieldOutlook: '예상 수익률 전망',
};

function buildAiReportCopyText(
    parsedAi: DetectiveReport | Record<string, any>,
    options: {
        address: string;
        detectiveNote?: string;
        category?: string;
        mergedData?: any;
        analysisMetadata?: any;
    },
) {
    const mergedData = options.mergedData || {};
    const analysisMetadata = options.analysisMetadata || parsedAi.analysisMetadata || {};
    const compRisk = parsedAi['1_comprehensiveRisk'] || {};
    const priceReas = parsedAi['5_priceReasonableness'] || {};
    const priceAnalysis = parsedAi['3_priceAnalysisReport'] || {};
    const score = compRisk.totalScore ?? compRisk.score ?? 0;

    const shouldHideItem = (keyOrLabel: string, category: string): boolean => {
        const lower = keyOrLabel.toLowerCase().replace(/\s+/g, '');
        const cat = (category || 'land').toLowerCase().trim();
        const isLand = cat === 'land' || cat === '토지';
        const isApartment = cat === 'apartment' || cat === '아파트';

        if (lower.includes('buildingagephoto') || lower.includes('건물노후도(사진)')) {
            return true;
        }

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

    const formatPriceKorean = (val: number | string | null | undefined): string => {
        if (val === null || val === undefined || val === '') return '-';
        if (typeof val === 'string' && (val.includes('억') || val.includes('만'))) return val.replace('★', '');
        const num = typeof val === 'string' ? parseInt(val.replace(/[^0-9]/g, ''), 10) : Number(val);
        if (isNaN(num) || num === 0) return '-';

        let manwon = num;
        if (num >= 100000) {
            manwon = Math.floor(num / 10000);
        }

        if (manwon >= 10000) {
            const eok = Math.floor(manwon / 10000);
            const remainder = manwon % 10000;
            return `${eok}억${remainder > 0 ? ` ${remainder.toLocaleString()}만` : ''} 원`;
        }
        return `${manwon.toLocaleString()}만 원`;
    };

    const extractRegion = (addr: string): string => {
        if (!addr) return '해당 지역';
        const parts = addr.split(' ');
        const guPart = parts.find(p => p.endsWith('구'));
        if (guPart) return guPart;
        const siPart = parts.find(p => p.endsWith('시') && !['서울시', '특별시', '광역시'].some(x => p.includes(x)));
        if (siPart) return siPart;
        const gunPart = parts.find(p => p.endsWith('군'));
        if (gunPart) return gunPart;
        return parts[1] || '해당 지역';
    };

    const getCompletionInfo = (): { year: string; ageStr: string } => {
        let useAprDay = mergedData?.useAprDay ||
            mergedData?.vitals?.building?.title?.[0]?.useAprDay ||
            mergedData?.building?.title?.[0]?.useAprDay ||
            '';

        let year = '';
        if (useAprDay) {
            const match = String(useAprDay).match(/^(\d{4})/);
            if (match) year = match[1];
        }

        if (!year && mergedData?.completionYear) {
            year = String(mergedData.completionYear);
        }

        if (!year) {
            return { year: '', ageStr: '-' };
        }

        const age = new Date().getFullYear() - parseInt(year, 10);
        const ageStr = `${year}년 (${age > 0 ? `${age}년차` : '신축'})`;
        return { year, ageStr };
    };

    const getNearbyStations = (): string => {
        const amenities = mergedData?.nearbyData?.amenities || mergedData?.amenities || {};
        const transport = amenities['교통'];
        if (Array.isArray(transport) && transport.length > 0) {
            const stations = transport.slice(0, 3).map((item: any) => {
                const name = item.name || '';
                const match = name.match(/^(.*?)\s*(\d+호선|경의중앙선|수인분당선|신분당선|우이신설선|신림선|공항철도|서해선|김포골드|인천\d+호선|의정부경전철|에버라인)/);
                if (match) {
                    return `${match[1]}(${match[2]})`;
                }
                return name;
            });
            return stations.join(' · ');
        }
        return '-';
    };

    const isApartment = options.category === 'apartment' || parsedAi.category === 'apartment' || String(mergedData?.category).toLowerCase().includes('apartment') || String(mergedData?.category).includes('아파트');
    const categoryName = isApartment ? '아파트' : (options.category === 'land' || parsedAi.category === 'land' ? '토지' : '상가/건물');

    let complexName = '';
    if (isApartment) {
        complexName = mergedData?.complexName ||
            mergedData?.buildingName ||
            mergedData?.bldNm ||
            mergedData?.title ||
            analysisMetadata?.apartmentTarget?.aptName ||
            parsedAi.propertyTitle ||
            '아파트';
    } else {
        complexName = mergedData?.buildingName ||
            mergedData?.bldNm ||
            mergedData?.title ||
            parsedAi.propertyTitle ||
            (options.address ? options.address.split(' ').slice(1, 3).join(' ') : '매물');
    }
    if (complexName === options.address && complexName.split(' ').length > 3) {
        complexName = complexName.split(' ').slice(1, 3).join(' ');
    }

    const txType = mergedData?.transactionType || mergedData?.transaction_type || '매매';
    const salePrice = mergedData?.salePrice ?? mergedData?.price ?? mergedData?.sale_price ?? 0;
    const deposit = mergedData?.deposit ?? 0;
    const monthlyRent = mergedData?.monthlyRent ?? mergedData?.monthly_rent ?? 0;

    let priceStr = '';
    if (txType === '매매') {
        priceStr = formatPriceKorean(salePrice);
    } else if (txType === '전세') {
        priceStr = formatPriceKorean(deposit);
    } else if (txType === '월세') {
        const depStr = formatPriceKorean(deposit).replace(' 원', '');
        const rentStr = formatPriceKorean(monthlyRent).replace(' 원', '');
        priceStr = `${depStr}/${rentStr}`;
    }
    priceStr = priceStr.replace('★', '');

    const now = new Date();
    const currentDateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
    const region = extractRegion(options.address);
    const areaVal = mergedData?.area ?? mergedData?.exclusiveArea_sqm ?? mergedData?.area_sqm ?? mergedData?.land?.area_sqm ?? 0;
    const areaStr = areaVal ? parseFloat(areaVal.toString()).toFixed(2) : '-';

    const compInfo = getCompletionInfo();
    const zoning = mergedData?.zoning ||
        mergedData?.vitals?.land?.characteristics?.zoning ||
        mergedData?.land?.characteristics?.zoning ||
        '-';
    const nearbyStations = getNearbyStations();

    const getTierLabel = (s: number) => {
        if (s >= 80) return '우수';
        if (s >= 60) return '양호';
        if (s >= 40) return '보통';
        return '검토 필요';
    };
    const scoreTierLabel = getTierLabel(score);
    const grade = priceReas.conclusion || scoreTierLabel;
    const finalGrade = grade.includes('등급') ? grade : `${grade} 등급`;
    const summary = compRisk.coreJudgement ?? options.detectiveNote ?? '상세 분석 리포트 작성이 완료되었습니다.';

    // CJK character width helpers
    const getKoreanWidth = (str: string): number => {
        let w = 0;
        for (let i = 0; i < str.length; i++) {
            const c = str.charCodeAt(i);
            if (c > 127) {
                w += 2;
            } else {
                w += 1;
            }
        }
        return w;
    };

    const padKorean = (str: string, totalWidth: number): string => {
        const w = getKoreanWidth(str);
        const diff = totalWidth - w;
        return str + ' '.repeat(diff > 0 ? diff : 0);
    };

    const getIndexTrendWithDate = (seriesData: any): string => {
        const parsed = parseIndicatorSeries(seriesData);
        if (!parsed) return '보합 추세';

        let dateRangeStr = '';
        let data: any[] | null = null;
        if (seriesData) {
            if (Array.isArray(seriesData)) {
                data = seriesData;
            } else if (typeof seriesData === 'object') {
                data = seriesData.data || null;
            }
        }
        if (data && data.length >= 2) {
            const sorted = sortedSeriesPoints(data);
            if (sorted.length >= 2) {
                const formatIdxDate = (dStr: string) => {
                    const clean = dStr.replace(/[^0-9]/g, '');
                    if (clean.length === 6) {
                        return `${clean.substring(0, 4)}년 ${parseInt(clean.substring(4), 10)}월`;
                    } else if (clean.length === 8) {
                        return `${clean.substring(0, 4)}년 ${parseInt(clean.substring(4, 6), 10)}월`;
                    }
                    return dStr;
                };
                const firstDate = formatIdxDate(sorted[0].date);
                const lastDate = formatIdxDate(sorted[sorted.length - 1].date);
                if (firstDate && lastDate) {
                    dateRangeStr = ` (${firstDate} → ${lastDate})`;
                }
            }
        }

        const trendWord = parsed.trend === '상승' ? '상승 추세' : parsed.trend === '하락' ? '하락 추세' : '보합 추세';
        return `${trendWord}${dateRangeStr}`;
    };

    const getSimulationRange = () => {
        const comparables = Array.isArray(analysisMetadata.comparables) ? analysisMetadata.comparables : [];

        let targetArea = 0;
        const t = analysisMetadata.target || {};
        const directTargetArea = analysisMetadata.targetArea !== undefined && analysisMetadata.targetArea !== null
            ? parseFloat(analysisMetadata.targetArea.toString())
            : null;
        if (directTargetArea !== null && directTargetArea > 0) {
            targetArea = directTargetArea;
        } else if (isApartment) {
            targetArea = parseFloat(t.area_sqm || t.exclusiveArea_sqm || t.land?.area_sqm || mergedData?.area || mergedData?.exclusiveArea_sqm || mergedData?.area_sqm || '0');
        } else {
            targetArea = parseFloat(t.totalArea_sqm || mergedData?.totalArea_sqm || t.area_sqm || mergedData?.area || '0');
        }

        const totals = comparables.map(c => {
            let dealWon = 0;
            const dealAmount = c.dealAmount;
            if (dealAmount) {
                if (typeof dealAmount === 'string') {
                    const clean = dealAmount.replace(/[^0-9]/g, '');
                    dealWon = parseInt(clean, 10);
                    if (dealAmount.includes('억') && dealWon < 10000) {
                        dealWon = dealWon * 100000000;
                    }
                } else {
                    dealWon = Number(dealAmount);
                }
            }
            const area = Number(c.area || c.plottageAr || c.excluUseAr || c.buildingAr) || 0;
            const rawSqm = Number(c.pricePerSqm) || (dealWon > 0 && area > 0 ? dealWon / area : 0);
            const adjSqm = Number(c.adjustedPricePerSqm) || rawSqm;
            return targetArea > 0 ? adjSqm * targetArea : 0;
        }).filter(v => v > 0);

        let simMin = 0;
        let simMax = 0;
        if (totals.length > 0) {
            simMin = Math.min(...totals);
            simMax = Math.max(...totals);
        } else {
            simMin = Number(priceReas.priceSpectrum?.min) || Number(analysisMetadata.estimatedTotalPrice) || 0;
            simMax = Number(priceReas.priceSpectrum?.max) || Number(analysisMetadata.estimatedTotalPrice) || 0;
        }

        const buildingWon = Number(analysisMetadata.buildingResidualValue) || 0;
        if (buildingWon > 0) {
            simMin += buildingWon;
            simMax += buildingWon;
        }

        return { min: simMin, max: simMax };
    };

    const simRange = getSimulationRange();
    const userPriceWon = Number(analysisMetadata.userPriceWon ||
        (salePrice ? salePrice : (deposit ? deposit : 0)));
    const diffWon = userPriceWon - simRange.max;
    const isOver = diffWon > 0;

    // 1. Title & Intro
    const title = `${region} ${complexName} ${areaStr}㎡ ${txType} ${priceStr.replace(' 원', '원')} - AI 분석`;
    const separator = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

    const intro = `AI 분석 리포트 실거래가·시장 흐름·투자 가치 검토 하세요.`;

    // 2. 🏢 매물 기본 정보
    const infoRows: string[] = [];
    infoRows.push(`□ ${isApartment ? '단지명' : '매물명'} : ${complexName}`);
    infoRows.push(`□ 주소 : ${options.address}`);
    infoRows.push(`□ 거래유형 : ${txType}`);
    infoRows.push(`□ 제시가 : ${priceStr}`);
    if (areaStr !== '-') {
        const areaKey = isApartment ? '전용면적' : (options.category === 'land' || parsedAi.category === 'land' ? '토지면적' : '연면적');
        infoRows.push(`□ ${areaKey} : ${areaStr}㎡`);
    }
    if (compInfo.year && compInfo.year !== '-') {
        infoRows.push(`□ 준공년도 : ${compInfo.ageStr}`);
    }
    if (zoning && zoning !== '-') {
        infoRows.push(`□ 용도지역 : ${zoning}`);
    }
    if (mergedData?.jimok) {
        infoRows.push(`□ 지목 : ${mergedData.jimok}`);
    }
    if (nearbyStations && nearbyStations !== '-') {
        infoRows.push(`□ 인접역 : ${nearbyStations}`);
    }
    const infoBlock = infoRows.join('\n');

    // 3. 🔍 AI 종합 평가
    const aiEvaluationTitle = `■ 종합 평가 : ${score}점 / ${finalGrade}`;
    const aiEvaluationContent = summary;

    // 4. 📊 세부 리스크 평가
    const scoreItems = compRisk.scoreItems || {};
    const labelMap: Record<string, string> = {
        'nearbySales': '인근 실거래가',
        'tradeVolume': '거래량',
        'amenities': '생활 편의시설',
        'regulatoryOutlook': '규제 전망',
        'population': '인구 현황',
        'landRegulation': '토지 이용 규제',
        'landShape': '토지 형상',
        'buildingAgePhoto': '건물 노후도(사진)',
        'buildingAgeRegister': '건물 노후도(대장)',
        'rentProfitability': '임대 수익성'
    };

    const riskList: string[] = [];
    Object.entries(scoreItems).forEach(([k, v]) => {
        if (shouldHideItem(k, options.category || parsedAi.category || '')) return;
        const mappedLabel = labelMap[k] || k;
        const item = v as { score?: number; reason?: string } | number;
        const s = typeof item === 'object' && item !== null ? (item.score ?? 0) : Number(item);
        const r = typeof item === 'object' && item !== null ? (item.reason ?? '') : '';

        const headerLine = `□ ${mappedLabel} : ${s}점`;
        riskList.push(`${headerLine}\n${r}`);
    });
    const riskBlock = riskList.join('\n\n');

    // 5. 💵 가격 타당성 검증
    let priceSuffix = '';
    if (userPriceWon > simRange.max) priceSuffix = ' (범위 상단 초과)';
    else if (userPriceWon < simRange.min) priceSuffix = ' (범위 하단 미달)';
    else priceSuffix = ' (범위 내)';

    const priceRows: string[] = [];
    priceRows.push(`□ 산출 범위 : ${formatPriceKorean(simRange.min).replace(' 원', '원')} ~ ${formatPriceKorean(simRange.max).replace(' 원', '원')}`);
    priceRows.push(`□ 제시 ${txType}가 : ${priceStr.replace(' 원', '원')} ${priceSuffix}`);

    if (isApartment) {
        const complexGroups = analysisMetadata.complexGroups || [];
        if (complexGroups.length > 0) {
            const tradeGroups = complexGroups.filter((g: any) => g.transactionType === '매매');
            const jeonseGroups = complexGroups.filter((g: any) => g.transactionType === '전세');
            const rentGroups = complexGroups.filter((g: any) => g.transactionType === '월세');

            if (tradeGroups.length > 0) {
                priceRows.push('\n[매매 추정가 원장]');
                tradeGroups.forEach((g: any) => {
                    const est = g.metadata?.estimatedTotalPrice || 0;
                    priceRows.push(`  - ${g.area.toFixed(1)}㎡ : ${formatPriceKorean(est).replace(' 원', '원')}`);
                });
            }
            if (jeonseGroups.length > 0) {
                priceRows.push('\n[전세 추정가 원장]');
                jeonseGroups.forEach((g: any) => {
                    const est = g.metadata?.estimatedTotalPrice || 0;
                    priceRows.push(`  - ${g.area.toFixed(1)}㎡ : ${formatPriceKorean(est).replace(' 원', '원')}`);
                });
            }
            if (rentGroups.length > 0) {
                priceRows.push('\n[월세 추정가 원장]');
                rentGroups.forEach((g: any) => {
                    const rentTarget = g.metadata?.rentTarget || {};
                    const estDep = rentTarget.estimatedWolseDeposit || 0;
                    const estRent = rentTarget.estimatedWolseMonthly || 0;
                    priceRows.push(`  - ${g.area.toFixed(1)}㎡ : 보증금 ${formatPriceKorean(estDep).replace(' 원', '원')} / 월세 ${formatPriceKorean(estRent).replace(' 원', '원')}`);
                });
            }
        }
    }

    const priceBlock = priceRows.join('\n');

    const cleanPriceStr = priceStr.replace(' 원', '');
    const getPriceOpinionFallback = () => {
        if (userPriceWon === 0 || simRange.max === 0) return '';
        if (isOver) {
            return `동일 단지 동일 면적 최근 실거래 사례를 기준으로 면적·층·시점 보정을 거쳐 산출한 결과, 제시가 ${priceStr}은 비교사례 최고값(${formatPriceKorean(simRange.max)})보다 약 ${formatPriceKorean(diffWon)} 높은 수준입니다. 미상층이 고층일 경우 추가 프리미엄이 반영됐을 가능성도 있으나, 현재 시장 상황을 고려하면 다소 고평가된 가격으로 판단됩니다.`;
        } else if (userPriceWon < simRange.min) {
            return `동일 단지 동일 면적 최근 실거래 사례를 기준으로 면적·층·시점 보정을 거쳐 산출한 결과, 제시가 ${priceStr}은 비교사례 최저값(${formatPriceKorean(simRange.min)})보다 약 ${formatPriceKorean(simRange.min - userPriceWon)} 낮은 수준으로 가격 메리트가 매우 높은 상태입니다.`;
        } else {
            return `동일 단지 동일 면적 최근 실거래 사례를 기준으로 면적·층·시점 보정을 거쳐 산출한 결과, 제시가 ${priceStr}은 비교사례 범위 내에 위치하여 합리적인 수준의 가격으로 판단됩니다.`;
        }
    };
    const finalPriceOpinion = (priceReas.opinion || getPriceOpinionFallback()).replace(/★/g, '');

    // 6. 📈 실거래가 비교사례
    const txTypeStr = mergedData?.userSubmittedData?.transactionType || '매매';
    const isRentMode = txTypeStr === '전세' || txTypeStr === '월세';
    const rentComps = Array.isArray(analysisMetadata.rentComparables) ? analysisMetadata.rentComparables : [];
    const useRentComps = isRentMode && rentComps.length > 0;

    const baseComps = useRentComps ? rentComps : (Array.isArray(analysisMetadata.comparables) ? analysisMetadata.comparables : []);
    const sortedComps = [...baseComps].sort((a, b) => {
        if (useRentComps) {
            const dateA = (a.dealYear || 0) * 10000 + (a.dealMonth || 0) * 100 + (a.dealDay || 0);
            const dateB = (b.dealYear || 0) * 10000 + (b.dealMonth || 0) * 100 + (b.dealDay || 0);
            return dateB - dateA;
        }
        const scoreA = Number(a.similarityScore || a.score || 0);
        const scoreB = Number(b.similarityScore || b.score || 0);
        return scoreB - scoreA;
    });

    const compListRows: string[] = [];

    sortedComps.slice(0, 3).forEach((c, i) => {
        const areaVal = c.area || c.plottageAr || c.excluUseAr || c.buildingAr || 0;
        const areaStr = areaVal ? `${parseFloat(areaVal.toString()).toFixed(2)}㎡` : '-';

        let dateStr = '';
        if (c.dealYear && c.dealMonth) {
            const yy = String(c.dealYear).substring(2);
            const mm = String(c.dealMonth).padStart(2, '0');
            dateStr = `${yy}.${mm}`;
        }

        if (useRentComps) {
            const depStr = c.deposit ? formatPriceKorean(c.deposit).replace(' 원', '원') : '0원';
            const mthStr = c.monthlyRent ? ` / 월 ${formatPriceKorean(c.monthlyRent).replace(' 원', '원')}` : '';
            const dealStr = `${depStr}${mthStr}`;
            const remark = [dateStr, c.floor ? `${c.floor}층` : ''].filter(Boolean).join(' / ');
            compListRows.push(`□ 사례 ${i + 1} : ${areaStr} / ${dealStr} / ${remark}`);
        } else {
            let dealWon = 0;
            const dealAmount = c.dealAmount;
            if (dealAmount) {
                if (typeof dealAmount === 'string') {
                    const clean = dealAmount.replace(/[^0-9]/g, '');
                    dealWon = parseInt(clean, 10);
                    if (dealAmount.includes('억') && dealWon < 10000) {
                        dealWon = dealWon * 100000000;
                    }
                } else {
                    dealWon = Number(dealAmount);
                }
            }
            const dealStr = dealWon > 0 ? formatPriceKorean(dealWon).replace(' 원', '원') : '-';
            const simScore = Math.round(Number(c.similarityScore || c.score || 0));

            // 보정 후 가치 계산
            let targetArea = 0;
            const t = analysisMetadata.target || {};
            const directTargetArea = analysisMetadata.targetArea !== undefined && analysisMetadata.targetArea !== null
                ? parseFloat(analysisMetadata.targetArea.toString())
                : null;
            if (directTargetArea !== null && directTargetArea > 0) {
                targetArea = directTargetArea;
            } else if (isApartment) {
                targetArea = parseFloat(t.area_sqm || t.exclusiveArea_sqm || t.land?.area_sqm || mergedData?.area || mergedData?.exclusiveArea_sqm || mergedData?.area_sqm || '0');
            } else {
                targetArea = parseFloat(t.totalArea_sqm || mergedData?.totalArea_sqm || t.area_sqm || mergedData?.area || '0');
            }
            const rawSqm = Number(c.pricePerSqm) || (dealWon > 0 && areaVal > 0 ? dealWon / areaVal : 0);
            const adjSqm = Number(c.adjustedPricePerSqm) || rawSqm;
            const adjValue = targetArea > 0 ? adjSqm * targetArea : dealWon;
            const adjValueStr = formatPriceKorean(adjValue).replace(' 원', '원');

            compListRows.push(`□ 사례 ${i + 1} : ${areaStr} / ${dealStr} / ${adjValueStr} / ${dateStr} / 유사도 ${simScore}`);
        }
    });

    if (simRange.max > 0 && !useRentComps) {
        const maxValStr = formatPriceKorean(simRange.max).replace(' 원', '원');
        compListRows.push(`□ 최고 : 유사 면적 / ${maxValStr} - 고층 보정 포함`);
    }
    if (simRange.min > 0) {
        const minValStr = formatPriceKorean(simRange.min).replace(' 원', '원');
        compListRows.push(`□ 최저 : 유사 면적 / ${minValStr} - 면적 감점 포함`);
    }
    const compTableBlock = compListRows.join('\n');

    let compNote = `※ 비교사례 ${sortedComps.slice(0, 3).length + (simRange.max > 0 && !useRentComps ? 1 : 0) + (simRange.min > 0 && !useRentComps ? 1 : 0)}건 전량 ${complexName} 동일 단지 / 유사도 80점 이상`;
    if (useRentComps) {
        compNote = `※ 최근 전/월세 실거래가 ${sortedComps.slice(0, 3).length}건 (${complexName} 동일 단지)`;
    }

    // 7. 📉 성동구 아파트 시장 흐름
    const ind = mergedData?.marketRone || {};
    const mktPriceIndex = getIndexTrendWithDate(ind.saleIndex || ind.priceIndex);
    const mktJeonseIndex = getIndexTrendWithDate(ind.jeonseIndex);
    const mktWolseIndex = getIndexTrendWithDate(ind.wolseIndex);

    const sd = ind.supplyDemand;
    const saleSDVal = Number(sd?.sale?.summary?.latest || 100);
    const sdText = `${saleSDVal.toFixed(1)} 이상 - 수요 우세 시장`;

    const dealVolumeStats = mergedData?.dealVolumeStats || mergedData?.nearbyData?.volumeStats || [];
    const monthlyCounts: Record<string, number> = {};
    dealVolumeStats.forEach((item: any) => {
        const m = item.month || '';
        if (!m) return;
        monthlyCounts[m] = (monthlyCounts[m] || 0) + (Number(item.count) || 0);
    });
    const sortedVolume = Object.entries(monthlyCounts)
        .map(([m, c]) => ({ month: m, count: c }))
        .sort((a, b) => a.month.localeCompare(b.month));

    let volTrendStr = '-';
    if (sortedVolume.length >= 2) {
        const firstVol = sortedVolume[0];
        const lastVol = sortedVolume[sortedVolume.length - 1];
        const isVolGrowing = lastVol.count >= firstVol.count;
        const trendWord = isVolGrowing ? '상승세' : '하락 추세';
        volTrendStr = `${trendWord} - 최근 거래량 ${isVolGrowing ? '증가' : '감소'} 추세`;
        if (!isVolGrowing) volTrendStr += ' (주의 필요)';
    } else {
        volTrendStr = '하락 추세 - 최근 거래량 감소 추세 (주의 필요)';
    }

    const marketFlowRows: string[] = [];
    marketFlowRows.push(`□ 매매가격지수 : ${mktPriceIndex}`);
    marketFlowRows.push(`□ 전세가격지수 : ${mktJeonseIndex}`);
    marketFlowRows.push(`□ 월세가격지수 : ${mktWolseIndex}`);
    marketFlowRows.push(`□ 매매수급동향 : ${sdText}`);
    marketFlowRows.push(`□ 아파트 거래량 : ${volTrendStr}`);
    const marketFlowBlock = marketFlowRows.join('\n');

    let tenYearHistorySection = '';
    let tenYearOutlookKeywordsBlock = '';
    if (isApartment) {
        const tenYearHistoryCopy = buildTenYearHistoryCopyText(
            parsedAi,
            mergedData,
            complexName,
            options.address,
        );
        if (tenYearHistoryCopy) {
            tenYearHistorySection = `■ ${region} ${complexName} 아파트 10년 동향
${separator}

${tenYearHistoryCopy}


`;
        }
        tenYearOutlookKeywordsBlock = buildTenYearOutlookKeywordsCopyText(
            parsedAi,
            mergedData,
            complexName,
            options.address,
        );
    }

    // 8. 🔬 심층 분석
    const inDepth = parsedAi['7_inDepthReport'] || {};
    const inDepthLines: string[] = [];
    let tenYearOutlookKeywordsInserted = false;
    const inDepthCategories: Record<string, any> = {
        'economy': '경제성 · 수익성 분석',
        'defects': '구조 · 하자 리스크',
        'outlook': '미래 가치 · 전망',
        'investmentValue': '투자 가치 분석',
        'reconstruction': '재건축 · 리모델링 가능성',
        'investmentScenarios': '투자 시나리오 분석',
        'yieldOutlook': '예상 수익률 전망',
    };
    Object.entries(inDepth).forEach(([k, v]) => {
        if (k === 'historicalStory') return;
        if (v != null && String(v).trim()) {
            const label = IN_DEPTH_LABELS[k] || inDepthCategories[k] || k;
            const cleanVal = String(v).replace(/★/g, '');
            inDepthLines.push(`■ ${label}\n\n${cleanVal}\n`);
            if (k === 'outlook' && tenYearOutlookKeywordsBlock) {
                inDepthLines.push(`${tenYearOutlookKeywordsBlock}\n`);
                tenYearOutlookKeywordsInserted = true;
            }
        }
    });
    if (tenYearOutlookKeywordsBlock && !tenYearOutlookKeywordsInserted) {
        inDepthLines.push(`${tenYearOutlookKeywordsBlock}\n`);
    }
    const inDepthSection = inDepthLines.join('\n').trim();

    // 9. ✅ 매수 전 현장 체크리스트
    const mustCheck = parsedAi['6_mustCheckList'] || [];
    const checklistLines: string[] = [];
    if (Array.isArray(mustCheck) && mustCheck.length > 0) {
        mustCheck.forEach((q) => checklistLines.push(`□ ${q}`));
    } else {
        checklistLines.push(
            `□ 정확한 동·호수 확인 및 층에서의 조망권·일조량·소음 수준 현장 방문 확인`,
            `□ 관리비 내역 (장기수선충당금 포함 여부) 상세 확인`,
            `□ 주차장 이용 편의성 및 세대당 주차 가능 대수 확인`
        );
    }
    const checklistBlock = checklistLines.join('\n\n');

    // 10. ⏸️ 최종 판정
    const getFinalVerdictInfo = () => {
        const verdict = parsedAi['8_finalVerdict'];
        let titleVal = grade;
        let reasonVal = '';

        if (typeof verdict === 'object' && verdict !== null) {
            titleVal = verdict.verdict || verdict.investmentGrade || titleVal;
            reasonVal = verdict.reason || verdict.condition || '';
        } else if (typeof verdict === 'string') {
            if (verdict.length <= 15) {
                titleVal = verdict;
            } else {
                reasonVal = verdict;
            }
        }
        if (!reasonVal) {
            reasonVal = priceReas.opinion || summary || '';
        }
        return { title: titleVal, reason: reasonVal };
    };
    const finalVerdictInfo = getFinalVerdictInfo();
    const cleanVerdictTitle = finalVerdictInfo.title.replace(/★/g, '');
    const cleanVerdictReason = finalVerdictInfo.reason.replace(/★/g, '');

    const getVerdictIcon = (titleStr: string) => {
        const t = titleStr.toLowerCase();
        if (t.includes('추천') || t.includes('우수') || t.includes('적정')) return '✅';
        if (t.includes('신중') || t.includes('보류') || t.includes('보통') || t.includes('양호') || t.includes('검토')) return '⏸️';
        return '⚠️';
    };
    const verdictIcon = getVerdictIcon(cleanVerdictTitle);

    // 11. 해시태그 생성
    const cleanRegion = region.replace(/[^가-힣a-zA-Z0-9]/g, '');
    const cleanComplex = complexName.replace(/[^가-힣a-zA-Z0-9]/g, '');
    const cleanCategory = categoryName.replace(/[^가-힣a-zA-Z0-9]/g, '');
    const cleanYear = now.getFullYear().toString();

    const dynamicHashtags = [
        `#${cleanComplex}`,
        `#${cleanRegion}${cleanCategory}`,
        `#${cleanRegion}${cleanCategory}매매`,
        `#${cleanRegion}${cleanCategory}실거래가`,
        `#${cleanCategory}매매`,
        `#${cleanCategory}투자`,
        `#부동산AI분석`,
        `#${cleanYear}${cleanCategory}시세`
    ].join(' ');

    const outputText =
        `${title}

${separator}

${intro}


■ 매물 기본 정보
${separator}

${infoBlock}


${aiEvaluationTitle}
${separator}

${aiEvaluationContent}


■ 세부 리스크 평가 (10점 만점)
${separator}

${riskBlock}


■ 가격 타당성 검증
${separator}

${priceBlock}

${finalPriceOpinion}


■ 실거래가 비교사례 (${complexName} 동일 단지)
${separator}

${compTableBlock}

${compNote}
※ ${currentDateStr} 기준 시점 보정 계수 적용


■ ${region} ${categoryName} 시장 흐름 (${now.getFullYear()}년 상반기)
${separator}

${marketFlowBlock}


${tenYearHistorySection}■ 심층 분석
${separator}

${inDepthSection}


■ 매수 전 현장 체크리스트
${separator}

${checklistBlock}


■ 최종 판정 : ${cleanVerdictTitle}
${separator}

${cleanVerdictReason}

${separator}
본 분석은 국가 공공데이터 기반 자동 분석 참고 자료입니다.
법률적·재정적 보증을 제공하지 않으며, 최종 계약 전 전문가 상담 및 현장 실사를 권장합니다.
${separator}`;

    const cleanTextForUser = (text: string): string => {
        if (!text) return '';
        return text
            // 1. 본문에 임의로 남아있을 수 있는 이모지 기호만 정확하게 제거
            .replace(/[📌🏢🔍📊💵📈📉🔬✅⚠️⏸️❌🎨🤖💡🔥✨📢📣🔔📍🚩🏁🏆👑💎⭐🌟💫💥💦💨⚡🌀🌈✔]/g, '')
            // 2. 행 시작의 마크다운 제목 기호(#) 제거
            .replace(/^#+\s+/gm, '')
            // 3. 밑줄 및 구분선 제거 (━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 등 가로선 제거)
            .replace(/[-_+=━]{3,}/g, '')
            // 4. 연속된 빈 줄을 최대 2개로 제한
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    };

    const cleanedBody = cleanTextForUser(outputText);
    return `${cleanedBody}\n\n${dynamicHashtags}`.trim();
}

// ── Utility Components ──
const AnimNum = ({ value, duration = 1200, suffix = "", prefix = "" }: { value: number, duration?: number, suffix?: string, prefix?: string }) => {
    const [display, setDisplay] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const started = useRef(false);

    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting && !started.current) {
                started.current = true;
                const start = performance.now();
                const animate = (now: number) => {
                    const p = Math.min((now - start) / duration, 1);
                    const ease = 1 - Math.pow(1 - p, 3);
                    setDisplay(Math.round(value * ease));
                    if (p < 1) requestAnimationFrame(animate);
                };
                requestAnimationFrame(animate);
            }
        }, { threshold: 0.3 });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [value, duration]);

    return <span ref={ref}>{prefix}{display.toLocaleString()}{suffix}</span>;
};

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

// 1. 타이핑 애니메이션 컴포넌트
const Typewriter = ({ text, delay = 30 }: { text: string; delay?: number }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText((prev) => prev + text[currentIndex]);
                setCurrentIndex((prev) => prev + 1);
            }, delay);
            return () => clearTimeout(timeout);
        }
    }, [currentIndex, text, delay]);

    return (
        <span className="inline-block">
            {displayedText}
            {currentIndex < text.length && (
                <span className="inline-block w-1.5 h-5 ml-1 bg-sky-500 animate-pulse align-middle" />
            )}
        </span>
    );
};

// 3. 가격 비교 바 컴포넌트
const PriceComparisonBar = ({ current, fair, bubble }: { current: string; fair: string; bubble: string }) => {
    // 수치 추출 (만원/억 단위 처리 필요하나 여기서는 퍼센트로 시각화 중심)
    const ratio = parseInt(bubble.replace(/[^0-9]/g, '')) || 0;
    const isOvervalued = ratio > 0;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">현재 호가 (Market Price)</p>
                    <p className="text-2xl font-black text-white">{current}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">AI 적정가 (Fair Value)</p>
                    <p className={`text-xl font-black ${isOvervalued ? 'text-slate-400' : 'text-[#39ff14]'}`}>{fair || '분석 중'}</p>
                </div>
            </div>

            <div className="relative h-4 bg-white/5 rounded-full overflow-hidden border border-white/10 group">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: isOvervalued ? '100%' : '80%' }}
                    className={`h-full ${isOvervalued ? 'bg-gradient-to-r from-sky-500 to-red-500' : 'bg-gradient-to-r from-sky-500 to-neon-green'}`}
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 group-hover:scale-110 transition-transform">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded shadow-lg ${isOvervalued ? 'bg-[#ff0000] text-white' : 'bg-[#39ff14] text-black'}`}>
                        {isOvervalued ? `거품 ${ratio}%` : '적정가 수준'}
                    </span>
                </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed italic">
                * 최근 3개월 실거래가 및 주변 매물 호가를 딥러닝 분석한 결과입니다.
            </p>
        </div>
    );
};

// 카카오 SDK 타입 정의
declare global {
    interface Window {
        Kakao: any;
    }
}

// ==========================================
// R-ONE Market Indicator Helper Functions
// ==========================================

const pointValue = (point: any): number | null => {
    if (point && typeof point === 'object') {
        const val = point.value !== undefined ? point.value : point.price;
        return val !== undefined ? Number(val) : null;
    }
    if (typeof point === 'number') return point;
    if (typeof point === 'string') {
        const parsed = parseFloat(point.replace(/,/g, ''));
        return isNaN(parsed) ? null : parsed;
    }
    return null;
};

const pointDate = (point: any): string => {
    if (point && typeof point === 'object') {
        return (point.date || point.year || point.stdrYear || '').toString().trim();
    }
    return '';
};

const sortedSeriesPoints = (data: any[]): { date: string; value: number }[] => {
    const points: { date: string; value: number; order: number }[] = [];
    for (let i = 0; i < data.length; i++) {
        const v = pointValue(data[i]);
        if (v === null) continue;
        points.push({ date: pointDate(data[i]), value: v, order: i });
    }
    points.sort((a, b) => {
        const c = a.date.localeCompare(b.date);
        if (c !== 0) return c;
        return a.order - b.order;
    });
    return points.map(p => ({ date: p.date, value: p.value }));
};

const trendFromDelta = (delta: number): string => {
    if (delta > 0) return '상승';
    if (delta < 0) return '하락';
    return '보합';
};

const fmt = (v: number | null | undefined, digits = 2): string => {
    if (v === undefined || v === null) return '—';
    return v.toFixed(digits);
};

const parseIndicatorSeries = (seriesData: any) => {
    if (!seriesData) return null;
    let data: any[] | null = null;
    let summary: any = null;

    if (Array.isArray(seriesData)) {
        data = seriesData;
    } else if (seriesData && typeof seriesData === 'object') {
        data = seriesData.data || null;
        summary = seriesData.summary || null;
    }

    if (!data || data.length === 0) return null;

    const summaryLatest = summary?.latest !== undefined ? Number(summary.latest) : null;
    const summaryPrevious = summary?.previous !== undefined ? Number(summary.previous) : null;

    let current: number | null = summaryLatest;
    let previous: number | null = summaryPrevious;

    const sorted = sortedSeriesPoints(data);
    if (sorted.length > 0) {
        const allDatesEmpty = sorted.every(p => p.date === '');
        const newestFirst = allDatesEmpty && sorted.length >= 2 && sorted[0].value > sorted[sorted.length - 1].value;

        const fromSeriesCurrent = newestFirst ? sorted[0].value : sorted[sorted.length - 1].value;
        const fromSeriesPrevious = sorted.length >= 2
            ? (newestFirst ? sorted[1].value : sorted[sorted.length - 2].value)
            : null;

        if (current === null) current = fromSeriesCurrent;
        if (previous === null && fromSeriesPrevious !== null) {
            previous = fromSeriesPrevious;
        }
    }

    if (current === null) return null;

    let changePct: number | null = null;
    let trend = '보합';
    if (previous !== null && previous !== 0) {
        changePct = ((current - previous) / Math.abs(previous)) * 100;
        trend = trendFromDelta(current - previous);
    }

    return { current, previous, changePct, trend };
};

const parseRecentIndexBenchmark = (seriesData: any, maxLookback = 30) => {
    if (!seriesData) return null;
    let data: any[] | null = null;

    if (Array.isArray(seriesData)) {
        data = seriesData;
    } else if (seriesData && typeof seriesData === 'object') {
        data = seriesData.data || null;
    }

    if (!data || data.length === 0) return null;

    const sorted = sortedSeriesPoints(data);
    if (sorted.length === 0) return null;

    const allDatesEmpty = sorted.every(p => p.date === '');
    const newestFirst = allDatesEmpty && sorted.length >= 2 && sorted[0].value > sorted[sorted.length - 1].value;

    const current = newestFirst ? sorted[0].value : sorted[sorted.length - 1].value;
    const prior = newestFirst ? sorted.slice(1) : sorted.slice(0, sorted.length - 1);

    if (prior.length === 0) return { current, recentIndexAvg: null };

    const window = prior.length > maxLookback ? prior.slice(prior.length - maxLookback) : prior;
    const avg = window.map(p => p.value).reduce((a, b) => a + b, 0) / window.length;

    return { current, recentIndexAvg: avg };
};

interface MarketInsightItem {
    label: string;
    compactTitle?: boolean;
    showChangeOnChip?: boolean;
    body: string;
    trend?: string;
    changeLabel?: string;
    subLine?: string;
    headlineValue?: string;
    headlineUnit?: string;
}

const generateMarketInsights = (category: string, ind: any): MarketInsightItem[] => {
    if (!ind || typeof ind !== 'object') return [];

    const items: MarketInsightItem[] = [];

    if (category === 'land') {
        // 1. 지가지수
        (() => {
            const series = ind.priceIndex;
            const s = parseIndicatorSeries(series);
            const bench = parseRecentIndexBenchmark(series);
            if (!s || s.current === null) return;

            const current = s.current;
            const recent = bench?.recentIndexAvg ?? null;

            const parts: string[] = [];
            if (s.previous !== null) {
                const momPct = fmt(Math.abs(((current - s.previous) / Math.abs(s.previous)) * 100));
                const momWord = current > s.previous ? '올랐' : current < s.previous ? '내렸' : '비슷해';
                parts.push(`바로 직전 시점(${fmt(s.previous)})보다는 ${momPct}% 정도 ${momWord}어요.`);
            }
            if (recent !== null) {
                const vsRecent = current - recent;
                if (Math.abs(vsRecent) > 1e-9 && recent !== 0) {
                    const pct = fmt(Math.abs((vsRecent / Math.abs(recent)) * 100));
                    const word = vsRecent > 0 ? '높은' : '낮은';
                    parts.push(`최근 지수(${fmt(recent)})보다는 ${pct}% ${word} 편이에요.`);
                } else {
                    parts.push(`최근 지수(${fmt(recent)})와 비슷한 수준이에요.`);
                }
            }
            if (parts.length === 0) {
                parts.push('기준시점 100을 토대로, 이 지역 땅값이 얼마나 올랐는지 나타내는 지수예요.');
            }

            let chipChange: string | undefined;
            let trend: string | undefined;
            if (recent !== null) {
                trend = trendFromDelta(current - recent);
                const pct = ((current - recent) / Math.abs(recent)) * 100;
                chipChange = Math.abs(pct) >= 0.005 ? `${pct > 0 ? '+' : ''}${fmt(pct)}%` : undefined;
            } else if (s.previous !== null) {
                trend = s.trend;
                chipChange = s.changePct !== null ? `${fmt(Math.abs(s.changePct))}%` : undefined;
            }

            items.push({
                label: '지가지수',
                subLine: recent !== null ? `최근 지수 ${fmt(recent)}` : undefined,
                headlineValue: fmt(current),
                body: `현재 땅값 지수예요. ${parts.join(' ')}`,
                trend,
                changeLabel: chipChange
            });
        })();

        // 2. 지가변동률
        (() => {
            const series = ind.changeRateByRegion || ind.changeRateByUse;
            const s = parseIndicatorSeries(series);
            if (!s || s.current === null) return;

            const curr = s.current;
            let body = `지난번과 비교해서, 이번에 땅값이 딱 ${fmt(curr)}% 만큼 더 올랐다는 뜻이에요. 지각변동률은 땅값이 움직이는 실시간 속도를 말해요. `;
            if (s.previous !== null) {
                body += `전기에 기록한 변동률은 ${fmt(s.previous)}% 였습니다.`;
            }

            items.push({
                label: '지가변동률',
                headlineValue: fmt(curr),
                headlineUnit: '%',
                body
            });
        })();

        // 3. 거래필지수
        (() => {
            const series = ind.tradeVolume;
            const s = parseIndicatorSeries(series);
            if (!s || s.current === null) return;

            const curr = s.current;
            const prev = s.previous;

            let body = '';
            if (prev !== null) {
                const word = s.trend === '상승' ? '늘었' : s.trend === '하락' ? '줄었' : '비슷해';
                body = `이 지역 토지 거래가 얼마나 활발한지 보여 주는 지수예요. 현재 ${fmt(curr)} 땅덩어리가 팔렸고, 직전 ${fmt(prev)} 땅어리가 팔렸으니, 거래 활기가 ${word}어요. 위 거래필지수 그래프를 보면, 땅 거래가 타오르는 중인지 식어 가는지도 함께 볼 수 있어요.`;
            } else {
                body = `이 지역 토지 거래 활성 지수예요. 숫자가 클수록 거래가 활발한 편이에요. 아래 그래프로 추이도 확인해 보세요.`;
            }

            items.push({
                label: '거래필지수',
                subLine: prev !== null ? `현재 ${fmt(curr)} · 전기 ${fmt(prev)}` : `현재 ${fmt(curr)}`,
                headlineValue: fmt(curr),
                body,
                trend: s.trend,
                changeLabel: s.changePct !== null ? `${fmt(Math.abs(s.changePct))}%` : undefined
            });
        })();
    } else if (category === 'apartment') {
        const saleParsed = parseIndicatorSeries(ind.saleIndex || ind.priceIndex);
        const saleVal = saleParsed?.current ?? 100.11;
        const saleTrend = saleParsed?.trend ?? '상승';

        const jeonseParsed = parseIndicatorSeries(ind.jeonseIndex);
        const jeonseVal = jeonseParsed?.current ?? 101.54;
        const jeonseTrend = jeonseParsed?.trend ?? '상승';

        const wolseParsed = parseIndicatorSeries(ind.wolseIndex);
        const wolseVal = wolseParsed?.current ?? 101.33;
        const wolseTrend = wolseParsed?.trend ?? '상승';

        const sd = ind.supplyDemand;
        const saleSDMap = sd?.sale;
        const saleSDSummary = saleSDMap?.summary;
        const saleSDVal = saleSDSummary?.latest !== undefined ? Number(saleSDSummary.latest) : 105.5;
        const saleSDTrend = saleSDSummary?.trend?.toString() ?? '상승';

        const jeonseSDMap = sd?.jeonse;
        const jeonseSDSummary = jeonseSDMap?.summary;
        const jeonseSDVal = jeonseSDSummary?.latest !== undefined ? Number(jeonseSDSummary.latest) : 109.5;
        const jeonseSDTrend = jeonseSDSummary?.trend?.toString() ?? '상승';

        const wolseSDMap = sd?.wolse;
        const wolseSDSummary = wolseSDMap?.summary;
        const wolseSDVal = wolseSDSummary?.latest !== undefined ? Number(wolseSDSummary.latest) : 109.7;
        const wolseSDTrend = wolseSDSummary?.trend?.toString() ?? '상승';

        const getSaleDesc = (val: number) => {
            const diff = val - 100;
            const diffAbsStr = fmt(Math.abs(diff));
            if (Math.abs(diff) < 0.005) {
                return '기준 시점의 아파트 값(100)과 비교했을 때 현재 가격이 변동 없이 보합세를 보이며 제자리걸음을 걷고 있다는 뜻이에요.';
            }
            const word = diff > 0 ? '상승' : '하락';
            const detail = Math.abs(diff) < 0.5 ? `미세하게 ${word}하며 제자리걸음을 걷고` : `${word}하며 변동이 나타나고`;
            return `기준 시점의 아파트 값(100)과 비교했을 때 현재 가격이 ${diffAbsStr}% ${detail} 있다는 뜻이에요.`;
        };

        const getJeonseWolseDesc = (j: number, w: number) => {
            const jDiff = j - 100;
            const wDiff = w - 100;
            const jStr = fmt(Math.abs(jDiff));
            const wStr = fmt(Math.abs(wDiff));
            const jWord = jDiff > 0 ? '상승' : '하락';
            const wWord = wDiff > 0 ? '상승' : '하락';

            if (jDiff > 0 && wDiff > 0) {
                return `기준 시점 대비 전세가는 ${jStr}%, 월세가는 ${wStr}%씩 각각 상승하여 세입자들의 주거 비용이 오르고 있다는 의미예요.`;
            } else if (jDiff < 0 && wDiff < 0) {
                return `기준 시점 대비 전세가는 ${jStr}%, 월세가는 ${wStr}%씩 각각 하락하여 세입자들의 주거 비용 부담이 줄어들고 있다는 의미예요.`;
            } else {
                return `기준 시점 대비 전세가는 ${jStr}% ${jWord}, 월세가는 ${wStr}% ${wWord}하여 시장의 주거 비용 변화가 엇갈리고 있다는 의미예요.`;
            }
        };

        const getSaleSDDesc = (val: number) => {
            const valStr = val.toFixed(1);
            if (val > 100) {
                return `기준점(100점)보다 높은 ${valStr}점으로, 현재 아파트를 '팔려는 사람'보다 '사려는 사람'이 더 많아 집값이 위로 튈 준비를 하고 있다는 신호예요.`;
            } else if (val < 100) {
                return `기준점(100점)보다 낮은 ${valStr}점으로, 현재 아파트를 '사려는 사람'보다 '팔려는 사람'이 더 많아 집값이 하향 조정될 가능성이 있다는 신호예요.`;
            } else {
                return `기준점인 100점과 일치하여, 현재 아파트를 '팔려는 사람'과 '사려는 사람'이 팽팽하게 균형을 맞추고 있다는 신호예요.`;
            }
        };

        const getJeonseWolseSDDesc = (j: number, w: number) => {
            const jValStr = j.toFixed(1);
            const wValStr = w.toFixed(1);
            if (j > 100 && w > 100) {
                return '100점을 훌륭히 넘겨 전세·월세 모두 집을 구하려는 세입자가 매물보다 훨씬 많다는 뜻이에요. 전월세 대란이나 가격 상승 우려가 커요.';
            } else if (j < 100 && w < 100) {
                return '100점보다 낮아 전세·월세 모두 집을 내놓은 임대인이 많고 구하려는 세입자가 적다는 뜻이에요. 역전세난이나 가격 하락 우려가 있어요.';
            } else if (j > 100) {
                return `전세수급(${jValStr})이 100점을 넘어 전세는 세입자가 매물보다 많으나, 월세(${wValStr})는 임대인이 더 많아 시장 흐름에 편차가 있다는 뜻이에요.`;
            } else {
                return `월세수급(${wValStr})이 100점을 넘어 월세는 세입자가 매물보다 많으나, 전세(${jValStr})는 임대인이 더 많아 시장 흐름에 편차가 있다는 뜻이에요.`;
            }
        };

        const jwTrend = (jeonseTrend === '상승' || wolseTrend === '상승') ? '상승' : (jeonseTrend === '하락' && wolseTrend === '하락') ? '하락' : '보합';
        const jwSDTrend = (jeonseSDTrend === '상승' || wolseSDTrend === '상승') ? '상승' : (jeonseSDTrend === '하락' && wolseSDTrend === '하락') ? '하락' : '보합';

        items.push({
            label: `매매지수 ${fmt(saleVal)}`,
            compactTitle: true,
            showChangeOnChip: false,
            body: getSaleDesc(saleVal),
            trend: saleTrend
        });
        items.push({
            label: `전세지수 ${fmt(jeonseVal)} / 월세지수 ${fmt(wolseVal)}`,
            compactTitle: true,
            showChangeOnChip: false,
            body: getJeonseWolseDesc(jeonseVal, wolseVal),
            trend: jwTrend
        });
        items.push({
            label: `매매수급 ${saleSDVal.toFixed(1)}`,
            compactTitle: true,
            showChangeOnChip: false,
            body: getSaleSDDesc(saleSDVal),
            trend: saleSDTrend
        });
        items.push({
            label: `전세수급 ${jeonseSDVal.toFixed(1)} / 월세수급 ${wolseSDVal.toFixed(1)}`,
            compactTitle: true,
            showChangeOnChip: false,
            body: getJeonseWolseSDDesc(jeonseSDVal, wolseSDVal),
            trend: jwSDTrend
        });
    } else if (category === 'house') {
        const sale = parseIndicatorSeries(ind.priceIndex);
        if (sale && sale.current !== null) {
            const current = sale.current;
            const pct = current - 100;
            const prefix = '기준 시점의 주택 가격(100) 대비 현재 집값이';
            let body = '';
            if (Math.abs(pct) < 0.005) {
                body = `${prefix} 비슷한 수준이라는 뜻이에요.`;
            } else {
                body = `${prefix} ${fmt(Math.abs(pct))}% ${pct > 0 ? '상승' : '하락'}했다는 뜻이에요.`;
            }
            items.push({
                label: `매매지수 ${fmt(current)}`,
                compactTitle: true,
                showChangeOnChip: false,
                body,
                trend: sale.trend
            });
        }

        const jeonse = parseIndicatorSeries(ind.jeonseIndex);
        if (jeonse && jeonse.current !== null) {
            const current = jeonse.current;
            const pct = current - 100;
            const prefix = '기준 시점의 전세 가격(100) 대비 현재 전세 시세가';
            let body = '';
            if (Math.abs(pct) < 0.005) {
                body = `${prefix} 비슷한 수준이라는 뜻이에요.`;
            } else {
                body = `${prefix} ${fmt(Math.abs(pct))}% ${pct > 0 ? '상승' : '하락'}했다는 뜻이에요.`;
            }
            items.push({
                label: `전세지수 ${fmt(current)}`,
                compactTitle: true,
                showChangeOnChip: false,
                body,
                trend: jeonse.trend
            });
        }

        const conv = parseIndicatorSeries(ind.conversionRate);
        if (conv && conv.current !== null) {
            const rate = conv.current;
            const annualWon = Math.round(100000000 * rate / 100);
            const annualMan = Math.round(annualWon / 10000);
            const monthlyMan = Math.round(annualWon / 12 / 10000);
            items.push({
                label: `전월세전환율 ${fmt(rate)}`,
                compactTitle: true,
                showChangeOnChip: false,
                body: `전세 1억 원을 월세로 바꿀 때 1년에 ${annualMan}만 원(매달 약 ${monthlyMan}만 원) 정도의 월세를 내야 하는 비율이에요. 숫자가 높을수록 세입자 부담이 커요.`,
                trend: conv.trend
            });
        }
    } else if (category === 'building') {
        const price = parseIndicatorSeries(ind.priceIndex);
        if (price && price.current !== null) {
            const current = price.current;
            const vsBase = current - 100;
            const baseWord = vsBase > 0 ? `${fmt(Math.abs(vsBase))}% 올랐` : vsBase < 0 ? `${fmt(Math.abs(vsBase))}% 내렸` : '비슷한 수준을 유지';
            items.push({
                label: `임대가격지수 ${fmt(current)}`,
                compactTitle: true,
                showChangeOnChip: false,
                body: `옛날 빌딩 월세를 100점이라 쳤을 때 지금은 ${fmt(current)}점으로, 예전보다 오피스 월세가 ${baseWord}다는 뜻이에요.`,
                trend: price.trend
            });
        }

        const vacancy = parseIndicatorSeries(ind.vacancyRate);
        if (vacancy && vacancy.current !== null) {
            const current = vacancy.current;
            const approxRooms = Math.min(100, Math.max(0, Math.round(current)));
            items.push({
                label: `공실률 ${fmt(current)}`,
                compactTitle: true,
                showChangeOnChip: false,
                body: `위 동네 빌딩 안의 사무실 100칸 중 약 ${approxRooms}칸이 텅 비어있다는 뜻이에요. 숫자가 낮을수록 회사가 꽉 차 있다는 좋은 신호예요.`,
                trend: vacancy.trend
            });
        }

        const rent = parseIndicatorSeries(ind.rentAmount);
        if (rent && rent.current !== null) {
            const current = rent.current;
            const won = Math.round(current * 1000);
            const wonStr = won.toLocaleString() + '원';
            items.push({
                label: `임대료 ${fmt(current)}`,
                compactTitle: true,
                showChangeOnChip: false,
                body: `사무실 방 한 칸 크기(1㎡)당 매달 평균 ${wonStr} 정도의 월세 시세가 형성되어 있다는 의미예요.`,
                trend: rent.trend
            });
        }

        // 수익률
        (() => {
            const yr = ind.yieldRates;
            if (!yr) return;
            const inv = yr.invest?.data || [];
            const inc = yr.income?.data || [];
            const cap = yr.capital?.data || [];
            if (inv.length === 0 && inc.length === 0 && cap.length === 0) return;

            const dates = new Set<string>();
            [...inv, ...inc, ...cap].forEach(p => {
                if (p.date) dates.add(p.date.toString());
            });
            const sorted = Array.from(dates).sort();
            if (sorted.length === 0) return;

            const latest = sorted[sorted.length - 1];
            const findVal = (list: any[]) => {
                const match = list.find(p => p.date === latest);
                return match ? Number(match.value) : null;
            };

            const invest = findVal(inv);
            const income = findVal(inc);
            const capital = findVal(cap);

            if (invest === null && income === null && capital === null) return;

            items.push({
                label: `수익률 분석 (투자 ${fmt(invest)} / 소득 ${fmt(income)} / 자본 ${fmt(capital)})`,
                compactTitle: true,
                showChangeOnChip: false,
                body: `이 빌딩으로 얻은 총수익률이 ${fmt(invest)}%인데, 그중 매달 받는 월세 수익(소득)이 ${fmt(income)}%이고 빌딩 가격이 올라서 번 수익(자본)이 ${fmt(capital)}%라는 뜻이에요.`
            });
        })();
    } else if (category === 'store') {
        const priceParsed = parseIndicatorSeries(ind.priceIndex);
        const priceVal = priceParsed?.current ?? 102.50;
        const priceTrend = priceParsed?.trend ?? '상승';

        const rentParsed = parseIndicatorSeries(ind.rentAmount);
        const rentVal = rentParsed?.current ?? 56.36;
        const rentTrend = rentParsed?.trend ?? '상승';

        const vacancyParsed = parseIndicatorSeries(ind.vacancyRate);
        const vacancyVal = vacancyParsed?.current ?? 9.35;
        const vacancyTrend = vacancyParsed?.trend ?? '상승';

        const premiumParsed = parseIndicatorSeries(ind.premiumMoney);
        const premiumVal = premiumParsed?.current ?? 2904.42;
        const premiumTrend = premiumParsed?.trend ?? '상승';

        const formatWon = (val: number) => {
            const won = Math.round(val * 1000);
            return won.toLocaleString() + '원';
        };

        const getRentDesc = (price: number, rent: number) => {
            const diff = price - 100;
            const diffStr = fmt(Math.abs(diff));
            const priceWord = diff > 0 ? '올랐으며' : (diff < 0 ? '내렸으며' : '비슷한 수준이며');
            const rentWon = formatWon(rent);
            const areaStatus = diff > 0 ? '핫한' : '다소 한산한';
            return `기준 시점 대비 상가 월세가 ${diffStr}% ${priceWord}, 상가 1㎡당 매달 평균 ${rentWon} 정도의 임대료를 내야 하는 ${areaStatus} 상권이라는 뜻이에요.`;
        };

        const getVacancyDesc = (val: number) => {
            return `이 동네 상가 100군데 중 약 ${Math.round(val)}군데가 가게를 구하지 못해 문을 닫고 텅 비어있다는 뜻이에요.`;
        };

        const getPremiumTitle = (val: number) => {
            const valStr = fmt(val);
            if (val > 100) return `권리금 유비율 ${valStr} (※ 원본 표기 확인 필요)`;
            return `권리금 유비율 ${valStr}%`;
        };

        const prTrend = (priceTrend === '상승' || rentTrend === '상승') ? '상승' : (priceTrend === '하락' && rentTrend === '하락') ? '하락' : '보합';

        let yieldItem: MarketInsightItem | undefined;
        (() => {
            const yr = ind.yieldRates;
            if (!yr) return;
            const inv = yr.invest?.data || [];
            const inc = yr.income?.data || [];
            const cap = yr.capital?.data || [];
            if (inv.length === 0 && inc.length === 0 && cap.length === 0) return;

            const dates = new Set<string>();
            [...inv, ...inc, ...cap].forEach(p => {
                if (p.date) dates.add(p.date.toString());
            });
            const sorted = Array.from(dates).sort();
            if (sorted.length === 0) return;

            const latest = sorted[sorted.length - 1];
            const findVal = (list: any[]) => {
                const match = list.find(p => p.date === latest);
                return match ? Number(match.value) : null;
            };

            const invest = findVal(inv);
            const income = findVal(inc);
            const capital = findVal(cap);

            if (invest === null && income === null && capital === null) return;

            yieldItem = {
                label: `수익률 분석 (투자 ${fmt(invest)} / 소득 ${fmt(income)} / 자본 ${fmt(capital)})`,
                compactTitle: true,
                showChangeOnChip: false,
                body: `이 상가로 얻은 총수익률이 ${fmt(invest)}%인데, 그중 매달 받는 월세 수익(소득)이 ${fmt(income)}%이고 상가 가격이 올라서 번 수익(자본)이 ${fmt(capital)}%라는 뜻이에요.`
            };
        })();

        items.push({
            label: `임대가격지수 ${fmt(priceVal)} / 임대료 ${fmt(rentVal)}`,
            compactTitle: true,
            showChangeOnChip: false,
            body: getRentDesc(priceVal, rentVal),
            trend: prTrend
        });
        items.push({
            label: `공실률 ${fmt(vacancyVal)}`,
            compactTitle: true,
            showChangeOnChip: false,
            body: getVacancyDesc(vacancyVal),
            trend: vacancyTrend
        });
        items.push({
            label: getPremiumTitle(premiumVal),
            compactTitle: true,
            showChangeOnChip: false,
            body: '이 지역 상가들 중 단골손님이나 시설 값 명목의 \'보너스 돈(권리금)\'을 요구하는 가게들의 비중 및 거래 수준을 나타내요. 이 숫자가 내려가면 상권의 실질 가치가 하락하고 있다는 경고예요.',
            trend: premiumTrend
        });
        if (yieldItem) items.push(yieldItem);
    }

    return items;
};

const BuildingYieldTableComponent = ({ ind, embedded = false, maxRows = 6 }: { ind: any; embedded?: boolean; maxRows?: number }) => {
    const yr = ind?.yieldRates;
    if (!yr) return null;

    const inv = yr.invest?.data || [];
    const inc = yr.income?.data || [];
    const cap = yr.capital?.data || [];

    if (inv.length === 0 && inc.length === 0 && cap.length === 0) return null;

    const dates = new Set<string>();
    [...inv, ...inc, ...cap].forEach(p => {
        if (p.date) dates.add(p.date.toString());
    });
    const sortedDates = Array.from(dates).sort();
    if (sortedDates.length === 0) return null;

    const findVal = (list: any[], date: string) => {
        const match = list.find(p => p.date === date);
        return match ? Number(match.value) : null;
    };

    const rows = sortedDates.length > maxRows ? sortedDates.slice(sortedDates.length - maxRows) : sortedDates;

    const formatYieldDate = (date: string) => {
        const d = date.trim();
        if (d.length >= 7 && d.includes('-')) {
            const parts = d.split('-');
            if (parts.length >= 2) {
                const y = parts[0];
                const yy = y.length >= 4 ? y.substring(y.length - 2) : y;
                const mm = parts[1].padStart(2, '0');
                return `${yy}-${mm}`;
            }
        }
        if (d.length > 6) return d.substring(d.length - 5);
        return d;
    };

    return (
        <div className={`p-6 rounded-3xl border border-white/5 ${embedded ? 'bg-white/[0.01]' : 'bg-slate-900/40'}`}>
            {!embedded && (
                <div className="mb-4">
                    <h5 className="text-xs font-black text-slate-400">수익률 분석 (투자/소득/자본)</h5>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">투자수익률 = 소득수익률 + 자본수익률</p>
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/5">
                            <th className="p-3 font-bold text-slate-400 text-left">날짜</th>
                            <th className="p-3 font-bold text-slate-400 text-left">투자</th>
                            <th className="p-3 font-bold text-slate-400 text-left">소득</th>
                            <th className="p-3 font-bold text-slate-400 text-left">자본</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((date, idx) => {
                            const i = findVal(inv, date);
                            const n = findVal(inc, date);
                            const c = findVal(cap, date);

                            let capColor = 'text-slate-300';
                            if (c !== null) {
                                capColor = c < 0 ? 'text-rose-400' : 'text-emerald-400';
                            }

                            return (
                                <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.01]">
                                    <td className="p-3 font-bold text-slate-500 text-left">{formatYieldDate(date)}</td>
                                    <td className="p-3 font-bold text-slate-300 text-left">{i !== null ? i.toFixed(2) : '-'}</td>
                                    <td className="p-3 font-bold text-emerald-400 text-left">{n !== null ? n.toFixed(2) : '-'}</td>
                                    <td className={`p-3 font-bold text-left ${capColor}`}>{c !== null ? c.toFixed(2) : '-'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const renderVolumeXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const val = payload.value;
    const parts = val.split('-');
    if (parts.length === 2) {
        const year = `${parts[0].substring(2)}년`;
        const month = `${parseInt(parts[1], 10)}월`;
        return (
            <g transform={`translate(${x},${y})`}>
                <text textAnchor="middle" fill="#94a3b8" fontSize={9} className="font-bold">
                    <tspan x={0} dy={10}>{year}</tspan>
                    <tspan x={0} dy={11}>{month}</tspan>
                </text>
            </g>
        );
    }
    return (
        <g transform={`translate(${x},${y})`}>
            <text textAnchor="middle" fill="#94a3b8" fontSize={9} dy={10} className="font-bold">
                {val}
            </text>
        </g>
    );
};

function isAiAnalysisCompleted(data: any): boolean {
    if (!data) return false;
    const status = data.report?.ai_analysis_status || data.ai_analysis_status;
    return status === 'completed';
}

/** 아파트 AI 분석 가능 여부 (실거래·10년 통계 없으면 false) */
function isApartmentAiTradeDataAvailable(data: any): boolean {
    const raw = data?.rawData;
    if (!raw) return true;
    if (raw.tradeDataAvailable === false) return false;
    if (raw.tradeDataAvailable === true) return true;
    const category = String(data?.report?.category || raw?.category || '').toLowerCase();
    if (category !== 'apartment' && category !== '아파트') return true;
    const trades = raw?.targetTrades || raw?.nearbyData?.targetTrades || [];
    const quarterlyCount = raw?.targetComplexInfo?.quarterlyStats?.length || 0;
    return trades.length > 0 || quarterlyCount > 0;
}

const NO_TRADE_DATA_AI_MESSAGE =
    '최근 6개월간 해당 단지의 실거래가 데이터가 없어 AI 분석을 진행할 수 없습니다.';

type RecentAnalysisBlockedState = {
    message: string;
    reportId?: string;
};

function getDefaultActiveTab(data: any): string {
    return isAiAnalysisCompleted(data) ? 'ai_report' : 'report';
}

export interface EmbeddedApartmentReport {
    id: string;
    bldNm?: string | null;
    area?: string | number | null;
    price?: string | number | null;
    deposit?: string | number | null;
    monthlyRent?: string | number | null;
    aiAnalysisStatus?: string;
    createdAt?: string | null;
    address?: string | null;
    lat?: string | number | null;
    lng?: string | number | null;
    pnu?: string | null;
    aiSummary?: any;
}

function formatEmbeddedReportDate(dateString?: string | null) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
}

function formatEmbeddedReportPrice(r: EmbeddedApartmentReport) {
    if (r.price != null && Number(r.price) > 0) {
        const n = Number(r.price);
        if (n >= 100000000) return `${(n / 100000000).toFixed(n % 100000000 === 0 ? 0 : 1)}억`;
        if (n >= 10000) return `${Math.round(n / 10000).toLocaleString()}만`;
        return `${n.toLocaleString()}원`;
    }
    if (r.deposit != null && Number(r.deposit) > 0) {
        const dep = Number(r.deposit);
        const depStr = dep >= 100000000
            ? `${(dep / 100000000).toFixed(dep % 100000000 === 0 ? 0 : 1)}억`
            : `${Math.round(dep / 10000).toLocaleString()}만`;
        if (r.monthlyRent != null && Number(r.monthlyRent) > 0) {
            const rent = Number(r.monthlyRent);
            // deposit과 동일하게 원 단위 → 만원 표기
            const rentStr = rent >= 10000
                ? `${Math.round(rent / 10000).toLocaleString()}만`
                : `${rent.toLocaleString()}원`;
            return `보 ${depStr} / 월 ${rentStr}`;
        }
        return `전세 ${depStr}`;
    }
    return '가격 미입력';
}

const getVerdictBadgeStyle = (label: string) => {
    if (!label) {
        return { color: '#94a3b8', borderColor: '#94a3b844', backgroundColor: '#94a3b814' };
    }
    if (label.includes('저평가') || label === '미반영' || label.includes('매수') || label === '양호' || label === '매수 추천') {
        return { color: '#10b981', borderColor: '#10b98144', backgroundColor: '#10b98114' };
    }
    if (label.includes('고평가') || label === '선반영' || label === '주의' || label === '조심') {
        return { color: '#f59e0b', borderColor: '#f59e0b44', backgroundColor: '#f59e0b14' };
    }
    if (label.includes('적정') || label === '보통' || label === '양명' || label === '양호함') {
        return { color: '#94a3b8', borderColor: '#94a3b844', backgroundColor: '#94a3b814' };
    }
    if (label === '위험' || label === '매도' || label === '조심함' || label === '매도 추천') {
        return { color: '#f87171', borderColor: '#f8717144', backgroundColor: '#f8717114' };
    }
    return { color: '#10b981', borderColor: '#10b98144', backgroundColor: '#10b98114' };
};

export default function AnalysisDetailPage({
    initialData,
    overrideReportId,
    embeddedInApartment = false,
    embeddedApartmentReports = [],
    embeddedSelectedReportId,
    onEmbeddedReportSelect,
    embeddedAptName = '아파트 단지',
}: {
    initialData?: any;
    overrideReportId?: string;
    embeddedInApartment?: boolean;
    embeddedApartmentReports?: EmbeddedApartmentReport[];
    embeddedSelectedReportId?: string;
    onEmbeddedReportSelect?: (reportId: string) => void;
    embeddedAptName?: string;
}) {
    const params = useParams();
    const id = overrideReportId
        ?? (params?.slug ? parseAnalyzeSlug(Array.isArray(params.slug) ? params.slug : [params.slug]) : undefined);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const adminSample = searchParams.get('adminSample') === '1';
    const returnQs = searchParams.get('return');
    /** 비공개 쇼츠 프레임 캡처 (/analyze/{id}?shorts=1) */
    const shortsCapture = searchParams.get('shorts') === '1';
    /** 카페 업로드용 AI 리포트 전문 export (?cafeExport=1) */
    const cafeExport = searchParams.get('cafeExport') === '1';
    const shortsTokenParam = searchParams.get('token') || '';
    const shortsTokenExpected = process.env.NEXT_PUBLIC_SHORTS_CAPTURE_TOKEN || '';

    const goBack = useCallback(() => {
        if (returnQs) {
            // returnQs가 '?'로 시작하는 경우 (/??panel=ranking... 이중 ? 방지)
            const cleanQs = returnQs.startsWith('?') ? returnQs.slice(1) : returnQs;
            router.push(`/?${cleanQs}`);
            return;
        }
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
            return;
        }
        router.push('/');
    }, [router, returnQs]);

    const buildShortsHref = useCallback((tab: 'cards' | 'studio' = 'cards') => {
        const reportKey = Array.isArray(id) ? id[0] : id;
        if (embeddedInApartment && pathname) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('shorts', '1');
            params.set('preview', '1');
            if (reportKey) params.set('reportId', String(reportKey));
            if (tab === 'studio') params.set('tab', 'studio');
            else params.delete('tab');
            return `${pathname}?${params.toString()}`;
        }
        const base = `/analyze/${reportKey}?shorts=1&preview=1`;
        return tab === 'studio' ? `${base}&tab=studio` : base;
    }, [embeddedInApartment, pathname, searchParams, id]);

    const handleShortsClose = useCallback(() => {
        if (embeddedInApartment && pathname) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete('shorts');
            params.delete('preview');
            params.delete('tab');
            const qs = params.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
            return;
        }
        const reportKey = Array.isArray(id) ? id[0] : id;
        if (reportKey) {
            router.replace(`/analyze/${reportKey}`, { scroll: false });
            return;
        }
        router.back();
    }, [embeddedInApartment, pathname, searchParams, router, id]);

    const isFromRanking = returnQs ? new URLSearchParams(returnQs).get('panel') === 'ranking' : false;
    const backLabel = isFromRanking ? '랭킹으로' : returnQs ? '리포트 목록' : '홈으로';
    const adminAutoTriggered = useRef(false);
    const [analysisData, setAnalysisData] = useState<any>(initialData || null);
    const [loading, setLoading] = useState(!initialData);
    const [initialFetchDone, setInitialFetchDone] = useState(!!initialData?.rawData);
    const [error, setError] = useState<string | null>(null);
    const [shareToast, setShareToast] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [activeTab, setActiveTab] = useState<string>(() => getDefaultActiveTab(initialData));
    const tabScrollRef = useRef<HTMLDivElement>(null);
    const tabScrollAnchorRef = useRef<HTMLDivElement>(null);
    const tabScrollTargetYRef = useRef(0);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const defaultTabApplied = useRef(!!initialData);
    const apartmentRedirectDone = useRef(false);
    const [isFavorited, setIsFavorited] = useState(false);
    const [selectedChartFilter, setSelectedChartFilter] = useState('전체');
    const [selectedRoneChart, setSelectedRoneChart] = useState<string>('price');
    const [selectedTargetTab, setSelectedTargetTab] = useState<'매매' | '전세' | '월세'>('매매');
    const [targetAptTradesLimit, setTargetAptTradesLimit] = useState<number>(10);
    const [selectedQuarterlyArea, setSelectedQuarterlyArea] = useState<number | null>(null);



    // AI 분석 관련 상태
    const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
    const [aiStep, setAiStep] = useState(0);
    const [aiElapsed, setAiElapsed] = useState(0);
    const [historyModalReport, setHistoryModalReport] = useState<EmbeddedApartmentReport | null>(null);

    // AI 분석 제보용 입력 상태 (카테고리별 필드 — DetectiveSummaryView / Flutter ai_analysis_modal 기준)
    const [isInputModalOpen, setIsInputModalOpen] = useState(false);
    const [recentAnalysisBlocked, setRecentAnalysisBlocked] = useState<RecentAnalysisBlockedState | null>(null);
    const [aiInput, setAiInput] = useState<AiAnalysisInputState>(defaultAiAnalysisInput);
    const patchAiInput = (patch: Partial<AiAnalysisInputState>) =>
        setAiInput((prev) => ({ ...prev, ...patch }));

    // 결제 관련 상태 - 두 운영자 계정은 결제 없이 무제한
    const DEV_UID = process.env.NEXT_PUBLIC_DEV_UID;
    const DEV_UID2 = process.env.NEXT_PUBLIC_DEV_UID2;
    const isDevAccount = !!user && (user.uid === DEV_UID || user.uid === DEV_UID2);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isCheckingAccess, setIsCheckingAccess] = useState(false);

    // 무료 사용 및 결제 정보 조회 상태
    const [freeRemaining, setFreeRemaining] = useState<number>(0);
    const [hasPaidToday, setHasPaidToday] = useState<boolean>(false);
    const [hasAccess, setHasAccess] = useState<boolean>(false);

    const [isMapDropdownOpen, setIsMapDropdownOpen] = useState(false);
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [isAiReportCopyOpen, setIsAiReportCopyOpen] = useState(false);
    const [isDesktopReportPanel, setIsDesktopReportPanel] = useState(false);

    const [isMapCollapsed, setIsMapCollapsed] = useState(false);
    const isMapManuallyToggledRef = useRef(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(min-width: 768px)');
        const update = () => {
            setIsDesktopReportPanel(mq.matches);
            setIsMobile(!mq.matches);
        };
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    // 스크롤 시 지도 접기 핸들러 (수동 조작 우선)
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleScroll = () => {
            // 사용자가 수동 조작을 하지 않았고, 지도가 현재 열려있는 상태에서만 스크롤 임계값 도달 시 닫음
            if (!isMapManuallyToggledRef.current && !isMapCollapsed) {
                if (window.scrollY > 150) {
                    setIsMapCollapsed(true);
                }
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [isMapCollapsed]);

    const updateTabScrollTarget = useCallback(() => {
        const anchor = tabScrollAnchorRef.current;
        if (!anchor) return;
        tabScrollTargetYRef.current = anchor.getBoundingClientRect().top + window.scrollY;
    }, []);

    const scrollToTabTop = useCallback(() => {
        updateTabScrollTarget();
        const top = Math.max(0, tabScrollTargetYRef.current - 88);
        const anchor = tabScrollAnchorRef.current;
        if (anchor) {
            anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        window.scrollTo({ top, behavior: 'smooth' });
        document.documentElement.scrollTo({ top, behavior: 'smooth' });
    }, [updateTabScrollTarget]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleTabScrollTop = () => {
            updateTabScrollTarget();
            const threshold = tabScrollTargetYRef.current + 120;
            setShowScrollTop(window.scrollY > threshold);
        };

        const timer = window.setTimeout(handleTabScrollTop, 100);
        window.addEventListener('scroll', handleTabScrollTop, { passive: true });
        window.addEventListener('resize', handleTabScrollTop);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('scroll', handleTabScrollTop);
            window.removeEventListener('resize', handleTabScrollTop);
        };
    }, [updateTabScrollTarget, loading, analysisData, isMapCollapsed, activeTab]);

    useEffect(() => {
        if (!shareToast) return;
        const timer = window.setTimeout(() => setShareToast(null), 3000);
        return () => window.clearTimeout(timer);
    }, [shareToast]);
    const propertyId = analysisData?.report?.pnu as string | undefined;

    const { images: dataImages, report: dataReport, rawData } = analysisData || {};
    const report = dataReport || analysisData;
    const images = dataImages || analysisData?.images || [];

    const mergedData = useMemo(() => {
        if (!analysisData) return {};
        const base = { ...analysisData };
        if (analysisData.report && typeof analysisData.report === 'object') {
            Object.assign(base, analysisData.report);
        }
        if (analysisData.rawData && typeof analysisData.rawData === 'object') {
            Object.assign(base, analysisData.rawData);
        }
        if (analysisData.storeData && typeof analysisData.storeData === 'object') {
            Object.assign(base, analysisData.storeData);
        }
        return base;
    }, [analysisData]);

    const address = report?.address || mergedData?.address || '';
    const rawBldNm = report?.bldNm || mergedData?.bldNm || '';

    const handleNewApartmentAnalysis = useCallback(() => {
        if (!user) {
            alert('로그인이 필요한 서비스입니다.');
            return;
        }
        if (!isApartmentAiTradeDataAvailable(analysisData)) {
            alert(NO_TRADE_DATA_AI_MESSAGE);
            return;
        }
        setAiInput(parseAiInputFromReportData(mergedData));
        setIsInputModalOpen(true);
    }, [analysisData, mergedData, user]);

    /** AnalyzePanel에서 입력한 상세 정보 → AI 모달 prefill */
    useEffect(() => {
        if (!analysisData) return;
        setAiInput(parseAiInputFromReportData(mergedData));
    }, [analysisData, mergedData]);

    // 최근 조회한 리포트 이력 저장
    useEffect(() => {
        if (!analysisData || !report) return;
        if (typeof window === 'undefined') return;

        try {
            const title = report.propertyTitle || report.address || report.title || '분석 매물';
            const item = {
                id: report.id,
                title,
                address: report.address || '',
                category: report.category || 'land',
                timestamp: Date.now()
            };

            const raw = localStorage.getItem('recent_report_views');
            let prev: any[] = [];
            if (raw) {
                prev = JSON.parse(raw);
            }
            // 중복 제거
            const filtered = prev.filter((x: any) => x.id !== report.id);
            const next = [item, ...filtered].slice(0, 10);
            localStorage.setItem('recent_report_views', JSON.stringify(next));
        } catch (e) {
            console.error('Error saving view history:', e);
        }
    }, [analysisData, report]);

    const volumeTrendData = useMemo(() => {
        // 앱(Flutter)과 똑같이 rawData를 우선 참조합니다 (AI 분석 전에도 볼 수 있게)
        const stats = rawData?.dealVolumeStats || rawData?.nearbyData?.volumeStats || analysisData?.dealVolumeStats || analysisData?.nearbyData?.volumeStats || [];
        const monthlyCounts: Record<string, number> = {};

        stats.forEach((item: any) => {
            const jimok = item.jimok || '';
            const month = item.month || '';
            if (selectedChartFilter !== '전체' && jimok !== selectedChartFilter) return;
            if (!month) return;
            monthlyCounts[month] = (monthlyCounts[month] || 0) + (Number(item.count) || 0);
        });

        return Object.entries(monthlyCounts)
            .map(([month, count]) => ({ month, count }))
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-12);
    }, [rawData, analysisData, selectedChartFilter]);

    const isApartmentCategory = useMemo(() => {
        const cat = String(report?.category || analysisData?.category || '').toLowerCase().trim();
        return cat === 'apartment' || cat === '아파트';
    }, [report?.category, analysisData?.category]);

    const tenYearOutlookContext = useMemo(() => ({
        marketIndicators: rawData?.marketIndicators || mergedData?.marketIndicators,
        housingSupply: rawData?.housingSupply || mergedData?.housingSupply,
        population: rawData?.population || mergedData?.population,
        macroIndicators: rawData?.macroIndicators || mergedData?.macroIndicators,
        householdLoanRate: rawData?.householdLoanRate ?? mergedData?.householdLoanRate ?? null,
        dealVolumeStats: rawData?.dealVolumeStats || rawData?.nearbyData?.volumeStats || mergedData?.dealVolumeStats || [],
        targetTrades: rawData?.targetTrades || rawData?.nearbyData?.targetTrades || [],
        regulatoryData: rawData?.regulatoryData || mergedData?.regulatoryData,
        dynamicNews: rawData?.dynamicNews || mergedData?.dynamicNews,
        amenities: rawData?.nearbyData?.amenities || mergedData?.nearbyData?.amenities,
        spatialFacilities: rawData?.nearbyData?.spatialFacilities || mergedData?.nearbyData?.spatialFacilities || [],
    }), [rawData, mergedData]);

    const tenYearStoryChart = useMemo(() => {
        const stats = rawData?.targetComplexInfo?.quarterlyStats || [];
        const complexName = rawData?.targetComplexInfo?.name || report?.propertyTitle || '해당 단지';

        if (!stats.length) {
            return { hasChart: false, complexName, uniqueAreas: [] as number[], activeArea: null as number | null, chartData: [] as any[] };
        }

        const areaValues: number[] = [];
        for (const s of stats as Array<{ exclusiveArea?: unknown }>) {
            const area = Number(s.exclusiveArea);
            if (Number.isFinite(area)) areaValues.push(area);
        }
        const uniqueAreas = [...new Set(areaValues)].sort((a, b) => a - b);
        if (!uniqueAreas.length) {
            return { hasChart: false, complexName, uniqueAreas, activeArea: null as number | null, chartData: [] as any[] };
        }

        const activeArea: number | null = selectedQuarterlyArea ?? resolveDefaultQuarterlyArea(uniqueAreas, {
            quarterlyStats: stats as Array<Record<string, unknown>>,
            targetTrades: (rawData?.targetTrades || rawData?.nearbyData?.targetTrades || []) as Array<Record<string, unknown>>,
        });
        const filteredStats = stats.filter((s: any) => areasMatch(Number(s.exclusiveArea), activeArea!));

        const groups: Record<string, any> = {};
        for (const s of filteredStats) {
            const shortYear = String(s.dealYear).slice(-2);
            const key = `${s.dealYear}-${s.dealQuarter}Q`;
            if (!groups[key]) {
                groups[key] = {
                    name: `${shortYear}-${s.dealQuarter}Q`,
                    year: s.dealYear,
                    quarter: s.dealQuarter,
                    sale: null,
                    charter: null,
                    rent: null,
                };
            }
            if (s.dealType === 'sale') groups[key].sale = s.avgAmount;
            else if (s.dealType === 'charter') groups[key].charter = s.avgAmount;
            else if (s.dealType === 'rent') groups[key].rent = s.avgAmount;
        }

        const chartData = Object.values(groups).sort((a: any, b: any) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.quarter - b.quarter;
        });

        return { hasChart: true, complexName, uniqueAreas, activeArea, chartData };
    }, [rawData, report, selectedQuarterlyArea]);

    // 유틸리티 함수
    const formatPrice = (price: any) => {
        if (!price) return '정보없음';
        if (typeof price === 'string' && price.includes('억')) return price;
        const num = typeof price === 'string' ? parseInt(price.replace(/,/g, '')) : price;
        if (isNaN(num)) return price;
        if (num >= 10000) {
            const eok = Math.floor(num / 10000);
            const man = num % 10000;
            return `${eok}억${man > 0 ? ` ${man.toLocaleString()}만원` : '원'}`;
        }
        return `${num.toLocaleString()}만원`;
    };

    const formatArea = (area: any) => {
        if (!area) return '-';
        return `${area}`;
    };

    /** ㎡ → 평(0.3025) 병기 */
    const formatSqmWithPyeong = (sqm: any) => {
        const n = Number(sqm);
        if (!sqm || Number.isNaN(n)) return '-';
        const pyeong = n * 0.3025;
        const pyeongStr = pyeong.toLocaleString(undefined, { maximumFractionDigits: 2 });
        return `${n} ㎡ (${pyeongStr}평)`;
    };

    /** API 공시지가는 원/㎡ 단위 → formatPrice(만원) 입력으로 변환 */
    const formatOfficialLandPrice = (raw: any) => {
        if (!raw) return '정보없음';
        const won = typeof raw === 'string' ? parseInt(raw.replace(/,/g, ''), 10) : Number(raw);
        if (!won || Number.isNaN(won)) return '정보없음';
        const inMan = won >= 10000 ? won / 10000 : won;
        const wholeMan = Math.floor(inMan);
        const restWon = Math.round((inMan - wholeMan) * 10000);
        if (wholeMan >= 10000) return formatPrice(inMan);
        if (restWon > 0) return `${wholeMan.toLocaleString()}만 ${restWon.toLocaleString()}원`;
        return `${wholeMan.toLocaleString()}만원`;
    };

    const formatDate = (dateStr: any) => {
        if (!dateStr) return '-';
        const str = String(dateStr);
        if (str.length === 8) return `${str.substring(0, 4)}.${str.substring(4, 6)}.${str.substring(6, 8)}`;
        if (str.length === 6) return `${str.substring(0, 4)}.${str.substring(4, 6)}`;
        return str;
    };

    const getPermitYear = (dateStr: any) => {
        if (!dateStr) return '연도 미상';
        const str = String(dateStr).replace(/[^0-9]/g, '');
        if (str.length >= 4) return `${str.substring(0, 4)}년`;
        return '연도 미상';
    };

    const groupPermitsByYear = (permitList: any[]) => {
        const grouped: Record<string, any[]> = {};
        for (const item of permitList) {
            const year = getPermitYear(item.archPmsDay);
            if (!grouped[year]) grouped[year] = [];
            grouped[year].push(item);
        }
        const sortedYears = Object.keys(grouped).sort((a, b) => {
            if (a === '연도 미상') return 1;
            if (b === '연도 미상') return -1;
            return b.localeCompare(a);
        });
        return { grouped, sortedYears };
    };

    const formatToMan = (value: number) => {
        if (value >= 10000) {
            const manVal = value / 10000;
            return manVal % 1 === 0 ? `${manVal}만` : `${manVal.toFixed(1)}만`;
        }
        return Math.round(value).toLocaleString();
    };

    const getMovementChartDomain = (trend: any[]): [number, number] => {
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
    };

    const getEumLandDetUrl = (pnu: string) => {
        if (!pnu || pnu.length !== 19) return null;
        const selSido = pnu.substring(0, 2);
        const selSgg = pnu.substring(2, 5);
        const selUmd = '0' + pnu.substring(5, 8);
        const selRi = pnu.substring(8, 10);
        const landGbn = pnu.substring(10, 11);
        const bobn = String(Number(pnu.substring(11, 15)));
        const bubnVal = Number(pnu.substring(15, 19));
        const bubn = bubnVal === 0 ? '' : String(bubnVal);

        return `https://www.eum.go.kr/web/ar/lu/luLandDet.jsp?selGbn=umd&isNoScr=script&s_type=1&pnu=${pnu}&tobrowser=1&mode=search&landGbnExt=1&selSido=${selSido}&selSgg=${selSgg}&selUmd=${selUmd}&selRi=${selRi}&landGbn=${landGbn}&bobn=${bobn}&bubn=${bubn}&withbrowser=#none&withbrowser`;
    };

    useEffect(() => {
        const container = tabScrollRef.current;
        if (!container) return;
        const activeBtn = container.querySelector(`[data-tab-id="${activeTab}"]`) as HTMLElement | null;
        if (!activeBtn) return;
        const buttons = Array.from(container.querySelectorAll('[data-tab-id]')) as HTMLElement[];
        const isFirst = buttons[0] === activeBtn;
        const isLast = buttons[buttons.length - 1] === activeBtn;
        activeBtn.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: isFirst ? 'start' : isLast ? 'end' : 'center',
        });
    }, [activeTab]);

    // 데이터 수집 경과 시간 계산용 state
    const [collectElapsed, setCollectElapsed] = useState(0);

    useEffect(() => {
        if (!id) return;

        setAnalysisData(initialData || null);
        setLoading(!initialData);
        setInitialFetchDone(!!initialData?.rawData);

        let isMounted = true;
        let timer: NodeJS.Timeout | null = null;

        const poll = async () => {
            try {
                const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
                const headers: Record<string, string> = {};
                if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
                const response = await fetch(`/api/land/detective/report/${id}`, { headers });
                if (!response.ok) {
                    if (isMounted) {
                        setLoading(false);
                        setInitialFetchDone(true);
                    }
                    return;
                }
                const data = await response.json();

                if (!isMounted) return;
                setAnalysisData(data);
                setLoading(false);
                setInitialFetchDone(true);

                const status = data.report?.ai_analysis_status || data.ai_analysis_status;
                const hasRawData = !!data.rawData;

                if (status === 'pending' && !hasRawData) {
                    timer = setTimeout(poll, 3000);
                }
            } catch (err) {
                console.error("수집 상태 폴링 오류:", err);
                if (isMounted) {
                    setLoading(false);
                    setInitialFetchDone(true);
                    timer = setTimeout(poll, 3000);
                }
            }
        };

        const currentStatus = initialData?.report?.ai_analysis_status || initialData?.ai_analysis_status;
        const currentRawData = initialData?.rawData;
        if (!initialData || (currentStatus === 'pending' && !currentRawData)) {
            poll();
        } else {
            void fetchAnalysis(true);
        }

        return () => {
            isMounted = false;
            if (timer) clearTimeout(timer);
        };
    }, [id]);

    /** 아파트: 공공데이터 수집 완료 시 단지 페이지로 자동 이동 */
    useEffect(() => {
        if (searchParams.get('stayOnAnalyze') === '1') return;
        if (searchParams.get('shorts') === '1') return; // 카드로 보기(쇼츠) 시 리다이렉트 금지!
        if (!shouldRedirectToApartmentPage(
            analysisData?.report,
            !!analysisData?.rawData,
            embeddedInApartment,
        )) return;
        if (apartmentRedirectDone.current) return;

        const url = buildApartmentPageUrl(analysisData.report, id);
        if (url) {
            apartmentRedirectDone.current = true;
            router.replace(url);
        }
    }, [analysisData, embeddedInApartment, id, router, searchParams]);

    /** 데이터 로드 시 AI 완료 여부에 따라 기본 탭 설정 */
    useEffect(() => {
        if (!analysisData) return;

        const shouldBeAi = isAiAnalysisCompleted(analysisData);
        if (!defaultTabApplied.current) {
            defaultTabApplied.current = true;
            setActiveTab(getDefaultActiveTab(analysisData));
        } else if (shouldBeAi && activeTab === 'report') {
            // SSR 캐시된 초기 데이터는 미완료였으나, 새로 fetch한 데이터가 완료 상태인 경우 탭 자동 전환
            setActiveTab('ai_report');
        }
    }, [analysisData]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (analysisData && user) {
            // 백엔드에서 전달해주는 isLiked 값을 우선 사용
            if (analysisData.isLiked !== undefined) {
                setIsFavorited(analysisData.isLiked);
            } else {
                // 기존 likes 배열 구조 fallback
                const likesArray = analysisData.likes || analysisData.report?.likes;
                if (likesArray) {
                    setIsFavorited(likesArray.map((l: any) => l.toString()).includes(user.uid.toString()));
                }
            }
        }
    }, [analysisData, user]);

    const fetchAnalysis = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
            const headers: Record<string, string> = {};
            if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

            const response = await fetch(`/api/land/detective/report/${id}`, { headers });
            if (!response.ok) throw new Error('분석 결과를 불러오는데 실패했습니다');
            const data = await response.json();
            setAnalysisData(data);
        } catch (err: any) {
            setError(err.message);
            console.error("데이터 로딩 오류:", err);
        } finally {
            setLoading(false);
            setInitialFetchDone(true);
        }
    };

    const navigateToExistingReport = useCallback((reportId: string) => {
        if (!reportId) return;
        setRecentAnalysisBlocked(null);

        if (embeddedInApartment && onEmbeddedReportSelect) {
            onEmbeddedReportSelect(reportId);
            return;
        }

        if (String(id) === String(reportId)) {
            void fetchAnalysis(true);
            return;
        }

        if (embeddedInApartment) {
            const aptSeqParam = searchParams.get('aptSeq') || analysisData?.report?.apt_seq || 'pnu';
            const pnuVal = searchParams.get('pnu') || analysisData?.report?.pnu;
            const pnuParam = pnuVal
                ? `?pnu=${encodeURIComponent(pnuVal)}&reportId=${reportId}`
                : `?reportId=${reportId}`;
            router.replace(`/apartment/${aptSeqParam}${pnuParam}`);
            return;
        }

        router.replace(`/analyze/${reportId}`);
    }, [
        analysisData?.report?.apt_seq,
        analysisData?.report?.pnu,
        embeddedInApartment,
        id,
        onEmbeddedReportSelect,
        router,
        searchParams,
    ]);

    const fetchPaymentAndUsageStatus = async () => {
        if (!user) return;
        try {
            const idToken = await user.getIdToken();

            // 1. check daily usage
            const usageRes = await fetch(
                `/api/payment/check-daily-usage?userId=${user.uid}`,
                { headers: { Authorization: `Bearer ${idToken}` } }
            );
            if (usageRes.ok) {
                const usageData = await usageRes.json();
                setFreeRemaining(usageData.freeRemaining ?? 0);
                setHasPaidToday(usageData.hasPaidToday ?? false);
            }

            // 2. check access
            if (propertyId) {
                const accessRes = await fetch(
                    `/api/payment/check-access?userId=${user.uid}&propertyId=${propertyId}`,
                    { headers: { Authorization: `Bearer ${idToken}` } }
                );
                if (accessRes.ok) {
                    const accessData = await accessRes.json();
                    setHasAccess(accessData.hasAccess ?? false);
                }
            }
        } catch (error) {
            console.error('Failed to fetch payment or usage status:', error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchPaymentAndUsageStatus();
        }
    }, [user, propertyId]);

    const toggleFavorite = async () => {
        if (!user) {
            alert('로그인이 필요한 기능입니다.');
            return;
        }

        // Optimistic
        setIsFavorited(!isFavorited);
        setShareToast(!isFavorited ? '찜 목록에 추가되었습니다! ❤️' : '찜 취소되었습니다.');

        try {
            const idToken = await user.getIdToken();
            const res = await fetch(`/api/land/detective/reports/${id}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                }
            });
            const data = await res.json();
            if (data.success) {
                // 서버의 응답 likes 배열이 있다면 반영, 아니면 isLiked 결과 기반으로 처리
                if (data.likes) {
                    setIsFavorited(data.likes.map((l: any) => l.toString()).includes(user.uid.toString()));
                } else if (data.isLiked !== undefined) {
                    setIsFavorited(data.isLiked);
                }
            }
        } catch (e) {
            console.error("찜하기 처리 오류:", e);
        }
        setTimeout(() => setShareToast(null), 3000);
    };

    const handleShare = async () => {
        const shareData = {
            title: `부동산탐정 AI 리포트 - ${analysisData?.report?.address}`,
            text: `부동산 매물 분석 결과를 확인해보세요`,
            url: window.location.href
        };

        try {
            if (navigator.share && /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                await navigator.share(shareData);
                setShareToast('공유가 완료되었습니다! 📱');
            } else {
                await navigator.clipboard.writeText(shareData.url);
                setShareToast('링크가 복사되었습니다! 📋');
            }
        } catch (error) {
            setShareToast('링크 복사 실패');
        }
        setTimeout(() => setShareToast(null), 3000);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setShareToast('질문이 복사되었습니다! 📋');
        setTimeout(() => setShareToast(null), 2000);
    };

    // ── AI 분석 버튼 클릭 → 추가 정보 입력 먼저 ──
    const handleAiAnalysisClick = async () => {
        if (!user) {
            alert('로그인이 필요한 서비스입니다.');
            return;
        }
        if (!isApartmentAiTradeDataAvailable(analysisData)) {
            alert(NO_TRADE_DATA_AI_MESSAGE);
            return;
        }
        setAiInput(parseAiInputFromReportData(mergedData));
        setIsInputModalOpen(true);
    };

    /** 입력 완료 후 결제 여부 확인 → 분석 또는 결제 모달 */
    const handleInputSubmit = async () => {
        if (!user) return;

        if (!isAiInputValid(aiInput)) {
            const msg =
                aiInput.transactionType === '매매'
                    ? '매매가를 입력해주세요.'
                    : aiInput.transactionType === '전세'
                        ? '전세보증금을 입력해주세요.'
                        : '월세보증금과 월세를 입력해주세요.';
            alert(msg);
            return;
        }

        // 운영자 계정 또는 propertyId 없으면 바로 분석 실행
        if (isDevAccount || !propertyId) {
            runAiAnalysis();
            return;
        }

        setIsCheckingAccess(true);
        try {
            const idToken = await user.getIdToken();

            // (1) 오늘 무료 분석 이력 확인 (daily_free_analysis)
            const usageRes = await fetch(
                `/api/payment/check-daily-usage?userId=${user.uid}`,
                { headers: { Authorization: `Bearer ${idToken}` } },
            );
            if (usageRes.ok) {
                const usageData = await usageRes.json();
                // freeRemaining > 0 이면 오늘 무료 분석 기회 남음 → AI 분석 실행
                // hasPaidToday === true 이면 오늘 결제완료 상태 → AI 분석 실행
                if (usageData.freeRemaining > 0 || usageData.hasPaidToday) {
                    runAiAnalysis();
                    return;
                }
            }

            // (2) 유료 결제 이력 확인 (analysis_access)
            const res = await fetch(
                `/api/payment/check-access?userId=${user.uid}&propertyId=${propertyId}`,
                { headers: { Authorization: `Bearer ${idToken}` } },
            );
            const data = await res.json();
            if (data.hasAccess) {
                runAiAnalysis();
            } else {
                setIsInputModalOpen(false);
                setIsPaymentModalOpen(true);
            }
        } catch (e) {
            console.error('결제 확인 오류:', e);
            setIsInputModalOpen(false);
            setIsPaymentModalOpen(true);
        } finally {
            setIsCheckingAccess(false);
        }
    };

    const runAiAnalysis = async () => {
        if (!id || !user) return;

        const reportIdStr = String(Array.isArray(id) ? id[0] : id);

        setIsInputModalOpen(false);
        setIsAiAnalyzing(true);
        setAiStep(0);
        setAiElapsed(0);

        registerActiveAiAnalysis({
            id: reportIdStr,
            address: analysisData?.report?.address || '주소 정보 없음',
            category: analysisData?.report?.category || 'apartment',
            startedAt: Date.now(),
            currentStep: 0,
        });

        const timer = setInterval(() => setAiElapsed(prev => prev + 1), 1000);
        const stepTimer = setInterval(() => {
            setAiStep(prev => (prev < AI_ANALYSIS_STEPS.length - 1 ? prev + 1 : prev));
        }, 5000);

        try {
            const idToken = await user.getIdToken();
            const formData = buildAiAnalysisFormData(id as string, aiInput);

            const response = await fetch(`/api/land/detective/analyze-ai-only`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${idToken}`
                },
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({} as Record<string, unknown>));
                const errorCode = typeof errData.error === 'string' ? errData.error : '';
                const errorMessage = typeof errData.message === 'string'
                    ? errData.message
                    : 'AI 분석 요청 실패';

                if (errorCode === 'RECENT_ANALYSIS_EXISTS') {
                    dismissActiveAiAnalysis(reportIdStr);
                    setRecentAnalysisBlocked({
                        message: errorMessage,
                        reportId: errData.reportId != null ? String(errData.reportId) : undefined,
                    });
                    return;
                }

                if (errorCode === 'NO_TRADE_DATA') {
                    dismissActiveAiAnalysis(reportIdStr);
                    alert(errorMessage || NO_TRADE_DATA_AI_MESSAGE);
                    return;
                }

                throw new Error(errorMessage);
            }

            const result = await response.json();
            const newReportId = result.reportId;
            const finalId = newReportId ? String(newReportId) : reportIdStr;
            completeActiveAiAnalysis(reportIdStr, finalId !== reportIdStr ? finalId : undefined);

            if (newReportId && String(newReportId) !== String(id)) {
                if (embeddedInApartment) {
                    const aptSeqParam = searchParams.get('aptSeq') || analysisData?.report?.apt_seq || 'pnu';
                    const pnuVal = searchParams.get('pnu') || analysisData?.report?.pnu;
                    const pnuParam = pnuVal ? `?pnu=${encodeURIComponent(pnuVal)}&reportId=${newReportId}` : `?reportId=${newReportId}`;
                    router.replace(`/apartment/${aptSeqParam}${pnuParam}`);
                } else {
                    router.replace(`/analyze/${newReportId}`);
                }
            } else {
                await fetchAnalysis();
            }
            await fetchPaymentAndUsageStatus();
            setActiveTab('ai_report');
            setShareToast('AI 탐정의 판독이 완료되었습니다! 🕵️');
        } catch (err: any) {
            console.error(err);
            dismissActiveAiAnalysis(reportIdStr);
            alert(err.message);
            setError(err.message);
        } finally {
            clearInterval(timer);
            clearInterval(stepTimer);
            setIsAiAnalyzing(false);
        }
    };

    // 공시지가 차트 데이터 가공
    const chartData = useMemo(() => {
        // 1. officialLandPrice (8년치 데이터) 우선 확인
        if (analysisData?.rawData?.officialLandPrice && analysisData.rawData.officialLandPrice.length > 0) {
            return [...analysisData.rawData.officialLandPrice]
                .sort((a, b) => Number(a.year) - Number(b.year))
                .map((item: any) => ({
                    year: item.year,
                    price: Math.round((item.price || 0) / 10000) // 만원 단위 (만약 이미 만원이면 조정 필요)
                }));
        }

        // 2. 기존 vitals.officialPrice 확인
        if (!analysisData?.rawData?.vitals?.officialPrice) return [];
        return [...analysisData.rawData.vitals.officialPrice]
            .reverse()
            .map((item: any) => ({
                year: item.stdrYear,
                price: Math.round((item.pblntfPclnd || item.housePc || 0) / 10000) // 만원 단위
            }));
    }, [analysisData]);

    // AI 분석 데이터 파싱
    const reportData = useMemo<DetectiveReport | null>(() => {
        if (!analysisData) return null;

        const rawJsonString =
            analysisData.analysis?.recommendations ||
            analysisData.report?.ai_summary ||
            (typeof analysisData.analysis === 'string' ? analysisData.analysis : null);

        if (!rawJsonString) return null;

        try {
            let parsed: any;
            try {
                parsed = JSON.parse(rawJsonString);
            } catch (e) {
                console.error("JSON Parse Error on rawJsonString:", e);
                parsed = {};
            }

            return {
                ...parsed,
                propertyTitle: parsed.propertyTitle || analysisData.report?.address || "익명 매물",
            };
        } catch (e) {
            console.error("AI Analysis JSON Parsing Error:", e);
            return null;
        }
    }, [analysisData]);

    // 1. Sigungu Code & Name extraction
    const pnu = report?.pnu || mergedData?.pnu || '';
    const sigunguCd = pnu && typeof pnu === 'string' ? pnu.substring(0, 5) : '';

    const sigunguName = useMemo(() => {
        if (!address) return '';
        const m = address.match(
            /(?:[가-힣]+(?:특별시|광역시|특별자치시|도)\s+)?([가-힣]+(?:시\s+[가-힣]+구|[가-힣]+(?:시|군|구)))/,
        );
        return m ? m[1].trim() : '';
    }, [address]);

    // 2. Naver keyword extraction
    const naverKeyword = useMemo(() => {
        let aptName = '';
        if (embeddedAptName && embeddedAptName !== '아파트 단지') {
            aptName = embeddedAptName;
        } else {
            aptName = report?.bldNm || mergedData?.bldNm || reportData?.propertyTitle || '';
        }
        if (!aptName && !address) return '';

        const cleanBldNmOnly = aptName.replace(/\(.*?\)/g, '').trim();

        // 주소를 공백으로 분리하여 시/도, 시/군/구, 읍/면/동 정보 추출
        const parts = address.replace(/,/g, ' ').split(/\s+/).filter((p: string) => p.trim() !== '');
        const siName = parts.find((p: string) => p.endsWith('시') || p.endsWith('도')) || '';
        const guName = parts.find((p: string) => p.endsWith('구') || p.endsWith('군')) || '';
        const dongMatch = address.match(/([가-힣]+동)/);
        const dongName = dongMatch ? dongMatch[1] : '';

        // 구/군 또는 동 정보가 있으면 시/도 정보와 함께 조합
        let regionPrefix = '';
        if (guName) {
            regionPrefix = `${siName} ${guName}`;
        } else if (dongName) {
            regionPrefix = `${siName} ${dongName}`;
        } else {
            regionPrefix = parts.slice(0, 2).join(' '); // 앞 두 단어 (예: "인천광역시 계양구")
        }

        // 아파트명이 이미 지역명을 포함하고 있다면 그대로 쓰고, 없으면 지역명을 앞에 붙여줍니다.
        if (cleanBldNmOnly.includes(guName) || (dongName && cleanBldNmOnly.includes(dongName))) {
            return cleanBldNmOnly;
        }

        return `${regionPrefix} ${cleanBldNmOnly}`.trim();
    }, [address, embeddedAptName, report?.bldNm, mergedData?.bldNm, reportData?.propertyTitle]);

    const cat = (report?.category || mergedData?.category || '').toLowerCase();
    const isApartment = cat === 'apartment' || cat === '아파트' || embeddedInApartment;

    const dashboardSummary = useMemo(() => {
        const compRisk = reportData?.['1_comprehensiveRisk'];
        const priceReas = reportData?.['5_priceReasonableness'];
        return (
            compRisk?.coreJudgement ||
            report?.detectiveNote ||
            priceReas?.conclusion ||
            ''
        );
    }, [reportData, report]);

    const aiReportCopyText = useMemo(() => {
        if (!reportData) return '';
        return buildAiReportCopyText(reportData, {
            address: report?.address || mergedData?.address || reportData.propertyTitle || '매물 상세',
            detectiveNote: report?.detectiveNote || analysisData?.detectiveNote,
            category: report?.category || mergedData?.category || '',
            mergedData: mergedData,
            analysisMetadata: analysisData?.analysisMetadata || reportData?.analysisMetadata,
        });
    }, [reportData, report, mergedData, analysisData]);

    const mapDataForHeader = useMemo<any>(() => {
        if (reportData?.analysisMetadata) {
            return reportData.analysisMetadata;
        }
        const latVal = report?.lat ?? mergedData?.lat ?? mergedData?.coordinates?.lat;
        const lngVal = report?.lng ?? mergedData?.lng ?? mergedData?.coordinates?.lng;
        return {
            target: {
                lat: latVal,
                lng: lngVal,
                address: report?.address || mergedData?.address || '분석 대상지',
            },
            comparables: [],
            targetArea: null,
        };
    }, [reportData, report, mergedData]);

    const isAdmin = isAdminUser(user?.uid);

    /** 관리자 샘플 분석: 리포트 로드 후 AI 분석 자동 실행 (버튼 1회 통일) */
    useEffect(() => {
        if (!adminSample || !isAdmin || adminAutoTriggered.current) return;
        if (loading || !analysisData || !user || isAiAnalyzing) return;

        const status =
            report?.ai_analysis_status ||
            analysisData?.ai_analysis_status ||
            analysisData?.report?.ai_analysis_status ||
            '';
        if (status === 'completed' || status === 'processing' || status === 'failed') {
            if (id) router.replace(`/analyze/${id}`, { scroll: false });
            return;
        }

        if (!isAiInputValid(aiInput)) return;

        adminAutoTriggered.current = true;
        if (id) router.replace(`/analyze/${id}`, { scroll: false });
        void runAiAnalysis();
        // runAiAnalysis는 매 렌더마다 갱신되므로 의존성에서 제외 (1회 트리거 ref로 보호)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adminSample, isAdmin, loading, analysisData, user, isAiAnalyzing, aiInput, report, id, router]);

    const status = analysisData?.report?.ai_analysis_status || analysisData?.ai_analysis_status;
    const hasRawData = !!analysisData?.rawData;
    const isDataCollecting = initialFetchDone && status === 'pending' && !hasRawData;

    useEffect(() => {
        if (!isAiAnalyzing || !id) return;
        const reportIdStr = String(Array.isArray(id) ? id[0] : id);
        updateActiveAiAnalysis(reportIdStr, { currentStep: aiStep });
    }, [isAiAnalyzing, id, aiStep]);

    useEffect(() => {
        if (isAiAnalyzing || !id || !analysisData) return;
        if (!isAiAnalysisCompleted(analysisData)) return;
        try {
            const targetId = String(Array.isArray(id) ? id[0] : id);
            const list = readActiveAiAnalyses();
            const hasEntry = list.some((item) => String(item.id) === targetId);
            if (hasEntry) {
                dismissActiveAiAnalysis(targetId);
            }
        } catch (e) {
            console.error('AI 배경 분석 정리 오류:', e);
        }
    }, [isAiAnalyzing, id, analysisData]);

    useEffect(() => {
        if (!isDataCollecting || !id) return;
        try {
            const stored = localStorage.getItem('active_analyses');
            const list = stored ? JSON.parse(stored) : [];
            const targetId = Array.isArray(id) ? id[0] : id;
            const exists = list.some((item: any) => String(item.id) === String(targetId));
            if (!exists) {
                list.push({
                    id: String(targetId),
                    address: analysisData?.report?.address || '주소 정보 없음',
                    category: analysisData?.report?.category || '매물',
                    startedAt: Date.now()
                });
                localStorage.setItem('active_analyses', JSON.stringify(list));
                window.dispatchEvent(new Event('storage'));
            }
        } catch (e) {
            console.error('배경 분석 등록 오류:', e);
        }
    }, [isDataCollecting, id, analysisData]);

    useEffect(() => {
        if (!isDataCollecting || !id) {
            setCollectElapsed(0);
            return;
        }

        const targetId = String(Array.isArray(id) ? id[0] : id);

        const syncElapsed = () => {
            try {
                const stored = localStorage.getItem('active_analyses');
                const list: Array<{ id: string; startedAt?: number }> = stored ? JSON.parse(stored) : [];
                const item = list.find((entry) => String(entry.id) === targetId);
                if (item?.startedAt) {
                    setCollectElapsed(Math.floor((Date.now() - item.startedAt) / 1000));
                    return;
                }
            } catch { /* noop */ }
            setCollectElapsed(0);
        };

        syncElapsed();
        const timer = setInterval(syncElapsed, 1000);
        return () => clearInterval(timer);
    }, [isDataCollecting, id]);

    // 수집 완료된 리포트 페이지를 방문하면 트래커에서 자동 제거 (이미 페이지에서 확인 중)
    useEffect(() => {
        if (isDataCollecting || !id) return;
        try {
            const targetId = String(Array.isArray(id) ? id[0] : id);
            const stored = localStorage.getItem('active_analyses');
            const list: Array<{ id: string }> = stored ? JSON.parse(stored) : [];
            const filtered = list.filter((item) => String(item.id) !== targetId);
            if (filtered.length !== list.length) {
                localStorage.setItem('active_analyses', JSON.stringify(filtered));
                window.dispatchEvent(new Event('storage'));
            }
        } catch (e) {
            console.error('배경 분석 정리 오류:', e);
        }
    }, [isDataCollecting, id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-sky-500/20 rounded-full border-t-sky-500 animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Search className="w-6 h-6 text-sky-500 animate-pulse" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-white text-lg mb-1">탐정 AI가 데이터를 분석 중입니다</p>
                        <p className="text-slate-400 text-sm animate-pulse">국가 기관 데이터 연동 중...</p>
                    </div>
                </div>
            </div>
        );
    }

    // 1. 공공데이터 수집 실패 상태 처리 (rawData 없을 때만)
    if (status === 'failed' && !hasRawData) {
        return (
            <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl"
                >
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">공공데이터 수집 실패</h2>
                    <p className="text-slate-400 mb-8 font-medium leading-relaxed">
                        선택하신 토지/건물의 공공데이터(건축물대장 정보, 실거래가 등)를 수집하는 동안 오류가 발생했거나, 등록되지 않은 번지입니다. 잠시 후 다시 요청해 주세요.
                    </p>
                    <button
                        onClick={goBack}
                        className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> 뒤로 가기
                    </button>
                </motion.div>
            </div>
        );
    }

    // 2. 백그라운드 공공데이터 수집 중 상태 처리
    if (isDataCollecting) {
        const collectSteps = [
            { label: '위치 데이터 매칭', desc: '좌표를 기반으로 정확한 필지(PNU)를 식별합니다', icon: '/3d/wich.svg' },
            { label: '국가 API 연동', desc: '건축물대장 및 토지특성 데이터를 수집합니다', icon: '/3d/api.svg' },
            { label: '주변 실거래가 수집', desc: '인근 지역의 최근 거래 정보를 필터링합니다', icon: '/3d/sil.svg' },
            { label: '공시가격 조회', desc: '연도별 공시지가 및 주택가격을 확인합니다', icon: '/3d/gong.svg' },
            { label: '인허가/규제 확인', desc: '토지이용계획 및 개발 행위 제한 사항을 검토합니다', icon: '/3d/inhuga.svg' },
            { label: '인구/통계 데이터 수집', desc: '지역 인구 이동 및 상권 활성도를 분석합니다', icon: '/3d/ingu.svg' },
            { label: '기초 데이터 조립', desc: '수집된 모든 데이터를 분석용 리포트로 구성합니다', icon: '/3d/gicho.svg' },
            { label: '수집 완료', desc: '데이터 수집이 완료되었습니다. 상세 페이지로 이동합니다', icon: '/3d/suzip.svg' },
        ];
        const activeStep = Math.min(7, Math.floor(collectElapsed / 5));

        return (
            <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4 text-white">
                <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-white/5 p-6 rounded-3xl shadow-2xl relative overflow-hidden animate-fade-in">
                    {/* Gradient highlight */}
                    <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />

                    <div className="flex flex-col items-center gap-4 relative z-10">
                        {/* Premium pulse radar */}
                        <div className="relative w-16 h-16 mb-1 flex items-center justify-center">
                            <div className="absolute inset-0 border-2 border-dashed border-sky-500/20 rounded-full animate-spin duration-[10s]" />
                            <div className="absolute inset-2 border border-sky-500/40 rounded-full animate-ping duration-[2s]" />
                            <div className="w-12 h-12 bg-sky-500/10 rounded-full flex items-center justify-center border border-sky-500/20 shadow-inner">
                                <Search className="w-5 h-5 text-sky-400 animate-pulse" />
                            </div>
                        </div>

                        <div className="text-center w-full">
                            <h2 className="text-lg font-bold text-white mb-1">공공데이터 수집 및 분석 중</h2>
                            <p className="text-slate-400 text-xs mb-6 animate-pulse font-medium">
                                최신 정부 부처 및 지자체 API에서 실시간 조회 중... ({collectElapsed}초 경과)
                            </p>

                            {/* Checklist steps */}
                            <div className="space-y-2 text-left border-t border-white/5 pt-4 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                                {collectSteps.map((step, idx) => {
                                    const isDone = idx < activeStep;
                                    const isActive = idx === activeStep;

                                    return (
                                        <div
                                            key={idx}
                                            className={`flex items-center gap-3 transition-all duration-300 p-2 rounded-xl ${isActive ? 'bg-sky-500/5 border border-sky-500/10' : 'opacity-60'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDone ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                isActive ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 animate-pulse' :
                                                    'bg-slate-800 text-slate-500 border border-slate-700'
                                                }`}>
                                                {isDone ? (
                                                    <CheckCircle2 className="w-4 h-4" />
                                                ) : (
                                                    <img
                                                        src={step.icon}
                                                        alt={step.label}
                                                        className={`w-5 h-5 object-contain ${isActive ? 'animate-bounce' : ''}`}
                                                    />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs font-bold ${isDone ? 'text-emerald-400/90' :
                                                    isActive ? 'text-white' : 'text-slate-400'
                                                    }`}>
                                                    {step.label}
                                                </p>
                                                <p className="text-[10px] text-slate-400/80 mt-0.5 font-medium truncate">
                                                    {step.desc}
                                                </p>
                                                {isActive && (
                                                    <p className="text-[9px] text-sky-400 animate-pulse mt-0.5 font-bold">
                                                        연동 패킷 전송 및 정밀 분석 중...
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* "Check later in My History" buttons */}
                            <div className="mt-6 pt-4 border-t border-white/5 w-full flex flex-col gap-2.5">
                                <button
                                    onClick={() => router.push('/profile')}
                                    className="w-full py-3.5 bg-sky-500 hover:bg-sky-400 text-[#0a0a0c] font-extrabold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(14,165,233,0.15)] active:scale-[0.98]"
                                >
                                    <Clock className="w-4 h-4" /> 내 기록에서 나중에 확인하기
                                </button>
                                <button
                                    onClick={goBack}
                                    className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 border border-white/5 active:scale-[0.98]"
                                >
                                    뒤로 가기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }


    if (error || !analysisData) {
        return (
            <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl"
                >
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">분석 리포트 로드 실패</h2>
                    <p className="text-slate-400 mb-8">{error || '분석 결과를 찾을 수 없습니다.'}</p>
                    <button
                        onClick={goBack}
                        className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> {backLabel}
                    </button>
                </motion.div>
            </div>
        );
    }

    if (shortsCapture) {
        if (shortsTokenExpected && shortsTokenParam !== shortsTokenExpected) {
            return (
                <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-6">
                    <div className="max-w-md w-full text-center p-8 rounded-3xl border border-white/10 bg-[#13131a]">
                        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-4" />
                        <h2 className="text-lg font-bold text-white mb-2">쇼츠 캡처 접근 불가</h2>
                        <p className="text-white/50 text-sm">유효한 캡처 토큰이 필요합니다.</p>
                    </div>
                </div>
            );
        }

        const shortsLat = report?.lat ?? mergedData?.lat ?? mergedData?.coordinates?.lat;
        const shortsLng = report?.lng ?? mergedData?.lng ?? mergedData?.coordinates?.lng;
        const shortsAddress = report?.address || mergedData?.address || mergedData?.location?.address;

        return (
            <div className="min-h-screen bg-[#0a0a0c]">
                <ShortsFrameView
                    ai={reportData || analysisData || {}}
                    mergedData={mergedData}
                    category={report?.category || analysisData?.category}
                    lat={shortsLat}
                    lng={shortsLng}
                    address={shortsAddress}
                    analyzeId={Array.isArray(id) ? id[0] : id}
                    showVideoStudio={isAdmin}
                    onClose={handleShortsClose}
                    getShortsTabHref={buildShortsHref}
                />
            </div>
        );
    }

    if (cafeExport) {
        if (!reportData || !aiReportCopyText) {
            return (
                <div
                    data-cafe-export-ready="true"
                    data-cafe-export-error="no-report"
                    className="min-h-screen bg-[#0a0a0c] p-4 text-white/50 text-sm"
                >
                    AI 리포트 데이터 없음
                </div>
            );
        }
        return (
            <pre
                data-ai-report-copy
                data-cafe-export-ready="true"
                className="m-0 p-4 whitespace-pre-wrap text-sm text-white bg-[#0a0a0c]"
            >
                {aiReportCopyText}
            </pre>
        );
    }

    const aiAnalysisStatus = report?.ai_analysis_status || analysisData?.ai_analysis_status || '';
    const aiTradeDataAvailable = isApartmentAiTradeDataAvailable(analysisData);
    const showAiBottomBar =
        aiAnalysisStatus !== 'completed' &&
        aiTradeDataAvailable &&
        !isAiAnalyzing &&
        !isInputModalOpen &&
        !isPaymentModalOpen;

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-sky-500/30">
            <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
            {/* 고정 배경 효과 */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-sky-500/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/5 blur-[120px] rounded-full"></div>
            </div>

            {/* 상단 네비게이션 */}
            <nav className="sticky top-0 z-50 bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between">
                    {!embeddedInApartment ? (
                    <button
                        onClick={goBack}
                        className="group flex items-center gap-3 text-slate-400 hover:text-white transition-all"
                    >
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-105 transition-all">
                            <ArrowLeft className="w-5 h-5" />
                        </div>
                        <span className="hidden md:inline font-bold">{backLabel}</span>
                    </button>
                    ) : (
                        <button
                            type="button"
                            onClick={goBack}
                            className="group flex items-center gap-2 text-slate-400 hover:text-white transition-all min-w-0"
                        >
                            <div className="w-10 h-10 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10">
                                <ArrowLeft className="w-5 h-5" />
                            </div>
                            <span className="hidden sm:block text-sm font-bold truncate max-w-[140px] md:max-w-[240px]">
                                {embeddedAptName}
                            </span>
                        </button>
                    )}

                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                            onClick={toggleFavorite}
                            className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all shrink-0 ${isFavorited ? 'bg-red-500/20 border-red-500/50 text-red-500' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                        >
                            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                        </button>
                        <button
                            type="button"
                            onClick={handleShare}
                            title="공유"
                            className="w-9 h-9 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all shrink-0 overflow-hidden"
                        >
                            <img src="/high/SHARE.png" alt="공유" className="w-5 h-5 object-contain shrink-0" />
                        </button>
                        {(() => {
                            const navPnu = report?.pnu || rawData?.pnu || mergedData?.pnu || '';
                            const navAddress = report?.address || '';
                            const eumLandDetUrl = navPnu ? getEumLandDetUrl(navPnu) : null;
                            const eumMapDetUrl = navPnu ? `https://www.eum.go.kr/web/mp/mpMapDet.jsp?detType=luLand&pnu=${navPnu}` : null;
                            const naverMapUrl = navAddress ? `https://map.naver.com/p/search/${encodeURIComponent(navAddress)}` : null;
                            const kakaoMapUrl = navAddress ? `https://map.kakao.com/?q=${encodeURIComponent(navAddress)}` : null;

                            return (
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsMapDropdownOpen(!isMapDropdownOpen)}
                                        title="이음"
                                        className="w-9 h-9 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all shrink-0 cursor-pointer overflow-hidden"
                                    >
                                        <img src="/high/DATA.png" alt="이음" className="w-5 h-5 object-contain shrink-0" />
                                    </button>
                                    {isMapDropdownOpen && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-10"
                                                onClick={() => setIsMapDropdownOpen(false)}
                                            />
                                            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0f172a]/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl p-2 z-20 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                                {eumLandDetUrl && (
                                                    <a
                                                        href={eumLandDetUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
                                                        onClick={() => setIsMapDropdownOpen(false)}
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                                                        토지이음 (지적도 열람)
                                                    </a>
                                                )}
                                                {eumMapDetUrl && (
                                                    <a
                                                        href={eumMapDetUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
                                                        onClick={() => setIsMapDropdownOpen(false)}
                                                    >
                                                        <Map className="w-3.5 h-3.5 text-emerald-400" />
                                                        국가지도 (이음지도 이동)
                                                    </a>
                                                )}
                                                {naverMapUrl && (
                                                    <a
                                                        href={naverMapUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
                                                        onClick={() => setIsMapDropdownOpen(false)}
                                                    >
                                                        <span className="w-3.5 h-3.5 font-black text-[10px] text-green-400 border border-green-500/30 rounded flex items-center justify-center bg-green-500/10 shrink-0">N</span>
                                                        네이버 지도 열람
                                                    </a>
                                                )}
                                                {kakaoMapUrl && (
                                                    <a
                                                        href={kakaoMapUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
                                                        onClick={() => setIsMapDropdownOpen(false)}
                                                    >
                                                        <span className="w-3.5 h-3.5 font-black text-[10px] text-yellow-400 border border-yellow-500/30 rounded flex items-center justify-center bg-yellow-500/10 shrink-0">K</span>
                                                        카카오 맵 열람
                                                    </a>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })()}
                        <button
                            type="button"
                            onClick={() => setIsAiReportCopyOpen(true)}
                            disabled={!aiReportCopyText}
                            title="리포트"
                            className="w-9 h-9 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/5 overflow-hidden"
                        >
                            <img src="/high/DAUN.png" alt="리포트" className="w-5 h-5 object-contain shrink-0" />
                        </button>
                        {isApartment && naverKeyword && (
                            <a
                                href={`https://new.land.naver.com/?keyword=${encodeURIComponent(naverKeyword)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="네이버 부동산"
                                className="w-9 h-9 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all shrink-0 overflow-hidden"
                            >
                                <img src="/high/nav.png" alt="네이버 부동산" className="w-5 h-5 object-contain" />
                            </a>
                        )}
                        <Link
                            replace
                            href={buildShortsHref()}
                            className="h-9 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg font-semibold text-xs whitespace-nowrap shrink-0 transition-all bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 border border-violet-400/50 text-white shadow-md shadow-violet-500/25 hover:shadow-violet-500/40 active:scale-[0.98] overflow-hidden"
                            title="카드로 보기"
                        >
                            <img src="/high/CARD.png" alt="카드" className="w-4 h-4 object-contain shrink-0" />
                            <span className="hidden sm:inline">카드</span>
                        </Link>
                        {embeddedInApartment && aiTradeDataAvailable && (
                            <button
                                type="button"
                                onClick={handleNewApartmentAnalysis}
                                title="AI 분석"
                                className="h-9 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg font-semibold text-xs whitespace-nowrap shrink-0 transition-all bg-emerald-500 hover:bg-emerald-400 text-white shadow-md shadow-emerald-500/20 active:scale-[0.98] overflow-hidden"
                            >
                                <img src="/high/AI.png" alt="" className="w-4 h-4 object-contain shrink-0" />
                                <span className="hidden sm:inline">AI 분석</span>
                            </button>
                        )}
                        {/* <button
                            onClick={handleAiAnalysisClick}
                            disabled={isCheckingAccess}
                            className="bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2"
                        >
                            {isCheckingAccess ? (
                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>확인 중...</span></>
                            ) : (
                                <><span>AI 분석</span></>
                            )}
                        </button> */}
                    </div>
                </div>
            </nav>

            <main className={`relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-2.5 pb-8 sm:pb-12 ${showAiBottomBar ? 'pb-28' : ''}`}>

                {!aiTradeDataAvailable && hasRawData && isApartment && (
                    <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90 font-medium">
                        해당 단지의 최근 실거래가 데이터가 없어 AI 분석은 이용할 수 없습니다. 건축물대장·학군·공시지가 등 공공데이터는 확인할 수 있습니다.
                    </div>
                )}

                {/* 헤더: 매물 대시보드 */}
                <header className={`-mx-2 sm:mx-0 mt-0.5 ${isMapCollapsed ? "mb-4" : "mb-8"}`}>
                    {/* 매물 정보 — 지도 밖 항상 표시 (UX + JS 크롤러 보조) */}
                    <div className="mb-3 sm:mb-4 p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] border border-white/[0.08] bg-[#0f172a]/50">
                        <div className="flex flex-wrap items-center gap-2 mb-2.5">
                            <span className="inline-flex px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-semibold rounded">
                                분석 #{String(report?.id || id || '').substring(0, 6).toUpperCase()}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold rounded">
                                <Building2 className="w-3 h-3 text-emerald-400" />
                                {report?.category === 'land' ? '토지' : report?.category === 'apartment' ? '아파트' : report?.category === 'house' ? '주택' : '상가'}
                            </span>
                            {(reportData?.analysisMetadata?.comparables?.length > 0
                                || analysisData?.analysisMetadata?.comparables?.length > 0) && (
                                    <button
                                        type="button"
                                        onClick={() => setIsMapModalOpen(true)}
                                        className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 rounded text-[10px] font-bold text-sky-400 transition-colors cursor-pointer"
                                    >
                                        <Map className="w-3.5 h-3.5 text-sky-400" />
                                        지도
                                    </button>
                                )}
                            {isApartment && naverKeyword && (
                                <a
                                    href={`https://new.land.naver.com/?keyword=${encodeURIComponent(naverKeyword)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 rounded text-[10px] font-bold text-green-400 transition-colors cursor-pointer"
                                >
                                    <ExternalLink className="w-3 h-3 text-green-400" />
                                    네이버부동산
                                </a>
                            )}
                            {isApartment && sigunguCd && sigunguName && (
                                <Link
                                    href={`/ranking?rankingType=apartment&sigunguCd=${sigunguCd}&sigunguName=${encodeURIComponent(sigunguName)}`}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 rounded text-[10px] font-bold text-indigo-400 transition-colors cursor-pointer"
                                >
                                    <TrendingUp className="w-3 h-3 text-indigo-400" />
                                    '{sigunguName}' 랭킹
                                </Link>
                            )}
                        </div>
                        <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                            {reportData?.propertyTitle || report?.address || mergedData?.address || '매물 상세'}
                        </h1>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: -12 }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            height: isMapCollapsed ? '0px' : (isMobile ? '320px' : '400px')
                        }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="relative overflow-hidden rounded-[20px] sm:rounded-[32px] border border-white/[0.08] bg-[#0f172a]/50 animate-in duration-300"
                    >
                        {/* 지도가 존재하는 경우 렌더링 */}
                        {(mapDataForHeader?.target?.lat && mapDataForHeader?.target?.lng) ? (
                            <ComparableMap
                                mapData={mapDataForHeader}
                                category={report?.category}
                                className="w-full h-full"
                                onToggleFullscreen={() => setIsMapModalOpen(true)}
                                draggable={false}
                                isCollapsed={isMapCollapsed}
                                targetArea={(() => {
                                    let targetArea = 0;
                                    if (mapDataForHeader && mapDataForHeader.target) {
                                        const t = mapDataForHeader.target;
                                        const directTargetArea = mapDataForHeader.targetArea !== undefined && mapDataForHeader.targetArea !== null
                                            ? parseFloat(mapDataForHeader.targetArea.toString())
                                            : null;
                                        if (directTargetArea !== null && directTargetArea > 0) {
                                            targetArea = directTargetArea;
                                        } else if (report?.category === 'building' || report?.category === '빌딩') {
                                            targetArea = parseFloat(t.totalArea_sqm || mergedData?.totalArea_sqm || t.area_sqm || mergedData?.area || '0');
                                        } else if (report?.category === 'apartment' || report?.category === '아파트') {
                                            targetArea = parseFloat(t.area_sqm || t.exclusiveArea_sqm || t.land?.area_sqm || mergedData?.area || mergedData?.exclusiveArea_sqm || mergedData?.area_sqm || '0');
                                        } else {
                                            targetArea = parseFloat(t.area_sqm || t.land?.area_sqm || mergedData?.area || mergedData?.area_sqm || '0');
                                        }
                                    }
                                    return targetArea;
                                })()}
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-sm p-6 text-center">
                                {(() => {
                                    const rawDate = report?.created_at || report?.createdAt || mergedData?.created_at || mergedData?.createdAt;
                                    let isBeforeJune15 = false;
                                    if (rawDate) {
                                        try {
                                            const d = new Date(rawDate);
                                            const threshold = new Date('2026-06-15');
                                            isBeforeJune15 = d < threshold;
                                        } catch (e) { }
                                    }
                                    if (isBeforeJune15) {
                                        return <span>6월 15일 이전 게시물에서는 상단 이음지도를 이용해 주세요</span>;
                                    }
                                    return <span>지도 데이터를 불러올 수 없습니다.</span>;
                                })()}
                            </div>
                        )}

                        {/* 지도 접기 버튼 (열려있을 때만 노출) */}
                        {!isMapCollapsed && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsMapCollapsed(true);
                                    isMapManuallyToggledRef.current = true;
                                }}
                                className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white text-xs font-bold rounded-full border border-white/10 shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                                지도 접기
                            </button>
                        )}
                    </motion.div>

                    {/* 완전히 접혀있을 때 대신 나타나는 얇은 지도 펼치기 바 */}
                    {isMapCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full"
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    setIsMapCollapsed(false);
                                    isMapManuallyToggledRef.current = true;
                                }}
                                className="w-full py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-black tracking-wide flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                            >
                                <span className="truncate max-w-[calc(100%-2rem)]">
                                    {reportData?.propertyTitle || report?.address || '매물'} 분석 지도 펼쳐보기
                                </span>
                                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                            </button>
                        </motion.div>
                    )}
                </header>

                {/* 탭 스크롤 앵커 (sticky 탭 바 위 — scrollIntoView 기준점) */}
                <div ref={tabScrollAnchorRef} className="scroll-mt-[88px] h-0 w-full" aria-hidden="true" />

                {/* 탭 네비게이션 (가로 스크롤) */}
                <div
                    className="sticky top-[80px] z-40 bg-[#0f172a]/70 backdrop-blur-xl border border-white/[0.08] rounded-2xl sm:rounded-3xl px-4 sm:px-5 py-3 mb-8 min-w-0 shadow-lg shadow-black/25"
                >
                    <div
                        ref={tabScrollRef}
                        className="flex flex-nowrap items-center justify-start gap-1.5 overflow-x-auto tab-scrollbar scroll-smooth w-full min-w-0 pb-1"
                    >
                        {(() => {
                            const isCompleted = isAiAnalysisCompleted(analysisData);
                            const category = report?.category || '';
                            const lower = category.toLowerCase().trim();

                            let baseTabs = [];
                            if (lower === 'apartment' || lower === '아파트') {
                                baseTabs = [
                                    { id: 'report', label: '탐정 요약' },
                                    { id: 'ten_year_story', label: '10년스토리' },
                                    { id: 'school', label: '학군' },
                                    { id: 'r_one', label: '부동산원' },
                                    { id: 'market', label: '실거래가' },
                                    { id: 'additional_info', label: '조례·동향·공급' },
                                    { id: 'amenities', label: '주변 시설' },
                                    { id: 'population', label: '인구 현황' },
                                    { id: 'building', label: '건축물대장' },
                                    { id: 'regulatory', label: '개발 공고' },
                                    { id: 'gosi', label: '고시 공고' },
                                    { id: 'price', label: '공시지가' },
                                    { id: 'commercial', label: '상권 분석' },
                                    { id: 'land', label: '토지 이음' },
                                ];
                            } else if (lower === 'store' || lower === '상가' || lower === '상업용' || lower === '상업' || lower === 'shop' || lower === 'commercial') {
                                baseTabs = [
                                    { id: 'report', label: '탐정 요약' },
                                    { id: 'r_one', label: '부동산원' },
                                    { id: 'market', label: '실거래가' },
                                    { id: 'additional_info', label: '조례·동향·공급' },
                                    { id: 'amenities', label: '주변 시설' },
                                    { id: 'population', label: '인구 현황' },
                                    { id: 'school', label: '학군' },
                                    { id: 'building', label: '건축물대장' },
                                    { id: 'regulatory', label: '개발 공고' },
                                    { id: 'gosi', label: '고시 공고' },
                                    { id: 'price', label: '공시지가' },
                                    { id: 'commercial', label: '상권 분석' },
                                    { id: 'land', label: '토지 이음' },
                                ];
                            } else {
                                baseTabs = [
                                    { id: 'report', label: '탐정 요약' },
                                    { id: 'land', label: '토지 이음' },
                                    { id: 'building', label: '건축물대장' },
                                    { id: 'r_one', label: '부동산원' },
                                    { id: 'price', label: '공시지가' },
                                    { id: 'market', label: '실거래가' },
                                    { id: 'additional_info', label: '조례·동향·공급' },
                                    { id: 'gosi', label: '고시 공고' },
                                    { id: 'regulatory', label: '개발 공고' },
                                    { id: 'commercial', label: '상권 분석' },
                                    { id: 'population', label: '인구 현황' },
                                    { id: 'school', label: '학군' },
                                    { id: 'amenities', label: '주변 시설' },
                                ];
                            }

                            const tabList = [
                                ...(isCompleted ? [{ id: 'ai_report', label: 'AI 분석' }] : []),
                                ...baseTabs
                            ];
                            return tabList.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        data-tab-id={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`shrink-0 h-10 px-4 py-2 rounded-xl text-sm transition-all whitespace-nowrap border flex items-center justify-center ${isActive
                                            ? 'bg-sky-500/15 border-sky-400/30 text-sky-300 font-semibold'
                                            : 'bg-transparent border-transparent text-white/45 hover:text-white/80 hover:bg-white/[0.04] font-medium'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            });
                        })()}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'report' && (
                        <motion.div
                            key="report"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-8"
                        >
                            <DetectiveSummaryView
                                rawData={mergedData}
                                category={report?.category || analysisData?.category}
                            />
                        </motion.div>
                    )}
                    {activeTab === 'ten_year_story' && isApartmentCategory && (
                        <motion.div
                            key="ten_year_story"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6 w-full mx-auto"
                        >
                            {tenYearStoryChart.hasChart ? (
                                <section className="w-full py-3 sm:p-8 bg-slate-900 border border-white/5 rounded-[24px] sm:rounded-[40px] shadow-2xl space-y-4 sm:space-y-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-white/[0.06] pb-3 sm:pb-4 text-center sm:text-left">
                                        <div className="flex items-center justify-center sm:justify-start gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-sky-500/10 border border-sky-500/20 shrink-0">
                                                <TrendingUp className="w-5 h-5 text-sky-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">단지 시세 변동</span>
                                                <h4 className="text-base sm:text-lg font-bold text-white/90 truncate">{tenYearStoryChart.complexName} · 10년 실거래 시세 추이</h4>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 p-1 bg-white/[0.02] border border-white/5 rounded-2xl w-full sm:w-auto">
                                            {tenYearStoryChart.uniqueAreas.map((area: number) => {
                                                const isSelected = tenYearStoryChart.activeArea === area;
                                                return (
                                                    <button
                                                        key={area}
                                                        onClick={() => setSelectedQuarterlyArea(area)}
                                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all duration-300 ${isSelected
                                                            ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                                                            : 'text-slate-400 hover:text-slate-200'
                                                            }`}
                                                    >
                                                        전용 {area}㎡
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="h-[340px] sm:h-[320px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={tenYearStoryChart.chartData} margin={{ top: 16, right: 8, left: 4, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                                <XAxis
                                                    dataKey="name"
                                                    stroke="#475569"
                                                    fontSize={10}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    dy={8}
                                                />
                                                <YAxis
                                                    stroke="#475569"
                                                    fontSize={10}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tickFormatter={(val: number) => {
                                                        if (val == null) return '';
                                                        if (val >= 10000) {
                                                            const eok = val / 10000;
                                                            return eok % 1 === 0 ? `${eok}억` : `${eok.toFixed(1)}억`;
                                                        }
                                                        return `${val.toLocaleString()}만`;
                                                    }}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#111114',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        borderRadius: '16px',
                                                        fontSize: '11px',
                                                    }}
                                                    labelFormatter={(label) => `${label} 평균 시세`}
                                                    formatter={(val: any, name: any) => {
                                                        const label = name === 'sale' ? '매매' : name === 'charter' ? '전세' : '월세 보증금';
                                                        const num = Number(val);
                                                        if (num >= 10000) {
                                                            const eok = num / 10000;
                                                            const formatted = eok % 1 === 0 ? `${eok}억` : `${eok.toFixed(1)}억`;
                                                            return [formatted, label];
                                                        }
                                                        return [`${num.toLocaleString()}만`, label];
                                                    }}
                                                />
                                                <Legend
                                                    verticalAlign="top"
                                                    align="right"
                                                    iconType="circle"
                                                    iconSize={8}
                                                    wrapperStyle={{ fontSize: '11px', paddingBottom: '16px' }}
                                                    formatter={(value) => {
                                                        const label = value === 'sale' ? '매매' : value === 'charter' ? '전세' : '월세 보증금';
                                                        return <span className="text-slate-400 font-semibold">{label}</span>;
                                                    }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="sale"
                                                    name="sale"
                                                    stroke="#0ea5e9"
                                                    strokeWidth={3}
                                                    dot={false}
                                                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                                                    connectNulls
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="charter"
                                                    name="charter"
                                                    stroke="#10b981"
                                                    strokeWidth={3}
                                                    dot={false}
                                                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                                                    connectNulls
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="rent"
                                                    name="rent"
                                                    stroke="#f59e0b"
                                                    strokeWidth={2}
                                                    strokeDasharray="4 4"
                                                    dot={false}
                                                    activeDot={{ r: 5, strokeWidth: 1.5, stroke: '#fff' }}
                                                    connectNulls
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </section>
                            ) : (
                                <section className="w-full py-8 sm:p-12 bg-slate-900 border border-white/5 rounded-[24px] sm:rounded-[40px] shadow-2xl text-center">
                                    <TrendingUp className="w-10 h-10 text-slate-600 mx-auto mb-4" />
                                    <h4 className="text-lg font-bold text-white/90 mb-2">10년 실거래 시세 데이터 준비 중</h4>
                                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                                        {tenYearStoryChart.complexName}의 분기별 시세가 수집·매칭되면 위에 10년 추이 차트가 표시됩니다.
                                    </p>
                                </section>
                            )}

                            {tenYearStoryChart.hasChart && (
                                <ApartmentTenYearNarrative
                                    chartData={tenYearStoryChart.chartData}
                                    complexName={tenYearStoryChart.complexName}
                                    exclusiveArea={tenYearStoryChart.activeArea}
                                />
                            )}

                            <ApartmentTenYearTimeline
                                chartData={tenYearStoryChart.chartData}
                                complexName={tenYearStoryChart.complexName}
                                uniqueAreas={tenYearStoryChart.uniqueAreas}
                                activeArea={tenYearStoryChart.activeArea}
                                onAreaChange={setSelectedQuarterlyArea}
                                address={
                                    report?.address
                                    || mergedData?.address
                                    || rawData?.targetComplexInfo?.address
                                    || mergedData?.location?.address
                                }
                                sido={report?.sido || mergedData?.sido || rawData?.sido}
                                outlookContext={tenYearOutlookContext}
                                aiTimeline={reportData?.tenYearMarketTimeline}
                                aiTopKeywords={reportData?.tenYearMarketKeywords}
                                reportId={id}
                                showProTestButton={isAdmin}
                                getAuthToken={async () => (user ? user.getIdToken() : null)}
                                onTenYearSaved={() => fetchAnalysis(true)}
                            />
                        </motion.div>
                    )}
                    {activeTab === 'ai_report' && (
                        <motion.div
                            key="ai_report"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-8"
                        >
                            {embeddedInApartment && (
                                <section className="rounded-[24px] border border-white/[0.08] bg-[#0f172a]/60 p-4 sm:p-5">
                                    <div className="flex items-center justify-between gap-3 mb-4">
                                        <div>
                                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">AI 분석 이력</p>
                                            <h2 className="text-sm sm:text-base font-black text-white mt-1">{embeddedAptName}</h2>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[11px] font-bold text-slate-400">
                                                {embeddedApartmentReports.length}건
                                            </span>
                                            {aiTradeDataAvailable && (
                                                <button
                                                    type="button"
                                                    onClick={handleNewApartmentAnalysis}
                                                    className="h-8 inline-flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98]"
                                                >
                                                    <img src="/high/AI.png" alt="" className="w-4 h-4 object-contain shrink-0" />
                                                    <span>AI 분석</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {embeddedApartmentReports.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center">
                                            <p className="text-sm text-slate-400 mb-3">AI 완료된 분석이 없습니다.</p>
                                            {aiTradeDataAvailable ? (
                                                <button
                                                    type="button"
                                                    onClick={handleNewApartmentAnalysis}
                                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition-all"
                                                >
                                                    <Sparkles className="w-4 h-4" />
                                                    AI 새로 분석하기
                                                </button>
                                            ) : (
                                                <p className="text-sm text-amber-400/90 font-medium">{NO_TRADE_DATA_AI_MESSAGE}</p>
                                            )}
                                        </div>
                                    ) : (
                                    <div className="space-y-2">
                                        {embeddedApartmentReports.map((item) => {
                                            const selected = item.id === embeddedSelectedReportId;
                                            const areaLabel = item.area != null ? `${item.area}㎡` : '면적 미입력';
                                            const dateLabel = formatEmbeddedReportDate(item.createdAt);
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => setHistoryModalReport(item)}
                                                    className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${
                                                        selected
                                                            ? 'border-emerald-400/60 bg-emerald-500/10'
                                                            : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-black text-white truncate">
                                                                {areaLabel}
                                                                {dateLabel ? ` · ${dateLabel}` : ''}
                                                            </p>
                                                            <p className="text-xs font-bold text-slate-400 mt-1">
                                                                {formatEmbeddedReportPrice(item)}
                                                            </p>
                                                        </div>
                                                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black border text-emerald-300 border-emerald-500/30 bg-emerald-500/10">
                                                            AI 완료
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    )}
                                </section>
                            )}
                            <AiReportView
                                ai={reportData || {}}
                                mergedData={mergedData}
                                analysisMetadata={analysisData?.analysisMetadata || reportData?.analysisMetadata}
                                onTriggerAnalysis={handleAiAnalysisClick}
                                isCheckingAccess={isCheckingAccess}
                            />
                        </motion.div>
                    )}
                    {activeTab === 'school' && (
                        <motion.div
                            key="school"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-8"
                        >
                            <SchoolDistrictTab lat={report?.lat ?? mergedData?.lat ?? mergedData?.coordinates?.lat} lng={report?.lng ?? mergedData?.lng ?? mergedData?.coordinates?.lng} />
                        </motion.div>
                    )}
                    {activeTab === 'land' && (
                        <motion.div key="land" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                            {(() => {
                                const multiPnu = rawData?.vitals?.multiPnu;
                                const isMulti = multiPnu && multiPnu.parcelCount > 1;
                                const primaryLandData = rawData?.vitals?.land?.characteristics;

                                if (!primaryLandData && !isMulti) {
                                    return <div className="p-20 text-center text-slate-500">토지 데이터가 제공되지 않았습니다. 관련 지자체 문의</div>;
                                }

                                const parcelsToRender = isMulti ? (multiPnu.parcels || []) : [primaryLandData];

                                return (
                                    <>
                                        {isMulti && (
                                            <div className="text-sky-500 font-black text-lg">
                                                총 {multiPnu.parcelCount}개 필지 정보
                                            </div>
                                        )}
                                        {parcelsToRender.map((parcel: any, idx: number) => {
                                            const pnu = parcel.pnu || '';
                                            const isPrimary = !isMulti || parcel.isPrimary;
                                            const usagePlans = parcel?.usagePlansIncluded || primaryLandData?.usagePlansIncluded || [];

                                            let officialLandPriceRaw = [];
                                            if (isMulti && parcel?.landPriceHistory) {
                                                officialLandPriceRaw = Object.entries(parcel.landPriceHistory).map(([year, price]) => ({ year, price }));
                                            } else {
                                                const list = rawData?.officialLandPrice ||
                                                    rawData?.vitals?.officialLandPrice ||
                                                    rawData?.vitals?.land?.officialLandPrice ||
                                                    rawData?.vitals?.officialPrice ||
                                                    [];
                                                officialLandPriceRaw = list.map((item: any) => {
                                                    const year = item.year || item.stdrYear || '';
                                                    const price = item.price !== undefined ? item.price : (item.pblntfPclnd || item.housePc || 0);
                                                    return { year, price };
                                                });
                                            }

                                            const officialLandPrice = [...officialLandPriceRaw]
                                                .filter((d: any) => d.year)
                                                .sort((a: any, b: any) => String(a.year).localeCompare(String(b.year)));

                                            return (
                                                <div key={idx} className="space-y-8 pb-12 mb-12 border-b border-white/5 last:border-0 last:pb-0 last:mb-0">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-3">
                                                                <h3 className="text-2xl font-black">토지 상세지표 {isMulti ? `(${idx + 1})` : ''}</h3>
                                                                {pnu && (
                                                                    <a
                                                                        href={getEumLandDetUrl(pnu) || '#'}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 hover:text-sky-300 rounded-lg text-xs font-black transition-all shrink-0 cursor-pointer"
                                                                    >
                                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                                        토지이음 열람
                                                                    </a>
                                                                )}
                                                            </div>
                                                            {pnu && <p className="text-slate-500 text-xs mt-1 font-mono uppercase tracking-widest">PNU: {pnu}</p>}
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-900/80 border border-white/[0.06] rounded-[32px] overflow-hidden">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.04]">
                                                            {[
                                                                { label: '지목', value: parcel.jimok },
                                                                {
                                                                    label: '면적',
                                                                    value: report.area && isPrimary ? (
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sky-400">{formatSqmWithPyeong(report.area)} (입력)</span>
                                                                            {parcel.area && report.area !== parcel.area && (
                                                                                <span className="text-xs text-slate-500 font-normal">토지이음: {formatSqmWithPyeong(parcel.area)}</span>
                                                                            )}
                                                                        </div>
                                                                    ) : formatSqmWithPyeong(parcel.area)
                                                                },
                                                                { label: '용도지역', value: parcel.zoning },
                                                                { label: '이용상황', value: parcel.landUse },
                                                                { label: '지형지세', value: parcel.topography },
                                                                { label: '도로접면', value: parcel.roadConnection },
                                                                { label: '형상', value: parcel.landShape },
                                                                {
                                                                    label: '공시지가',
                                                                    value: formatOfficialLandPrice(
                                                                        parcel.pnuPrice || parcel.latestOfficialPrice || (officialLandPrice.length > 0 ? officialLandPrice[officialLandPrice.length - 1].price : 0),
                                                                    ),
                                                                },
                                                            ].map((item, i) => (
                                                                <div key={i} className="bg-[#0a0a0c] p-5 lg:p-6">
                                                                    <p className="text-[11px] text-white/40 font-medium mb-1.5">{item.label}</p>
                                                                    <div className="text-base lg:text-lg font-semibold text-white">{item.value || '정보없음'}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {/* 용도구역 및 규제사항 */}
                                                        <div className="px-5 py-6 lg:px-6 lg:py-7 border-t border-white/[0.06]">
                                                            <p className="text-xs font-semibold text-white/45 mb-4">용도구역 및 규제사항</p>

                                                            {(() => {
                                                                const hasCriticalRegulation = usagePlans.some((p: string) =>
                                                                    p.includes('개발제한구역') || p.includes('시가화조정구역') || p.includes('토지거래허가구역')
                                                                );
                                                                if (!hasCriticalRegulation) return null;
                                                                return (
                                                                    <div className="mb-4 p-4 bg-amber-500/[0.06] border border-amber-400/15 rounded-2xl flex gap-3 items-start">
                                                                        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                                                        <div className="space-y-1">
                                                                            <p className="text-xs font-semibold text-amber-300/90">강력 규제 구역 안내</p>
                                                                            <p className="text-[11px] text-white/55 leading-relaxed">
                                                                                개발제한구역, 시가화조정구역, 토지거래허가구역 등은 일반 용도지역보다 개발 및 매매 거래에 추가 제한이 적용됩니다. 실매입 전 지자체 인허가 사전 문의를 권장합니다.
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}

                                                            <div className="flex flex-wrap gap-2">
                                                                {usagePlans?.length ? usagePlans.map((plan: string, i: number) => {
                                                                    const isRegulated = plan.includes('허가') || plan.includes('제한') || plan.includes('억제') || plan.includes('보호') || plan.includes('관리');
                                                                    return (
                                                                        <span
                                                                            key={i}
                                                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${isRegulated
                                                                                ? 'bg-amber-500/[0.08] border-amber-400/20 text-amber-200/90'
                                                                                : 'bg-white/[0.04] border-white/[0.08] text-white/70'
                                                                                }`}
                                                                        >
                                                                            {plan}
                                                                        </span>
                                                                    );
                                                                }) : (
                                                                    <span className="text-sm text-white/40">규제 정보 없음</span>
                                                                )}
                                                            </div>

                                                            <p className="mt-4 text-[10px] text-white/35 leading-relaxed">
                                                                * 정확한 건축 가부는 해당 지자체 조례 및 건축과 확인이 필요합니다.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* 토지 입지 및 형상 분석 요약 */}
                                                    {(() => {
                                                        const formatKoreanCurrency = (val: number) => {
                                                            if (val === 0) return '0';
                                                            if (val >= 100000000) {
                                                                return `${(val / 100000000).toLocaleString(undefined, { maximumFractionDigits: 2 })}억`;
                                                            } else if (val >= 10000) {
                                                                return `${Math.round(val / 10000).toLocaleString()}만`;
                                                            }
                                                            return val.toLocaleString();
                                                        };

                                                        const getRoadConnectionExplanation = (road: string) => {
                                                            if (!road || road === '정보없음') return null;
                                                            const cleanConn = road.replace(/\s+/g, '');
                                                            if (cleanConn.includes('광대로한면') || cleanConn.includes('광대한면')) {
                                                                return { title: '광대로 한 면 접함 (대형 도로)', desc: '폭 25m 이상의 넓은 도로에 한 면이 접해 있어 차량 진출입과 통행 여건이 매우 우수하며, 대형 차량의 접근성이 뛰어납니다.', badge: '광대접면', type: 'good' };
                                                            }
                                                            if (cleanConn.includes('광대로-광대로') || cleanConn.includes('광대소각') || cleanConn.includes('광대로등')) {
                                                                return { title: '광대로 및 소로 각지 (다면 접함)', desc: '폭 25m 이상 도로와 폭 8m 이상 도로의 모퉁이(각지)에 접해 있어 가시성과 교통 접근성이 매우 뛰어나며 우수한 토지 활용 가치를 제공합니다.', badge: '광대교차', type: 'good' };
                                                            }
                                                            if (cleanConn.includes('광대로-세로') || cleanConn.includes('광대세각')) {
                                                                return { title: '광대로 및 세로 접함', desc: '폭 25m 이상의 대로와 폭 8m 미만의 골목 도로에 동시 접해 있습니다. 넓은 도로의 가시성과 좁은 도로의 조용함을 겸비한 위치입니다.', badge: '대로/세로', type: 'info' };
                                                            }
                                                            if (cleanConn.includes('중로한면') || cleanConn.includes('중로')) {
                                                                return { title: '중로 한 면 접함 (중형 도로)', desc: '폭 12m~25m 미만의 도로에 한 면이 접해 있어 일반 차량의 원활한 통행과 진출입이 보장되며 양호한 주거/보행 환경을 이룹니다.', badge: '중로접면', type: 'good' };
                                                            }
                                                            if (cleanConn.includes('소로-소로') || cleanConn.includes('소로각지')) {
                                                                return { title: '소로 각지 (이면 교차)', desc: '폭 8m~12m 미만 소형 도로 두 면 이상에 접해 있는 모퉁이 필지로, 양방향 접근이 가능하여 가시성이 양호합니다.', badge: '소로각지', type: 'good' };
                                                            }
                                                            if (cleanConn.includes('소로한면') || cleanConn.includes('소로')) {
                                                                return { title: '소로 한 면 접함 (일반 도로)', desc: '폭 8m~12m 미만의 일반 소형 도로에 접하여, 소형 및 중형 차량의 양방향 통행 및 진출입이 수월합니다.', badge: '소로접면', type: 'info' };
                                                            }
                                                            if (cleanConn.includes('세로한면(가)') || cleanConn.includes('세로(가)')) {
                                                                return { title: '세로 한 면 접함 (차량 가능 골목)', desc: '차량 통행은 가능하나 도로 폭이 8m 미만으로 다소 협소합니다. 대형 차량 진입이 어려울 수 있으며 보행자/차량 이동에 주의가 요구됩니다.', badge: '차량가능 골목', type: 'warning' };
                                                            }
                                                            if (cleanConn.includes('세로-세로(가)') || cleanConn.includes('세각(가)')) {
                                                                return { title: '세각(가) (좁은 도로 각지)', desc: '폭 8m 미만의 좁은 골목길 도로 두 면 이상에 접해 있습니다. 골목길 차량 통행은 가능하나 폭이 협소하므로 통행 시 주의가 요구됩니다.', badge: '골목 각지', type: 'warning' };
                                                            }
                                                            if (cleanConn.includes('세로한면(불)') || cleanConn.includes('세로(불)')) {
                                                                return { title: '세로한면(불) (차량 진입 불가)', desc: '사람은 다닐 수 있으나 차량 통행이 불가능한 보행자용 좁은 골목에 접해 있습니다. 소방 차량 진입이나 차량 주차가 불가하므로 가치 판단에 주의가 필요합니다.', badge: '차량불가 골목', type: 'danger' };
                                                            }
                                                            if (cleanConn.includes('맹지')) {
                                                                return { title: '맹지 (접면 도로 없음)', desc: '공로(公路) 또는 통행 가능한 도로와 접해 있지 않는 필지입니다. 건축 인허가 시 인접 토지 소유주의 사용 승낙(진입로 확보) 등이 반드시 수반되어야 합니다.', badge: '맹지', type: 'danger' };
                                                            }
                                                            return null;
                                                        };

                                                        const getTopographyExplanation = (topo: string) => {
                                                            if (!topo || topo === '정보없음') return null;
                                                            const clean = topo.replace(/\s+/g, '');
                                                            if (clean.includes('평지')) {
                                                                return { title: '평지 (평탄한 지세)', desc: '간선도로나 주변 지형과 높이가 비슷한 토지로, 건축 공사 시 성토나 절토 등의 추가 토목 공사 비용이 적게 들어 대단히 경제적입니다.', badge: '평지', type: 'good' };
                                                            }
                                                            if (clean.includes('완경사')) {
                                                                return { title: '완경사 (경사 15° 이하)', desc: '주변 지형보다 높고 경사도가 15도 이하인 토지입니다. 자연 배수가 원활하고 조망 확보에 유리하며, 적절한 토목 설계를 통해 훌륭한 건축이 가능합니다.', badge: '완경사', type: 'info' };
                                                            }
                                                            if (clean.includes('급경사')) {
                                                                return { title: '급경사 (경사 15° 초과)', desc: '주변 지형보다 높고 경사도가 15도를 초과하는 토지입니다. 개발 행위 허가 및 옹벽 설치 등 추가 토목 공사 비용 부담이 비교적 크게 발생할 수 있습니다.', badge: '급경사', type: 'danger' };
                                                            }
                                                            if (clean.includes('고단')) {
                                                                return { title: '고단 (지대 높음)', desc: '주변 필지보다 지대가 높은 토지입니다. 일조권과 조망이 우수하지만 진출입로 확보 및 경사면(법면) 처리에 따른 토목 비용이 수반될 수 있습니다.', badge: '고단', type: 'info' };
                                                            }
                                                            if (clean.includes('저단')) {
                                                                return { title: '저단 (지대 낮음)', desc: '주변보다 지대가 낮은 토지입니다. 강우 시 배수 대책이 필요할 수 있으며 성토 작업이나 배수 시설 구축 등 기초 보완을 검토해야 합니다.', badge: '저단', type: 'warning' };
                                                            }
                                                            if (clean.includes('혼합')) {
                                                                return { title: '혼합 지세', desc: '한 필지 내에 평지와 완경사 등 여러 높낮이가 복합적으로 섞여 있는 지세입니다. 토지의 지세에 맞춘 입체적인 설계가 요구됩니다.', badge: '혼합', type: 'warning' };
                                                            }
                                                            return null;
                                                        };

                                                        const getLandShapeExplanation = (shape: string) => {
                                                            if (!shape || shape === '정보없음') return null;
                                                            const clean = shape.replace(/\s+/g, '');
                                                            if (clean.includes('정방형') || clean.includes('01')) {
                                                                return { title: '정방형 (정사각형)', desc: '가로·세로 비율이 1:1.1 내외인 정사각형 형태의 우수한 형상입니다. 건축 배치 및 토지의 데드 스페이스(로스율)가 거의 없어 가치가 높습니다.', badge: '정방형', type: 'good' };
                                                            }
                                                            if (clean.includes('가장형') || clean.includes('02')) {
                                                                return { title: '가장형 (가로 직사각형)', desc: '직사각형 모양 중 넓은 면이 도로에 접하거나 향하고 있는 형태입니다. 도로변 상가나 건물의 전면 가시성을 넓게 확보하기에 가장 유리합니다.', badge: '가장형', type: 'good' };
                                                            }
                                                            if (clean.includes('세장형') || clean.includes('03')) {
                                                                return { title: '세장형 (세로 직사각형)', desc: '직사각형 모양의 토지 중 좁은 면이 도로에 접하는 형태입니다. 안쪽으로 깊은 형태를 띄고 있어, 깊이감을 고려한 공간 배치 계획이 효과적입니다.', badge: '세장형', type: 'info' };
                                                            }
                                                            if (clean.includes('사다리형') || clean.includes('04') || clean.includes('사다리')) {
                                                                return { title: '사다리형 (사다리꼴)', desc: '사다리꼴 형태의 토지입니다. 비정형 모서리 부분의 가치를 극대화하기 위해 조경, 주차장 또는 독특한 건축 설계 레이아웃을 추천합니다.', badge: '사다리형', type: 'info' };
                                                            }
                                                            if (clean.includes('삼각형') || clean.includes('05')) {
                                                                if (clean.includes('역삼각형') || clean.includes('06')) {
                                                                    return { title: '역삼각형 (뾰족면 접면)', desc: '삼각형 모양 중 뾰족한 꼭짓점 부분이 도로에 접하는 토지입니다. 도로와 접하는 전면부가 협소하여 진출입 동선 계획에 제약이 있을 수 있습니다.', badge: '역삼각형', type: 'danger' };
                                                                }
                                                                return { title: '삼각형 (삼각형 형상)', desc: '삼각형 형태의 토지입니다. 예리한 모서리 영역의 손실을 방지하고 잔여지를 주차장 또는 조경 시설로 구성하면 가치를 보존할 수 있습니다.', badge: '삼각형', type: 'warning' };
                                                            }
                                                            if (clean.includes('부정형') || clean.includes('07')) {
                                                                return { title: '부정형 (불규칙 형태)', desc: '모양이 매우 불규칙하여 토지의 손실율(로스율)이 높고 일반적인 건물 건축에 제약이 있으나, 창의적 설계로 보완할 수 있습니다.', badge: '부정형', type: 'warning' };
                                                            }
                                                            if (clean.includes('자루형') || clean.includes('08') || clean.includes('자루')) {
                                                                return { title: '자루형 (자루 모양 토지)', desc: '메인 필지가 건물들 안쪽에 숨어 있고 좁은 입구 통로(자루)로 도로와 접한 토지입니다. 조용하고 아늑하나 도로 개방감이 다소 낮습니다.', badge: '자루형', type: 'warning' };
                                                            }
                                                            return null;
                                                        };

                                                        const getZoningExplanation = (zoning: string) => {
                                                            if (!zoning || zoning === '정보없음') return null;
                                                            const clean = zoning.replace(/\s+/g, '');
                                                            if (clean.includes('제1종전용주거')) return { title: '제1종 전용주거지역', desc: '단독주택 중심의 조용하고 쾌적한 고급 주택가로 개발할 수 있는 지역입니다. (아파트 건축 불가)', badge: '주거지역', type: 'info' };
                                                            if (clean.includes('제2종전용주거')) return { title: '제2종 전용주거지역', desc: '공동주택(빌라·타운하우스) 중심의 쾌적한 주거 환경을 조성하기 위해 지정된 지역입니다.', badge: '주거지역', type: 'info' };
                                                            if (clean.includes('제1종일반주거')) return { title: '제1종 일반주거지역', desc: '저층 주택(4층 이하) 중심의 주거지로, 다세대나 빌라 개발에 아주 적합한 용도지역입니다.', badge: '주거지역', type: 'good' };
                                                            if (clean.includes('제2종일반주거')) return { title: '제2종 일반주거지역', desc: '중층 주택(보통 15층~25층 이하)을 중심으로 쾌적한 환경을 갖춘, 가장 흔하고 활용도 높은 대중적인 주거지역입니다.', badge: '주거지역', type: 'good' };
                                                            if (clean.includes('제3종일반주거')) return { title: '제3종 일반주거지역', desc: '층수 제한이 없는 고층 아파트 중심의 주거 개발지로, 용적률이 높고 개발 사업성이 매우 뛰어납니다.', badge: '주거지역', type: 'good' };
                                                            if (clean.includes('준주거')) return { title: '준주거지역', desc: '주거 기능과 상업 기능이 유기적으로 결합된 땅으로, 오피스텔이나 상가주택 개발에 최적의 가치를 지닙니다.', badge: '주거지역', type: 'good' };
                                                            if (clean.includes('중심상업')) return { title: '중심상업지역', desc: '도심의 핵심 상권으로 용적률과 건폐율이 가장 높습니다. 고층 빌딩 및 대형 상가 개발이 가능하나, 순수 단독주택은 지을 수 없습니다.', badge: '상업지역', type: 'good' };
                                                            if (clean.includes('일반상업')) return { title: '일반상업지역', desc: '일반적인 시내 상권 및 주 상권 업무지구입니다. 고부가가치의 주상복합 건물이나 상업 빌딩 건축에 매우 적합합니다.', badge: '상업지역', type: 'good' };
                                                            if (clean.includes('근린상업')) return { title: '근린상업지역', desc: '주택가 인근에 밀접한 근린 생활 상권입니다. 동네 대형 상가나 병원, 학원 건물 용도로 활용하기 좋습니다.', badge: '상업지역', type: 'good' };
                                                            if (clean.includes('유통상업')) return { title: '유통상업지역', desc: '도시 내 물류센터 및 대형 도매시장 전용 영토입니다. 일반 주택이나 아파트 등 주거용 건물은 절대 들어설 수 없습니다.', badge: '상업지역', type: 'warning' };
                                                            if (clean.includes('전용공업')) return { title: '전용공업지역', desc: '중화학공장이나 공해 유발 공장 전용입니다. 주거용 및 생활 편의 시설은 법적으로 절대 들어설 수 없습니다.', badge: '공업지역', type: 'danger' };
                                                            if (clean.includes('일반공업')) return { title: '일반공업지역', desc: '환경오염 우려가 적은 일반 공장 설립용 지역입니다. 지자체 조례에 따라 제한적인 단독주택 등의 조성이 예외적으로 허용될 수 있습니다.', badge: '공업지역', type: 'warning' };
                                                            if (clean.includes('준공업')) return { title: '준공업지역', desc: '경공업을 수용하되 주거와 상업 기능까지 조화롭게 융합할 수 있습니다. 지식산업센터나 아파트 전환 투자처로 인기가 높습니다.', badge: '공업지역', type: 'good' };
                                                            if (clean.includes('보전녹지')) return { title: '보전녹지지역', desc: '도시의 자연환경 보전이 최우선 목표인 땅입니다. 4층 이하의 엄격한 제한 및 개발 허가를 받아내기가 매우 까다롭습니다.', badge: '녹지지역', type: 'danger' };
                                                            if (clean.includes('생산녹지')) return { title: '생산녹지지역', desc: '농업적 생산 활동을 위해 향후 개발을 일시 유보해 둔 보전 성향의 땅입니다. 4층 이하 건축 제한이 적용됩니다.', badge: '녹지지역', type: 'warning' };
                                                            if (clean.includes('자연녹지')) return { title: '자연녹지지역', desc: '녹지지역 중 향후 개발 잠재력이 가장 높습니다. 제한적인 4층 이하의 소형 건축이 가능하여 투자자들의 수요가 많습니다.', badge: '녹지지역', type: 'info' };
                                                            if (clean.includes('보전관리')) return { title: '보전관리지역', desc: '자연환경 보호를 목적으로 자연환경보전지역에 준하여 엄격하게 관리되는 땅으로, 개발 규제가 매우 까다롭습니다.', badge: '관리지역', type: 'danger' };
                                                            if (clean.includes('생산관리')) return { title: '생산관리지역', desc: '농업적 관리를 위해 농림지역에 준하여 관리되는 토지입니다. 주로 농어업용 창고나 관련 생산 시설 위주로 허용됩니다.', badge: '관리지역', type: 'warning' };
                                                            if (clean.includes('계획관리')) return { title: '계획관리지역', desc: '비도시 지역의 대장 땅! 향후 대도시 편입이 예정된 개발의 핵심지로, 빌라, 공장, 예쁜 카페 등 폭넓은 개발과 최고의 활용도를 지닙니다.', badge: '관리지역', type: 'good' };
                                                            if (clean.includes('농림')) return { title: '농림지역', desc: '농업 생산성 증진과 임업 육성 전용 구역입니다. 일반인 건축은 불가하며 실제 농업인 전용 주택만 제한적으로 허용됩니다.', badge: '농림지역', type: 'danger' };
                                                            if (clean.includes('자연환경보전')) return { title: '자연환경보전지역', desc: '청정 자연환경, 문화재 및 수자원 보호를 위한 법적 보존구역입니다. 일반 개발이나 건축은 사실상 전면 불가(극소수 농어민 주택 제외)합니다.', badge: '보전지역', type: 'danger' };
                                                            return { title: zoning, desc: '국토의 계획 및 이용에 관한 법률에 의거해 토지의 용도와 규제를 지자체별로 세분화하여 정의한 법적 구역입니다.', badge: '용도지역', type: 'info' };
                                                        };

                                                        const roadConn = parcel.roadConnection || '';
                                                        const roadExplanation = getRoadConnectionExplanation(roadConn);

                                                        const topoVal = parcel.topography || '';
                                                        const topoExplanation = getTopographyExplanation(topoVal);

                                                        const shapeVal = parcel.landShape || '';
                                                        const shapeExplanation = getLandShapeExplanation(shapeVal);

                                                        const zoningVal = parcel.zoning || '';
                                                        const zoningExplanation = getZoningExplanation(zoningVal);

                                                        const pricePerM2 = (() => {
                                                            const raw = parcel.pnuPrice || parcel.latestOfficialPrice || (officialLandPrice.length > 0 ? officialLandPrice[officialLandPrice.length - 1].price : 0);
                                                            if (!raw) return 0;
                                                            return typeof raw === 'string' ? parseInt(raw.replace(/,/g, '')) : Number(raw);
                                                        })();
                                                        const areaVal = Number(parcel.area || report.area || 0);
                                                        const pyeongVal = areaVal * 0.3025;

                                                        let totalLandPriceExplanation = null;
                                                        if (pricePerM2 > 0 && pyeongVal > 0) {
                                                            const totalPrice = pricePerM2 * 3.3 * pyeongVal;
                                                            const pricePerPyeong = pricePerM2 * 3.3;
                                                            totalLandPriceExplanation = {
                                                                title: `공시지가 총액 ${formatKoreanCurrency(totalPrice)}원`,
                                                                desc: `평당 약 ${formatKoreanCurrency(pricePerPyeong)}원 * 토지 면적 ${pyeongVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}평 기준으로 계산한 총 공시지가 가치입니다.`,
                                                                badge: '공시지가 총액',
                                                                type: 'good'
                                                            };
                                                        }

                                                        const renderAnalysisRow = (label: string, explanation: any) => {
                                                            if (!explanation) return null;

                                                            let colorClass = 'text-sky-400 border-sky-400/15 bg-sky-400/8';
                                                            if (explanation.type === 'good') {
                                                                colorClass = 'text-emerald-400 border-emerald-400/15 bg-emerald-400/8';
                                                            } else if (explanation.type === 'warning' || explanation.type === 'danger') {
                                                                colorClass = 'text-amber-300 border-amber-400/15 bg-amber-400/8';
                                                            }

                                                            return (
                                                                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start py-5 border-b border-white/[0.06] last:border-0 last:pb-0 first:pt-0">
                                                                    <div className="w-[100px] shrink-0">
                                                                        <span className="text-[11px] font-medium text-white/40 block mb-2">{label}</span>
                                                                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${colorClass}`}>
                                                                            {explanation.badge}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0 space-y-1">
                                                                        <h5 className="text-sm font-semibold text-white">{explanation.title}</h5>
                                                                        <p className="text-[11px] text-white/50 leading-relaxed">{explanation.desc}</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        };

                                                        if (!roadExplanation && !topoExplanation && !shapeExplanation && !zoningExplanation && !totalLandPriceExplanation) return null;

                                                        return (
                                                            <div className="bg-slate-900/80 border border-white/[0.06] rounded-[32px] p-5 lg:p-6 mt-6">
                                                                <h4 className="text-sm font-semibold text-white/90 flex items-center gap-2.5 mb-5 pb-4 border-b border-white/[0.06]">
                                                                    <Layers className="w-4 h-4 text-sky-400" />
                                                                    <span>토지 입지 및 형상 분석 요약</span>
                                                                </h4>
                                                                <div>
                                                                    {renderAnalysisRow('공시지가 총액', totalLandPriceExplanation)}
                                                                    {renderAnalysisRow('용도지역', zoningExplanation)}
                                                                    {renderAnalysisRow('도로접면', roadExplanation)}
                                                                    {renderAnalysisRow('지형지세', topoExplanation)}
                                                                    {renderAnalysisRow('토지형상', shapeExplanation)}
                                                                </div>
                                                                <p className="mt-4 pt-4 border-t border-white/[0.06] text-[10px] text-white/35 leading-relaxed">
                                                                    * 정확한 건축 허가 가능 여부 및 상세 건축 조건은 해당 지방자치단체 조례 및 건축과 공식 유선 확인이 반드시 필요합니다.
                                                                </p>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            );
                                        })}
                                    </>
                                );
                            })()}
                        </motion.div>
                    )}

                    {activeTab === 'price' && (
                        <motion.div key="price" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                            {(() => {
                                const multiPnu = rawData?.vitals?.multiPnu;
                                const isMulti = multiPnu && multiPnu.parcelCount > 1;
                                const primaryLandData = rawData?.vitals?.land?.characteristics;

                                if (!primaryLandData && !isMulti) {
                                    return <div className="p-20 text-center text-slate-500">토지 데이터가 제공되지 않았습니다. 관련 지자체 문의</div>;
                                }

                                const parcelsToRender = isMulti ? (multiPnu.parcels || []) : [primaryLandData];

                                return (
                                    <>
                                        {parcelsToRender.map((parcel: any, idx: number) => {
                                            const pnu = parcel.pnu || '';
                                            let officialLandPriceRaw = [];
                                            if (isMulti && parcel?.landPriceHistory) {
                                                officialLandPriceRaw = Object.entries(parcel.landPriceHistory).map(([year, price]) => ({ year, price }));
                                            } else {
                                                const list = rawData?.officialLandPrice ||
                                                    rawData?.vitals?.officialLandPrice ||
                                                    rawData?.vitals?.land?.officialLandPrice ||
                                                    rawData?.vitals?.officialPrice ||
                                                    [];
                                                officialLandPriceRaw = list.map((item: any) => {
                                                    const year = item.year || item.stdrYear || '';
                                                    const price = item.price !== undefined ? item.price : (item.pblntfPclnd || item.housePc || 0);
                                                    return { year, price };
                                                });
                                            }

                                            const officialLandPrice = [...officialLandPriceRaw]
                                                .filter((d: any) => d.year)
                                                .sort((a: any, b: any) => String(a.year).localeCompare(String(b.year)));

                                            if (officialLandPrice.length === 0) return null;

                                            const computedTrend = (() => {
                                                let trendTitle = '보합세';
                                                let trendSubTitle = '변동성 미미';
                                                let trendExplanation = '해당 기간 동안 공시지가의 뚜렷한 급등락 변동이 관측되지 않은 안정적인 보합 상태입니다. 부동산 지가 급등락 리스크가 적어 자산 가치의 안정적인 보존에 유리합니다.';
                                                let trendColor = '#38bdf8'; // sky-400
                                                let trendBg = 'bg-[#38bdf8]/10 border-[#38bdf8]/20 text-[#38bdf8]';

                                                let recentYearLabel = '최근';
                                                let recentPriceLabel = '정보없음';
                                                let threeYearsAgoYearLabel = '3년전';
                                                let threeYearsAgoPriceLabel = '정보없음';
                                                let eightYearsAgoYearLabel = '8년전';
                                                let eightYearsAgoPriceLabel = '정보없음';

                                                if (officialLandPrice.length > 0) {
                                                    const firstPoint = officialLandPrice[0];
                                                    const lastPoint = officialLandPrice[officialLandPrice.length - 1];
                                                    const startYear = firstPoint.year ? String(firstPoint.year) : '';
                                                    const endYear = lastPoint.year ? String(lastPoint.year) : '';
                                                    const firstPrice = typeof firstPoint.price === 'string' ? Number(firstPoint.price.replace(/,/g, '')) : Number(firstPoint.price || 0);
                                                    const lastPrice = typeof lastPoint.price === 'string' ? Number(lastPoint.price.replace(/,/g, '')) : Number(lastPoint.price || 0);

                                                    let threeAgoPoint: any = null;
                                                    let eightAgoPoint: any = null;

                                                    const currentYearVal = parseInt(endYear);
                                                    if (!isNaN(currentYearVal)) {
                                                        recentYearLabel = `${currentYearVal}년(최근)`;
                                                        recentPriceLabel = lastPrice ? `${lastPrice.toLocaleString()}원` : '정보없음';

                                                        const threeAgoVal = currentYearVal - 3;
                                                        const eightAgoVal = currentYearVal - 8;

                                                        threeYearsAgoYearLabel = `${threeAgoVal}년(3년전)`;
                                                        eightYearsAgoYearLabel = `${eightAgoVal}년(8년전)`;

                                                        officialLandPrice.forEach((item: any) => {
                                                            const y = parseInt(item.year);
                                                            if (y === threeAgoVal) threeAgoPoint = item;
                                                            if (y === eightAgoVal) eightAgoPoint = item;
                                                        });

                                                        const len = officialLandPrice.length;
                                                        if (!threeAgoPoint && len >= 4) {
                                                            threeAgoPoint = officialLandPrice[len - 4];
                                                            threeYearsAgoYearLabel = `${threeAgoPoint.year}년(3년전)`;
                                                        }
                                                        if (!eightAgoPoint) {
                                                            if (len >= 9) {
                                                                eightAgoPoint = officialLandPrice[len - 9];
                                                            } else {
                                                                eightAgoPoint = officialLandPrice[0];
                                                            }
                                                            eightYearsAgoYearLabel = `${eightAgoPoint.year}년(8년전)`;
                                                        }

                                                        if (threeAgoPoint) {
                                                            const p = typeof threeAgoPoint.price === 'string' ? Number(threeAgoPoint.price.replace(/,/g, '')) : Number(threeAgoPoint.price || 0);
                                                            threeYearsAgoPriceLabel = p ? `${p.toLocaleString()}원` : '정보없음';
                                                        }
                                                        if (eightAgoPoint) {
                                                            const p = typeof eightAgoPoint.price === 'string' ? Number(eightAgoPoint.price.replace(/,/g, '')) : Number(eightAgoPoint.price || 0);
                                                            eightYearsAgoPriceLabel = p ? `${p.toLocaleString()}원` : '정보없음';
                                                        }
                                                    }

                                                    if (firstPrice > 0 && lastPrice > 0) {
                                                        const change = lastPrice - firstPrice;
                                                        const percent = (change / firstPrice) * 100;

                                                        let threeAgoPrice = 0;
                                                        let threeAgoYear = '';
                                                        if (threeAgoPoint) {
                                                            threeAgoPrice = typeof threeAgoPoint.price === 'string' ? Number(threeAgoPoint.price.replace(/,/g, '')) : Number(threeAgoPoint.price || 0);
                                                            threeAgoYear = String(threeAgoPoint.year || '');
                                                        }

                                                        let recent3YearDetail = '';
                                                        if (threeAgoPrice > 0) {
                                                            const change3 = lastPrice - threeAgoPrice;
                                                            const percent3 = (change3 / threeAgoPrice) * 100;
                                                            const word3 = percent3 > 1.0 ? '상승' : (percent3 < -1.0 ? '하락 조정' : '보합');
                                                            recent3YearDetail = ` 또한 최근 3년(${threeAgoYear}년 ~ ${endYear}년) 동안은 약 ${Math.abs(percent3).toFixed(1)}% ${word3}하며 단기적으로도 안정적인 흐름을 유지하고 있습니다.`;
                                                            if (percent3 > 1.0) {
                                                                recent3YearDetail = ` 또한 최근 3년(${threeAgoYear}년 ~ ${endYear}년) 동안은 약 ${percent3.toFixed(1)}% 상승하여 최근 들어 가격 오름세가 더욱 가속화되고 있습니다.`;
                                                            } else if (percent3 < -1.0) {
                                                                recent3YearDetail = ` 또한 최근 3년(${threeAgoYear}년 ~ ${endYear}년) 동안은 약 ${Math.abs(percent3).toFixed(1)}% 하락 조정되며 최근 부동산 경기 둔화의 영향이 반영되었습니다.`;
                                                            }
                                                        }

                                                        if (percent > 1.0) {
                                                            trendTitle = '우상향';
                                                            trendSubTitle = '꾸준한 지가 상승세';
                                                            trendExplanation = `${startYear}년 대비 ${endYear}년 공시지가가 약 ${percent.toFixed(1)}% 상승하였습니다. 해당 토지는 꾸준히 우상향 흐름을 보이며 인근 지역의 개발 호재 및 지가 상승 유발 동력이 탄탄하게 유지되고 있습니다.${recent3YearDetail}`;
                                                            trendColor = '#34d399'; // green-400
                                                            trendBg = 'bg-[#34d399]/10 border-[#34d399]/20 text-[#34d399]';
                                                        } else if (percent < -1.0) {
                                                            trendTitle = '하락세';
                                                            trendSubTitle = '지가 조정 국면';
                                                            trendExplanation = `${startYear}년 대비 ${endYear}년 공시지가가 약 ${Math.abs(percent).toFixed(1)}% 하락 조정되었습니다. 최근 부동산 시장의 조정 상황 또는 공시가격 현실화율 완화 조치 등 외부 정책적 조정을 거친 요인이 지배적입니다.${recent3YearDetail}`;
                                                            trendColor = '#f87171'; // red-400
                                                            trendBg = 'bg-[#f87171]/10 border-[#f87171]/20 text-[#f87171]';
                                                        } else {
                                                            trendExplanation = `해당 기간 동안 공시지가의 뚜렷한 급등락 변동이 관측되지 않은 안정적인 보합 상태입니다. 부동산 지가 급등락 리스크가 적어 자산 가치의 안정적인 보존에 유리합니다.${recent3YearDetail}`;
                                                        }
                                                    }
                                                }

                                                return {
                                                    trendTitle,
                                                    trendSubTitle,
                                                    trendExplanation,
                                                    trendColor,
                                                    trendBg,
                                                    recentYearLabel,
                                                    recentPriceLabel,
                                                    threeYearsAgoYearLabel,
                                                    threeYearsAgoPriceLabel,
                                                    eightYearsAgoYearLabel,
                                                    eightYearsAgoPriceLabel
                                                };
                                            })();

                                            return (
                                                <div key={idx} className="space-y-8 pb-12 mb-12 border-b border-white/5 last:border-0 last:pb-0 last:mb-0">
                                                    <section className="bg-slate-900 border border-white/5 rounded-[40px] p-8 shadow-2xl">
                                                        <h4 className="text-base font-semibold text-white/90 mb-6 pb-4 border-b border-white/[0.06]">
                                                            <span>최근 8년 공시지가 변동 추이 {isMulti ? `(${idx + 1})` : ''}</span>
                                                        </h4>
                                                        {pnu && <p className="text-slate-500 text-[10px] font-mono mb-4 uppercase tracking-widest">PNU: {pnu}</p>}
                                                        <div className="h-[300px] w-full">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <AreaChart data={officialLandPrice.map((d: any) => ({
                                                                    ...d,
                                                                    price: typeof d.price === 'string' ? Number(d.price.replace(/,/g, '')) : d.price
                                                                }))}>
                                                                    <defs>
                                                                        <linearGradient id={isMulti ? `colorLandPrice-${idx}` : "colorLandPrice"} x1="0" y1="0" x2="0" y2="1">
                                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                                        </linearGradient>
                                                                    </defs>
                                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                                    <XAxis dataKey="year" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                                                                    <YAxis
                                                                        stroke="#475569"
                                                                        fontSize={10}
                                                                        axisLine={false}
                                                                        tickLine={false}
                                                                        tickFormatter={(val) => `${Math.round(val / 10000).toLocaleString()}만원`}
                                                                    />
                                                                    <Tooltip
                                                                        contentStyle={{ backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '12px' }}
                                                                        formatter={(val: any) => [`${val.toLocaleString()}원`, "공시지가"]}
                                                                    />
                                                                    <Area type="monotone" dataKey="price" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill={`url(#${isMulti ? `colorLandPrice-${idx}` : "colorLandPrice"})`} dot={{ r: 4, fill: '#fff', strokeWidth: 2, stroke: '#10b981' }} />
                                                                </AreaChart>
                                                            </ResponsiveContainer>
                                                        </div>

                                                        {/* 최근, 3년전, 8년전 가격 지표 레이아웃 */}
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                                                            <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                                                                <span className="text-xs font-bold text-slate-400">{computedTrend.eightYearsAgoYearLabel}</span>
                                                                <span className="text-sm font-black text-slate-300">{computedTrend.eightYearsAgoPriceLabel}</span>
                                                            </div>
                                                            <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                                                                <span className="text-xs font-bold text-slate-400">{computedTrend.threeYearsAgoYearLabel}</span>
                                                                <span className="text-sm font-black text-amber-400">{computedTrend.threeYearsAgoPriceLabel}</span>
                                                            </div>
                                                            <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                                                                <span className="text-xs font-bold text-slate-400">{computedTrend.recentYearLabel}</span>
                                                                <span className="text-sm font-black text-[#10b981]">{computedTrend.recentPriceLabel}</span>
                                                            </div>
                                                        </div>

                                                        {/* 지가 추이 분석 상세 설명 카드 */}
                                                        <div className="mt-6 p-6 bg-white/[0.01] rounded-3xl border border-white/5 flex flex-col md:flex-row gap-6 items-start">
                                                            <div className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 border ${computedTrend.trendBg}`}>
                                                                {computedTrend.trendTitle}
                                                            </div>
                                                            <div className="space-y-1.5 flex-1 min-w-0">
                                                                <h5 className="text-sm font-black text-white">지가 추이 분석: {computedTrend.trendSubTitle}</h5>
                                                                <p className="text-xs text-slate-400 leading-relaxed font-bold">{computedTrend.trendExplanation}</p>
                                                            </div>
                                                        </div>
                                                    </section>
                                                </div>
                                            );
                                        })}
                                    </>
                                );
                            })()}
                        </motion.div>
                    )}

                    {activeTab === 'building' && (
                        <motion.div key="building" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                            {(() => {
                                const multiPnu = rawData?.vitals?.multiPnu;
                                const isMulti = multiPnu && multiPnu.parcelCount > 1;
                                const primaryTitleList = rawData?.vitals?.building?.title || [];
                                const primaryTitle = primaryTitleList.length > 0 ? primaryTitleList[0] : {};

                                const buildingsToRender = isMulti && multiPnu.buildings?.length > 0
                                    ? multiPnu.buildings
                                    : (primaryTitle.bldNm || primaryTitle.strctCdNm ? [primaryTitle] : []);

                                if (buildingsToRender.length === 0) {
                                    return (
                                        <div className="p-8 md:p-12 text-center bg-slate-900/80 border border-white/[0.06] rounded-[32px] space-y-6">
                                            <div className="text-white/80 text-sm md:text-base font-bold">
                                                현재 토지에는 건축물이 없는 것으로 확인됩니다.
                                            </div>

                                            <div className="max-w-md mx-auto p-5 bg-white/[0.02] border border-white/[0.04] rounded-2xl text-left space-y-3">
                                                <p className="text-white/60 text-xs font-semibold leading-relaxed">
                                                    본 토지에 실제로 건물이 존재 함에도 건축물 대장이 없다고 나오는 경우는 아래와 같습니다.
                                                </p>
                                                <p className="text-sky-300 text-xs font-bold leading-relaxed">
                                                    행정 지번 변경 및 전산 누락, 미등기 무허가 건물, 오래된 구옥(지번 누락), 혹은 사용승인 전 신축 건물일 가능성이 높습니다.
                                                </p>
                                                <div className="h-px bg-white/[0.06] my-2" />
                                                <p className="text-white/40 text-[11px] leading-relaxed">
                                                    위 경우 현장 확인 및 등기부등본 조회를 병행해 주세요.
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }

                                const primaryFloors = rawData?.vitals?.building?.floors || [];

                                return (
                                    <>
                                        {isMulti && (
                                            <div className="text-sky-400 font-semibold text-sm">
                                                총 {buildingsToRender.length}개 건물 정보
                                            </div>
                                        )}
                                        {buildingsToRender.map((title: any, idx: number) => {
                                            const isPrimary = (title.bldNm && primaryTitle.bldNm && title.bldNm === primaryTitle.bldNm) || (!isMulti) || (idx === 0);
                                            const floors = isPrimary ? primaryFloors : [];

                                            return (
                                                <div key={idx} className="space-y-6 pb-10 mb-10 border-b border-white/[0.06] last:border-0 last:pb-0 last:mb-0">
                                                    <div>
                                                        <h3 className="text-xl lg:text-2xl font-semibold text-white">건물 상세지표 {isMulti ? `(${idx + 1})` : ''}</h3>
                                                        {title.bldNm && (
                                                            <p className="text-white/40 text-xs mt-1">{title.bldNm}</p>
                                                        )}
                                                    </div>

                                                    {/* 표제부 정보 — 전체 폭 */}
                                                    <section className="bg-slate-900/80 border border-white/[0.06] rounded-[32px] p-5 lg:p-6">
                                                        <h4 className="text-sm font-semibold text-white/90 mb-5 pb-4 border-b border-white/[0.06]">표제부 정보</h4>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                            {[
                                                                { label: '건축물명', value: title.bldNm || '명칭없음' },
                                                                { label: '주구조', value: title.strctCdNm },
                                                                { label: '주용도', value: title.mainPurpsCdNm },
                                                                { label: '사용승인일', value: formatDate(title.useAprDay) },
                                                                {
                                                                    label: '연면적',
                                                                    value: (report.area && report.category !== 'land' && isPrimary) ? (
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <span className="text-sky-400">{report.area} ㎡ (제보)</span>
                                                                            {title.totArea && report.area !== title.totArea && (
                                                                                <span className="text-[10px] text-white/35 line-through font-normal">공식: {title.totArea} ㎡</span>
                                                                            )}
                                                                        </div>
                                                                    ) : `${title.totArea || 0} ㎡`
                                                                },
                                                                { label: '건폐율 / 용적률', value: `${title.bcRat || '-'}% / ${title.vlRat || '-'}%` },
                                                            ].map((item, i) => (
                                                                <div key={i} className="bg-white/[0.03] p-4 rounded-xl border border-white/[0.06]">
                                                                    <p className="text-[11px] text-white/40 font-medium mb-1.5">{item.label}</p>
                                                                    <div className="text-sm font-semibold text-white break-words">{item.value || '-'}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </section>

                                                    {/* 층별 현황 — 전체 폭, 스크롤 없이 전체 노출 */}
                                                    <section className="bg-slate-900/80 border border-white/[0.06] rounded-[32px] p-5 lg:p-6">
                                                        <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/[0.06]">
                                                            <h4 className="text-sm font-semibold text-white/90">층별 현황</h4>
                                                            {floors?.length > 0 && (
                                                                <span className="text-[11px] text-white/35 font-medium">총 {floors.length}개 층</span>
                                                            )}
                                                        </div>
                                                        {floors?.length > 0 ? (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                                                                {floors.map((floor: any, i: number) => (
                                                                    <div
                                                                        key={i}
                                                                        className="bg-white/[0.03] px-4 py-3 rounded-xl border border-white/[0.06] flex items-center justify-between gap-3"
                                                                    >
                                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                                            <span className="shrink-0 text-[10px] font-semibold bg-sky-400/10 text-sky-400 px-2 py-1 rounded-md">
                                                                                {floor.flrNoNm || `${floor.flrNo}층`}
                                                                            </span>
                                                                            <p className="text-xs font-medium text-white/80 truncate">
                                                                                {floor.etcPurps || floor.mainPurpsCdNm || '-'}
                                                                            </p>
                                                                        </div>
                                                                        <p className="shrink-0 text-xs font-semibold text-white/50">{floor.area} ㎡</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-white/40 py-6 text-center">
                                                                층별 데이터가 제공되지 않았습니다. 관련 지자체 문의
                                                            </p>
                                                        )}
                                                    </section>

                                                    {/* 상가정보 — 전체 폭 */}
                                                    <section className="bg-slate-900/80 border border-white/[0.06] rounded-[32px] p-5 lg:p-6 mt-6">
                                                        <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/[0.06]">
                                                            <h4 className="text-sm font-semibold text-white/90">입점 상가 정보</h4>
                                                            {rawData?.commercialData?.buildingStores?.length > 0 && (
                                                                <span className="text-[11px] text-white/35 font-medium">총 {rawData.commercialData.buildingStores.length}개 점포</span>
                                                            )}
                                                        </div>
                                                        {rawData?.commercialData?.buildingStores?.length > 0 ? (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                                                                {rawData.commercialData.buildingStores.map((store: any, i: number) => (
                                                                    <div
                                                                        key={i}
                                                                        className="bg-white/[0.03] px-4 py-3 rounded-xl border border-white/[0.06] flex flex-col justify-center gap-1.5"
                                                                    >
                                                                        <div className="flex items-center justify-between gap-2 min-w-0">
                                                                            <span className="shrink-0 text-[10px] font-semibold bg-emerald-400/10 text-emerald-400 px-2 py-1 rounded-md">
                                                                                {store.flrNoNm || '-'}
                                                                            </span>
                                                                            <span className="text-[10px] font-medium text-white/40 truncate">
                                                                                {store.indsLclsNm} {'>'} {store.indsSclsNm}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-sm font-bold text-white/80 truncate">
                                                                            {store.bizesNm || '-'}
                                                                        </p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-white/40 py-6 text-center">
                                                                해당 건물에 등록된 상가 데이터가 없습니다. (소상공인시장진흥공단 기준)
                                                            </p>
                                                        )}
                                                    </section>
                                                </div>
                                            );
                                        })}
                                    </>
                                );
                            })()}
                        </motion.div>
                    )}

                    {activeTab === 'r_one' && (
                        <motion.div key="r_one" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <h3 className="text-2xl font-black">시장 동향 공식지표</h3>
                                <div className="p-1 px-4 bg-white/5 border border-white/10 rounded-full">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Source: R-ONE Real Estate Board</span>
                                </div>
                            </div>

                            {rawData?.marketIndicators && Object.keys(rawData.marketIndicators).length > 0 ? (() => {
                                const CATEGORY_LABELS: Record<string, { title: string; color: string }> = {
                                    land: { title: '토지 시장 지표', color: '#8B5CF6' },
                                    apartment: { title: '아파트 시장 지표', color: '#0EA5E9' },
                                    house: { title: '주택 시장 지표', color: '#10B981' },
                                    building: { title: '오피스 시장 지표', color: '#F59E0B' },
                                    store: { title: '상가 시장 지표', color: '#EF4444' },
                                };
                                const IND_LABELS: Record<string, string> = {
                                    priceIndex: '가격지수', jeonseIndex: '전세지수', wolseIndex: '월세지수',
                                    tradeVolume: '거래량', supplyDemand: '수급지수', conversionRate: '전월세전환율',
                                    vacancyRate: '공실률', rentAmount: '임대료', premiumMoney: '권리금유비율',
                                    quintile: '5분위배율', changeRateByRegion: '지가변동률(지역)',
                                    changeRateByUse: '지가변동률(용도)', saleIndex: '실거래지수',
                                };

                                const cat = rawData?.category || report?.category || 'land';
                                const ind = rawData.marketIndicators;
                                const meta = CATEGORY_LABELS[cat] || { title: '시장 지표', color: '#64748B' };

                                const chartOptionsMap: Record<string, { key: string; label: string; color: string }[]> = {
                                    land: [
                                        { key: 'price', label: '지가지수', color: '#8B5CF6' },
                                        { key: 'change', label: '지가변동률', color: '#A78BFA' },
                                        { key: 'volume', label: '거래필지수', color: '#10B981' }
                                    ],
                                    apartment: [
                                        { key: 'price', label: '매매지수', color: '#0EA5E9' },
                                        { key: 'jeonse', label: '전세지수', color: '#F59E0B' },
                                        { key: 'wolse', label: '월세지수', color: '#FBBF24' }
                                    ],
                                    house: [
                                        { key: 'price', label: '매매지수', color: '#10B981' },
                                        { key: 'jeonse', label: '전세지수', color: '#F59E0B' }
                                    ],
                                    building: [
                                        { key: 'price', label: '임대가격지수', color: '#F59E0B' },
                                        { key: 'vacancy', label: '공실률', color: '#F87171' },
                                        { key: 'rent', label: '임대료', color: '#34D399' }
                                    ],
                                    store: [
                                        { key: 'price', label: '임대가격지수', color: '#EF4444' },
                                        { key: 'vacancy', label: '공실률', color: '#F87171' },
                                        { key: 'rent', label: '임대료', color: '#34D399' }
                                    ]
                                };

                                const getSeriesForChart = (chartKey: string, indicators: any) => {
                                    if (!indicators) return null;
                                    switch (chartKey) {
                                        case 'price': return indicators.priceIndex || indicators.saleIndex || indicators.priceIndexByStatus;
                                        case 'jeonse': return indicators.jeonseIndex;
                                        case 'wolse': return indicators.wolseIndex;
                                        case 'change': return indicators.changeRateByRegion || indicators.changeRateByUse;
                                        case 'volume': return indicators.tradeVolume || indicators.tradeVolumeByUse;
                                        case 'vacancy': return indicators.vacancyRate;
                                        case 'rent': return indicators.rentAmount;
                                        default: return null;
                                    }
                                };

                                const getChartData = (series: any) => {
                                    if (!series) return [];
                                    let data: any[] | null = null;
                                    if (Array.isArray(series)) data = series;
                                    else if (series && typeof series === 'object') data = series.data || null;

                                    if (!data || data.length === 0) return [];
                                    return sortedSeriesPoints(data);
                                };

                                const getSummary = (series: any): any | null => {
                                    if (!series) return null;
                                    if (series.summary) return series.summary;
                                    if (Array.isArray(series) && series.length > 0) {
                                        const last = series[series.length - 1];
                                        return { latest: last?.value ?? last, trend: '', change: 0 };
                                    }
                                    if (series.data && Array.isArray(series.data) && series.data.length > 0) {
                                        const last = series.data[series.data.length - 1];
                                        return { latest: last?.value ?? last, trend: '', change: 0 };
                                    }
                                    return null;
                                };

                                const cards: { key: string; label: string; summary: any }[] = [];
                                Object.entries(ind).forEach(([k, v]) => {
                                    if (k === 'category' || k === 'txType' || k === 'yieldRates' || k === 'supplyDemand' || k === 'region' || k === 'city' || k === 'sido') return;
                                    const s = getSummary(v);
                                    if (s) cards.push({ key: k, label: IND_LABELS[k] || k, summary: s });
                                });

                                // 현재 활성화된 지표 필터
                                const chartOptions = chartOptionsMap[cat] || [{ key: 'price', label: '가격지수', color: '#0EA5E9' }];
                                const activeOption = chartOptions.find(o => o.key === selectedRoneChart) || chartOptions[0];
                                const series = getSeriesForChart(activeOption.key, ind);
                                const chartData = getChartData(series);

                                return (
                                    <div className="space-y-8">
                                        {/* 대시보드 카드 영역 */}
                                        <section className="bg-slate-900 border border-white/5 rounded-[32px] overflow-hidden shadow-xl">
                                            <div className="px-8 py-5 flex items-center justify-between" style={{ background: meta.color + '12', borderBottom: '1px solid ' + meta.color + '22' }}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: meta.color + '25' }}>
                                                        <TrendingUp className="w-4 h-4" style={{ color: meta.color }} />
                                                    </div>
                                                    <span className="text-sm font-black text-white">{meta.title} 요약</span>
                                                </div>
                                                <span className="text-[9px] font-black px-2 py-1 rounded-full" style={{ background: meta.color + '20', color: meta.color, border: '1px solid ' + meta.color + '40' }}>R-ONE</span>
                                            </div>
                                            <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                {cards.map(({ key, label, summary }) => {
                                                    const isUp = summary.trend === '상승';
                                                    const isDown = summary.trend === '하락';
                                                    const trendColor = isUp ? '#f87171' : isDown ? '#60a5fa' : '#64748b';
                                                    const latest = typeof summary.latest === 'number' ? summary.latest.toFixed(2) : (summary.latest || '-');
                                                    const change = typeof summary.change === 'number' ? summary.change.toFixed(2) : (summary.change ?? '');
                                                    return (
                                                        <div key={key} className="p-4 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: meta.color + '20' }}>
                                                            <p className="text-[10px] font-bold text-slate-400 mb-2 truncate">{label}</p>
                                                            <p className="text-xl font-black text-white mb-1">{latest}</p>
                                                            <div className="flex items-center gap-1">
                                                                <span style={{ color: trendColor }} className="text-[10px] font-bold">
                                                                    {isUp ? '▲' : isDown ? '▼' : '─'} {change}{change ? '%' : summary.trend}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </section>

                                        {/* 인터랙티브 꺾은선(Area) 차트 영역 */}
                                        <section className="bg-slate-900 border border-white/5 rounded-[32px] p-6 lg:p-8 shadow-xl space-y-6">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-400">공식지표 추이 분석</h4>
                                                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">{activeOption.label} 시계열 변화량</p>
                                                </div>
                                                {/* 지표 필터 버튼 */}
                                                <div className="flex flex-wrap gap-1.5 p-1 bg-white/[0.02] border border-white/5 rounded-2xl">
                                                    {chartOptions.map((opt) => {
                                                        const isSelected = activeOption.key === opt.key;
                                                        return (
                                                            <button
                                                                key={opt.key}
                                                                onClick={() => setSelectedRoneChart(opt.key)}
                                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wider transition-all duration-300 ${isSelected
                                                                    ? 'text-white shadow-lg'
                                                                    : 'text-slate-500 hover:text-slate-300'
                                                                    }`}
                                                                style={{
                                                                    backgroundColor: isSelected ? opt.color : 'transparent'
                                                                }}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {chartData.length === 0 ? (
                                                <div className="h-[220px] flex items-center justify-center bg-white/[0.01] rounded-2xl border border-white/5">
                                                    <p className="text-slate-500 text-xs font-bold">지표 시계열 데이터가 제공되지 않았습니다</p>
                                                </div>
                                            ) : (
                                                <div className="h-[250px] w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                            <defs>
                                                                <linearGradient id={`colorUv-${cat}-${activeOption.key}`} x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor={activeOption.color} stopOpacity={0.4} />
                                                                    <stop offset="95%" stopColor={activeOption.color} stopOpacity={0.0} />
                                                                </linearGradient>
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                                            <XAxis
                                                                dataKey="date"
                                                                stroke="rgba(255,255,255,0.3)"
                                                                fontSize={10}
                                                                tickLine={false}
                                                                axisLine={false}
                                                                tickFormatter={(val) => {
                                                                    if (!val) return '';
                                                                    const clean = val.toString().trim();
                                                                    return clean.length >= 7 ? clean.substring(2) : clean;
                                                                }}
                                                            />
                                                            <YAxis
                                                                stroke="rgba(255,255,255,0.3)"
                                                                fontSize={10}
                                                                tickLine={false}
                                                                axisLine={false}
                                                                domain={['auto', 'auto']}
                                                            />
                                                            <Tooltip
                                                                contentStyle={{
                                                                    background: '#0F172A',
                                                                    borderColor: 'rgba(255,255,255,0.08)',
                                                                    borderRadius: '16px',
                                                                    fontSize: '11px',
                                                                    color: '#fff'
                                                                }}
                                                            />
                                                            <Area
                                                                type="monotone"
                                                                dataKey="value"
                                                                stroke={activeOption.color}
                                                                strokeWidth={2.5}
                                                                fillOpacity={1}
                                                                fill={`url(#colorUv-${cat}-${activeOption.key})`}
                                                                dot={{ r: 2, stroke: activeOption.color, strokeWidth: 1, fill: '#fff' }}
                                                                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 1.5, fill: activeOption.color }}
                                                            />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            )}
                                        </section>

                                        {/* 시장 한눈에 보기 설명 패널 */}
                                        {(() => {
                                            const insightItems = generateMarketInsights(cat, ind);
                                            if (insightItems.length === 0) return null;

                                            return (
                                                <section className="bg-slate-900 border border-white/5 rounded-[32px] p-6 lg:p-8 shadow-xl space-y-6">
                                                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                                                        <div className="w-1 h-5 rounded bg-sky-500" style={{ backgroundColor: meta.color }} />
                                                        <span className="text-sm font-black text-white">{meta.title.replace('지표', '분석 리포트')}</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {insightItems.map((item, idx) => {
                                                            const isUp = item.trend === '상승';
                                                            const isDown = item.trend === '하락';
                                                            const trendColor = isUp ? 'text-rose-400' : isDown ? 'text-sky-400' : 'text-slate-400';
                                                            const trendBg = isUp ? 'bg-rose-500/10 border-rose-500/20' : isDown ? 'bg-sky-500/10 border-sky-500/20' : 'bg-slate-500/10 border-slate-500/20';

                                                            return (
                                                                <div key={idx} className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col justify-between space-y-4">
                                                                    <div className="flex items-start justify-between gap-4">
                                                                        <h5 className="text-xs font-black text-slate-300">{item.label}</h5>
                                                                        {item.trend && (
                                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${trendColor} ${trendBg}`}>
                                                                                {isUp ? '▲' : isDown ? '▼' : '─'} {item.changeLabel ? `${item.trend} ${item.changeLabel}` : item.trend}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {item.headlineValue && (
                                                                        <div className="space-y-1">
                                                                            {item.subLine && <p className="text-[9px] text-slate-500 font-bold">{item.subLine}</p>}
                                                                            <div className="flex items-baseline gap-0.5">
                                                                                <span className="text-2xl font-black text-white" style={{ color: meta.color }}>{item.headlineValue}</span>
                                                                                {item.headlineUnit && <span className="text-[10px] font-black text-slate-400">{item.headlineUnit}</span>}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    <p className="text-xs text-slate-400 leading-relaxed font-medium">{item.body}</p>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </section>
                                            );
                                        })()}

                                        {/* 빌딩/상가 수익률 데이터 테이블 */}
                                        {(cat === 'building' || cat === 'store') && (
                                            <BuildingYieldTableComponent ind={ind} />
                                        )}
                                    </div>
                                );
                            })() : (
                                <div className="p-12 text-center bg-slate-900 border border-white/5 rounded-[32px]">
                                    <TrendingUp className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                                    <p className="text-xs font-bold text-slate-500">공식 시장 동향 지표가 제공되지 않았습니다</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'market' && (
                        <motion.div key="market" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <h3 className="text-2xl font-black">실거래 및 거래 정보</h3>
                                <div className="p-1 px-4 bg-white/5 border border-white/10 rounded-full">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Data Intensity: Maximum</span>
                                </div>
                            </div>

                            {/* 해당 아파트 (타겟 건물) 전용 거래 매물 위젯 */}
                            {(() => {
                                const backendTargetTrades = rawData?.targetTrades || rawData?.nearbyData?.targetTrades || [];
                                if (!backendTargetTrades || backendTargetTrades.length === 0) return null;

                                const targetComplexInfo = rawData?.targetComplexInfo || {};
                                const targetName = targetComplexInfo.name || '해당 단지';

                                // 필터링 및 최신순 정렬
                                const targetAptTrades = [...backendTargetTrades].filter((trade: any) => {
                                    const isRent = trade._isRent === true;
                                    const monthlyRent = String(trade.monthlyRent || '').replace(/,/g, '').trim() || '0';

                                    if (selectedTargetTab === '매매') return !isRent;
                                    if (selectedTargetTab === '전세') return isRent && (monthlyRent === '0' || monthlyRent === '');
                                    if (selectedTargetTab === '월세') return isRent && monthlyRent !== '0' && monthlyRent !== '';
                                    return false;
                                }).sort((a: any, b: any) => {
                                    const da = `${a.dealYear}${String(a.dealMonth || '').padStart(2, '0')}${String(a.dealDay || '').padStart(2, '0')}`;
                                    const db = `${b.dealYear}${String(b.dealMonth || '').padStart(2, '0')}${String(b.dealDay || '').padStart(2, '0')}`;
                                    return db.localeCompare(da);
                                });

                                // 가격 포맷 함수
                                const formatTradePrice = (trade: any) => {
                                    const isRent = trade._isRent === true;
                                    const deposit = Number(String(trade.deposit || '0').replace(/,/g, ''));
                                    const monthlyRent = Number(String(trade.monthlyRent || '0').replace(/,/g, ''));
                                    const dealAmtForView = Number(String(trade.dealAmount || '0').replace(/,/g, ''));

                                    if (isRent) {
                                        if (monthlyRent > 0) {
                                            return `${deposit.toLocaleString()}만 / 월 ${monthlyRent.toLocaleString()}만`;
                                        } else {
                                            if (deposit >= 10000) {
                                                const eok = Math.floor(deposit / 10000);
                                                const rest = Math.round(deposit % 10000);
                                                return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만` : `${eok}억`;
                                            }
                                            return `${deposit.toLocaleString()}만`;
                                        }
                                    } else {
                                        if (dealAmtForView >= 10000) {
                                            const eok = Math.floor(dealAmtForView / 10000);
                                            const rest = Math.round(dealAmtForView % 10000);
                                            return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만` : `${eok}억`;
                                        }
                                        return `${dealAmtForView.toLocaleString()}만`;
                                    }
                                };

                                return (
                                    <div className="bg-slate-950 border-2 border-sky-500/30 rounded-[40px] p-8 shadow-2xl space-y-6">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-sky-500/10 border border-sky-500/20">
                                                    <Star className="w-5 h-5 text-sky-400" />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">해당 단지 실거래가</span>
                                                    <h4 className="text-lg font-black text-white">{targetName}</h4>
                                                </div>
                                            </div>
                                            <div className="px-3 py-1 bg-sky-500/10 rounded-full border border-sky-500/20 text-[10px] font-black text-sky-400">
                                                최근 {targetAptTrades.length}건
                                            </div>
                                        </div>

                                        {/* 거래 유형 탭 */}
                                        <div className="flex gap-1.5 p-1 bg-white/[0.02] border border-white/5 rounded-2xl w-fit">
                                            {(['매매', '전세', '월세'] as const).map((type) => {
                                                const isSelected = selectedTargetTab === type;
                                                return (
                                                    <button
                                                        key={type}
                                                        onClick={() => {
                                                            setSelectedTargetTab(type);
                                                            setTargetAptTradesLimit(10);
                                                        }}
                                                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all duration-300 ${isSelected
                                                            ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                                                            : 'text-slate-500 hover:text-slate-300'
                                                            }`}
                                                    >
                                                        {type}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {targetAptTrades.length === 0 ? (
                                            <div className="py-12 text-center text-slate-500 italic text-xs font-bold bg-white/[0.01] rounded-2xl border border-white/5">
                                                해당 유형의 거래 내역이 없습니다.
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {targetAptTrades.slice(0, targetAptTradesLimit).map((trade: any, index: number) => {
                                                    const isRent = trade._isRent === true;
                                                    const priceLabel = formatTradePrice(trade);
                                                    return (
                                                        <div
                                                            key={index}
                                                            className="flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl border border-white/5 transition-all duration-300"
                                                        >
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] text-slate-500 font-bold">
                                                                    {trade.dealYear}.{trade.dealMonth}.{trade.dealDay}
                                                                </span>
                                                                <p className="text-xs font-black text-slate-200">
                                                                    {trade.floor ? `${trade.floor}층` : '-'} | 전용 {trade.excluUseAr || trade.area || '-'}㎡
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <span
                                                                    className={`text-sm font-black ${isRent ? 'text-amber-400' : 'text-sky-400'
                                                                        }`}
                                                                >
                                                                    {priceLabel}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {targetAptTrades.length > targetAptTradesLimit && (
                                                    <button
                                                        onClick={() => setTargetAptTradesLimit(prev => prev + 10)}
                                                        className="w-full flex items-center justify-center gap-1.5 py-3.5 bg-sky-500/5 hover:bg-sky-500/10 border border-sky-500/15 rounded-2xl text-xs font-black text-sky-400 transition-all duration-300 mt-4"
                                                    >
                                                        <span>실거래가 더보기 ({targetAptTrades.length - targetAptTradesLimit}개 남음)</span>
                                                        <ChevronDown className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* 지목별 거래량 (Volume Stats) - 토지 전용 */}
                            {!isApartmentCategory && (
                                <section className="bg-slate-900 border border-white/5 rounded-[40px] p-8 shadow-2xl">
                                    <h4 className="text-base font-semibold text-white/90 mb-6 pb-4 border-b border-white/[0.06]">
                                        <span>지목별 최근 거래량 추이</span>
                                    </h4>

                                    {/* 필터 UI */}
                                    <div className="flex flex-wrap gap-2 mb-8">
                                        {['전체', '대', '도로', '임야', '전', '답'].map((f) => (
                                            <button
                                                key={f}
                                                onClick={() => setSelectedChartFilter(f)}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${selectedChartFilter === f
                                                    ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                                                    : 'bg-white/5 text-slate-500 border border-white/5 hover:bg-white/10'
                                                    }`}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="h-[300px] w-full">
                                        {volumeTrendData && volumeTrendData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={volumeTrendData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                    <XAxis
                                                        dataKey="month"
                                                        stroke="#475569"
                                                        fontSize={9}
                                                        height={35}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={renderVolumeXAxisTick}
                                                    />
                                                    <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                                                    <Tooltip
                                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                        contentStyle={{ backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '10px' }}
                                                        labelFormatter={(label) => `${label} 거래 현황`}
                                                        formatter={(val: any) => [`${val}건`, '거래량']}
                                                    />
                                                    <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24}>
                                                        {volumeTrendData.map((entry: any, index: number) => (
                                                            <Cell
                                                                key={`cell-${index}`}
                                                                fill={index === volumeTrendData.length - 1 ? '#10b981' : 'rgba(255,255,255,0.1)'}
                                                                stroke={index === volumeTrendData.length - 1 ? 'none' : 'rgba(255,255,255,0.05)'}
                                                            />
                                                        ))}
                                                        <LabelList
                                                            dataKey="count"
                                                            position="insideTop"
                                                            fill="#ffffff"
                                                            fontSize={9}
                                                            fontWeight="bold"
                                                            formatter={(val: any) => val > 0 ? `${val}건` : ''}
                                                            offset={5}
                                                        />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : <p className="text-slate-500 italic text-center py-20">최근 거래량 통계 부족</p>}
                                    </div>
                                </section>
                            )}

                            {/* 유형별 개별 시장 데이터 (아파트, 빌라 등 각각 개별 차트 및 리스트) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {rawData?.vitals?.regionalTrades && rawData.vitals.regionalTrades.length > 0 ? (
                                    rawData.vitals.regionalTrades.map((group: any, idx: number) => {
                                        // 차트 전용 데이터 가공 (콤마 제거 및 숫자 변환)
                                        const chartData = [...group.data].slice(0, 15).reverse().map((item: any) => ({
                                            ...item,
                                            dealAmount: item.dealAmount ? Number(String(item.dealAmount).replace(/,/g, '')) : 0,
                                            deposit: item.deposit ? Number(String(item.deposit).replace(/,/g, '')) : 0,
                                        }));
                                        const isRent = (group.type || '').includes('전월세');

                                        return (
                                            <section key={idx} className="bg-white/[0.02] hover:bg-[#0f172a]/40 border border-white/[0.06] hover:border-white/[0.1] rounded-[32px] p-6 lg:p-8 flex flex-col gap-6 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-black/25">
                                                <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                                                            <TrendingUp className="w-5 h-5 text-indigo-400" />
                                                        </div>
                                                        <div>
                                                            <h5 className="text-[14px] font-bold text-white tracking-tight">{group.type || '부동산 거래'}</h5>
                                                            <p className="text-xs text-slate-400 font-medium">시세 및 최근 실거래 현황</p>
                                                        </div>
                                                    </div>
                                                    <span className="px-2.5 py-1 bg-white/[0.04] border border-white/[0.06] rounded-full text-[10px] font-semibold text-slate-400">
                                                        {group.data.length}건 탐지
                                                    </span>
                                                </div>

                                                {/* 개별 차트 */}
                                                <div className="h-[240px] w-full">
                                                    {group.data && group.data.length > 0 ? (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                                <defs>
                                                                    <linearGradient id={`gradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="5%" stopColor={
                                                                            (group.type || '').includes('아파트') ? '#0ea5e9' :
                                                                                (group.type || '').includes('연립') ? '#10b981' :
                                                                                    (group.type || '').includes('오피스텔') ? '#f59e0b' : '#8b5cf6'
                                                                        } stopOpacity={0.4} />
                                                                        <stop offset="95%" stopColor={
                                                                            (group.type || '').includes('아파트') ? '#0ea5e9' :
                                                                                (group.type || '').includes('연립') ? '#10b981' :
                                                                                    (group.type || '').includes('오피스텔') ? '#f59e0b' : '#8b5cf6'
                                                                        } stopOpacity={0} />
                                                                    </linearGradient>
                                                                </defs>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                                                <XAxis dataKey="dealDay" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}일`} />
                                                                <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(val) => {
                                                                    if (val >= 10000) return `${(val / 10000).toFixed(1)}억`;
                                                                    return `${val.toLocaleString()}만`;
                                                                }} />
                                                                <Tooltip contentStyle={{ backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '11px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} labelFormatter={(label) => `${label}일 거래`} formatter={(val: any) => [`${Number(String(val).replace(/,/g, '')).toLocaleString()}만원`, '금액']} />
                                                                <Area type="monotone" dataKey={isRent ? 'deposit' : 'dealAmount'} stroke={
                                                                    (group.type || '').includes('아파트') ? '#0ea5e9' :
                                                                        (group.type || '').includes('연립') ? '#10b981' :
                                                                            (group.type || '').includes('오피스텔') ? '#f59e0b' : '#8b5cf6'
                                                                } strokeWidth={4} fillOpacity={0.6} fill={`url(#gradient-${idx})`} animationDuration={1500} dot={{ r: 4, fill: '#fff', strokeWidth: 2, stroke: (group.type || '').includes('아파트') ? '#0ea5e9' : (group.type || '').includes('연립') ? '#10b981' : (group.type || '').includes('오피스텔') ? '#f59e0b' : '#8b5cf6' }} />
                                                            </AreaChart>
                                                        </ResponsiveContainer>
                                                    ) : <div className="h-full flex items-center justify-center text-slate-600 italic text-xs">데이터 부족</div>}
                                                </div>

                                                {/* 상세 거래 리스트 */}
                                                <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                                                    {group.data.map((trade: any, i: number) => {
                                                        const depositVal = trade.deposit !== undefined && trade.deposit !== null ? String(trade.deposit).replace(/,/g, '') : '0';
                                                        const dealAmountVal = trade.dealAmount !== undefined && trade.dealAmount !== null ? String(trade.dealAmount).replace(/,/g, '') : '0';
                                                        const priceVal = isRent
                                                            ? `보증금 ${Number(depositVal || 0).toLocaleString()}${trade.monthlyRent && trade.monthlyRent !== '0' ? ` / 월 ${Number(trade.monthlyRent).toLocaleString()}` : ''}`
                                                            : `${Number(dealAmountVal || 0).toLocaleString()}만원`;

                                                        return (
                                                            <div key={i} className="group p-3 bg-white/[0.01] hover:bg-white/[0.03] rounded-xl border border-white/[0.04] hover:border-white/[0.08] transition-all">
                                                                <div className="flex items-center justify-between mb-1.5 gap-4">
                                                                    <p className="text-[13px] font-bold text-slate-200 truncate flex-1">
                                                                        {trade.aptNm || trade.mhouseNm || trade.offiNm || trade.roadNm || trade.sggNm || '지정 건축물'}
                                                                    </p>
                                                                    <span className="text-[13px] font-extrabold text-emerald-400 shrink-0">{priceVal}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between text-[10px] text-slate-400">
                                                                    <p className="font-medium">
                                                                        {trade.dealYear}.{String(trade.dealMonth).padStart(2, '0')}.{String(trade.dealDay).padStart(2, '0')} · {trade.floor ? `${trade.floor}층` : trade.buildYear ? `${trade.buildYear}년 준공` : '다중건물'} · {trade.excluUseAr || trade.exArea || trade.area || trade.plottage || trade.totArea || '-'}㎡
                                                                    </p>
                                                                    <span className="text-slate-500 font-semibold uppercase">{trade.contractType || '일반'}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </section>
                                        );
                                    })
                                ) : <div className="col-span-full p-20 text-center text-slate-500">시장 통계 데이터가 제공되지 않았습니다. 관련 지자체 문의</div>}
                            </div>

                            {/* 토지 실거래 기록 (Fire Sales) - 토지 전용 */}
                            {!isApartmentCategory && (
                                <section className="bg-slate-900 border border-white/5 rounded-[40px] p-8">
                                    <h4 className="text-base font-semibold text-white/90 mb-6 pb-4 border-b border-white/[0.06]">
                                        <span>탐지된 토지 실거래 내역</span>
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {rawData?.nearbyData?.firesales && rawData.nearbyData.firesales.length > 0 ? (
                                            rawData.nearbyData.firesales.slice(0, 12).map((sale: any, i: number) => (
                                                <div key={i} className="group relative p-5 bg-white/[0.02] hover:bg-[#0f172a]/70 rounded-[24px] border border-white/[0.06] hover:border-emerald-500/30 flex flex-col justify-between min-h-[145px] shadow-sm hover:shadow-lg hover:shadow-black/30 transition-all duration-300 hover:-translate-y-0.5">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-1.5">
                                                                {sale.jimok && (
                                                                    <span className="inline-flex px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-md">
                                                                        {sale.jimok}
                                                                    </span>
                                                                )}
                                                                {sale.posesnNm && (
                                                                    <span className="inline-flex px-2 py-0.5 bg-white/[0.04] border border-white/[0.06] text-slate-400 text-[10px] font-semibold rounded-md">
                                                                        {sale.posesnNm} 소유
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm font-bold text-white tracking-tight leading-snug">
                                                                {sale.umdNm} {sale.jibun}
                                                            </p>
                                                        </div>
                                                        <span className="text-[11px] font-semibold text-slate-400 font-mono">
                                                            {sale.dealYear}.{String(sale.dealMonth).padStart(2, '0')}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-end justify-between pt-2 border-t border-white/[0.04]">
                                                        <div className="text-[11px] text-slate-400 space-y-0.5 font-medium">
                                                            <p>{sale.dealArea}㎡ ({Math.round(sale.dealArea * 0.3025)}평)</p>
                                                            <p className="text-slate-500 text-[10px]">{sale.landUse}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] text-emerald-400/70 font-bold uppercase tracking-wider mb-0.5">실거래가</p>
                                                            <p className="text-base font-extrabold text-emerald-400">
                                                                {Number(String(sale.dealAmount || 0).replace(/,/g, '')).toLocaleString()}만원
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : <p className="col-span-full text-center py-10 text-slate-500 italic">토지 실거래 기록이 없습니다.</p>}
                                    </div>
                                </section>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'additional_info' && (
                        <motion.div key="additional_info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <h3 className="text-2xl font-black">지역 조례 · 공급 · 동향</h3>
                                <div className="p-1 px-4 bg-white/5 border border-white/10 rounded-full">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Premium Curation</span>
                                </div>
                            </div>

                            {/* 1. 주택 공급 현황 */}
                            <section className="bg-slate-900 border border-white/5 rounded-[40px] p-8 shadow-2xl space-y-6">
                                <h4 className="text-base font-semibold text-white/90 mb-6 pb-4 border-b border-white/[0.06] flex items-center gap-3">
                                    <Building2 className="w-5 h-5 text-sky-500" />
                                    <span>해당 지역 주택 공급 현황</span>
                                </h4>

                                {(() => {
                                    const hs = rawData?.housingSupply || mergedData?.housingSupply || {};
                                    if (!hs || Object.keys(hs).length === 0) {
                                        return (
                                            <div className="flex flex-col items-center justify-center py-16 gap-2 opacity-35">
                                                <Search className="w-8 h-8" />
                                                <p className="text-xs font-bold">주택 공급 데이터 부족</p>
                                            </div>
                                        );
                                    }

                                    const nextYears = hs.nextYears || {};
                                    const planned = nextYears.planned?.count ?? '0';
                                    const moveIn = nextYears.moveIn?.count ?? '0';
                                    const unsold = hs.unsold?.current ?? '0';
                                    const unsoldTrend = hs.unsold?.trend ?? '안정';
                                    const permits = hs.permits?.last12months ?? '0';
                                    const glutScore = hs.glutScore ?? '0';
                                    const plannedDetails = hs.plannedDetails || [];

                                    return (
                                        <div className="space-y-8">
                                            {/* 핵심 지표 그리드 */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="p-6 bg-sky-500/5 rounded-3xl border border-sky-500/10 flex flex-col justify-between">
                                                    <p className="text-[10px] font-black text-sky-400 uppercase tracking-wider mb-4">향후 분양 예정</p>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-3xl font-black text-white">{Number(planned).toLocaleString()}</span>
                                                        <span className="text-xs font-bold text-slate-400">세대</span>
                                                    </div>
                                                </div>
                                                <div className="p-6 bg-purple-500/5 rounded-3xl border border-purple-500/10 flex flex-col justify-between">
                                                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-wider mb-4">입주 예정 물량</p>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-3xl font-black text-white">{Number(moveIn).toLocaleString()}</span>
                                                        <span className="text-xs font-bold text-slate-400">세대</span>
                                                    </div>
                                                </div>
                                                <div className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 flex flex-col justify-between">
                                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider mb-4">미분양 현황</p>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-3xl font-black text-white">{Number(unsold).toLocaleString()}</span>
                                                        <span className="text-xs font-bold text-slate-400">세대 ({unsoldTrend})</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 보조 지표 */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-bold text-slate-400">최근 1년 인허가 실적</span>
                                                    <span className="text-sm font-black text-white">{permits} 건</span>
                                                </div>
                                                <div className="flex justify-between items-center border-t border-white/5 md:border-t-0 md:border-l md:pl-6 pt-4 md:pt-0">
                                                    <span className="text-xs font-bold text-slate-400">공급 과잉 지수 (Glut Score)</span>
                                                    <span className="text-sm font-black text-sky-400">{glutScore} / 100</span>
                                                </div>
                                            </div>

                                            {/* 세부 분양 정보 리스트 */}
                                            {plannedDetails.length > 0 && (
                                                <div className="space-y-4">
                                                    <h5 className="text-xs font-black text-slate-300">예정된 구체적 분양/공급 사업지</h5>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                        {plannedDetails.map((detail: any, i: number) => (
                                                            <div key={i} className="p-4 bg-white/[0.01] hover:bg-white/[0.03] rounded-2xl border border-white/5 transition-all">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <span className="text-xs font-black text-sky-400 truncate max-w-[200px]">{detail.name || '공급 사업'}</span>
                                                                    <span className="text-[10px] font-bold text-slate-400">{detail.count} 세대</span>
                                                                </div>
                                                                {detail.address && (
                                                                    <p className="text-[10px] text-slate-500 truncate">{detail.address}</p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </section>

                            {/* 2. 동적 호재 및 큐레이션 */}
                            <section className="bg-slate-900 border border-white/5 rounded-[40px] p-8 shadow-2xl space-y-6">
                                <h4 className="text-base font-semibold text-white/90 mb-6 pb-4 border-b border-white/[0.06] flex items-center gap-3">
                                    <Lightbulb className="w-5 h-5 text-emerald-400" />
                                    <span>동적 호재 및 뉴스 큐레이션</span>
                                </h4>

                                {(() => {
                                    const dn = rawData?.dynamicNews || {};
                                    const items = dn.items || [];
                                    if (items.length === 0) {
                                        return (
                                            <div className="flex flex-col items-center justify-center py-16 gap-2 opacity-35">
                                                <Search className="w-8 h-8" />
                                                <p className="text-xs font-bold">동적 호재 데이터 부족</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                                            {items.map((item: any, i: number) => {
                                                const title = item.title || '호재 소식';
                                                const type = item.type || '동향';
                                                const date = item.date || item.news_date || '-';
                                                const source = item.source || '';
                                                const hasLink = source.startsWith('http://') || source.startsWith('https://');

                                                const cardContent = (
                                                    <div className="group p-5 bg-white/[0.02] hover:bg-emerald-500/5 rounded-3xl border border-white/5 hover:border-emerald-500/20 transition-all flex flex-col justify-between min-h-[120px] cursor-pointer">
                                                        <div>
                                                            <div className="flex justify-between items-center mb-3">
                                                                <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg uppercase tracking-wider">{type}</span>
                                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                                                    {hasLink && <ExternalLink className="w-3 h-3 text-emerald-400" />}
                                                                    <span>{date}</span>
                                                                </div>
                                                            </div>
                                                            <h5 className="text-xs sm:text-sm font-black text-white leading-snug group-hover:text-emerald-400 transition-colors line-clamp-2">{title}</h5>
                                                        </div>
                                                    </div>
                                                );

                                                if (hasLink) {
                                                    return (
                                                        <a key={i} href={source} target="_blank" rel="noopener noreferrer" className="block">
                                                            {cardContent}
                                                        </a>
                                                    );
                                                }

                                                return <div key={i}>{cardContent}</div>;
                                            })}
                                        </div>
                                    );
                                })()}
                            </section>

                            {/* 3. 지자체 조례 핵심 */}
                            <section className="bg-slate-900 border border-white/5 rounded-[40px] p-8 shadow-2xl space-y-6">
                                <h4 className="text-base font-semibold text-white/90 mb-6 pb-4 border-b border-white/[0.06] flex items-center gap-3">
                                    <Gavel className="w-5 h-5 text-purple-400" />
                                    <span>지자체 조례 핵심 분석</span>
                                </h4>

                                {(() => {
                                    const ord = rawData?.ordinance || {};
                                    let list = ord.ordinances || [];
                                    if (list.length === 0 && ord.core && typeof ord.core === 'object') {
                                        list = ord.core.ordinances || [];
                                    }

                                    if (list.length === 0) {
                                        return (
                                            <div className="flex flex-col items-center justify-center py-16 gap-2 opacity-35">
                                                <Search className="w-8 h-8" />
                                                <p className="text-xs font-bold">지자체 조례 데이터 없음</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                                            {list.map((item: any, i: number) => {
                                                const title = item.title || '조례 항목';
                                                const summary = item.summary || item.content || '세부 정보 없음';

                                                return (
                                                    <div key={i} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></div>
                                                            <span className="text-xs font-black text-purple-400">{title}</span>
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-300 leading-relaxed">{summary}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </section>
                        </motion.div>
                    )}

                    {activeTab === 'gosi' && (
                        <motion.div key="gosi" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                            <h3 className="text-2xl font-black">결정 및 시행 공고</h3>

                            {/* ── 결정/시행공고 (Gosi) ── 전체너비 전용 카드 */}
                            <section className="bg-slate-900 border border-white/5 rounded-[40px] p-8 shadow-xl">
                                <div className="flex items-center gap-3 mb-6">
                                    <Landmark className="w-5 h-5 text-orange-500" />
                                    <h4 className="text-sm font-black text-slate-200">결정/시행공고 (Gosi)</h4>
                                    {rawData?.regulatoryData?.gosi?.length > 0 && (
                                        <span className="ml-auto text-[10px] font-black text-orange-500/60 uppercase tracking-widest">
                                            {rawData.regulatoryData.gosi.length}건
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-3 overflow-y-auto max-h-[420px] pr-2 custom-scrollbar">
                                    {rawData?.regulatoryData?.gosi && rawData.regulatoryData.gosi.length > 0 ? (
                                        rawData.regulatoryData.gosi.slice(0, 15).map((item: any, i: number) => {
                                            const gosiDate = item.gosiDate || item.gosi_date || '';
                                            const formattedDate = gosiDate.length === 8
                                                ? gosiDate.slice(0, 4) + '.' + gosiDate.slice(4, 6) + '.' + gosiDate.slice(6, 8)
                                                : gosiDate;
                                            const url = item.url || '';
                                            const summary = item.summary || '';
                                            const title = item.title || '고시 내용';

                                            return (
                                                <div key={i} className="group p-5 bg-white/[0.02] hover:bg-orange-500/5 rounded-2xl border border-white/5 hover:border-orange-500/20 transition-all">
                                                    {/* 제목 */}
                                                    <p className="text-[12px] font-bold text-slate-100 leading-snug mb-2">{title}</p>

                                                    {/* 날짜 + 요약 */}
                                                    <div className="flex items-start gap-2 mb-3">
                                                        {formattedDate && (
                                                            <span className="shrink-0 text-[10px] font-black text-orange-500/80 bg-orange-500/10 px-2 py-0.5 rounded-lg">
                                                                {formattedDate}
                                                            </span>
                                                        )}
                                                        {summary && (
                                                            <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">{summary}</p>
                                                        )}
                                                    </div>

                                                    {/* URL 이동 버튼 */}
                                                    {url && (
                                                        <a
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 text-[10px] font-black text-orange-400 hover:text-orange-300 transition-colors group-hover:underline"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                                            </svg>
                                                            고시 원문 보기 →
                                                        </a>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-16 gap-2 opacity-30">
                                            <Search className="w-8 h-8" />
                                            <p className="text-xs font-bold">진행 데이터 없음</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </motion.div>
                    )}

                    {activeTab === 'regulatory' && (() => {
                        const permitList = rawData?.regulatoryData?.permits || [];
                        const propertyAddress = rawData?.location?.address || report?.address || reportData?.propertyTitle || '';
                        const { grouped: groupedPermits, sortedYears: permitYears } = groupPermitsByYear(permitList);

                        const renderPermitInfoChip = (label: string, value: string) => (
                            <span key={label} className="inline-flex items-center px-2 py-1 bg-white/5 rounded-md text-[10px]">
                                <span className="text-slate-500">{label} </span>
                                <span className="text-slate-200 font-bold">{value}</span>
                            </span>
                        );

                        const renderPermitItem = (item: any, i: number) => {
                            const title = item.archGbCdNm || '인허가 항목';
                            const bldNm = item.bldNm?.trim?.() || item.bldNm || '';
                            const platPlc = item.platPlc || item.platAddr || '';
                            const dispName = bldNm
                                ? bldNm
                                : (platPlc || propertyAddress || '인허가 대상지');
                            const pmsDay = formatDate(item.archPmsDay);
                            const platArea = item.platArea ?? '-';
                            const totArea = item.totArea ?? '-';
                            const mainPurps = item.mainPurpsCdNm || '-';
                            const jimok = item.jimokCdNm || '-';
                            const jiyuk = item.jiyukCdNm || '-';
                            const jigu = item.jiguCdNm || '-';
                            const showAddress = platPlc || propertyAddress;

                            return (
                                <div key={i} className="p-4 bg-white/[0.02] hover:bg-white/5 rounded-2xl border border-white/5 transition-all">
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <p className="text-[13px] font-bold text-slate-100 truncate flex-1">{dispName}</p>
                                        <span className="shrink-0 text-[10px] font-black text-sky-400 bg-sky-500/10 px-2 py-1 rounded-md">
                                            {title}
                                        </span>
                                    </div>
                                    {showAddress && dispName !== showAddress && (
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                                            <p className="text-[11px] text-slate-400 truncate">{showAddress}</p>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                                        <p className="text-[11px] text-slate-400">허가일: {pmsDay}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 mb-3">
                                        <Building2 className="w-3 h-3 text-slate-500 shrink-0" />
                                        <p className="text-[11px] text-slate-400 truncate">주용도: {mainPurps}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {renderPermitInfoChip('대지면적', `${platArea}㎡`)}
                                        {renderPermitInfoChip('연면적', `${totArea}㎡`)}
                                        {renderPermitInfoChip('지목', jimok)}
                                        {renderPermitInfoChip('지역', jiyuk)}
                                        {jigu !== '-' && renderPermitInfoChip('지구', jigu)}
                                    </div>
                                </div>
                            );
                        };

                        return (
                            <motion.div key="regulatory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                <h3 className="text-2xl font-black">개발 호재 및 인허가 현황</h3>

                                <div className="grid grid-cols-1 gap-6">
                                    {/* ── 인허가 현황 (연도별 그룹) ── */}
                                    <section className="bg-slate-900 border border-white/5 rounded-[40px] p-8 flex flex-col shadow-xl">
                                        <div className="flex items-center gap-3 mb-6">
                                            <FileText className="w-5 h-5 text-sky-500" />
                                            <h4 className="text-sm font-black text-slate-200">인허가 현황</h4>
                                            {permitList.length > 0 && (
                                                <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-sky-500">
                                                    {permitList.length}건
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-2 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                                            {permitList.length > 0 ? (
                                                permitYears.map((year) => (
                                                    <div key={year}>
                                                        <div className="flex items-center gap-2 pt-4 pb-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                                                            <span className="text-[13px] font-black text-slate-200">{year}</span>
                                                            <span className="text-[11px] font-bold text-slate-500">({groupedPermits[year].length}건)</span>
                                                        </div>
                                                        <div className="space-y-2.5">
                                                            {groupedPermits[year].map(renderPermitItem)}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-16 gap-2 opacity-30">
                                                    <Search className="w-8 h-8" />
                                                    <p className="text-xs font-bold">진행 데이터 없음</p>
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    {/* ── 개발 호재 (고시 기반) ── */}
                                    {[
                                        { title: '도시정비사업 (재개발·재건축)', data: (rawData?.regulatoryData?.gosi || []).filter((g: any) => /재개발|재건축|정비/.test(g.title || '')), icon: Activity, color: 'text-orange-500' },
                                        { title: '지구단위계획', data: (rawData?.regulatoryData?.gosi || []).filter((g: any) => /지구단위/.test(g.title || '')), icon: Map, color: 'text-emerald-500' },
                                        { title: '실시계획인가', data: (rawData?.regulatoryData?.gosi || []).filter((g: any) => /실시계획|인가/.test(g.title || '')), icon: Activity, color: 'text-purple-500' },
                                    ].map((box, idx) => (
                                        <section key={idx} className="bg-slate-900 border border-white/5 rounded-[40px] p-8 flex flex-col shadow-xl">
                                            <div className="flex items-center gap-3 mb-6">
                                                <box.icon className={`w-5 h-5 ${box.color}`} />
                                                <h4 className="text-sm font-black text-slate-200">{box.title}</h4>
                                                {box.data && box.data.length > 0 && (
                                                    <span className={`ml-auto text-[10px] font-black uppercase tracking-widest ${box.color}`}>
                                                        {box.data.length}건
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                                                {box.data && box.data.length > 0 ? box.data.slice(0, 15).map((item: any, i: number) => (
                                                    <div key={i} className="p-5 bg-white/[0.02] hover:bg-white/5 rounded-2xl border border-white/5 group transition-all">
                                                        {item.bldNm && item.bldNm.trim() !== "" && (
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <div className="w-1 h-1 rounded-full bg-sky-500 animate-pulse"></div>
                                                                <p className="text-[10px] font-black text-sky-500 uppercase tracking-tighter">{item.bldNm}</p>
                                                            </div>
                                                        )}
                                                        <p className="text-[11px] font-bold text-slate-200 leading-snug mb-3">
                                                            {item.title || item.plan_nm || item.area_nm || item.zone_name || item.location_name || item.mainPurpsCdNm || '상세 규제 예정'}
                                                        </p>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                                    <Clock className="w-2.5 h-2.5" />
                                                                    {formatDate(item.gosiDate || item.gosi_date || item.archPmsDay || item.plan_wrtg_de || item.sys_updt_dt || item.plan_year)}
                                                                </span>
                                                                <span className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-slate-400 font-bold">{item.projectType || item.archGbCdNm || item.prcs_stts_stcd || '진행중'}</span>
                                                            </div>
                                                            {item.useAprDay && item.useAprDay.trim() !== "" && (
                                                                <div className="flex items-center gap-1">
                                                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                                    <span className="text-[9px] text-emerald-500/80 font-black">승인완료</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="flex flex-col items-center justify-center h-full gap-2 opacity-30">
                                                        <Search className="w-8 h-8" />
                                                        <p className="text-xs font-bold">진행 데이터 없음</p>
                                                    </div>
                                                )}
                                            </div>
                                        </section>
                                    ))}
                                </div>
                            </motion.div>
                        );
                    })()}

                    {activeTab === 'commercial' && (
                        <motion.div key="commercial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                            {(() => {
                                const commercial = rawData?.commercialData;
                                if (!commercial) return (
                                    <div className="p-20 text-center text-slate-500 bg-white/5 rounded-3xl border border-white/10">
                                        <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <p className="italic">상권 데이터가 존재하지 않습니다.</p>
                                    </div>
                                );

                                const storeOverview = commercial.storeOverview;
                                const stores = commercial.stores;
                                const within500m = stores?.within500m;
                                const within1km = stores?.within1km;
                                const within2km = stores?.within2km;
                                const household = commercial.household;
                                const populationAge = commercial.populationAge;
                                const housingType = commercial.housingType;
                                const workingPop = commercial.workingPopulation;
                                const academyStores = commercial.academyStores;
                                const tenants: any[] = commercial.buildingTenants || [];

                                const SectionCard = ({ title, icon: Icon, color, children }: { title: string; icon: any; color: string; children: React.ReactNode }) => (
                                    <section className="rounded-[28px] overflow-hidden border" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderColor: `${color}18` }}>
                                        <div className="px-6 py-5 flex items-center gap-3" style={{ background: `${color}0d` }}>
                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}25` }}>
                                                <Icon className="w-5 h-5" style={{ color }} />
                                            </div>
                                            <span className="text-sm font-bold text-white">{title}</span>
                                        </div>
                                        <div className="p-6 space-y-3">{children}</div>
                                    </section>
                                );

                                const DataRow = ({ label, value, color = '#94a3b8' }: { label: string; value: any; color?: string }) => (
                                    <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${color}18` }}>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-bold text-slate-400 mb-0.5">{label}</p>
                                            <p className="text-base font-black text-white">{value ?? '-'}</p>
                                        </div>
                                    </div>
                                );

                                const ZoneCard = ({ title, data, color }: { title: string; data: any; color: string }) => {
                                    if (!data) return null;
                                    return (
                                        <div className="p-4 rounded-2xl border" style={{ background: `${color}08`, borderColor: `${color}20` }}>
                                            <p className="text-xs font-bold mb-3" style={{ color }}>{title}</p>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
                                                    <ShoppingBag className="w-3.5 h-3.5" style={{ color }} />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] text-slate-400">총 점포수</p>
                                                    <p className="text-lg font-black text-white">{data.totalStores ?? 0}개</p>
                                                </div>
                                            </div>
                                            {data.categories && (data.categories as any[]).slice(0, 3).map((c: any, i: number) => (
                                                <div key={i} className="flex justify-between items-center py-1.5 px-3 rounded-xl mb-1" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                                    <span className="text-[11px] text-slate-300">{c.name}</span>
                                                    <span className="text-[11px] font-bold text-white">{c.count}개</span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                };

                                return (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-2xl font-black">상권 분석 지표</h3>
                                            <span className="text-[10px] font-black px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">실시간</span>
                                        </div>

                                        {academyStores && (
                                            <SectionCard title="주변 학원" icon={GraduationCap} color="#0ea5e9">
                                                <DataRow
                                                    label="반경 1km"
                                                    value={`${academyStores.within1km?.totalStores ?? 0}개`}
                                                    color="#0ea5e9"
                                                />
                                                <DataRow
                                                    label="1~2km"
                                                    value={`${academyStores.within2km?.totalStores ?? 0}개`}
                                                    color="#38bdf8"
                                                />
                                            </SectionCard>
                                        )}

                                        {/* 1. 반경 500m 상권 현황 */}
                                        {storeOverview && (
                                            <SectionCard title="반경 500m 상권 현황" icon={ShoppingBag} color="#3b82f6">
                                                <DataRow label="총 점포 수" value={`${storeOverview.totalStores ?? 0}개`} color="#3b82f6" />
                                                {storeOverview.categories && (storeOverview.categories as any[]).slice(0, 5).map((c: any, i: number) => (
                                                    <DataRow key={i} label={c.name} value={`${c.count ?? 0}개`} color="#60a5fa" />
                                                ))}
                                            </SectionCard>
                                        )}

                                        {/* 2. 희망업종 경쟁 현황 */}
                                        {(within500m || within1km || within2km) && (
                                            <section className="rounded-[28px] overflow-hidden border" style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', borderColor: '#f8717120' }}>
                                                <div className="px-6 py-5 flex items-center gap-3" style={{ background: '#f871710d' }}>
                                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-500/20">
                                                        <Activity className="w-5 h-5 text-red-400" />
                                                    </div>
                                                    <span className="text-sm font-bold text-white">희망업종 경쟁 현황</span>
                                                </div>
                                                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <ZoneCard title="500m 이내 (도보권)" data={within500m} color="#f87171" />
                                                    <ZoneCard title="1km 이내 (핵심 경쟁권)" data={within1km} color="#fca5a5" />
                                                    <ZoneCard title="1~2km (배달/확장 경쟁권)" data={within2km} color="#fb923c" />
                                                </div>
                                            </section>
                                        )}

                                        {/* 3. 배후세대 */}
                                        {household && (
                                            <SectionCard title="배후세대" icon={Users} color="#10b981">
                                                <div className="grid grid-cols-3 gap-3">
                                                    <DataRow label="세대수" value={`${(household.householdCount ?? 0).toLocaleString()}가구`} color="#10b981" />
                                                    <DataRow label="인구" value={`${(household.totalPopulation ?? 0).toLocaleString()}명`} color="#34d399" />
                                                    <DataRow label="평균 가구원" value={`${household.avgFamilyMembers ?? '-'}명`} color="#6ee7b7" />
                                                </div>
                                            </SectionCard>
                                        )}

                                        {/* 4. 연령별 인구 */}
                                        {populationAge && (populationAge.ages as any[])?.length > 0 && (
                                            <SectionCard title="연령별 인구 특성" icon={Users} color="#f97316">
                                                <div className="grid grid-cols-2 gap-3 mb-3">
                                                    <DataRow label="주요 연령대" value={populationAge.mainAge} color="#f97316" />
                                                    <DataRow label="20~40대 비율" value={`${populationAge.youngRatio ?? '-'}%`} color="#fb923c" />
                                                </div>
                                                {(populationAge.ages as any[]).slice(0, 5).map((a: any, i: number) => (
                                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.025)' }}>
                                                        <span className="text-xs font-bold text-slate-300 w-16 shrink-0">{a.label}</span>
                                                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min((a.ratio || 0) * 4, 100)}%` }} />
                                                        </div>
                                                        <span className="text-xs font-black text-orange-400 w-10 text-right">{a.ratio}%</span>
                                                    </div>
                                                ))}
                                            </SectionCard>
                                        )}

                                        {/* 5. 거주 형태 */}
                                        {housingType && (housingType.breakdown as any[])?.length > 0 && (
                                            <SectionCard title="거주 형태 (거처 종류)" icon={Building2} color="#a855f7">
                                                {(housingType.breakdown as any[]).slice(0, 4).map((h: any, i: number) => (
                                                    <DataRow key={i} label={h.name} value={`${h.ratio}%`} color="#c084fc" />
                                                ))}
                                            </SectionCard>
                                        )}

                                        {/* 6. 직장 인구 */}
                                        {workingPop && (
                                            <SectionCard title="직장 인구 (서울시 한정)" icon={Users} color="#06b6d4">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <DataRow label="총 직장 인구" value={`${(workingPop.total ?? '-').toLocaleString()}명`} color="#06b6d4" />
                                                    <DataRow label="주요 연령대" value={workingPop.mainAge} color="#22d3ee" />
                                                    <DataRow label="점심 수요" value={workingPop.lunchDemand} color="#67e8f9" />
                                                </div>
                                            </SectionCard>
                                        )}

                                        {/* 7. 건물 입점 현황 */}
                                        {tenants.length > 0 && (
                                            <section className="rounded-[28px] overflow-hidden border" style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', borderColor: '#2dd4bf18' }}>
                                                <div className="px-6 py-5 flex items-center gap-3" style={{ background: '#2dd4bf0d' }}>
                                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-teal-500/20">
                                                        <Building2 className="w-5 h-5 text-teal-400" />
                                                    </div>
                                                    <span className="text-sm font-bold text-white">건물 내 입점 현황</span>
                                                </div>
                                                <div className="p-6 space-y-3">
                                                    {tenants.slice(0, 10).map((t: any, i: number) => (
                                                        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.025)', borderColor: '#2dd4bf18' }}>
                                                            <div className="w-12 h-8 flex items-center justify-center rounded-lg shrink-0 bg-teal-500/15">
                                                                <span className="text-[11px] font-bold text-teal-400">{t.floor ?? '-'}층</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-white truncate">{t.business ?? '-'}</p>
                                                                <p className="text-[10px] text-slate-400 truncate">{t.name ?? '-'}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                    </>
                                );
                            })()}
                        </motion.div>
                    )}

                    {activeTab === 'population' && (() => {
                        const popData = rawData?.population || {};
                        const trend5Yr = popData?.trend?.trend || [];
                        const movementObj = popData?.movement || {};
                        const trend1Yr = movementObj?.trend || [];
                        const summary = movementObj?.summary || {};
                        const populationChange = parseInt(summary.populationChange) || 0;
                        const currentHouseholds = parseInt(summary.currentHouseholds) || 0;
                        const isGrowing = summary.isGrowing === true;
                        const umdComp = popData?.umdComparison;
                        const [chartMin, chartMax] = getMovementChartDomain(trend1Yr);

                        const firstPop5 = parseFloat(trend5Yr[0]?.population) || 0;
                        const lastPop5 = parseFloat(trend5Yr[trend5Yr.length - 1]?.population) || 0;
                        const fiveYrChange = lastPop5 - firstPop5;
                        const isGrowing5Yr = fiveYrChange > 0;
                        const avgChange5Yr = trend5Yr.length > 1 ? Math.round(fiveYrChange / (trend5Yr.length - 1)) : 0;

                        const chartAxisStyle = { fill: '#64748b', fontSize: 10 };
                        const chartMargin = { top: 12, right: 16, left: 4, bottom: 4 };

                        const PopChartTooltip = ({ active, payload, label }: any) => {
                            if (!active || !payload?.length) return null;
                            const formattedLabel = (() => {
                                const s = String(label ?? '');
                                if (s.length === 6) return `${s.substring(0, 4)}년 ${s.substring(4)}월`;
                                if (s.length === 4) return `${s}년`;
                                return s;
                            })();
                            const unitMap: Record<string, string> = { population: '명', households: '세대' };
                            return (
                                <div className="bg-slate-800/95 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 shadow-2xl min-w-[130px]">
                                    <p className="text-[10px] font-bold text-slate-400 mb-2">{formattedLabel}</p>
                                    {payload.map((entry: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between gap-4">
                                            <span className="flex items-center gap-1.5 text-[11px] text-slate-300">
                                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                                                {entry.name}
                                            </span>
                                            <span className="text-[11px] font-black text-white tabular-nums">
                                                {Number(entry.value).toLocaleString()}{unitMap[entry.dataKey] || ''}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            );
                        };

                        const PopStatCard = ({ value, label, accent }: { value: string | number; label: string; accent: 'sky' | 'purple' | 'amber' | 'emerald' | 'rose' }) => {
                            const styles = {
                                sky: 'text-sky-400',
                                purple: 'text-purple-400',
                                amber: 'text-amber-400',
                                emerald: 'text-emerald-400',
                                rose: 'text-rose-400',
                            };
                            return (
                                <div className="p-5 rounded-2xl border bg-white/[0.01] border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.03] transition-all text-center flex flex-col justify-center min-h-[90px] shadow-sm">
                                    <div className={`text-base font-extrabold tabular-nums ${styles[accent]}`}>{value}</div>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1">{label}</p>
                                </div>
                            );
                        };

                        return (
                            <motion.div key="population" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                <div className="flex items-center justify-between gap-4">
                                    <h3 className="text-2xl font-black">인구 · 세대 현황</h3>
                                    <span className="shrink-0 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-[10px] font-black text-emerald-400 tracking-widest uppercase">
                                        실시간
                                    </span>
                                </div>

                                {/* ── 5년 장기 추이 (SGIS) ── */}
                                <section className="bg-white/[0.02] hover:bg-[#0f172a]/40 border border-white/[0.06] hover:border-white/[0.1] rounded-[32px] p-6 lg:p-8 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-black/25">
                                    <h4 className="text-base font-semibold text-white/90 mb-6 pb-4 border-b border-white/[0.06]">
                                        <span>최근 5년 지역 인구 증감 추이</span>
                                    </h4>
                                    <div className="h-[300px] w-full">
                                        {trend5Yr.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={trend5Yr} margin={chartMargin}>
                                                    <defs>
                                                        <linearGradient id="pop5-gradient" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.15} />
                                                            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                                    <XAxis dataKey="year" tick={chartAxisStyle} tickLine={false} axisLine={false} dy={8} />
                                                    <YAxis tick={chartAxisStyle} tickLine={false} axisLine={false} tickFormatter={formatToMan} width={48} />
                                                    <Tooltip content={<PopChartTooltip />} cursor={{ stroke: 'rgba(56,189,248,0.2)', strokeWidth: 1 }} />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="population"
                                                        name="인구"
                                                        stroke="#38bdf8"
                                                        strokeWidth={3}
                                                        dot={{ r: 5, fill: '#38bdf8', strokeWidth: 2, stroke: '#0f172a' }}
                                                        activeDot={{ r: 7, fill: '#38bdf8', strokeWidth: 2, stroke: '#fff' }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
                                                <Activity className="w-10 h-10 opacity-20" />
                                                <p className="text-sm italic">5년 인구 통계 데이터가 부족합니다.</p>
                                            </div>
                                        )}
                                    </div>
                                    {trend5Yr.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
                                            <PopStatCard
                                                accent={isGrowing5Yr ? 'emerald' : 'amber'}
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
                                    )}
                                </section>

                                {/* ── 1년 단기 추이 (인구 + 세대수) ── */}
                                <section className="bg-white/[0.02] hover:bg-[#0f172a]/40 border border-white/[0.06] hover:border-white/[0.1] rounded-[32px] p-6 lg:p-8 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-black/25">
                                    <h4 className="text-base font-semibold text-white/90 mb-6 pb-4 border-b border-white/[0.06]">
                                        <span>최근 1년 인구 및 세대수 변화 추이</span>
                                    </h4>
                                    <div className="h-[300px] w-full">
                                        {trend1Yr.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ComposedChart data={trend1Yr} margin={chartMargin}>
                                                    <defs>
                                                        <linearGradient id="pop1-gradient" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="#34d399" stopOpacity={0.2} />
                                                            <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
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
                                                        width={48}
                                                    />
                                                    <Tooltip content={<PopChartTooltip />} cursor={{ stroke: 'rgba(52,211,153,0.15)', strokeWidth: 1 }} />
                                                    <Legend
                                                        verticalAlign="top"
                                                        align="right"
                                                        iconType="circle"
                                                        iconSize={8}
                                                        wrapperStyle={{ fontSize: '10px', paddingBottom: '12px', color: '#94a3b8' }}
                                                        formatter={(value) => <span className="text-slate-400 font-bold text-[10px]">{value}</span>}
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="population"
                                                        name="인구"
                                                        stroke="#34d399"
                                                        strokeWidth={2.5}
                                                        fill="url(#pop1-gradient)"
                                                        dot={{ r: 3.5, fill: '#34d399', strokeWidth: 1.5, stroke: '#0f172a' }}
                                                        activeDot={{ r: 5, fill: '#34d399', strokeWidth: 2, stroke: '#fff' }}
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="households"
                                                        name="세대수"
                                                        stroke="#a78bfa"
                                                        strokeWidth={2}
                                                        strokeDasharray="5 5"
                                                        dot={{ r: 3.5, fill: '#a78bfa', strokeWidth: 1.5, stroke: '#0f172a' }}
                                                        activeDot={{ r: 5, fill: '#a78bfa', strokeWidth: 2, stroke: '#fff' }}
                                                    />
                                                </ComposedChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
                                                <Users className="w-10 h-10 opacity-20" />
                                                <p className="text-sm italic">최근 1년 통계 데이터가 부족합니다.</p>
                                            </div>
                                        )}
                                    </div>
                                    {trend1Yr.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
                                            <PopStatCard
                                                accent={isGrowing ? 'emerald' : 'amber'}
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
                                    )}
                                </section>

                                {/* ── 읍면동 인구 비교 ── */}
                                {umdComp?.pastPop != null && (
                                    <section className="bg-[#13131a]/85 border border-white/[0.08] rounded-[32px] p-8 shadow-xl">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-sky-500/10 rounded-xl">
                                                <Building2 className="w-5 h-5 text-sky-400" />
                                            </div>
                                            <h4 className="text-base font-black text-slate-100 truncate">
                                                {umdComp.dongNm || '우리 동네'} 세부 인구 변동
                                            </h4>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-6">2022년 10월 대비 상세 주민등록 인구 분석입니다.</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                            <div className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl">
                                                <p className="text-[10px] font-bold text-slate-500 mb-2">2022년 10월 인구</p>
                                                <p className="text-base font-black text-slate-200 tabular-nums">
                                                    {parseInt(umdComp.pastPop).toLocaleString()}명
                                                </p>
                                            </div>
                                            <div className="p-5 bg-white/[0.03] border border-sky-500/10 rounded-2xl">
                                                <p className="text-[10px] font-bold text-slate-500 mb-2">
                                                    최근 인구{umdComp.recentYm ? ` (${String(umdComp.recentYm).substring(4)}월)` : ''}
                                                </p>
                                                <p className="text-base font-black text-sky-400 tabular-nums">
                                                    {parseInt(umdComp.recentPop).toLocaleString()}명
                                                </p>
                                            </div>
                                        </div>
                                        {(() => {
                                            const changeVal = parseInt(umdComp.change) || 0;
                                            const changeRateVal = parseFloat(umdComp.changeRate) || 0;
                                            const isGrowingUmd = changeVal >= 0;
                                            const sign = isGrowingUmd ? '+' : '';
                                            return (
                                                <div className={`flex items-center justify-between p-5 rounded-3xl border ${isGrowingUmd ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                                                    <span className="text-xs font-bold text-slate-400">변동 내역</span>
                                                    <span className={`text-base font-black tabular-nums ${isGrowingUmd ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                        {sign}{changeVal.toLocaleString()}명 ({sign}{changeRateVal.toFixed(2)}%)
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </section>
                                )}
                            </motion.div>
                        );
                    })()}

                    {activeTab === 'amenities' && (
                        <motion.div key="amenities" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <AmenitiesView
                                amenities={rawData?.nearbyData?.amenities}
                                variant="page"
                            />
                        </motion.div>
                    )}

                    {activeTab === 'properties' && (
                        <motion.div key="properties" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                            <h3 className="text-2xl font-black">주변 급매 및 추천 매물</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {rawData?.nearbyData?.properties && rawData.nearbyData.properties.length > 0 ? (
                                    rawData.nearbyData.properties.map((prop: any, i: number) => (
                                        <div key={i} className="bg-slate-900 border border-sky-500/20 rounded-[40px] p-8 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="px-3 py-1 bg-sky-500 text-white text-[10px] font-black rounded-lg">급매</div>
                                            </div>
                                            <p className="text-[10px] text-sky-500 font-black mb-1 uppercase tracking-widest">{prop.title || '토지/상가'}</p>
                                            <h4 className="text-lg font-black text-white mb-4 leading-tight">{prop.address || '상세 주소 미공개'}</h4>
                                            <div className="space-y-3 mb-6">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500 font-bold">희망가</span>
                                                    <span className="text-white font-black">{formatPrice(prop.price)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500 font-bold">면적</span>
                                                    <span className="text-white font-black">{prop.area} ㎡</span>
                                                </div>
                                            </div>
                                            <button className="w-full py-3 bg-white/5 hover:bg-sky-500 rounded-2xl text-[10px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest">
                                                상세 분석 결과 보기
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-20 text-center bg-white/5 rounded-[40px] border border-white/5">
                                        <ShoppingBag className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                        <p className="font-bold text-slate-500">현재 주변에 추천할 만한 급매물이 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <AnimatePresence>
                {showScrollTop && (
                    <motion.button
                        type="button"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        onClick={scrollToTabTop}
                        aria-label="탭 내용 맨 위로"
                        title="탭 내용 맨 위로"
                        className={`fixed right-4 sm:right-6 z-[90] w-11 h-11 rounded-full bg-[#1e293b]/90 hover:bg-[#334155] border border-white/15 text-white shadow-xl backdrop-blur-md flex items-center justify-center transition-colors active:scale-95 ${showAiBottomBar ? 'bottom-28 sm:bottom-32' : 'bottom-6 sm:bottom-8'}`}
                    >
                        <ChevronUp className="w-5 h-5" />
                    </motion.button>
                )}
            </AnimatePresence>

            {showAiBottomBar && (
                <AiAnalysisBottomBar
                    onTriggerAnalysis={handleAiAnalysisClick}
                    isCheckingAccess={isCheckingAccess}
                    isLoggedIn={!!user}
                    hasAccess={hasAccess}
                    hasPaidToday={hasPaidToday}
                    isDevAccount={isDevAccount}
                    freeRemaining={freeRemaining}
                />
            )}

            {/* Footer */}
            <footer className="relative z-10 py-20 border-t border-white/5 bg-slate-900/20 text-center">
                <div className="max-w-md mx-auto px-6">
                    <Link href="/" className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 hover:bg-white/10 active:scale-95 transition-all cursor-pointer">
                        <CheckCircle2 className="w-6 h-6 text-slate-600" />
                    </Link>
                    <p className="text-slate-400 text-xs font-extrabold tracking-widest mb-2.5 font-noto-sans-kr">공공데이터와 AI가 만나다 - 부동산탐정</p>
                    <div className="text-slate-600 text-[10px] leading-[1.75] font-noto-sans-kr text-left whitespace-pre-wrap max-w-md mx-auto">
                        {`본 분석 결과는 국가 공공 데이터를 기반으로 AI가 자동 분석한 참고용 자료이며, 어떠한 법률적·재정적 보증도 제공하지 않습니다. 데이터의 수집 시점이나 실제 원본 서류(등기부등본 등)와 차이가 있을 수 있으며, 분석 이후의 권리관계 변동은 반영되지 않습니다.

부동산탐정은 투자 결정을 대신해 드리지 않으므로, 최종 투자 및 계약 전에는 반드시 전문가(변호사, 법무사 등)의 상담과 현장 실사를 통해 사실관계를 재확인하시기 바랍니다. 본 서비스 이용으로 발생한 손해에 대해 부동산탐정은 책임을 지지 않습니다.`}
                    </div>
                </div>
            </footer>

            {/* AI 분석 중 모달 */}
            <AnimatePresence>
                {isAiAnalyzing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl px-4 overflow-y-auto py-8"
                    >
                        <div className="w-full max-w-md bg-slate-900/50 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col">
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold mb-3 animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
                                    AI 탐정 분석 중
                                </div>
                                <h3 className="text-xl font-black text-white tracking-tight">계약 전 리스크 검토 중</h3>
                                <p className="text-xs text-white/50 mt-1.5 font-semibold">
                                    AI가 매물 데이터를 종합 분석하고 있습니다... ({aiElapsed}초 경과)
                                </p>
                            </div>

                            {/* Steps List */}
                            <div className="space-y-3 my-2 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                                {AI_ANALYSIS_STEPS.map((step, idx) => {
                                    const isCompleted = idx < aiStep;
                                    const isInProgress = idx === aiStep;

                                    return (
                                        <div
                                            key={step.label}
                                            className={`flex gap-3 items-start p-3 rounded-2xl border transition-all ${
                                                isInProgress
                                                    ? 'bg-violet-500/5 border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.08)]'
                                                    : isCompleted
                                                    ? 'bg-emerald-500/[0.02] border-emerald-500/10'
                                                    : 'bg-transparent border-transparent opacity-40'
                                            }`}
                                        >
                                            <div className="shrink-0 mt-0.5">
                                                {isCompleted ? (
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </div>
                                                ) : (
                                                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${isInProgress ? 'bg-violet-500/15 border-violet-500/30 animate-pulse' : 'bg-white/5 border-white/10 opacity-60'}`}>
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={step.icon} alt="" className="w-5 h-5 object-contain" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-xs font-bold leading-none ${isInProgress ? 'text-violet-300' : isCompleted ? 'text-emerald-400/90' : 'text-white/60'}`}>
                                                    {step.label}
                                                </p>
                                                <p className="text-[10px] text-white/40 font-semibold mt-1 leading-relaxed">
                                                    {step.desc}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Buttons */}
                            <div className="flex flex-col gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAiAnalyzing(false);
                                        router.push('/profile?tab=my-analyses');
                                    }}
                                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-lg shadow-violet-500/15 flex items-center justify-center gap-2"
                                >
                                    내 기록에서 나중에 확인하기
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAiAnalyzing(false);
                                    }}
                                    className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white text-xs font-bold transition-all flex items-center justify-center"
                                >
                                    다른 페이지로 이동 (우하단에서 진행 확인)
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* AI 리포트 복사 다이얼로그 */}
            <AnimatePresence>
                {isAiReportCopyOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] flex items-end md:items-stretch md:justify-end bg-black/55 backdrop-blur-sm"
                        onClick={() => setIsAiReportCopyOpen(false)}
                    >
                        <motion.div
                            initial={isDesktopReportPanel ? { x: '100%' } : { y: '100%' }}
                            animate={{ x: 0, y: 0 }}
                            exit={isDesktopReportPanel ? { x: '100%' } : { y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                            className="relative w-full md:max-w-[440px] md:h-full max-h-[88vh] md:max-h-none flex flex-col overflow-hidden rounded-t-[28px] md:rounded-none md:rounded-l-[28px] border border-white/[0.08] border-b-0 md:border-b md:border-r-0 bg-[#0f172a]/95 shadow-[-8px_0_40px_rgba(14,165,233,0.12)]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/[0.08] via-transparent to-transparent" />
                            <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-sky-400/30 to-transparent" />
                            <div className="md:hidden flex justify-center pt-3 pb-1">
                                <div className="w-10 h-1 rounded-full bg-white/15" />
                            </div>

                            <div className="relative z-10 flex items-start justify-between gap-3 px-5 sm:px-6 pt-4 md:pt-6 pb-4 border-b border-white/[0.06]">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/25 via-cyan-500/10 to-transparent border border-sky-400/30 flex items-center justify-center shadow-[0_0_16px_rgba(14,165,233,0.15)]">
                                        <FileText className="w-5 h-5 text-sky-300" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-base font-bold text-white tracking-tight">AI 분석 리포트</h2>
                                        <p className="text-[11px] text-white/45 mt-0.5">텍스트 선택 후 복사하거나 버튼을 누르세요</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsAiReportCopyOpen(false)}
                                    className="shrink-0 w-9 h-9 rounded-xl border border-white/10 bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
                                    aria-label="닫기"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar px-5 sm:px-6 py-4">
                                <div className="rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-500/[0.12] via-sky-500/[0.05] to-transparent p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                                    <pre className="whitespace-pre-wrap break-words text-[13px] sm:text-sm leading-[1.75] text-white/85 font-sans select-text">
                                        {aiReportCopyText}
                                    </pre>
                                </div>
                            </div>

                            <div className="relative z-10 flex items-center gap-2 px-5 sm:px-6 py-4 md:py-5 border-t border-white/[0.06] bg-[#0a0f1a]/80 backdrop-blur-md">
                                <button
                                    type="button"
                                    onClick={() => setIsAiReportCopyOpen(false)}
                                    className="flex-1 md:flex-none px-4 py-3 rounded-xl text-sm font-semibold text-white/55 hover:text-white/85 hover:bg-white/[0.05] transition-colors"
                                >
                                    닫기
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            await navigator.clipboard.writeText(aiReportCopyText);
                                            setIsAiReportCopyOpen(false);
                                            setShareToast('AI 분석 리포트 전문이 클립보드에 복사되었습니다!');
                                        } catch {
                                            setShareToast('복사에 실패했습니다.');
                                        }
                                    }}
                                    className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-sky-500 hover:bg-sky-400 shadow-lg shadow-sky-500/20 transition-colors"
                                >
                                    <Copy className="w-4 h-4" />
                                    클립보드 복사
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* AI 분석 입력 모달 */}
            <AiAnalysisInputModal
                isOpen={isInputModalOpen}
                category={report?.category}
                input={aiInput}
                onChange={patchAiInput}
                onClose={() => setIsInputModalOpen(false)}
                onSubmit={handleInputSubmit}
                isCheckingAccess={isCheckingAccess}
            />

            {/* AI 분석 중 모달 */}
            <AnimatePresence>
                {shareToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 20, x: '-50%' }}
                        className="fixed bottom-10 left-1/2 z-[100] bg-[#1E1E24] text-white px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-3 border border-white/10 min-w-[280px] max-w-[min(92vw,420px)]"
                    >
                        <span className="flex-1 leading-snug">{shareToast}</span>
                        <button
                            type="button"
                            onClick={() => setShareToast(null)}
                            className="shrink-0 w-7 h-7 rounded-lg text-white/45 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
                            aria-label="닫기"
                        >
                            ✕
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* 결제 모달 */}
            <AnimatePresence>
                {isPaymentModalOpen && (
                    <PaymentModal
                        propertyId={propertyId || ''}
                        propertyAddress={analysisData?.report?.address || ''}
                        user={user!}
                        onClose={() => setIsPaymentModalOpen(false)}
                        onSuccess={() => {
                            setIsPaymentModalOpen(false);
                            setShareToast('✅ 결제 완료! AI 분석을 시작합니다.');
                            setTimeout(() => runAiAnalysis(), 800);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* 7일 이내 중복 AI 분석 안내 */}
            <AnimatePresence>
                {recentAnalysisBlocked && (
                    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center px-4 pb-4 sm:pb-0">
                        <motion.button
                            type="button"
                            aria-label="닫기"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60"
                            onClick={() => setRecentAnalysisBlocked(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 24 }}
                            className="relative w-full max-w-md rounded-t-[28px] sm:rounded-[28px] bg-[#13131A] border border-white/10 px-6 pt-4 pb-8 shadow-2xl"
                        >
                            <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-white/20" />
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-sky-500/10">
                                <History className="h-7 w-7 text-sky-400" />
                            </div>
                            <h3 className="text-center text-lg font-black text-white">최근 분석 이력 있음</h3>
                            <p className="mt-3 text-center text-sm leading-relaxed text-slate-400">
                                {recentAnalysisBlocked.message}
                            </p>
                            <p className="mt-2 text-center text-xs leading-relaxed text-slate-500">
                                동일 단지·동일 평형은 7일 이내 AI 분석을 다시 실행할 수 없습니다.
                            </p>
                            <div className="mt-6 space-y-2.5">
                                {recentAnalysisBlocked.reportId && (
                                    <button
                                        type="button"
                                        onClick={() => navigateToExistingReport(recentAnalysisBlocked.reportId!)}
                                        className="w-full rounded-2xl bg-sky-500 py-3.5 text-sm font-black text-white transition-colors hover:bg-sky-400"
                                    >
                                        이전 분석 보기
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setRecentAnalysisBlocked(null)}
                                    className="w-full rounded-2xl py-3.5 text-sm font-bold text-slate-400 transition-colors hover:text-slate-300"
                                >
                                    닫기
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* AI 분석 이력 간편 다이알로그 모달 */}
            <AnimatePresence>
                {historyModalReport && (() => {
                    const parsedAi = (() => {
                        if (!historyModalReport.aiSummary) return null;
                        try {
                            return typeof historyModalReport.aiSummary === 'string'
                                ? JSON.parse(historyModalReport.aiSummary)
                                : historyModalReport.aiSummary;
                        } catch (e) {
                            console.error("aiSummary 파싱 실패:", e);
                            return null;
                        }
                    })();

                    const compRisk = parsedAi?.['1_comprehensiveRisk'] || {};
                    const priceReasonableness = parsedAi?.['5_priceReasonableness'] || {};
                    
                    const coreJudgement = compRisk.coreJudgement || "분석 리포트가 안전하게 로드되었습니다.";
                    const totalVerdict = compRisk.verdict || compRisk.riskGrade || "AI 분석 완료";
                    const priceVerdict = priceReasonableness.verdict || priceReasonableness.result || "";
                    
                    const areaLabel = historyModalReport.area != null ? `${historyModalReport.area}㎡` : '면적 미입력';
                    const dateLabel = formatEmbeddedReportDate(historyModalReport.createdAt);
                    const priceLabel = formatEmbeddedReportPrice(historyModalReport);

                    const totalVerdictStyle = getVerdictBadgeStyle(totalVerdict);
                    const priceVerdictStyle = priceVerdict ? getVerdictBadgeStyle(priceVerdict) : null;

                    return (
                        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                                onClick={() => setHistoryModalReport(null)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative w-full max-w-2xl bg-[#0a0a0c] border border-white/10 rounded-[32px] p-6 sm:p-8 shadow-2xl z-10 max-h-[85vh] overflow-y-auto flex flex-col gap-6"
                            >
                                {/* 헤더 */}
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-black text-emerald-400 uppercase tracking-wider">AI 분석 이력 리포트</p>
                                        <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                                            {areaLabel} · {dateLabel}
                                        </h3>
                                        <p className="text-sm font-bold text-slate-400 mt-0.5">
                                            {priceLabel}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setHistoryModalReport(null)}
                                        className="w-10 h-10 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors flex items-center justify-center text-lg font-black"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="h-px w-full bg-white/10" />

                                {/* 본문 */}
                                <div className="space-y-6 flex-1">
                                    {/* 판정 결과 배지 라인 */}
                                    <div className="flex flex-wrap gap-2">
                                        <span
                                            className="px-3 py-1 rounded-xl text-xs font-black border tracking-wide"
                                            style={{
                                                color: totalVerdictStyle.color,
                                                borderColor: totalVerdictStyle.borderColor,
                                                backgroundColor: totalVerdictStyle.backgroundColor
                                            }}
                                        >
                                            종합: {totalVerdict}
                                        </span>
                                        {priceVerdict && priceVerdictStyle && (
                                            <span
                                                className="px-3 py-1 rounded-xl text-xs font-black border tracking-wide"
                                                style={{
                                                    color: priceVerdictStyle.color,
                                                    borderColor: priceVerdictStyle.borderColor,
                                                    backgroundColor: priceVerdictStyle.backgroundColor
                                                }}
                                            >
                                                가격: {priceVerdict}
                                            </span>
                                        )}
                                        <span className="px-3 py-1 rounded-xl text-xs font-black border text-emerald-300 border-emerald-500/30 bg-emerald-500/10">
                                            AI 완료
                                        </span>
                                    </div>

                                    {/* 판독 총평 본문 */}
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-black text-slate-400">🕵️ AI 탐정 판독 결과</h4>
                                        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-5 text-sm sm:text-base text-slate-200 font-bold leading-relaxed whitespace-pre-line">
                                            {coreJudgement}
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px w-full bg-white/10" />

                                {/* 하단 버튼 액션 */}
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setHistoryModalReport(null)}
                                        className="flex-1 py-3.5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-white text-sm font-black transition-colors"
                                    >
                                        닫기
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onEmbeddedReportSelect?.(historyModalReport.id);
                                            setHistoryModalReport(null);
                                        }}
                                        className="flex-1 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-black shadow-lg shadow-emerald-500/10 transition-colors"
                                    >
                                        이 분석 전체 불러오기
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>

            {/* Comparable Map Bottom Sheet Modal */}
            <AnimatePresence>
                {isMapModalOpen && (
                    <div className="fixed inset-0 z-[999] flex items-end justify-center">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsMapModalOpen(false)}
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="relative w-full max-w-4xl h-[85vh] bg-white rounded-t-[32px] overflow-hidden flex flex-col z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.35)]"
                        >
                            {/* Bottom sheet drag handle indicator */}
                            <div className="w-full flex justify-center pt-3 pb-1.5 bg-gradient-to-r from-sky-50 via-white to-emerald-50 shrink-0">
                                <div className="w-12 h-1.5 bg-slate-300/80 rounded-full" />
                            </div>
                            <div className="flex justify-between items-center px-6 pb-4 border-b border-slate-200/80 bg-gradient-to-r from-sky-50 via-white to-emerald-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                                        <Map className="w-5 h-5 text-sky-600" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-slate-900 text-base font-black">비교사례 위치 지도</span>
                                        <span className="text-slate-500 text-[11px] font-medium">
                                            마커에 실거래가(억) 표시 · 클릭 시 상세 정보
                                            {mapDataForHeader?.comparables?.length
                                                ? ` · ${mapDataForHeader.comparables.length}건`
                                                : ''}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsMapModalOpen(false)}
                                    className="p-2 rounded-xl hover:bg-slate-900/5 text-slate-400 hover:text-slate-700 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 p-3 bg-slate-100">
                                <ComparableMap
                                    mapData={mapDataForHeader}
                                    category={report?.category}
                                    draggable={true}
                                    targetArea={(() => {
                                        let targetArea = 0;
                                        if (mapDataForHeader && mapDataForHeader.target) {
                                            const t = mapDataForHeader.target;
                                            const directTargetArea = mapDataForHeader.targetArea !== undefined && mapDataForHeader.targetArea !== null
                                                ? parseFloat(mapDataForHeader.targetArea.toString())
                                                : null;
                                            if (directTargetArea !== null && directTargetArea > 0) {
                                                targetArea = directTargetArea;
                                            } else if (report?.category === 'building' || report?.category === '빌딩') {
                                                targetArea = parseFloat(t.totalArea_sqm || mergedData?.totalArea_sqm || t.area_sqm || mergedData?.area || '0');
                                            } else if (report?.category === 'apartment' || report?.category === '아파트') {
                                                targetArea = parseFloat(t.area_sqm || t.exclusiveArea_sqm || t.land?.area_sqm || mergedData?.area || mergedData?.exclusiveArea_sqm || mergedData?.area_sqm || '0');
                                            } else {
                                                targetArea = parseFloat(t.area_sqm || t.land?.area_sqm || mergedData?.area || mergedData?.area_sqm || '0');
                                            }
                                        }
                                        return targetArea;
                                    })()}
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}

// ═══════════════════════════════════════════
//  결제 모달 컴포넌트 (토스페이먼츠 위젯 SDK)
// ═══════════════════════════════════════════
interface PaymentModalProps {
    propertyId: string;
    propertyAddress: string;
    user: User;
    onClose: () => void;
    onSuccess: () => void;
}

function PaymentModal({ propertyId, propertyAddress, user, onClose, onSuccess }: PaymentModalProps) {
    const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
    const AMOUNT = 5900;

    const DEV_UID = process.env.NEXT_PUBLIC_DEV_UID;
    const DEV_UID2 = process.env.NEXT_PUBLIC_DEV_UID2;
    const isDevAccount = !!user && (user.uid === DEV_UID || user.uid === DEV_UID2);

    const [isWidgetLoaded, setIsWidgetLoaded] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const widgetRef = useRef<any>(null);
    const methodsRef = useRef<any>(null);
    const agreementRef = useRef<any>(null);
    const methodsDivRef = useRef<HTMLDivElement>(null);
    const agreementDivRef = useRef<HTMLDivElement>(null);

    const orderId = useRef(
        'AI-' + Array.from(crypto.getRandomValues(new Uint8Array(8)))
            .map(b => b.toString(16).padStart(2, '0')).join('')
    ).current;

    useEffect(() => {
        // 토스페이먼츠 JS SDK 로드
        const script = document.createElement('script');
        script.src = 'https://js.tosspayments.com/v2/standard';
        script.async = true;
        script.onload = () => initWidget();
        document.head.appendChild(script);
        return () => { document.head.removeChild(script); };
    }, []);

    const initWidget = async () => {
        try {
            const TossPayments = (window as any).TossPayments;
            if (!TossPayments) return;

            const paymentWidget = await TossPayments(TOSS_CLIENT_KEY).widgets({
                customerKey: user.uid,
            });
            widgetRef.current = paymentWidget;

            await paymentWidget.setAmount({ currency: 'KRW', value: AMOUNT });

            const [methodsCtrl, agreementCtrl] = await Promise.all([
                paymentWidget.renderPaymentMethods({
                    selector: '#toss-payment-methods',
                    variantKey: 'cstalk',
                }),
                paymentWidget.renderAgreement({
                    selector: '#toss-agreement',
                    variantKey: 'cstalk',
                }),
            ]);

            methodsRef.current = methodsCtrl;
            agreementRef.current = agreementCtrl;
            setIsWidgetLoaded(true);
        } catch (e: any) {
            setErrorMsg('결제 위젯 로드 실패: ' + e.message);
        }
    };

    const handlePay = async () => {
        if (!widgetRef.current) return;
        setErrorMsg(null);
        setIsConfirming(true);

        try {
            const customerName = user.displayName || user.email || '고객';
            const orderName = `AI 부동산 분석 (${propertyAddress})`.slice(0, 100);

            const result = await widgetRef.current.requestPayment({
                orderId,
                orderName,
                customerName,
                successUrl: `${window.location.origin}/payment/success`,
                failUrl: `${window.location.origin}/payment/fail`,
            });

            if (result?.paymentKey) {
                // 서버 승인
                const idToken = await user.getIdToken();
                const res = await fetch('/api/payment/confirm', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                        paymentKey: result.paymentKey,
                        orderId: result.orderId,
                        amount: result.amount,
                        userId: user.uid,
                        propertyId,
                    }),
                });
                if (res.ok) {
                    onSuccess();
                } else {
                    const err = await res.json();
                    setErrorMsg(err.message || '결제 승인 실패');
                    setIsConfirming(false);
                }
            }
        } catch (e: any) {
            const code = e?.code || '';
            if (code === 'PAY_PROCESS_CANCELED' || code === 'USER_CANCEL') {
                setIsConfirming(false);
            } else {
                setErrorMsg(`[${code}] ${e?.message || '결제 실패'}`);
                setIsConfirming(false);
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                className="w-full sm:max-w-lg bg-[#0F172A] rounded-t-[32px] sm:rounded-[32px] border border-white/10 flex flex-col max-h-[95vh] overflow-hidden"
            >
                {/* 헤더 */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-sky-500/15 rounded-xl flex items-center justify-center">
                            <Hexagon className="w-5 h-5 text-sky-500" />
                        </div>
                        <div>
                            <p className="font-black text-white text-sm">공공데이터 + AI 분석</p>
                            <p className="text-slate-500 text-xs">분석된 리포트는 내기록 페이지 자동 저장</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-xs text-slate-500">결제 금액</p>
                            <p className="text-emerald-400 font-black text-xl">₩5,900</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* 매물 정보 */}
                <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5 flex-shrink-0">
                    <p className="text-xs text-slate-500 mb-1">분석 대상</p>
                    <p className="text-white font-bold text-sm truncate">{propertyAddress || '선택된 매물'}</p>
                    <p className="text-slate-500 text-xs mt-1">분석된 리포트는 내기록 페이지에 영구 저장됩니다.</p>
                </div>

                {/* 결제 위젯 영역 */}
                <div className="flex-1 overflow-y-auto">
                    {!isWidgetLoaded && !errorMsg && (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="w-10 h-10 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
                            <p className="text-slate-400 text-sm">결제 수단 불러오는 중...</p>
                        </div>
                    )}
                    {errorMsg && (
                        <div className="m-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                            <p className="text-red-400 text-sm font-bold">{errorMsg}</p>
                            <button
                                onClick={() => { setErrorMsg(null); initWidget(); }}
                                className="mt-2 text-xs text-slate-400 hover:text-white underline"
                            >
                                다시 시도
                            </button>
                        </div>
                    )}
                    <div id="toss-payment-methods" ref={methodsDivRef} />
                    <div id="toss-agreement" ref={agreementDivRef} />
                </div>

                {/* 결제 버튼 */}
                <div className="p-4 border-t border-white/5 flex-shrink-0">
                    <button
                        onClick={handlePay}
                        disabled={!isWidgetLoaded || isConfirming}
                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-base shadow-lg shadow-emerald-500/20"
                    >
                        {isConfirming ? (
                            <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 결제 승인 중...</>
                        ) : (
                            <>{isDevAccount ? 'AI 분석 시작' : 'AI 분석 시작  ·  5,900원'}</>
                        )}
                    </button>
                    <p className="text-center text-xs text-slate-600 mt-3">토스페이먼츠 보안 결제 • SSL 암호화</p>
                </div>
            </motion.div>
        </motion.div>
    );
}

