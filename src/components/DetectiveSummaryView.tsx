'use client';

import { useState, useMemo, type ReactNode } from 'react';
import {
    FileText, Building2, Calendar, Users, Ruler, Layers, ShieldCheck, Car,
    TrendingUp, MapPin, DollarSign, Map, Trees, Train, Activity, ShoppingBag,
    School, ArrowLeftRight, ArrowRight, Award, Zap,
    Calculator, Info, Plus, Percent, ShieldAlert, Coins, Milestone, Lock, Store,
    Hammer, Megaphone, Truck, Sparkles, PieChart, Home,
    Landmark, Clock, KeyRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AmenitiesView from './AmenitiesView';

// 포맷터 유틸리티
const formatKoreanCurrency = (val: number): string => {
    if (val === 0) return '0';
    if (val >= 100000000) {
        const eok = Math.floor(val / 100000000);
        const rest = val % 100000000;
        if (rest >= 10000) {
            return `${eok}억 ${Math.round(rest / 10000).toLocaleString()}만`;
        }
        return `${eok}억`;
    } else if (val >= 10000) {
        return `${Math.round(val / 10000).toLocaleString()}만`;
    }
    return val.toLocaleString();
};

const formatTradeAmountPart = (amt: number): string => {
    if (amt === 0) return '0';
    if (amt >= 10000) {
        const eok = Math.floor(amt / 10000);
        const rest = Math.round(amt % 10000);
        if (eok > 0) {
            return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만` : `${eok}억`;
        }
        return `${rest.toLocaleString()}만`;
    }
    return `${amt.toLocaleString()}만`;
};

// ──────────────────────────────────────────
// 📊 R-ONE 시계열 파싱 (시리즈 파서)
// ──────────────────────────────────────────
interface SeriesPoint {
    date: string;
    value: number;
}

const pointValue = (point: any): number | null => {
    if (point && typeof point === 'object') {
        const val = point.value;
        return typeof val === 'number' ? val : (parseFloat(String(val)) || null);
    }
    if (typeof point === 'number') return point;
    if (typeof point === 'string') {
        const parsed = parseFloat(point);
        return isNaN(parsed) ? null : parsed;
    }
    return null;
};

const pointDate = (point: any): string => {
    if (point && typeof point === 'object') {
        return String(point.date || '').trim();
    }
    return '';
};

const sortedSeriesPoints = (data: any[]): SeriesPoint[] => {
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

const parseIndicatorSeries = (seriesData: any) => {
    if (!seriesData) return null;

    let data: any[] | null = null;
    let summary: any = null;

    if (seriesData && typeof seriesData === 'object') {
        if (Array.isArray(seriesData)) {
            data = seriesData;
        } else {
            data = Array.isArray(seriesData.data) ? seriesData.data : null;
            summary = seriesData.summary || null;
        }
    }

    if (!data || data.length === 0) return null;

    const summaryLatest = (summary && summary.latest !== undefined) ? parseFloat(String(summary.latest)) : null;
    const summaryPrevious = (summary && summary.previous !== undefined) ? parseFloat(String(summary.previous)) : null;

    let current: number | null = null;
    let previous: number | null = null;

    if (summaryLatest !== null && !isNaN(summaryLatest)) {
        current = summaryLatest;
        previous = (summaryPrevious !== null && !isNaN(summaryPrevious)) ? summaryPrevious : null;
    }

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
        const delta = current - previous;
        if (delta > 0) trend = '상승';
        else if (delta < 0) trend = '하락';
    }

    return { current, previous, changePct, trend };
};

// ──────────────────────────────────────────
// 📊 프리미엄 요약 아이템 컴포넌트
// ──────────────────────────────────────────
interface SummaryItemProps {
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    color: string;
    subValue?: string;
    trailing?: React.ReactNode;
}

function SummaryItem({
    label,
    value,
    icon: Icon,
    color,
    subValue,
    trailing
}: SummaryItemProps) {
    const isHex = color.startsWith('#');
    const iconStyle = isHex ? { color } : undefined;
    const bgStyle = isHex ? { backgroundColor: `${color}1a` } : undefined;

    const iconClass = isHex ? '' : color;
    const bgClass = isHex ? '' : `bg-${color.replace('text-', '')}/10`;

    return (
        <div className="flex items-center gap-4 py-1">
            <div
                className={`p-2.5 rounded-xl shrink-0 ${bgClass}`}
                style={bgStyle}
            >
                <Icon
                    className={`w-5 h-5 ${iconClass}`}
                    style={iconStyle}
                />
            </div>
            <div className="flex-1 min-w-0">
                <span className="text-white/50 text-[13px] font-medium block leading-none mb-1.5">{label}</span>
                <div className="flex items-center gap-2">
                    <span className="text-white font-extrabold text-[15px] leading-tight truncate">{value}</span>
                    {subValue && (
                        <span className="text-white/30 text-xs truncate leading-tight font-normal">{subValue}</span>
                    )}
                    {trailing && (
                        <div className="ml-auto flex shrink-0 items-center">
                            {trailing}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────
// 📊 확장형 아파트 지표 행 컴포넌트
// ──────────────────────────────────────────
interface ExpandableMetricRowProps {
    metricKey: string;
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    color: string;
    insight?: {
        trend?: string;
        body: string;
    } | null;
    isExpanded: boolean;
    onToggle: () => void;
}

function ExpandableMetricRow({
    metricKey,
    label,
    value,
    icon: Icon,
    color,
    insight,
    isExpanded,
    onToggle
}: ExpandableMetricRowProps) {
    const isHex = color.startsWith('#');
    const iconStyle = isHex ? { color } : undefined;
    const bgStyle = isHex ? { backgroundColor: `${color}1a` } : undefined;

    const iconClass = isHex ? '' : color;
    const bgClass = isHex ? '' : `bg-${color.replace('text-', '')}/10`;

    return (
        <div className="space-y-3">
            <div className="flex items-start gap-4">
                <div
                    className={`p-2.5 rounded-xl shrink-0 ${bgClass}`}
                    style={bgStyle}
                >
                    <Icon
                        className={`w-5 h-5 ${iconClass}`}
                        style={iconStyle}
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-white/50 text-[13px] font-medium block leading-none mb-1.5">{label}</span>
                        {insight && (
                            <button
                                onClick={onToggle}
                                className={`px-2 py-0.5 rounded-lg border text-[10px] font-black shrink-0 transition-all flex items-center gap-0.5 bg-white/5 ${color} border-white/5 hover:bg-white/10`}
                            >
                                <span>설명</span>
                                <svg
                                    className={`w-3.5 h-3.5 transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <span className="text-white font-extrabold text-[15px] leading-tight block">{value}</span>
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && insight && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="pl-14 overflow-hidden"
                    >
                        <div className="p-4 rounded-2xl bg-white/1 border border-white/3 flex flex-col gap-1.5">
                            {insight.trend && (
                                <span className={`text-[11px] font-black ${color}`}>
                                    {insight.trend}
                                </span>
                            )}
                            <p className="text-white/80 text-[12.5px] leading-relaxed font-medium">
                                {insight.body}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export type DetectiveShortsSection = 'pyungTrades' | 'landSummary' | 'market';

interface DetectiveSummaryViewProps {
    rawData: any;
    category?: string;
    /** 쇼츠 캡처: 버튼·계산기 등 인터랙션 숨김 */
    shortsMode?: boolean;
    /** 지정 시 해당 섹션만 렌더 (쇼츠 프레임용) */
    shortsSections?: DetectiveShortsSection[];
}

export default function DetectiveSummaryView({
    rawData = {},
    category: categoryProp,
    shortsMode = false,
    shortsSections,
}: DetectiveSummaryViewProps) {
    const [selectedTargetTab, setSelectedTargetTab] = useState<'매매' | '전세' | '월세'>('매매');
    const [expandedApartmentMetrics, setExpandedApartmentMetrics] = useState<Record<string, boolean>>({});
    const [expandedNonAptMetrics, setExpandedNonAptMetrics] = useState<Record<string, boolean>>({});

    // 계산기 상태
    const [isCalcOpen, setIsCalcOpen] = useState(false);
    const [calcPyung, setCalcPyung] = useState(0);
    const [calcRecentPrice, setCalcRecentPrice] = useState(0); // 만원 단위
    const [selectedLoanRatio, setSelectedLoanRatio] = useState(0.7);

    // ──────────────────────────────────────────
    // 📊 헬퍼 유틸리티 (findValue 선언을 위로 올림)
    // ──────────────────────────────────────────
    const findValue = (map: any, key: string): any => {
        if (!map) return null;
        if (map[key] !== undefined && map[key] !== null) {
            if (typeof map[key] === 'string' && map[key].trim() === '') return null;
            return map[key];
        }
        const nestedKeys = ['storeData', 'rawData', 'report', 'vitals', 'analysis', 'userSubmittedData'];
        for (const nestedKey of nestedKeys) {
            const sub = map[nestedKey];
            if (sub && typeof sub === 'object') {
                const val = findValue(sub, key);
                if (val !== null && val !== undefined) return val;
            }
        }
        return null;
    };

    const rawCategory = categoryProp || rawData.category || findValue(rawData, 'category') || 'land';
    const category = String(rawCategory).toLowerCase().trim();
    const isApartment = category === 'apartment' || category === '아파트';

    const formatDate = (dateStr: any): string => {
        if (!dateStr) return '정보없음';
        const str = String(dateStr);
        if (str.length === 8) return `${str.substring(0, 4)}.${str.substring(4, 6)}.${str.substring(6, 8)}`;
        if (str.length === 6) return `${str.substring(0, 4)}.${str.substring(4, 6)}`;
        return str;
    };

    const getIndicatorValue = (seriesData: any): string => {
        if (!seriesData) return '-';
        let data = Array.isArray(seriesData) ? seriesData : seriesData.data;
        if (!data || data.length === 0) return '-';
        const latest = data[data.length - 1];
        if (latest && typeof latest === 'object') {
            return typeof latest.value === 'number' ? latest.value.toFixed(2) : '-';
        }
        return typeof latest === 'number' ? latest.toFixed(2) : '-';
    };

    const getIndicatorPercent = (seriesData: any): string => {
        const val = getIndicatorValue(seriesData);
        return val === '-' ? '-' : `${val}%`;
    };

    const getRegionalTradeCount = (regionalTrades: any[], typeKeyword: string): string => {
        if (!regionalTrades || !Array.isArray(regionalTrades)) return '0';
        for (const group of regionalTrades) {
            const type = String(group.type || '');
            if (type.replace(/\s+/g, '').includes(typeKeyword.replace(/\s+/g, ''))) {
                return String((group.data || []).length);
            }
        }
        return '0';
    };

    // ──────────────────────────────────────────
    // 📊 입력한 상세 정보 Section 데이터
    // ──────────────────────────────────────────
    const txType = findValue(rawData, 'transactionType') || findValue(rawData, 'transaction_type');
    const priceVal = findValue(rawData, 'price') || findValue(rawData, 'sale_price') || findValue(rawData, 'deposit');
    const deposit = findValue(rawData, 'deposit');
    const monthlyRent = findValue(rawData, 'monthlyRent') || findValue(rawData, 'monthly_rent');
    const floor = findValue(rawData, 'floor');
    const area = findValue(rawData, 'area');

    // 상가 전용
    const premium = findValue(rawData, 'premium');
    const currentBusiness = findValue(rawData, 'currentBusiness') || findValue(rawData, 'current_business');
    const desiredBusiness = findValue(rawData, 'desiredBusiness') || findValue(rawData, 'desired_business');
    const monthlyRevenue = findValue(rawData, 'monthly_revenue') || findValue(rawData, 'monthlyRevenue');
    const monthlyProfit = findValue(rawData, 'monthly_profit') || findValue(rawData, 'monthlyProfit');

    const getPriceText = () => {
        const formatValWon = (v: any) => {
            let parsed = parseFloat(String(v).replace(/,/g, ''));
            if (isNaN(parsed) || parsed === 0) return '-';
            if (parsed <= 1000000) parsed *= 10000;
            return formatKoreanCurrency(parsed);
        };
        
        if (txType === '전세') {
            return deposit ? `보증금 ${formatValWon(deposit)}` : '보증금 미입력';
        } else if (txType === '월세') {
            const depText = deposit ? `보증금 ${formatValWon(deposit)}` : '보증금 -';
            const rentText = monthlyRent ? `월세 ${formatValWon(monthlyRent)}` : '월세 -';
            return `${depText} / ${rentText}`;
        } else {
            if (userPrice > 0) {
                return formatKoreanCurrency(userPrice > 1000000 ? userPrice : userPrice * 10000);
            }
            if (priceVal) return formatValWon(priceVal);
            return '미입력';
        }
    };

    // ──────────────────────────────────────────
    // 📊 아파트 정보 Section 데이터
    // ──────────────────────────────────────────
    const building = rawData.vitals?.building || {};
    const primaryTitle = (Array.isArray(building.title) && building.title.length > 0) ? building.title[0] : {};

    const totalHouseholds = parseInt(building.totalHouseholds || '0');
    const totalParking = parseInt(building.totalParking || '0');
    const totalDongs = parseInt(building.totalDongs || '0');

    const useAprDay = primaryTitle.useAprDay || '';
    const formattedYear = useAprDay && useAprDay.length >= 4 ? `${useAprDay.substring(0, 4)}년` : '-';
    const topFloorText = primaryTitle.grndFlrCnt ? `${primaryTitle.grndFlrCnt}층` : '-';
    const seismicText = primaryTitle.rserthqkDsgnApplyYn === '1' ? '적용' : (primaryTitle.rserthqkDsgnApplyYn === '0' ? '미적용' : '미대상');
    const parkingSpaceText = (totalHouseholds > 0 && totalParking > 0) ? `${(totalParking / totalHouseholds).toFixed(2)}대` : (totalParking > 0 ? `${totalParking}대` : '-');

    // ──────────────────────────────────────────
    // 📊 단지 실거래가 (Complex Trades) 필터링
    // ──────────────────────────────────────────
    const backendTargetTrades = rawData.targetTrades || rawData.nearbyData?.targetTrades || [];
    const targetComplexInfo = rawData.targetComplexInfo || {};
    const targetName = targetComplexInfo.name || '해당 단지';

    const targetAptTrades = useMemo(() => {
        return backendTargetTrades.filter((trade: any) => {
            const isRent = trade._isRent === true;
            const monthlyRentStr = String(trade.monthlyRent || '0').replace(/,/g, '');
            const rentVal = parseFloat(monthlyRentStr);
            if (selectedTargetTab === '매매') return !isRent;
            if (selectedTargetTab === '전세') return isRent && (isNaN(rentVal) || rentVal === 0);
            if (selectedTargetTab === '월세') return isRent && !isNaN(rentVal) && rentVal > 0;
            return false;
        }).sort((a: any, b: any) => {
            const da = `${a.dealYear}${String(a.dealMonth).padStart(2, '0')}${String(a.dealDay || 1).padStart(2, '0')}`;
            const db = `${b.dealYear}${String(b.dealMonth).padStart(2, '0')}${String(b.dealDay || 1).padStart(2, '0')}`;
            return db.localeCompare(da);
        });
    }, [backendTargetTrades, selectedTargetTab]);

    const displayTrades = targetAptTrades.slice(0, 5);

    // ──────────────────────────────────────────
    // 📊 6개월 실거래가 (Pyung-based Trades)
    // ──────────────────────────────────────────
    const pyungSummary = useMemo(() => {
        const pyungTradesList: Record<number, any[]> = {};
        for (const trade of backendTargetTrades) {
            if (trade._isRent === true) continue;
            const areaVal = parseFloat(trade.excluUseAr || trade.area || '0');
            if (areaVal <= 0) continue;
            const dealAmt = parseFloat(String(trade.dealAmount || '0').replace(/,/g, ''));
            if (dealAmt <= 0) continue;
            const pyung = Math.round(areaVal / 3.3058);
            if (pyung <= 0) continue;

            if (!pyungTradesList[pyung]) pyungTradesList[pyung] = [];
            pyungTradesList[pyung].push(trade);
        }

        return Object.entries(pyungTradesList).map(([pyungStr, trades]) => {
            const pyung = parseInt(pyungStr);
            const sortedTrades = [...trades].sort((a: any, b: any) => {
                const da = `${a.dealYear}${String(a.dealMonth).padStart(2, '0')}${String(a.dealDay || 1).padStart(2, '0')}`;
                const db = `${b.dealYear}${String(b.dealMonth).padStart(2, '0')}${String(b.dealDay || 1).padStart(2, '0')}`;
                return db.localeCompare(da);
            });

            const recentTrade = sortedTrades[0];
            const recentPrice = parseFloat(String(recentTrade.dealAmount || '0').replace(/,/g, ''));

            let minTrade = trades[0];
            let minPrice = parseFloat(String(minTrade.dealAmount || '0').replace(/,/g, ''));
            let maxTrade = trades[0];
            let maxPrice = parseFloat(String(maxTrade.dealAmount || '0').replace(/,/g, ''));

            for (const t of trades) {
                const price = parseFloat(String(t.dealAmount || '0').replace(/,/g, ''));
                if (price < minPrice) {
                    minPrice = price;
                    minTrade = t;
                }
                if (price > maxPrice) {
                    maxPrice = price;
                    maxTrade = t;
                }
            }

            return {
                pyung,
                recentPrice,
                recentTrade,
                minPrice,
                minTrade,
                maxPrice,
                maxTrade
            };
        }).sort((a, b) => a.pyung - b.pyung);
    }, [backendTargetTrades]);

    // ──────────────────────────────────────────
    // 📊 주변 비교 아파트 (Compared Apartments)
    // ──────────────────────────────────────────
    const userPriceRaw = findValue(rawData, 'price') || findValue(rawData, 'sale_price') || findValue(rawData, 'deposit');
    const userPrice = parseFloat(String(userPriceRaw || '').replace(/,/g, '')) || 0;

    let targetPrice = 0;
    if (backendTargetTrades.length > 0) {
        const nonRentTrades = backendTargetTrades.filter((t: any) => t._isRent !== true);
        if (nonRentTrades.length > 0) {
            const sorted = [...nonRentTrades].sort((a: any, b: any) => {
                const da = `${a.dealYear}${String(a.dealMonth).padStart(2, '0')}${String(a.dealDay || 1).padStart(2, '0')}`;
                const db = `${b.dealYear}${String(b.dealMonth).padStart(2, '0')}${String(b.dealDay || 1).padStart(2, '0')}`;
                return db.localeCompare(da);
            });
            targetPrice = parseFloat(String(sorted[0].dealAmount || '0').replace(/,/g, ''));
        }
    }
    if (targetPrice === 0) targetPrice = userPrice;

    const comparedApts = useMemo(() => {
        if (targetPrice <= 0) return [];
        const regionalTrades = rawData.vitals?.regionalTrades || [];
        const aptSalesGroup = regionalTrades.find((group: any) => group.type === '아파트매매');
        if (!aptSalesGroup) return [];

        const otherAptTrades = (aptSalesGroup.data || []).filter((t: any) => {
            const aptNm = t.aptNm || '';
            return aptNm !== '' && aptNm !== targetName;
        });

        const aptGroups: Record<string, any[]> = {};
        for (const t of otherAptTrades) {
            const aptNm = t.aptNm || '';
            if (!aptGroups[aptNm]) aptGroups[aptNm] = [];
            aptGroups[aptNm].push(t);
        }

        return Object.entries(aptGroups).map(([aptNm, trades]) => {
            const sorted = [...trades].sort((a: any, b: any) => {
                const da = `${a.dealYear}${String(a.dealMonth).padStart(2, '0')}${String(a.dealDay || 1).padStart(2, '0')}`;
                const db = `${b.dealYear}${String(b.dealMonth).padStart(2, '0')}${String(b.dealDay || 1).padStart(2, '0')}`;
                return db.localeCompare(da);
            });
            const recentTrade = sorted[0];
            const price = parseFloat(String(recentTrade.dealAmount || '0').replace(/,/g, ''));
            return { aptNm, price, trade: recentTrade };
        }).filter(a => a.price > 0)
            .sort((a, b) => Math.abs(a.price - targetPrice) - Math.abs(b.price - targetPrice))
            .slice(0, 3);
    }, [rawData.vitals?.regionalTrades, targetPrice, targetName]);

    // ──────────────────────────────────────────
    // 📊 주택 공급 현황 (Housing Supply)
    // ──────────────────────────────────────────
    const housingSupply = rawData.housingSupply || {};
    const plannedDetails = housingSupply.plannedDetails || [];
    const planned = housingSupply.nextYears?.planned?.count || '0';
    const moveIn = housingSupply.nextYears?.moveIn?.count || '0';
    const unsold = housingSupply.unsold?.current || '0';
    const unsoldTrend = housingSupply.unsold?.trend || '안정';
    const glutScore = housingSupply.glutScore || '0';

    // ──────────────────────────────────────────
    // 📊 토지 상세 요약 (Land Summary)
    // ──────────────────────────────────────────
    const primaryLandData = rawData.vitals?.land?.characteristics || {};
    const officialLandPrice = (rawData.officialLandPrice || rawData.vitals?.officialLandPrice || []) as any[];

    let pricePerM2 = 0;
    if (officialLandPrice && officialLandPrice.length > 0) {
        const sorted = [...officialLandPrice].sort((a, b) => String(a.year || '').localeCompare(String(b.year || '')));
        pricePerM2 = parseFloat(String(sorted[sorted.length - 1].price).replace(/,/g, '')) || 0;
    }
    if (pricePerM2 <= 0) {
        pricePerM2 = parseFloat(String(primaryLandData.pnuPrice || '0').replace(/,/g, '')) || 0;
    }

    const areaStr = String(primaryLandData.area || '0').replace(/,/g, '');
    const areaVal = parseFloat(areaStr) || 0;
    const pyeongVal = areaVal * 0.3025;
    const totalOfficialPrice = pricePerM2 * 3.3 * pyeongVal;
    const landRatio = (userPrice > 0 && totalOfficialPrice > 0) ? (userPrice / totalOfficialPrice) * 100 : 0;

    // ──────────────────────────────────────────
    // 📊 상권 & 인프라 (Amenities toggle list)
    // ──────────────────────────────────────────
    const amenities = rawData.nearbyData?.amenities || {};

    // ──────────────────────────────────────────
    // 📊 매매 계산기 수식들
    // ──────────────────────────────────────────
    const calcPrice = calcRecentPrice * 10000;
    const calcTax = calcPrice * 0.11;

    const calculateBrokerageFee = (price: number) => {
        let rate = 0;
        if (price < 50000000) rate = 0.006;
        else if (price < 200000000) rate = 0.005;
        else if (price < 900000000) rate = 0.004;
        else if (price < 1200000000) rate = 0.005;
        else if (price < 1500000000) rate = 0.006;
        else rate = 0.007;
        return { amount: price * rate, rate: rate * 100 };
    };

    const calculatePropertyTax = (publicPrice: number) => {
        const baseVal = publicPrice * 0.44;
        let baseTax = 0;
        if (baseVal <= 60000000) baseTax = baseVal * 0.0005;
        else if (baseVal <= 150000000) baseTax = baseVal * 0.001 - 30000;
        else if (baseVal <= 300000000) baseTax = baseVal * 0.002 - 180000;
        else baseTax = baseVal * 0.0035 - 630000;

        const localEducationTax = baseTax * 0.2;
        const urbanAreaTax = baseVal * 0.0014;
        return baseTax + localEducationTax + urbanAreaTax;
    };

    const calculateLoan = (principal: number, annualRate = 4.12, years = 20) => {
        const monthlyRate = annualRate / 100 / 12;
        const months = years * 12;
        const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
        const totalPayment = monthlyPayment * months;
        const totalInterest = totalPayment - principal;

        return {
            monthlyPayment: isNaN(monthlyPayment) ? 0 : monthlyPayment,
            totalInterest: isNaN(totalInterest) ? 0 : totalInterest
        };
    };

    const openCalculator = (pyung: number, recentPrice: number) => {
        setCalcPyung(pyung);
        setCalcRecentPrice(recentPrice);
        setSelectedLoanRatio(0.7);
        setIsCalcOpen(true);
    };

    const calcSelfCapital = calcPrice * (1 - selectedLoanRatio);
    const calcLoanCapital = calcPrice * selectedLoanRatio;
    const calcLoanResult = calculateLoan(calcLoanCapital);
    const calcBrokerage = calculateBrokerageFee(calcPrice);
    const calcPublicPrice = calcPrice * 0.69;
    const calcPropTax = calculatePropertyTax(calcPublicPrice);
    const calcComprehensiveTax = calcPublicPrice >= 1200000000 ? '12억 이상이므로 종부세 확인 필요' : '종부세 없음';

    if (shortsSections && shortsSections.length > 0) {
        const blocks: ReactNode[] = [];
        if (shortsSections.includes('pyungTrades')) {
            const pyung = renderPyungTradesSection();
            if (pyung) blocks.push(pyung);
        }
        if (shortsSections.includes('landSummary')) {
            blocks.push(renderLandSummarySection());
        }
        if (shortsSections.includes('market')) {
            const market = renderMarketSummarySection();
            if (market) blocks.push(market);
        }
        if (blocks.length === 0) {
            return (
                <div className="p-6 rounded-[32px] border border-white/[0.08] bg-[#13131a]/80 text-white/40 text-sm text-center">
                    표시할 데이터가 없습니다.
                </div>
            );
        }
        return <div className="space-y-0">{blocks}</div>;
    }

    return (
        <div className="space-y-8 pb-12">
            {/* 📊 입력한 상세 정보 Section */}
            {renderUserDetailedInfoSection()}

            {isApartment ? (
                <>
                    {/* 아파트 기본 정보 */}
                    {renderApartmentInfoSection()}

                    {/* 6개월 실거래가 (Pyung-based) */}
                    {renderPyungTradesSection()}

                    {/* 단지 실거래가 리스트 */}
                    {renderTargetComplexTradesSection()}

                    {/* 주변 비교 아파트 */}
                    {renderNearbyComparedApartmentsSection()}

                    {/* 주택 공급 현황 */}
                    {renderHousingSupplySection()}

                    {/* 세부 인구 현황 */}
                    {renderPopulationSummarySection()}

                    {/* 주변 인프라 · 생활권 */}
                    {renderAmenitiesSummarySection()}

                    {/* 상권 현황 요약 */}
                    {renderCommercialSummarySection()}

                    {/* 시장 동향 요약 */}
                    {renderMarketSummarySection()}

                    {/* 규제 현황 요약 */}
                    {renderRegulatorySummarySection()}
                </>
            ) : (
                <>
                    {/* 토지 상세 요약 */}
                    {renderLandSummarySection()}

                    {/* 건물 상세 요약 */}
                    {renderBuildingSummarySection()}

                    {/* 입점 상가 정보 */}
                    {renderBuildingStoresSection()}

                    {/* 시장 동향 요약 */}
                    {renderMarketSummarySection()}

                    {/* 규제 현황 요약 */}
                    {renderRegulatorySummarySection()}

                    {/* 상권 현황 요약 */}
                    {renderCommercialSummarySection()}

                    {/* 세부 인구 현황 */}
                    {renderPopulationSummarySection()}

                    {/* 주변 인프라 · 생활권 */}
                    {renderAmenitiesSummarySection()}
                </>
            )}

            {/* 🧮 매매 계산기 Modal */}
            <AnimatePresence>
                {isCalcOpen && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="w-full max-w-md bg-[#0f0f12] border-t border-white/10 rounded-t-[40px] overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto my-3 shrink-0" />

                            <div className="px-6 py-4 flex justify-between items-center border-b border-white/5 shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 bg-[#0ea5e9]/10 rounded-lg">
                                        <Calculator className="w-4 h-4 text-[#0ea5e9]" />
                                    </div>
                                    <span className="text-white font-bold text-[17px]">{calcPyung}평 매매 간편 계산기</span>
                                </div>
                                <button onClick={() => setIsCalcOpen(false)} className="text-white/40 hover:text-white text-sm font-bold">닫기</button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                                {/* 가격 표시 */}
                                <div className="p-5 bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] rounded-[24px] shadow-lg shadow-[#0ea5e9]/10">
                                    <span className="text-white/60 text-xs font-semibold block mb-1">직전 실거래 가격 기준</span>
                                    <span className="text-white text-2xl font-black">{formatKoreanCurrency(calcPrice)}원</span>
                                </div>

                                {/* 필요 자금 */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-white/50 text-sm font-bold">
                                        <Award className="w-4 h-4 text-[#0ea5e9]" />
                                        <span>필요 자금</span>
                                    </div>
                                    <div className="p-4 bg-white/2 border border-white/5 rounded-2xl flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <span className="text-white/70 text-sm">대출 비율</span>
                                            <select
                                                value={selectedLoanRatio}
                                                onChange={(e) => setSelectedLoanRatio(parseFloat(e.target.value))}
                                                className="bg-[#1a1a1c] border border-white/10 text-white rounded-lg px-2 py-1 text-xs font-bold focus:outline-none"
                                            >
                                                <option value={0.8}>80% (최초)</option>
                                                <option value={0.7}>70% (일반)</option>
                                                <option value={0.6}>60%</option>
                                                <option value={0.5}>50% (규제)</option>
                                                <option value={0.35}>35%</option>
                                                <option value={0.2}>20%</option>
                                            </select>
                                        </div>
                                        <span className="text-white text-sm font-extrabold">{formatKoreanCurrency(calcLoanCapital)}원</span>
                                    </div>

                                    <div className="p-4 bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 rounded-2xl flex justify-between items-center">
                                        <span className="text-[#0ea5e9] text-sm font-bold">자기 자본 ({(100 - selectedLoanRatio * 100).toFixed(0)}%)</span>
                                        <span className="text-white text-sm font-black">{formatKoreanCurrency(calcSelfCapital)}원</span>
                                    </div>

                                    <div className="p-4 bg-white/2 border border-white/5 rounded-2xl flex justify-between items-center text-xs text-white/40">
                                        <span>이자 총액 (4.12%, 20년)</span>
                                        <span className="font-bold">{formatKoreanCurrency(calcLoanResult.totalInterest)}원</span>
                                    </div>

                                    <div className="p-4 bg-[#0ea5e9]/5 border border-[#0ea5e9]/15 rounded-2xl flex justify-between items-center">
                                        <span className="text-white text-sm font-bold">매달 납입금</span>
                                        <span className="text-[#0ea5e9] text-base font-black">{formatKoreanCurrency(calcLoanResult.monthlyPayment)}원/월</span>
                                    </div>
                                </div>

                                {/* 그외 부대비용 */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-white/50 text-sm font-bold">
                                        <Coins className="w-4 h-4 text-[#0ea5e9]" />
                                        <span>부대 비용</span>
                                    </div>
                                    <div className="p-4 bg-white/2 border border-white/5 rounded-2xl flex justify-between items-center">
                                        <span className="text-white/70 text-sm">취득세 (약 1.1% ~ 11% 기준)</span>
                                        <span className="text-white text-sm font-extrabold">{formatKoreanCurrency(calcTax)}원</span>
                                    </div>
                                    <div className="p-4 bg-white/2 border border-white/5 rounded-2xl flex justify-between items-center">
                                        <span className="text-white/70 text-sm">중개 보수 ({calcBrokerage.rate.toFixed(2)}%)</span>
                                        <span className="text-white text-sm font-extrabold">{formatKoreanCurrency(calcBrokerage.amount)}원</span>
                                    </div>
                                </div>

                                {/* 세금 브리핑 */}
                                <div className="p-5 bg-white/2 border border-white/5 rounded-[24px] space-y-4">
                                    <div className="flex items-center gap-2 text-white/70 text-sm font-bold">
                                        <Info className="w-4 h-4 text-[#0ea5e9]" />
                                        <span>보유 세금 안내</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-white/40">예상 재산세 (월 평균)</span>
                                        <span className="text-white font-bold">{formatKoreanCurrency(calcPropTax / 12)}원</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-white/40">종부세 대상 여부</span>
                                        <span className="text-white font-bold">{calcComprehensiveTax}</span>
                                    </div>
                                </div>

                                <div className="text-center text-[11px] text-white/40 font-medium pb-2">
                                    간편 계산인만큼 정확한 정보 내역은 한번 더 검토해 보세요.
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );

    // ──────────────────────────────────────────
    // 📊 RENDER SUB-METHODS
    // ──────────────────────────────────────────


    function renderUserDetailedInfoSection() {
        const buildingName = primaryTitle?.bldNm || rawData?.bld_nm || null;
        const details = [
            ...(buildingName ? [{ label: '건축물명', value: buildingName, icon: Building2 }] : []),
            { label: '거래 유형', value: txType || '미입력', icon: ArrowLeftRight },
            { label: '가격 정보', value: getPriceText(), icon: DollarSign },
            { label: '층수 / 면적', value: `${floor ? floor + '층' : '-층'} | 전용 ${area ? parseFloat(area).toFixed(1) + '㎡' : '-㎡'}`, icon: Ruler }
        ];

        if (premium || currentBusiness || desiredBusiness || monthlyRevenue || monthlyProfit) {
            if (premium) details.push({ label: '권리금', value: formatKoreanCurrency(parseFloat(premium) || 0), icon: Award });
            if (currentBusiness || desiredBusiness) {
                details.push({ label: '업종 현황', value: `현재: ${currentBusiness || '-'} | 희망: ${desiredBusiness || '-'}`, icon: Store });
            }
            if (monthlyRevenue || monthlyProfit) {
                details.push({ label: '운영 수익', value: `매출 ${formatKoreanCurrency(parseFloat(monthlyRevenue) || 0)} / 수익 ${formatKoreanCurrency(parseFloat(monthlyProfit) || 0)}`, icon: TrendingUp });
            }
        }

        return (
            <div className="p-6 bg-[#13131a]/80 backdrop-blur-2xl rounded-[32px] border border-white/[0.08] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)] hover:border-white/[0.15] transition-all duration-300">
                <div className="flex items-center gap-2 mb-6">
                    <FileText className="w-5 h-5 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
                    <span className="text-white text-base font-bold tracking-tight">입력한 상세 정보</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {details.map((item, idx) => {
                        const Icon = item.icon;
                        const isValueEntered = item.value !== '미입력' && item.value !== '-층 | 전용 -㎡';
                        return (
                            <div key={idx} className="p-4 bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.1] rounded-2xl flex items-center justify-between transition-all hover:bg-white/[0.05]">
                                <div className="flex items-center gap-3 text-white/60 text-sm font-semibold">
                                    <Icon className="w-4 h-4 text-sky-400/80" />
                                    <span>{item.label}</span>
                                </div>
                                <span className={`text-sm font-black tracking-tight ${isValueEntered ? 'text-sky-300' : 'text-white/30'}`}>{item.value}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    function renderApartmentInfoSection() {
        const details = [
            { label: '연도', value: formattedYear, icon: Calendar },
            { label: '세대수', value: totalHouseholds > 0 ? `${totalHouseholds}세대` : '-', icon: Users },
            { label: '동수', value: totalDongs > 0 ? `${totalDongs}개동` : '-', icon: Building2 },
            { label: '최고층', value: topFloorText, icon: TrendingUp },
            { label: '용적률', value: primaryTitle.vlRat ? `${primaryTitle.vlRat}%` : '-', icon: Ruler },
            { label: '건폐율', value: primaryTitle.bcRat ? `${primaryTitle.bcRat}%` : '-', icon: Layers },
            { label: '내진설계', value: seismicText, icon: ShieldCheck },
            { label: '주차공간', value: parkingSpaceText, icon: Car }
        ];

        return (
            <div className="p-6 bg-[#13131a]/80 backdrop-blur-2xl rounded-[32px] border border-white/[0.08] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)] hover:border-white/[0.15] transition-all duration-300">
                <div className="flex items-center gap-2 mb-6">
                    <Building2 className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    <span className="text-white text-base font-bold tracking-tight">아파트 기본 정보</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {details.map((item, idx) => {
                        const Icon = item.icon;
                        const hasVal = item.value !== '-' && item.value !== '정보없음' && item.value !== '미대상';
                        return (
                            <div key={idx} className="p-4 bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.1] rounded-2xl flex flex-col gap-1.5 transition-all hover:bg-white/[0.05]">
                                <div className="flex items-center gap-2 text-white/50 text-xs font-semibold">
                                    <Icon className="w-3.5 h-3.5 text-emerald-400/80" />
                                    <span>{item.label}</span>
                                </div>
                                <span className={`text-sm font-black tracking-tight mt-0.5 ${hasVal ? 'text-emerald-300' : 'text-white/30'}`}>{item.value}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    function renderPyungTradesSection() {
        if (pyungSummary.length === 0) return null;

        return (
            <div className="p-6 bg-gradient-to-br from-sky-950/30 to-slate-900/50 border border-sky-500/20 rounded-[32px] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl transition-all duration-300 hover:border-sky-500/30">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
                        <span className="text-white text-base font-bold tracking-tight">{targetName} 6개월 실거래가</span>
                    </div>
                    <span className="px-2.5 py-1 bg-sky-500/10 text-sky-400 text-[10px] rounded-lg font-black tracking-wider uppercase">최근 실거래 기준</span>
                </div>
                <div className="space-y-4">
                    {(shortsMode ? pyungSummary.slice(0, 3) : pyungSummary).map((item) => {
                        const maxFloor = item.maxTrade.floor ? `${item.maxTrade.floor}층` : '-층';
                        const minFloor = item.minTrade.floor ? `${item.minTrade.floor}층` : '-층';
                        const recentFloor = item.recentTrade.floor ? `${item.recentTrade.floor}층` : '-층';

                        const formatDateSimple = (tr: any) => `${tr.dealYear.toString().substring(2)}.${String(tr.dealMonth).padStart(2, '0')}.${String(tr.dealDay || 1).padStart(2, '0')}`;

                        return (
                            <div key={item.pyung} className="p-5 bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.1] rounded-2xl space-y-4 transition-all duration-300 hover:bg-white/[0.05]">
                                <div className="flex justify-between items-center">
                                    <span className="text-sky-300 text-base font-black tracking-tight">{item.pyung}평형</span>
                                    {!shortsMode && (
                                        <button
                                            onClick={() => openCalculator(item.pyung, item.recentPrice)}
                                            className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 active:scale-95"
                                        >
                                            <Calculator className="w-3.5 h-3.5 text-white" />
                                            <span className="text-white">간편 계산</span>
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-2.5 text-xs">
                                    {/* 직전가 */}
                                    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.05]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-sky-400 drop-shadow-[0_0_4px_rgba(56,189,248,0.7)]" />
                                            <span className="text-white/60 font-medium">직전 실거래가</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-white font-extrabold text-sm">{formatTradeAmountPart(item.recentPrice)}</span>
                                            <span className="text-white/10">|</span>
                                            <span className="text-white/40">{recentFloor} ({formatDateSimple(item.recentTrade)})</span>
                                        </div>
                                    </div>
                                    {/* 최고가 */}
                                    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.05]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-400 drop-shadow-[0_0_4px_rgba(251,113,133,0.7)]" />
                                            <span className="text-white/60 font-medium">6개월 최고가</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-rose-400 font-extrabold text-sm">{formatTradeAmountPart(item.maxPrice)}</span>
                                            <span className="text-white/10">|</span>
                                            <span className="text-white/40">{maxFloor} ({formatDateSimple(item.maxTrade)})</span>
                                        </div>
                                    </div>
                                    {/* 최저가 */}
                                    <div className="flex items-center justify-between py-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.7)]" />
                                            <span className="text-white/60 font-medium">6개월 최저가</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-emerald-400 font-extrabold text-sm">{formatTradeAmountPart(item.minPrice)}</span>
                                            <span className="text-white/10">|</span>
                                            <span className="text-white/40">{minFloor} ({formatDateSimple(item.minTrade)})</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    function renderTargetComplexTradesSection() {
        if (backendTargetTrades.length === 0) return null;

        return (
            <div className="p-6 bg-[#13131a]/80 border border-white/[0.08] rounded-[32px] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl space-y-5">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Landmark className="w-5 h-5 text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
                        <span className="text-white text-base font-bold tracking-tight">{targetName} 실거래가</span>
                    </div>
                    <span className="px-2.5 py-1 bg-white/5 border border-white/10 text-white/70 text-[10px] rounded-xl font-black">최근 {targetAptTrades.length}건</span>
                </div>

                {/* 탭 버튼들 */}
                <div className="flex gap-2">
                    {(['매매', '전세', '월세'] as const).map((type) => {
                        const isSelected = selectedTargetTab === type;
                        return (
                            <button
                                key={type}
                                onClick={() => setSelectedTargetTab(type)}
                                className={`px-4 py-1.5 rounded-xl text-xs font-black border transition-all ${isSelected
                                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                {type}
                            </button>
                        );
                    })}
                </div>

                {/* 거래 내역 리스트 */}
                {displayTrades.length === 0 ? (
                    <div className="py-10 text-center text-xs text-white/30 italic">해당 유형의 거래 내역이 없습니다.</div>
                ) : (
                    <div className="space-y-1">
                        {displayTrades.map((trade: any, idx: number) => {
                            const dateStr = `${trade.dealYear}.${String(trade.dealMonth).padStart(2, '0')}.${String(trade.dealDay || 1).padStart(2, '0')}`;
                            const floorStr = trade.floor ? `${trade.floor}층` : '-층';
                            const areaVal = parseFloat(trade.excluUseAr || trade.area || '0');
                            const areaStr = areaVal > 0 ? `${areaVal.toFixed(1)}㎡` : '-㎡';

                            const depositAmt = parseFloat(String(trade.deposit || '0').replace(/,/g, ''));
                            const rentAmt = parseFloat(String(trade.monthlyRent || '0').replace(/,/g, ''));
                            const dealAmt = parseFloat(String(trade.dealAmount || '0').replace(/,/g, ''));

                            const isRent = trade._isRent === true;
                            const isWolse = isRent && rentAmt > 0;

                            let priceLabel = '';
                            let typeColor = 'text-sky-300';
                            let iconBg = 'bg-sky-500/10';
                            let IconComp = Landmark;
                            if (isRent) {
                                if (isWolse) {
                                    priceLabel = `${formatTradeAmountPart(depositAmt)} / ${rentAmt.toLocaleString()}만`;
                                    typeColor = 'text-purple-300';
                                    iconBg = 'bg-purple-500/10';
                                    IconComp = Clock;
                                } else {
                                    priceLabel = formatTradeAmountPart(depositAmt);
                                    typeColor = 'text-emerald-300';
                                    iconBg = 'bg-emerald-500/10';
                                    IconComp = KeyRound;
                                }
                            } else {
                                priceLabel = formatTradeAmountPart(dealAmt);
                            }

                            return (
                                <div key={idx} className="hover:bg-white/[0.02] p-2 -mx-2 rounded-xl transition-all duration-200">
                                    {idx > 0 && <div className="h-px bg-white/[0.05] mb-2.5" />}
                                    <div className="flex items-center gap-3 py-1">
                                        <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                                            <IconComp className={`w-4 h-4 ${typeColor}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-white text-sm font-bold">{floorStr} | 전용 {areaStr}</div>
                                            <div className="text-white/40 text-xs mt-0.5">{dateStr}</div>
                                        </div>
                                        <span className={`${typeColor} text-sm font-black shrink-0`}>{priceLabel}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    function renderNearbyComparedApartmentsSection() {
        if (comparedApts.length === 0) return null;

        return (
            <div className="p-6 bg-[#13131a]/80 border border-white/[0.08] rounded-[32px] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl space-y-5">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <ArrowLeftRight className="w-5 h-5 text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.5)]" />
                        <span className="text-white text-base font-bold tracking-tight">주변 비교 아파트</span>
                    </div>
                    <span className="px-2.5 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[10px] rounded-xl font-black">비교 {comparedApts.length}곳</span>
                </div>

                <div className="space-y-1">
                    {comparedApts.map((apt, idx) => {
                        const areaVal = parseFloat(apt.trade.excluUseAr || apt.trade.area || '0');
                        const floorStr = apt.trade.floor ? `${apt.trade.floor}층` : '-층';
                        const dateStr = apt.trade.dealYear
                            ? `${String(apt.trade.dealYear).substring(2)}.${String(apt.trade.dealMonth).padStart(2, '0')}.${String(apt.trade.dealDay || 1).padStart(2, '0')}`
                            : '';
                        const diff = apt.price - targetPrice;

                        let diffText = '';
                        let diffColor = 'text-white/40';
                        if (diff > 0) {
                            diffText = `+${formatTradeAmountPart(diff)}`;
                            diffColor = 'text-rose-400 font-extrabold';
                        } else if (diff < 0) {
                            diffText = `-${formatTradeAmountPart(Math.abs(diff))}`;
                            diffColor = 'text-sky-400 font-extrabold';
                        } else {
                            diffText = '동일 시세';
                            diffColor = 'text-emerald-400 font-extrabold';
                        }

                        return (
                            <div key={idx} className="hover:bg-white/[0.02] p-2 -mx-2 rounded-xl transition-all duration-200">
                                {idx > 0 && <div className="h-px bg-white/[0.05] mb-2.5" />}
                                <div className="flex items-center gap-3 py-1">
                                    <div className="w-9 h-9 bg-violet-500/10 rounded-xl flex items-center justify-center shrink-0">
                                        <Building2 className="w-4 h-4 text-violet-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-white text-sm font-bold truncate max-w-[160px]">{apt.aptNm}</div>
                                        <div className="text-white/40 text-xs mt-0.5">{floorStr} | 전용 {areaVal.toFixed(1)}㎡{dateStr ? ` | ${dateStr}` : ''}</div>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                        <span className="text-violet-300 text-sm font-black">{formatTradeAmountPart(apt.price)}</span>
                                        <span className={`text-[10px] ${diffColor}`}>{diffText}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    function renderHousingSupplySection() {
        if (!housingSupply || Object.keys(housingSupply).length === 0) return null;

        return (
            <div className="p-6 bg-[#13131a]/80 border border-white/[0.08] rounded-[32px] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
                        <span className="text-white text-base font-bold tracking-tight">주택 공급 현황</span>
                    </div>
                    <span className="px-2.5 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] rounded-lg font-black">과잉지수 {glutScore}/100</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.1] rounded-2xl flex flex-col items-center transition-all duration-300">
                        <span className="text-white/60 text-[10px] font-bold block mb-1">향후 분양 예정</span>
                        <span className="text-sky-300 text-sm font-black">{planned}세대</span>
                    </div>
                    <div className="p-4 bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.1] rounded-2xl flex flex-col items-center transition-all duration-300">
                        <span className="text-white/60 text-[10px] font-bold block mb-1">입주 예정 물량</span>
                        <span className="text-emerald-300 text-sm font-black">{moveIn}세대</span>
                    </div>
                    <div className="p-4 bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.1] rounded-2xl flex flex-col items-center transition-all duration-300">
                        <span className="text-white/60 text-[10px] font-bold block mb-1">현재 미분양</span>
                        <span className="text-rose-300 text-sm font-black">{unsold}세대</span>
                    </div>
                </div>

                {plannedDetails.length > 0 && (
                    <div className="space-y-3">
                        <span className="text-white/50 text-xs font-black tracking-tight block">분양 계획 단지 정보</span>
                        <div className="space-y-2">
                            {plannedDetails.slice(0, 3).map((item: any, idx: number) => (
                                <div key={idx} className="p-3 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08] rounded-xl flex justify-between items-center transition-all">
                                    <div className="flex flex-col gap-1 max-w-[200px]">
                                        <span className="text-white text-xs font-black truncate">{item.name}</span>
                                        <span className="text-[10px] text-white/50 truncate">{item.address}</span>
                                    </div>
                                    <span className="text-sky-400 text-xs font-extrabold shrink-0">{item.count}세대</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    function renderLandSummarySection() {
        return (
            <div className="p-6 bg-[#13131a]/80 border border-white/[0.08] rounded-[32px] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl space-y-6">
                <div className="flex items-center gap-2">
                    <Map className="w-5 h-5 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
                    <span className="text-white text-base font-bold tracking-tight">토지 상세 요약</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 p-5 bg-white/[0.02] border border-white/[0.05] rounded-[24px]">
                    <SummaryItem
                        label="현재가 / 공시지가"
                        value={userPrice > 0 ? `${formatKoreanCurrency(userPrice)}원` : '정보없음'}
                        icon={DollarSign}
                        color="text-sky-400"
                        trailing={userPrice > 0 && landRatio > 0 ? (
                            <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20 text-[10px] font-black shrink-0">
                                대비 {landRatio.toFixed(0)}%
                            </span>
                        ) : undefined}
                    />
                    <SummaryItem
                        label="공시지가"
                        value={totalOfficialPrice > 0 ? `${formatKoreanCurrency(totalOfficialPrice)}원` : '정보없음'}
                        icon={TrendingUp}
                        color="text-emerald-400"
                        subValue={totalOfficialPrice > 0 ? `평당 약 ${formatKoreanCurrency(pricePerM2 * 3.3)}원` : undefined}
                    />
                    <SummaryItem
                        label="총 면적"
                        value={primaryLandData.area ? `${areaVal.toFixed(1)}㎡ (${pyeongVal.toFixed(1)}평)` : '정보없음'}
                        icon={Ruler}
                        color="text-purple-400"
                    />
                    <SummaryItem
                        label="핵심 용도지역"
                        value={primaryLandData.zoning || '정보없음'}
                        icon={Map}
                        color="text-amber-400"
                    />
                </div>
            </div>
        );
    }

    function renderBuildingSummarySection() {
        const hasBuildingInfo = !!(primaryTitle?.useAprDay || primaryTitle?.strctCdNm || primaryTitle?.totArea);

        return (
            <div className="p-6 bg-[#13131a]/80 border border-white/[0.08] rounded-[32px] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl space-y-6">
                <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    <span className="text-white text-base font-bold tracking-tight">건축물 대장 요약</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 p-5 bg-white/[0.02] border border-white/[0.05] rounded-[24px]">
                    <SummaryItem
                        label="사용승인일"
                        value={primaryTitle?.useAprDay ? formatDate(primaryTitle.useAprDay) : '정보없음'}
                        icon={Calendar}
                        color="text-sky-400"
                    />
                    <SummaryItem
                        label="주구조"
                        value={primaryTitle?.strctCdNm || '정보없음'}
                        icon={Building2}
                        color="text-emerald-400"
                    />
                    <SummaryItem
                        label="연면적 · 건폐율 · 용적률"
                        value={primaryTitle?.totArea ? `${(parseFloat(primaryTitle.totArea) * 0.3025).toFixed(1)}평` : '정보없음'}
                        icon={Layers}
                        color="text-purple-400"
                        subValue={primaryTitle?.bcRat || primaryTitle?.vlRat ? `건폐율 ${Math.round(parseFloat(primaryTitle.bcRat || '0'))}% / 용적률 ${Math.round(parseFloat(primaryTitle.vlRat || '0'))}%` : undefined}
                    />
                </div>
                {!hasBuildingInfo && (
                    <div className="p-5 bg-white/[0.02] border border-white/[0.04] rounded-2xl text-left space-y-3">

                        <p className="text-sky-300 text-xs font-bold leading-relaxed">
                            지번 변경, 전산 누락, 무허가 건물, 오래된 구옥, 신축 건물 일 경우 건축물대장 없음으로 표시될 수 있습니다.
                        </p>
                        <div className="h-px bg-white/[0.06] my-2" />
                    </div>
                )}
            </div>
        );
    }

    function renderBuildingStoresSection() {
        const isBldgOrStore =
            category === 'building' || category === 'store' || category === '빌딩';
        if (!isBldgOrStore) return null;

        const stores = rawData.commercialData?.buildingStores;
        const storeList = Array.isArray(stores) ? stores : [];

        return (
            <div className="p-6 bg-[#13131a]/80 border border-white/[0.08] rounded-[32px] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl space-y-6">
                <div className="flex justify-between items-center gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <Store className="w-5 h-5 text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.5)] shrink-0" />
                        <span className="text-white text-base font-bold tracking-tight">입점 상가 정보</span>
                    </div>
                    {storeList.length > 0 && (
                        <span className="px-2.5 py-1 bg-teal-500/10 border border-teal-500/20 text-teal-300 text-[10px] rounded-xl font-black shrink-0">
                            총 {storeList.length}개 점포
                        </span>
                    )}
                </div>

                <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-[24px] space-y-4">
                    {storeList.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {storeList.map((store: any, i: number) => (
                                <div
                                    key={i}
                                    className="p-4 bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.1] rounded-2xl flex flex-col gap-2 min-w-0 transition-all duration-300"
                                >
                                    <div className="flex items-center justify-between gap-2 min-w-0">
                                        <span className="shrink-0 text-[10px] font-black bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded-lg border border-teal-500/20">
                                            {store.flrNoNm || '-'}
                                        </span>
                                        <span className="text-[10px] font-bold text-white/35 truncate">
                                            {store.indsLclsNm}{store.indsSclsNm ? ` > ${store.indsSclsNm}` : ''}
                                        </span>
                                    </div>
                                    <p className="text-white font-extrabold text-[13px] truncate leading-tight">
                                        {store.bizesNm || '-'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sky-300 text-xs font-bold leading-relaxed text-center py-2">
                            해당 건물에 등록된 상가 데이터가 없습니다. (소상공인시장진흥공단 기준)
                        </p>
                    )}
                    <p className="text-white/25 text-[10px] font-bold text-center">
                        소상공인시장진흥공단 상가업소 정보
                    </p>
                </div>
            </div>
        );
    }

    function renderApartmentMarketSummarySection() {
        const ind = rawData.marketIndicators || {};

        // 1. 매매지수
        const saleParsed = parseIndicatorSeries(ind.saleIndex || ind.priceIndex);
        const saleVal = saleParsed?.current ?? 100.11;
        const saleTrend = saleParsed?.trend ?? '상승';

        // 2. 전세지수
        const jeonseParsed = parseIndicatorSeries(ind.jeonseIndex);
        const jeonseVal = jeonseParsed?.current ?? 101.54;
        const jeonseTrend = jeonseParsed?.trend ?? '상승';

        // 3. 월세지수
        const wolseParsed = parseIndicatorSeries(ind.wolseIndex);
        const wolseVal = wolseParsed?.current ?? 101.33;
        const wolseTrend = wolseParsed?.trend ?? '상승';

        // 4. 매매수급
        const sd = ind.supplyDemand || {};
        const saleSDMap = sd.sale || {};
        const saleSDSummary = saleSDMap.summary || {};
        const saleSDVal = saleSDSummary.latest !== undefined ? parseFloat(String(saleSDSummary.latest)) : 105.5;
        const saleSDTrend = saleSDSummary.trend || '상승';

        // 5. 전세수급
        const jeonseSDMap = sd.jeonse || {};
        const jeonseSDSummary = jeonseSDMap.summary || {};
        const jeonseSDVal = jeonseSDSummary.latest !== undefined ? parseFloat(String(jeonseSDSummary.latest)) : 109.5;
        const jeonseSDTrend = jeonseSDSummary.trend || '상승';

        // 6. 월세수급
        const wolseSDMap = sd.wolse || {};
        const wolseSDSummary = wolseSDMap.summary || {};
        const wolseSDVal = wolseSDSummary.latest !== undefined ? parseFloat(String(wolseSDSummary.latest)) : 109.7;
        const wolseSDTrend = wolseSDSummary.trend || '상승';

        // 설명 작성 유틸리티
        const getSaleDesc = (val: number) => {
            const diff = val - 100;
            const diffAbsStr = Math.abs(diff).toFixed(2);
            if (Math.abs(diff) < 0.005) {
                return '기준 시점의 아파트 값(100)과 비교했을 때 현재 가격이 변동 없이 보합세를 보이며 제자리걸음을 걷고 있다는 뜻이에요.';
            }
            const word = diff > 0 ? '상승' : '하락';
            const detail = Math.abs(diff) < 0.5
                ? `미세하게 ${word}하며 제자리걸음을 걷고`
                : `${word}하며 변동이 나타나고`;
            return `기준 시점의 아파트 값(100)과 비교했을 때 현재 가격이 ${diffAbsStr}% ${detail} 있다는 뜻이에요.`;
        };

        const getJeonseWolseDesc = (jVal: number, wVal: number) => {
            const jDiff = jVal - 100;
            const wDiff = wVal - 100;
            const jStr = Math.abs(jDiff).toFixed(2);
            const wStr = Math.abs(wDiff).toFixed(2);

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

        const getJeonseWolseSDDesc = (jVal: number, wVal: number) => {
            const jValStr = jVal.toFixed(1);
            const wValStr = wVal.toFixed(1);
            if (jVal > 100 && wVal > 100) {
                return '100점을 훌륭히 넘겨 전세·월세 모두 집을 구하려는 세입자가 매물보다 훨씬 많다는 뜻이에요. 전월세 대란이나 가격 상승 우려가 커요.';
            } else if (jVal < 100 && wVal < 100) {
                return '100점보다 낮아 전세·월세 모두 집을 내놓은 임대인이 많고 구하려는 세입자가 적다는 뜻이에요. 역전세난이나 가격 하락 우려가 있어요.';
            } else if (jVal > 100) {
                return `전세수급(${jValStr})이 100점을 넘어 전세는 세입자가 매물보다 많으나, 월세(${wValStr})는 임대인이 더 많아 시장 흐름에 편차가 있다는 뜻이에요.`;
            } else {
                return `월세수급(${wValStr})이 100점을 넘어 월세는 세입자가 매물보다 많으나, 전세(${jValStr})는 임대인이 더 많아 시장 흐름에 편차가 있다는 뜻이에요.`;
            }
        };

        let jwTrend = '보합';
        if (jeonseTrend === '상승' && wolseTrend === '상승') jwTrend = '상승';
        else if (jeonseTrend === '하락' && wolseTrend === '하락') jwTrend = '하락';
        else if (jeonseTrend === '상승' || wolseTrend === '상승') jwTrend = '상승';

        let jwSDTrend = '보합';
        if (jeonseSDTrend === '상승' && wolseSDTrend === '상승') jwSDTrend = '상승';
        else if (jeonseSDTrend === '하락' && wolseSDTrend === '하락') jwSDTrend = '하락';
        else if (jeonseSDTrend === '상승' || wolseSDTrend === '상승') jwSDTrend = '상승';

        const metrics = [
            {
                key: 'saleIndex',
                label: `매매지수 ${saleVal.toFixed(2)}`,
                value: `매매시장 흐름 : ${saleTrend}`,
                icon: TrendingUp,
                color: 'text-sky-400',
                insight: {
                    trend: `최근 추이: ${saleTrend}`,
                    body: getSaleDesc(saleVal)
                }
            },
            {
                key: 'jeonseIndex',
                label: `전세지수 ${jeonseVal.toFixed(2)} / 월세지수 ${wolseVal.toFixed(2)}`,
                value: `임대차시장 흐름 : ${jwTrend}`,
                icon: Home,
                color: 'text-emerald-400',
                insight: {
                    trend: `최근 추이: ${jwTrend}`,
                    body: getJeonseWolseDesc(jeonseVal, wolseVal)
                }
            },
            {
                key: 'saleSD',
                label: `매매수급 ${saleSDVal.toFixed(1)}`,
                value: `매매 시장 동력 : ${saleSDTrend}`,
                icon: Activity,
                color: 'text-amber-500',
                insight: {
                    trend: `수급 동향: ${saleSDTrend}`,
                    body: getSaleSDDesc(saleSDVal)
                }
            },
            {
                key: 'jeonseSD',
                label: `전세수급 ${jeonseSDVal.toFixed(1)} / 월세수급 ${wolseSDVal.toFixed(1)}`,
                value: `전월세 매물 과부하 : ${jwSDTrend}`,
                icon: ShieldCheck,
                color: 'text-purple-400',
                insight: {
                    trend: `수급 동향: ${jwSDTrend}`,
                    body: getJeonseWolseSDDesc(jeonseSDVal, wolseSDVal)
                }
            }
        ];

        const regionalTrades = rawData.vitals?.regionalTrades || [];

        return (
            <div className="p-6 bg-[#13131a]/80 border border-white/[0.08] rounded-[32px] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl space-y-6">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
                    <span className="text-white text-base font-bold tracking-tight">아파트 시장 동향 요약</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 p-5 bg-white/[0.02] border border-white/[0.05] rounded-[24px]">
                    {metrics.map((m) => {
                        const isExpanded = !!expandedApartmentMetrics[m.key];
                        return (
                            <ExpandableMetricRow
                                key={m.key}
                                metricKey={m.key}
                                label={m.label}
                                value={m.value}
                                icon={m.icon}
                                color={m.color}
                                insight={m.insight}
                                isExpanded={isExpanded}
                                onToggle={() => setExpandedApartmentMetrics(prev => ({ ...prev, [m.key]: !isExpanded }))}
                            />
                        );
                    })}
                </div>

                <div className="p-5 bg-white/[0.03] border border-white/[0.05] rounded-[24px] space-y-4 transition-all">
                    <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-white/60">아파트매매 거래량 (최근 1개월)</span>
                        <span className="text-sky-400 font-black text-sm">{getRegionalTradeCount(regionalTrades, '아파트매매')}건</span>
                    </div>
                </div>
            </div>
        );
    }

    function renderMarketSummarySection() {
        const marketIndicators = rawData.marketIndicators || {};
        const regionalTrades = rawData.vitals?.regionalTrades || [];
        if (Object.keys(marketIndicators).length === 0) return null;

        if (isApartment) {
            return renderApartmentMarketSummarySection();
        }

        const isBldgOrStore = category === 'building' || category === 'store';
        const isHouse = category === 'house';

        const title = isBldgOrStore ? '현 지역 상업 시장 동향 요약' : (isHouse ? '주택 시장 동향 요약' : '토지 시장 동향 요약');
        const themeColor = isBldgOrStore ? 'text-amber-400' : (isHouse ? 'text-emerald-400' : 'text-purple-400');
        const IconHeader = TrendingUp;

        return (
            <div className="p-6 bg-[#13131a]/80 border border-white/[0.08] rounded-[32px] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl space-y-6">
                <div className="flex items-center gap-2">
                    <IconHeader className={`w-5 h-5 ${themeColor} drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]`} />
                    <span className="text-white text-base font-bold tracking-tight">{title}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 p-5 bg-white/[0.02] border border-white/[0.05] rounded-[24px]">
                    {(() => {
                        const metrics = [];
                        if (isBldgOrStore) {
                            metrics.push(
                                { key: 'priceIndex', label: '임대가격지수', value: getIndicatorValue(marketIndicators.priceIndex), icon: TrendingUp, color: 'text-amber-400', insight: { trend: '지수 변동', body: '임대가격지수는 기준 시점 대비 현재 상가/오피스의 임대료 수준이 어떻게 변했는지를 나타냅니다.' } },
                                { key: 'vacancyRate', label: '공실률', value: getIndicatorPercent(marketIndicators.vacancyRate), icon: PieChart, color: 'text-purple-400', insight: { trend: '공실 현황', body: '공실률은 전체 임대 가능 면적 중 비어있는 면적의 비율로, 상권의 활성도와 수익성을 판단하는 핵심 지표입니다.' } },
                                { key: 'rentAmount', label: '임대료', value: getIndicatorValue(marketIndicators.rentAmount) !== '-' ? `${(parseFloat(getIndicatorValue(marketIndicators.rentAmount)) * 1000).toLocaleString()}원/㎡` : '-', icon: DollarSign, color: 'text-emerald-400', insight: { trend: '임대료 동향', body: '단위 면적당 평균 임대료를 나타내며, 해당 상권의 기대 수익 수준을 가늠할 수 있습니다.' } }
                            );
                        } else if (isHouse) {
                            metrics.push(
                                { key: 'priceIndex', label: '매매지수', value: getIndicatorValue(marketIndicators.priceIndex), icon: TrendingUp, color: 'text-sky-400', insight: { trend: '지수 변동', body: '주택 매매지수는 기준 시점 대비 현재 주택의 매매 가격 수준이 어떻게 변했는지를 나타냅니다.' } },
                                { key: 'jeonseIndex', label: '전세지수', value: getIndicatorValue(marketIndicators.jeonseIndex), icon: Home, color: 'text-emerald-400', insight: { trend: '지수 변동', body: '주택 전세지수는 기준 시점 대비 현재 주택의 전세 가격 수준이 어떻게 변했는지를 나타냅니다.' } },
                                { key: 'conversionRate', label: '전월세전환율', value: getIndicatorPercent(marketIndicators.conversionRate), icon: Percent, color: 'text-amber-400', insight: { trend: '전환 비율', body: '전월세전환율은 전세 보증금을 월세로 전환할 때 적용되는 비율로, 주택 임대차 시장의 수익률 지표로 활용됩니다.' } }
                            );
                        } else {
                            metrics.push(
                                { key: 'priceIndex', label: '지가지수', value: getIndicatorValue(marketIndicators.priceIndex), icon: TrendingUp, color: 'text-sky-400', insight: { trend: '지수 변동', body: '지가지수는 기준 시점 대비 현재 토지의 가격 수준이 어떻게 변했는지를 나타냅니다.' } },
                                { key: 'changeRate', label: '지가변동률', value: getIndicatorPercent(marketIndicators.changeRateByRegion || marketIndicators.changeRateByUse), icon: Percent, color: 'text-purple-400', insight: { trend: '변동 추이', body: '전월 대비 토지 가격의 상승 또는 하락 비율을 의미하며, 지역의 개발 호재나 시장 상황을 반영합니다.' } },
                                { key: 'tradeVolume', label: '거래필지수', value: getIndicatorValue(marketIndicators.tradeVolume) !== '-' ? `${Math.round(parseFloat(getIndicatorValue(marketIndicators.tradeVolume))).toLocaleString()}필지` : '-', icon: Layers, color: 'text-amber-500', insight: { trend: '거래 동향', body: '해당 지역에서 거래된 토지의 총 필지 수로, 시장의 유동성과 활성도를 판단하는 기준이 됩니다.' } }
                            );
                        }

                        return metrics.map((m) => {
                            const isExpanded = !!expandedNonAptMetrics[m.key];
                            return (
                                <ExpandableMetricRow
                                    key={m.key}
                                    metricKey={m.key}
                                    label={m.label}
                                    value={m.value}
                                    icon={m.icon}
                                    color={m.color}
                                    insight={m.insight}
                                    isExpanded={isExpanded}
                                    onToggle={() => setExpandedNonAptMetrics(prev => ({ ...prev, [m.key]: !isExpanded }))}
                                />
                            );
                        });
                    })()}
                </div>

                <div className="p-5 bg-white/[0.03] border border-white/[0.05] rounded-[24px] space-y-4">
                    <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-white/60">
                            {isBldgOrStore ? '상업업무매매 거래량 (최근 1개월)' : '토지매매 거래량 (최근 1개월)'}
                        </span>
                        <span className={`${isBldgOrStore ? 'text-sky-400' : 'text-emerald-400'} font-black text-sm`}>
                            {isBldgOrStore ? `${getRegionalTradeCount(regionalTrades, '상업업무용매매')}건` : `${getRegionalTradeCount(regionalTrades, '토지매매')}건`}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    function renderRegulatorySummarySection() {
        const regData = rawData.regulatoryData || {};
        const gosiList = regData.gosi || [];
        const permitList = regData.permits || [];

        const gosiCount = gosiList.length;
        const permitCount = permitList.length;
        const urbanRenewalCount = gosiList.filter((g: any) => /재개발|재건축|정비/.test(g.title || '')).length;
        const districtPlanCount = gosiList.filter((g: any) => /지구단위/.test(g.title || '')).length;
        const implementationPlanCount = gosiList.filter((g: any) => /실시계획|인가/.test(g.title || '')).length;

        return (
            <div className="p-6 bg-[#13131a]/80 border border-white/[0.08] rounded-[32px] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl space-y-6">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
                    <span className="text-white text-base font-bold tracking-tight">규제 현황 요약</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5 p-5 bg-white/[0.02] border border-white/[0.05] rounded-[24px]">
                    <SummaryItem
                        label="결정시행공고"
                        value={`${gosiCount}건`}
                        icon={FileText}
                        color="text-orange-400"
                    />
                    <SummaryItem
                        label="인허가현황"
                        value={`${permitCount}건`}
                        icon={ShieldCheck}
                        color="text-sky-400"
                    />
                    <SummaryItem
                        label="도시정비사업"
                        value={`${urbanRenewalCount}건`}
                        icon={Hammer}
                        color="text-orange-400"
                    />
                    <SummaryItem
                        label="지구단위계획"
                        value={`${districtPlanCount}건`}
                        icon={Map}
                        color="text-emerald-400"
                    />
                    <SummaryItem
                        label="실시계획인가"
                        value={`${implementationPlanCount}건`}
                        icon={Milestone}
                        color="text-purple-400"
                    />
                </div>
            </div>
        );
    }

    function renderCommercialSummarySection() {
        const commercial = rawData.commercialData || {};
        if (Object.keys(commercial).length === 0) return null;

        const storeOverview = commercial.storeOverview || {};
        const stores = commercial.stores || {};
        const within500m = stores.within500m || {};
        const within2km = stores.within2km || {};
        const household = commercial.household || {};

        const stores500mCount = within500m.totalStores || storeOverview.totalStores || 0;
        const stores1to2kmCount = within2km.totalStores || 0;
        const householdCount = household.householdCount || 0;

        return (
            <div className="p-6 bg-[#13131a]/80 border border-white/[0.08] rounded-[32px] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl space-y-6">
                <div className="flex items-center gap-2">
                    <Store className="w-5 h-5 text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]" />
                    <span className="text-white text-base font-bold tracking-tight">상권 현황 요약</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-5 p-5 bg-white/[0.02] border border-white/[0.05] rounded-[24px]">
                    <SummaryItem
                        label="반경 500m 총 점포수"
                        value={`${stores500mCount}개`}
                        icon={Store}
                        color="text-purple-400"
                    />
                    <SummaryItem
                        label="1~2km 배달 경쟁권 점포"
                        value={`${stores1to2kmCount}개`}
                        icon={Truck}
                        color="text-pink-400"
                    />
                    <SummaryItem
                        label="배후 세대수"
                        value={`${householdCount}가구`}
                        icon={Users}
                        color="text-emerald-400"
                    />
                </div>
            </div>
        );
    }

    function renderPopulationSummarySection() {
        const popData = rawData.population || {};
        const umdComp = popData.umdComparison || {};

        const dongNm = umdComp.dongNm || '우리 동네';
        const pastPop = parseInt(umdComp.pastPop || '0');
        const recentPop = parseInt(umdComp.recentPop || '0');
        const changeVal = parseInt(umdComp.change || '0');

        if (!pastPop && !recentPop) return null;

        const changeStr = `${changeVal >= 0 ? '+' : ''}${changeVal.toLocaleString()}명`;

        return (
            <div className="p-6 bg-[#13131a]/80 border border-white/[0.08] rounded-[32px] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl space-y-6">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]" />
                    <span className="text-white text-base font-bold tracking-tight">{dongNm} 세부 인구 현황</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.1] rounded-2xl flex flex-col items-center transition-all duration-300">
                        <span className="text-white/60 text-[10px] font-bold block mb-1">2022년 인구</span>
                        <span className="text-white text-xs font-black">{pastPop.toLocaleString()}명</span>
                    </div>
                    <div className="p-4 bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.1] rounded-2xl flex flex-col items-center transition-all duration-300">
                        <span className="text-white/60 text-[10px] font-bold block mb-1">최근 인구</span>
                        <span className="text-white text-xs font-black">{recentPop.toLocaleString()}명</span>
                    </div>
                    <div className="p-4 bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.1] rounded-2xl flex flex-col items-center justify-center transition-all duration-300">
                        <span className="text-white/60 text-[10px] font-bold block mb-1">인구 변동</span>
                        <span className={`text-xs font-black ${changeVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{changeStr}</span>
                    </div>
                </div>
            </div>
        );
    }

    function renderAmenitiesSummarySection() {
        return <AmenitiesView amenities={amenities} variant="summary" />;
    }
}
