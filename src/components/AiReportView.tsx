'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import PremiumRiskGauge from './PremiumRiskGauge';
import ComparableMap from './ComparableMap';
import {
    Zap, ShieldCheck, DollarSign, Layers, TrendingUp, TrendingDown, ShieldAlert,
    CheckCircle2, Search, Gavel, MapPin, Hexagon, BarChart3,
    AlertCircle, Sparkles, LogOut, Wrench, Percent, Coins,
    Compass, Lock, Award, Building, Building2, Activity, Info, ExternalLink,
    CheckSquare, RefreshCw, Eye, Shield,
    List, ChevronRight, ChevronDown, Store, ArrowRightLeft, Calendar, FileText,
    Milestone, Play, Map, X, SlidersHorizontal, Calculator
} from 'lucide-react';
import { buildRiskItemFacts } from '../lib/apartmentRiskItemFacts';

/** RiskBubbleChart · 세부 리스크 미니바와 동일한 파스텔 팔레트 */
const REPORT_PASTEL_PALETTE = [
    '#EDDCD2', '#C5DEDD', '#D6E2E9', '#FDE2E4', '#DBE7E4', '#FAD2E1', '#BCD4E6', '#F0EFEB',
] as const;

const PRICE_METHOD_ACCENTS = {
    summary: '#C5DEDD',
    comparables: '#C5DEDD',
    building: '#BCD4E6',
    official: '#EDDCD2',
    regional: '#D6E2E9',
    income: '#FAD2E1',
    narrative: '#FDE2E4',
} as const;

/** 가치 정밀 검증 원장 — 타당성 검증 카드와 동일 팔레트 매핑 */
const LEDGER_ACCENTS = {
    summary: PRICE_METHOD_ACCENTS.summary,
    comparables: PRICE_METHOD_ACCENTS.comparables,
    multipliers: PRICE_METHOD_ACCENTS.building,
    location: PRICE_METHOD_ACCENTS.official,
    zoning: PRICE_METHOD_ACCENTS.regional,
} as const;

const hexToRgba = (hex: string, alpha: number) => {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
};

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

const RISK_CARD_VARIANTS = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const } },
};

const RISK_CHIP_CONTAINER_VARIANTS = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05, delayChildren: 0.12 } },
};

const RISK_CHIP_VARIANTS = {
    hidden: { opacity: 0, y: 6, scale: 0.96 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const } },
};

// MiniBar 컴포넌트
const MiniBar = ({
    label,
    score,
    reason,
    facts,
    max = 10,
    customColor,
    animate = true,
}: {
    label: string;
    score: number;
    reason?: string;
    facts?: string[];
    max?: number;
    customColor?: string;
    animate?: boolean;
}) => {
    const reduceMotion = useReducedMotion();
    const shouldAnimate = animate && !reduceMotion;
    const pct = (score / max) * 100;
    const color = customColor || (score >= 8 ? "#22c55e" : score >= 5 ? "#eab308" : "#ef4444");
    return (
        <div className="bg-white/5 p-4 rounded-[20px] border border-white/10 transition-all">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-white">{label}</span>
                <span style={{ color }} className="text-xs font-black font-mono">{score} / {max}점</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mt-2 mb-1">
                {shouldAnimate ? (
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
                        style={{ backgroundColor: color }}
                        className="h-full rounded-full"
                    />
                ) : (
                    <div style={{ width: `${pct}%`, backgroundColor: color }} className="h-full rounded-full" />
                )}
            </div>
            {reason && (
                <div className="mt-2 text-xs text-white/50 leading-relaxed font-semibold">
                    {reason}
                </div>
            )}
            {facts && facts.length > 0 && (
                shouldAnimate ? (
                    <motion.div
                        className="mt-2.5 flex flex-wrap gap-1.5"
                        variants={RISK_CHIP_CONTAINER_VARIANTS}
                        initial="hidden"
                        animate="visible"
                    >
                        {facts.map((fact, i) => (
                            <motion.span
                                key={`${fact}-${i}`}
                                variants={RISK_CHIP_VARIANTS}
                                className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold leading-snug bg-emerald-500/10 border border-emerald-500/20 text-emerald-200/90"
                            >
                                {fact}
                            </motion.span>
                        ))}
                    </motion.div>
                ) : (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {facts.map((fact, i) => (
                            <span
                                key={i}
                                className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold leading-snug bg-emerald-500/10 border border-emerald-500/20 text-emerald-200/90"
                            >
                                {fact}
                            </span>
                        ))}
                    </div>
                )
            )}
        </div>
    );
};

// ── 2단계: 개별 요인 보정 계수 (Multipliers) ─────────────────

type LedgerMultiplierTile = {
    name: string;
    factor: number;
    desc: string;
    infoText?: string;
    customDescElement?: React.ReactNode;
};

const getMultiplierFactorStyle = (factor: number) => {
    if (factor > 1.001) {
        return { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' };
    }
    if (factor < 0.999) {
        return { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' };
    }
    return { color: 'rgba(255,255,255,0.38)', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.1)' };
};

const LedgerMultiplierFactorCard = ({
    indexStr,
    name,
    factor,
    desc,
    infoText,
    customDescElement,
    accentColor = LEDGER_ACCENTS.multipliers,
}: LedgerMultiplierTile & { indexStr: string; accentColor?: string }) => {
    const [expanded, setExpanded] = React.useState(false);
    const style = getMultiplierFactorStyle(factor);
    const hasDetail = Boolean(desc || infoText || customDescElement);

    return (
        <div
            className="rounded-xl border bg-white/[0.02] overflow-hidden"
            style={{ borderColor: style.border }}
        >
            <div className="px-3 pt-2.5 pb-0 flex items-start justify-between gap-2.5">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold" style={{ color: accentColor }}>{indexStr}</span>
                        <span className="text-white text-[11px] font-bold">{name}</span>
                    </div>
                    {desc && !expanded && (
                        <p className="text-white/50 text-[10px] leading-relaxed mt-1.5 line-clamp-2">{desc}</p>
                    )}
                </div>
                <div
                    className="shrink-0 px-2.5 py-1.5 rounded-lg border text-[13px] font-black font-mono leading-none"
                    style={{
                        color: style.color,
                        background: `linear-gradient(135deg, ${style.bg}, rgba(255,255,255,0.02))`,
                        borderColor: style.border,
                    }}
                >
                    {factor.toFixed(3)}x
                </div>
            </div>
            {hasDetail && (
                <button
                    type="button"
                    onClick={() => setExpanded(v => !v)}
                    className="w-full mt-2 px-3 py-2 border-t border-white/5 flex items-center justify-between text-[10px] text-white/40 hover:text-white/60 hover:bg-white/[0.02] transition-colors"
                >
                    <span>보정 근거 보기</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
            )}
            {expanded && hasDetail && (
                <div className="px-3 pb-3 flex flex-col gap-2">
                    {infoText && (
                        <p
                            className="text-[10px] leading-relaxed bg-white/5 border border-white/5 p-2.5 rounded-xl"
                            style={{ color: hexToRgba(accentColor, 0.85) }}
                        >
                            {infoText}
                        </p>
                    )}
                    {customDescElement || (desc ? (
                        <p className="text-white/50 text-[10px] leading-relaxed">{desc}</p>
                    ) : null)}
                </div>
            )}
        </div>
    );
};

const LedgerMultipliersSection = ({ tiles }: { tiles: LedgerMultiplierTile[] }) => {
    const combined = tiles.reduce((p, t) => p * (t.factor || 1), 1);
    const appliedCount = tiles.filter(t => t.factor > 1.001 || t.factor < 0.999).length;
    const indexMap = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];
    const accent = LEDGER_ACCENTS.multipliers;

    return (
        <PriceReasonMethodCard
            icon={SlidersHorizontal}
            title="프리미엄 · 중요 항목 ㎡당 대입 단가 보정"
            accent={accent}
            chips={(
                <>
                    {metaChip('실거래 기반', accent)}
                    {metaChip(`${tiles.length}개 요인`)}
                    {appliedCount > 0
                        ? metaChip(`${appliedCount}개 적용`, '#10b981')
                        : metaChip('보정 없음')}
                </>
            )}
        >
            <div
                className="rounded-2xl bg-white/[0.02] overflow-hidden"
                style={{
                    border: `1px solid ${hexToRgba(accent, 0.25)}`,
                    boxShadow: `0 0 0 1px ${hexToRgba(accent, 0.08)}`,
                }}
            >
                <div
                    className="mx-3.5 mt-3.5 mb-3 rounded-xl px-4 py-3"
                    style={{
                        background: `linear-gradient(to bottom right, ${hexToRgba(accent, 0.12)}, ${hexToRgba(accent, 0.05)})`,
                        border: `1px solid ${hexToRgba(accent, 0.3)}`,
                    }}
                >
                    <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: hexToRgba(accent, 0.85) }}>합산 보정 계수</span>
                    <p className="text-[22px] font-black mt-0.5 leading-none" style={{ color: accent }}>{combined.toFixed(3)}x</p>
                    <p className="text-[10px] text-white/35 mt-1.5">
                        {tiles.length}개 요인 곱셈 · {appliedCount > 0 ? `${appliedCount}개 실제 반영` : '모두 1.000x'}
                    </p>
                </div>
                <div className="px-3.5 pb-3.5 flex flex-col gap-2">
                    {tiles.map((tile, i) => (
                        <LedgerMultiplierFactorCard
                            key={i}
                            indexStr={indexMap[i] || `${i + 1}`}
                            accentColor={accent}
                            {...tile}
                        />
                    ))}
                </div>
            </div>
        </PriceReasonMethodCard>
    );
};

// ── 3단계: 입지 등급 및 CBD 프리미엄 ─────────────────────────

const LedgerLocationSection = ({
    cbdGrade,
    cbdScore,
    cbdEst,
    targetArea,
    isBuildingOrHouse,
}: {
    cbdGrade: string;
    cbdScore: number;
    cbdEst: any;
    targetArea: number;
    isBuildingOrHouse: boolean;
}) => {
    const minMult = cbdEst?.multiplier?.min ?? 1.0;
    const maxMult = cbdEst?.multiplier?.max ?? 1.0;
    const officialPerSqm = cbdEst?.officialPerSqm ?? 0;
    const minTotalMan = cbdEst && targetArea > 0
        ? Math.round((officialPerSqm * minMult * targetArea) / 10000)
        : 0;
    const maxTotalMan = cbdEst && targetArea > 0
        ? Math.round((officialPerSqm * maxMult * targetArea) / 10000)
        : 0;
    const hasRange = Boolean(cbdEst && minTotalMan > 0 && maxTotalMan > 0);
    const title = isBuildingOrHouse
        ? '프리미엄 등급과 중심상업지역 입지 등급 참고'
        : '중심상업지역 접근성 · 용도지역 배율로 토지 잠재 가치 추정';
    const accent = LEDGER_ACCENTS.location;

    return (
        <PriceReasonMethodCard
            icon={MapPin}
            title={title}
            accent={accent}
            chips={(
                <>
                    {metaChip('입지 분석', accent)}
                    {metaChip(`CBD ${cbdGrade}`)}
                    {metaChip(`${cbdScore}점`, LEDGER_ACCENTS.comparables)}
                    {hasRange && metaChip(`배율 ${minMult.toFixed(1)}~${maxMult.toFixed(1)}배`, LEDGER_ACCENTS.multipliers)}
                </>
            )}
        >
            <div
                className="rounded-2xl bg-white/[0.02] overflow-hidden"
                style={{
                    border: `1px solid ${hexToRgba(accent, 0.25)}`,
                    boxShadow: `0 0 0 1px ${hexToRgba(accent, 0.08)}`,
                }}
            >
                <div
                    className="mx-3.5 mt-3.5 mb-3 rounded-xl px-4 py-3"
                    style={{
                        background: `linear-gradient(to bottom right, ${hexToRgba(accent, 0.12)}, ${hexToRgba(accent, 0.05)})`,
                        border: `1px solid ${hexToRgba(accent, 0.3)}`,
                    }}
                >
                    <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: hexToRgba(accent, 0.85) }}>입지 등급</span>
                    <p className="text-[22px] font-black mt-0.5 leading-none" style={{ color: accent }}>{cbdGrade}</p>
                    <p className="text-[10px] text-white/35 mt-1.5">
                        종합 점수 {cbdScore}점
                        {hasRange ? ` · 추정 ${minTotalMan.toLocaleString()}~${maxTotalMan.toLocaleString()}만원` : ''}
                    </p>
                </div>
                <div className="px-3.5 pb-3.5 flex flex-col gap-2">
                    {hasRange ? (
                        <>
                            <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 flex flex-col gap-1">
                                <span className="text-[10px] text-white/40">일반 용도/주거 기준</span>
                                <span className="text-white font-bold text-[13px]">
                                    {minTotalMan.toLocaleString()}만원 ~ {maxTotalMan.toLocaleString()}만원
                                </span>
                                <span className="text-[10px] text-white/35">
                                    공시지가 × 배율 {minMult.toFixed(1)}~{maxMult.toFixed(1)}배 · {targetArea.toLocaleString()}㎡
                                </span>
                            </div>
                            <div
                                className="rounded-xl px-3 py-2.5"
                                style={{
                                    border: `1px solid ${hexToRgba(LEDGER_ACCENTS.multipliers, 0.15)}`,
                                    backgroundColor: hexToRgba(LEDGER_ACCENTS.multipliers, 0.04),
                                }}
                            >
                                <span className="text-[10px] font-semibold" style={{ color: hexToRgba(LEDGER_ACCENTS.multipliers, 0.85) }}>상업화 · 개발 성공 시 잠재 가치</span>
                                <p className="text-white/55 text-[10px] leading-relaxed mt-1">
                                    공시지가의 3.5배 ~ 5.0배 범위 적용 가능 (개발 호재·용도변경 성공 시)
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
                            <p className="text-white/55 text-[11px] leading-relaxed">
                                빌딩/주택 실거래가에는 입지 프리미엄이 이미 반영되어 있으므로 별도 CBD 배율 산출 불필요
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </PriceReasonMethodCard>
    );
};

// ── 4단계: 인접 필지 용도변경 이력 ───────────────────────────

const LedgerZoningChangeSection = ({ comment }: { comment: string }) => {
    const noHistory = /이력 없음|없습니다|미감지|해당 없음/i.test(comment);
    const accent = LEDGER_ACCENTS.zoning;

    return (
        <PriceReasonMethodCard
            icon={ArrowRightLeft}
            title="대상 인접 필지 용도변경 이력 조회"
            accent={accent}
            chips={(
                <>
                    {metaChip('5년 이내', accent)}
                    {metaChip('인접 필지')}
                    {metaChip(noHistory ? '변경 이력 없음' : '변경 이력 감지', noHistory ? undefined : accent)}
                </>
            )}
        >
            <div
                className="rounded-2xl bg-white/[0.02] overflow-hidden"
                style={{
                    border: `1px solid ${noHistory ? 'rgba(255,255,255,0.1)' : hexToRgba(accent, 0.25)}`,
                    boxShadow: noHistory ? undefined : `0 0 0 1px ${hexToRgba(accent, 0.08)}`,
                }}
            >
                <div
                    className="mx-3.5 mt-3.5 mb-3 rounded-xl px-4 py-3 border"
                    style={{
                        background: noHistory
                            ? 'rgba(255,255,255,0.03)'
                            : `linear-gradient(135deg, ${hexToRgba(accent, 0.12)}, ${hexToRgba(accent, 0.05)})`,
                        borderColor: noHistory ? 'rgba(255,255,255,0.06)' : hexToRgba(accent, 0.3),
                    }}
                >
                    <span
                        className="text-[10px] font-semibold uppercase tracking-wide"
                        style={{ color: noHistory ? 'rgba(255,255,255,0.35)' : hexToRgba(accent, 0.85) }}
                    >
                        용도변경 조회 결과
                    </span>
                    <p
                        className="text-[13px] font-bold mt-1 leading-snug"
                        style={{ color: noHistory ? 'rgba(255,255,255,0.55)' : accent }}
                    >
                        {noHistory ? '인접 필지 변경 이력 없음' : '인접 필지 용도변경 감지'}
                    </p>
                </div>
                <div className="px-3.5 pb-3.5">
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
                        <p className="text-white/60 text-[11px] leading-relaxed">{comment}</p>
                    </div>
                </div>
            </div>
        </PriceReasonMethodCard>
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

// ── 비교사례 대입 리스트 헬퍼 ──────────────────────────────

const normalizeDealAmountWon = (raw: any): number => {
    const num = Number(raw) || 0;
    if (num <= 0) return 0;
    return num > 1000000 ? num : num * 10000;
};

/** 빌딩 수익환원 입력(만원 또는 원) → 원화 통일 */
const normalizeIncomeInputWon = (raw: any): number => normalizeDealAmountWon(raw);

const formatEokCompact = (won: number): string => {
    if (!won || won <= 0) return '-';
    const eok = won / 100000000;
    if (eok >= 10) return `${Math.round(eok)}억`;
    return `${eok.toFixed(1).replace(/\.0$/, '')}억`;
};

const formatSqmManwon = (wonPerSqm: number): string => {
    if (!wonPerSqm || wonPerSqm <= 0) return '-';
    const man = wonPerSqm >= 10000 ? wonPerSqm / 10000 : wonPerSqm;
    return `${Math.round(man).toLocaleString()}만/㎡`;
};

const AREA_SIZE_RATIO_SMALL = 1 / 3;  // 사례 면적 < 대상 1/3 → 소형
const AREA_SIZE_RATIO_LARGE = 2;      // 사례 면적 > 대상 2배 → 대형

const getAreaSizeHint = (compArea: number, targetArea: number): 'small' | 'large' | 'normal' | null => {
    if (compArea <= 0 || targetArea <= 0) return null;
    const ratio = compArea / targetArea;
    if (ratio < AREA_SIZE_RATIO_SMALL) return 'small';
    if (ratio > AREA_SIZE_RATIO_LARGE) return 'large';
    return 'normal';
};

const resolveComparableMetrics = (c: any, targetArea: number) => {
    const platPlc = c.platPlc || '';
    const platAddr = c.platAddr || '';
    const umdNm = c.umdNm || '';
    const addr = umdNm || platPlc.split(' ').pop() || platAddr.split(' ').pop() || '';
    const fullAddr = [c.sggNm, umdNm, c.jibun].filter(Boolean).join(' ').trim() || platPlc || platAddr || addr;

    const dealWon = normalizeDealAmountWon(c.dealAmount);
    const area = Number(c.area || c.plottageAr || c.excluUseAr || c.buildingAr) || 0;
    const rawSqm = Number(c.pricePerSqm) || (dealWon > 0 && area > 0 ? dealWon / area : 0);
    const adjSqm = Number(c.adjustedPricePerSqm) || rawSqm;
    const adjTotalWon = targetArea > 0 ? adjSqm * targetArea : 0;

    const simVal = Number(c.similarityScore || c.score) || 0;
    const simRounded = simVal > 0 ? Math.round(simVal) : 0;
    const distVal = Number(c.distance ?? c.distanceFromTarget) || 0;
    const month = String(c.dealMonth || '?').padStart(2, '0');
    const date = c.dealYear ? `${c.dealYear}.${month}` : '-';

    return {
        addr: addr || fullAddr,
        fullAddr,
        dealWon,
        dealEok: formatEokCompact(dealWon),
        area,
        rawSqm,
        adjSqm,
        adjTotalWon,
        adjTotalEok: formatEokCompact(adjTotalWon),
        rawSqmStr: formatSqmManwon(rawSqm),
        adjSqmStr: formatSqmManwon(adjSqm),
        simVal,
        simRounded,
        simStr: simRounded > 0 ? `${simRounded}%` : '참고용',
        distStr: distVal > 0 ? `${Math.round(distVal)}m` : '-',
        date,
        monthsAgo: c.monthsAgo,
        areaSizeHint: getAreaSizeHint(area, targetArea),
        areaRatio: targetArea > 0 && area > 0 ? area / targetArea : null,
        zoning: c.zoning || c.landUse || '-',
        jimok: c.jimok || '',
        officialPrice: c.officialPrice,
        officialPriceRatio: c.officialPriceRatio,
        timeAdjFactor: c.timeAdjFactor || 1,
        timeAdjSource: c.timeAdjSource,
        deductions: Array.isArray(c.deductions) ? c.deductions : [],
        isRedevelopment: c.isRedevelopment,
        correctionClamped: c.correctionClamped,
    };
};

const getPastelAccent = (index: number) => REPORT_PASTEL_PALETTE[index % REPORT_PASTEL_PALETTE.length];

const ComparableCaseCard = ({
    c,
    index,
    targetArea,
    accent = PRICE_METHOD_ACCENTS.comparables,
}: {
    c: any;
    index: number;
    targetArea: number;
    accent?: string;
}) => {
    const [expanded, setExpanded] = React.useState(false);
    const m = resolveComparableMetrics(c, targetArea);
    const paletteColor = getPastelAccent(index);

    return (
        <div
            className="rounded-2xl bg-white/[0.02] overflow-hidden"
            style={{
                border: `1px solid ${hexToRgba(paletteColor, 0.45)}`,
                boxShadow: `0 0 0 1px ${hexToRgba(paletteColor, 0.1)}`,
            }}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-2">
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-white text-xs font-bold">#{index + 1} {m.addr || `사례 ${index + 1}`}</span>
                        {m.areaSizeHint === 'small' && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                                소형 필지
                            </span>
                        )}
                        {m.areaSizeHint === 'large' && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30">
                                대형 필지
                            </span>
                        )}
                        {m.areaSizeHint === 'normal' && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-sky-400/10 text-sky-300 border border-sky-400/25">
                                동일 필지
                            </span>
                        )}
                    </div>
                    {m.fullAddr && m.fullAddr !== m.addr && (
                        <p className="text-white/30 text-[10px] truncate mt-0.5">{m.fullAddr}</p>
                    )}
                </div>
                <div className="flex flex-wrap gap-1 justify-end shrink-0">
                    <span
                        className="text-[9px] font-semibold px-2 py-0.5 rounded-md border"
                        style={{
                            color: accent,
                            backgroundColor: hexToRgba(accent, 0.1),
                            borderColor: hexToRgba(accent, 0.2),
                        }}
                    >
                        공시 유사 {m.simStr}
                    </span>
                    {m.distStr !== '-' && (
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-white/5 text-white/45 border border-white/10">
                            {m.distStr}
                        </span>
                    )}
                </div>
            </div>

            {/* Hero: 대입 가치 */}
            <div
                className="mx-3 mb-2 rounded-lg px-3 py-2 flex flex-col gap-0.5"
                style={{
                    background: `linear-gradient(to bottom right, ${hexToRgba(accent, 0.1)}, ${hexToRgba(accent, 0.04)})`,
                    border: `1px solid ${hexToRgba(accent, 0.2)}`,
                }}
            >
                <div className="flex items-baseline justify-between gap-2 min-w-0">
                    <span className="text-[9px] font-semibold shrink-0" style={{ color: hexToRgba(accent, 0.8) }}>본 매물 대입</span>
                    <p className="text-lg font-black leading-none truncate" style={{ color: accent }}>{m.adjTotalEok}원</p>
                </div>
                {targetArea > 0 && (
                    <p className="text-[9px] text-white/35 leading-tight truncate">
                        ㎡당 {m.adjSqmStr} × {targetArea.toLocaleString()}㎡
                    </p>
                )}
            </div>

            {/* Sub: 실거래 + 면적/용도 */}
            <div className="px-4 pb-3 flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[11px]">
                    <span className="text-white/35">그 필지 실거래 ({m.date})</span>
                    <span className="text-white/60 font-semibold">{m.dealEok}원</span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-white/30">
                    {m.area > 0 && (
                        <span>
                            면적 {m.area.toLocaleString()}㎡
                            {m.areaRatio != null && targetArea > 0 && (
                                <span className={m.areaSizeHint === 'small' ? ' text-red-400/80' : m.areaSizeHint === 'large' ? ' text-amber-300/80' : m.areaSizeHint === 'normal' ? ' text-sky-300/80' : ''}>
                                    {' '} · ( {Math.round(m.areaRatio * 100)}% )
                                </span>
                            )}
                        </span>
                    )}
                    <span>{m.rawSqmStr}</span>
                    {m.zoning !== '-' && <span>{m.zoning}</span>}
                    {m.jimok && <span>지목 {m.jimok}</span>}
                    {m.isRedevelopment && (
                        <span className="text-amber-400/80">정비사업</span>
                    )}
                </div>
            </div>

            {/* Accordion: 보정 상세 */}
            <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-between px-4 py-2 border-t border-white/5 text-[10px] text-white/40 hover:text-white/60 hover:bg-white/[0.02] transition-colors"
            >
                <span>보정 어떻게 했나?</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
            {expanded && (
                <div className="px-4 pb-3.5 flex flex-col gap-1.5 border-t border-white/5 bg-black/10">
                    {m.officialPriceRatio != null && (
                        <div className="flex justify-between text-[10px]">
                            <span className="text-white/35">공시지가 비율</span>
                            <span className="text-white/70 font-mono">×{Number(m.officialPriceRatio).toFixed(3)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-[10px]">
                        <span className="text-white/35">시점 보정</span>
                        <span className="text-white/70 font-mono">
                            ×{Number(m.timeAdjFactor).toFixed(4)}
                            {m.timeAdjSource ? ` (${m.timeAdjSource})` : ''}
                        </span>
                    </div>
                    {m.officialPrice > 0 && (
                        <div className="flex justify-between text-[10px]">
                            <span className="text-white/35">사례 공시지가</span>
                            <span className="text-white/70">{formatSqmManwon(Number(m.officialPrice))}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-[10px]">
                        <span className="text-white/35">보정 전 → 후 ㎡당</span>
                        <span className="text-white/70">{m.rawSqmStr} → <span style={{ color: accent }}>{m.adjSqmStr}</span></span>
                    </div>
                    {m.correctionClamped && (
                        <span className="text-amber-400/70 text-[9px]">⚠ 보정 클램프 적용됨</span>
                    )}
                    {m.deductions.map((d: any, i: number) => (
                        <p key={i} className="text-[9px] text-white/40 leading-relaxed pt-0.5">
                            {d.detail || d.item || JSON.stringify(d)}
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
};

const NTS_BASE_PRICE_PER_SQM = 820000;

const parseBuildingValueNote = (note: string) => {
    if (!note) return null;
    const structureMatch = note.match(/구조지수\(([^)]+)\)/);
    const usageMatch = note.match(/용도지수\(([^)]+)\)/);
    const locationMatch = note.match(/위치지수\(([^)]+)\)/);
    const residualMatch = note.match(/잔가율\(([^)]+)\)/);
    const totalMatch = note.match(/총 건물가치\s*([\d,]+)원/);
    return {
        structureIndex: structureMatch ? parseFloat(structureMatch[1]) : null,
        usageIndex: usageMatch ? parseFloat(usageMatch[1]) : null,
        locationIndex: locationMatch ? parseFloat(locationMatch[1]) : null,
        residualRate: residualMatch ? parseFloat(residualMatch[1]) : null,
        totalFromNote: totalMatch ? parseInt(totalMatch[1].replace(/,/g, ''), 10) : null,
    };
};

const getLandAdjSpectrum = (comparables: any[], targetArea: number) => {
    const totals = comparables
        .map(c => resolveComparableMetrics(c, targetArea).adjTotalWon)
        .filter(v => v > 0);
    if (totals.length === 0) return null;
    return { min: Math.min(...totals), max: Math.max(...totals), count: totals.length };
};

// ── 가격 타당성 검증: 방법론별 독립 카드 셸 ─────────────────

const PriceReasonMethodCard = ({
    icon: Icon,
    title,
    description,
    chips,
    accent,
    children,
}: {
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    title: string;
    description?: React.ReactNode;
    chips?: React.ReactNode;
    accent: string;
    children: React.ReactNode;
}) => (
    <div
        className="p-5 sm:p-6 rounded-[32px] bg-[#0f172a]/55 flex flex-col gap-4 shadow-sm"
        style={{
            border: `1px solid ${hexToRgba(accent, 0.2)}`,
            boxShadow: `0 0 25px ${hexToRgba(accent, 0.04)}`,
        }}
    >
        <div className="flex items-start gap-3.5">
            <div
                className="p-2 rounded-xl shrink-0"
                style={{
                    backgroundColor: hexToRgba(accent, 0.12),
                    border: `1px solid ${hexToRgba(accent, 0.3)}`,
                }}
            >
                <Icon className="w-5 h-5" style={{ color: accent }} />
            </div>
            <div className="min-w-0 flex-1 flex flex-col gap-2 pt-0.5">
                <span className="text-base font-bold leading-snug text-white">{title}</span>
                {description && (
                    <p className="text-white/40 text-[11px] leading-relaxed">{description}</p>
                )}
                {chips && <div className="flex flex-wrap gap-1.5">{chips}</div>}
            </div>
        </div>
        {children}
    </div>
);

const metaChip = (label: string, accent?: string) => (
    <span
        className="text-[9px] font-semibold px-2 py-0.5 rounded-md border"
        style={accent ? {
            color: accent,
            backgroundColor: `${accent}18`,
            borderColor: `${accent}40`,
        } : {
            color: 'rgba(255,255,255,0.45)',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderColor: 'rgba(255,255,255,0.1)',
        }}
    >
        {label}
    </span>
);

const ComparableHorizontalScroll = ({
    items,
    targetArea,
    startIndex = 0,
    accent = PRICE_METHOD_ACCENTS.comparables,
}: {
    items: any[];
    targetArea: number;
    startIndex?: number;
    accent?: string;
}) => (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory -mx-1 px-1">
        {items.map((c, index) => (
            <div key={index} className="min-w-[300px] max-w-[300px] shrink-0 snap-center">
                <ComparableCaseCard c={c} index={startIndex + index} targetArea={targetArea} accent={accent} />
            </div>
        ))}
    </div>
);

// ── 가치 정밀 검증 원장: 요약 + 비교사례 카드 ─────────────────

const LedgerSummaryCard = ({
    title,
    showMapButton,
    onMapOpen,
}: {
    title: string;
    showMapButton: boolean;
    onMapOpen: () => void;
}) => {
    const accent = LEDGER_ACCENTS.summary;
    return (
        <div
            className="p-6 bg-[#0f172a]/55 rounded-[40px]"
            style={{
                border: `1px solid ${hexToRgba(accent, 0.2)}`,
                boxShadow: `0 0 25px ${hexToRgba(accent, 0.04)}`,
            }}
        >
            <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-3">
                    <div
                        className="p-2 rounded-xl"
                        style={{
                            backgroundColor: hexToRgba(accent, 0.12),
                            border: `1px solid ${hexToRgba(accent, 0.3)}`,
                        }}
                    >
                        <List className="w-4 h-4" style={{ color: accent }} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-white text-base font-bold tracking-tight">{title}</span>
                        <span className="text-white/38 text-[11px] font-medium">Valuation Ledger (Pro Premium)</span>
                    </div>
                </div>
                {showMapButton && (
                    <button
                        type="button"
                        onClick={onMapOpen}
                        className="flex items-center gap-1.5 px-3 py-1.5 hover:text-white rounded-xl text-xs font-bold transition-all"
                        style={{
                            backgroundColor: hexToRgba(accent, 0.1),
                            border: `1px solid ${hexToRgba(accent, 0.25)}`,
                            color: accent,
                        }}
                    >
                        <Map className="w-3.5 h-3.5" />
                        <span>지도 보기</span>
                    </button>
                )}
            </div>
        </div>
    );
};

const LedgerComparablesSection = ({
    categoryStr,
    isBuilding,
    isHouse,
    comparables,
    tier1Comparables,
    tier2Comparables,
    targetArea,
    confidenceGrade,
}: {
    categoryStr: string;
    isBuilding: boolean;
    isHouse: boolean;
    comparables: any[];
    tier1Comparables?: any[];
    tier2Comparables?: any[];
    targetArea: number;
    confidenceGrade?: string;
}) => {
    const useTier = ['land', 'building'].includes(categoryStr);
    const tier1 = tier1Comparables || [];
    const tier2 = tier2Comparables || [];
    const totalCount = useTier ? tier1.length + tier2.length : comparables.length;

    const title = isBuilding
        ? '프리미엄 · 선별된 상업건물과 실거래 비교'
        : isHouse
            ? '프리미엄 · 선별된 주택건물과 실거래 비교'
            : '프리미엄 · 선별된 토지와 실거래 비교';
    const accent = LEDGER_ACCENTS.comparables;

    return (
        <PriceReasonMethodCard
            icon={List}
            title={title}
            accent={accent}
            chips={(
                <>
                    {targetArea > 0 && metaChip(`대상 ${targetArea.toLocaleString()}㎡`, accent)}
                    {metaChip(`${totalCount}건`)}
                    {confidenceGrade && metaChip(`신뢰 ${confidenceGrade}`, accent)}
                </>
            )}
        >
            {useTier ? (
                <>
                    {tier1.length === 0 ? (
                        <span className="text-white/38 text-xs">정밀 필터에 부합하는 비교 사례가 없어 아래 완화 사례와 비교합니다.</span>
                    ) : (
                        <>
                            <span className="text-white/70 text-[11px] font-bold">
                                정밀 필터 (0.9~1.1배, 300m 이내) · {tier1.length}건
                            </span>
                            <ComparableHorizontalScroll items={tier1} targetArea={targetArea} startIndex={0} accent={accent} />
                        </>
                    )}
                    {tier2.length > 0 && (
                        <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
                            <span className="text-white/50 text-[11px] font-semibold">
                                완화 기준 · {tier2.length}건
                            </span>
                            <ComparableHorizontalScroll items={tier2} targetArea={targetArea} startIndex={tier1.length} accent={accent} />
                        </div>
                    )}
                </>
            ) : comparables.length === 0 ? (
                <span className="text-white/38 text-xs">부합하는 비교 사례가 없습니다.</span>
            ) : (
                <ComparableHorizontalScroll items={comparables} targetArea={targetArea} accent={accent} />
            )}
        </PriceReasonMethodCard>
    );
};

const LandComparableValueSection = ({
    comparables,
    meta,
    targetArea,
    categoryStr,
    isBuildingCat,
    regionName,
}: {
    comparables: any[];
    meta: any;
    targetArea: number;
    categoryStr: string;
    isBuildingCat: boolean;
    regionName: string;
}) => {
    const methodLabel = meta.method || meta.tierLabel || '-';
    const confidenceGrade = meta.confidenceGrade || '';
    const ratioTier = meta.ratioTier || '';
    const landSpectrum = getLandAdjSpectrum(comparables, targetArea);
    const landMin = landSpectrum?.min ?? 0;
    const landMax = landSpectrum?.max ?? 0;
    const hasRange = landMin > 0;

    const title = categoryStr === 'house'
        ? '인근 실거래 사례와 비교 분석합니다.'
        : '인근 실거래 사례와 비교 분석합니다.';
    const accent = PRICE_METHOD_ACCENTS.comparables;

    return (
        <PriceReasonMethodCard
            icon={List}
            title={title}
            accent={accent}
            chips={(
                <>
                    {targetArea > 0 && metaChip(`대상 ${targetArea.toLocaleString()}㎡`, accent)}
                    {metaChip(methodLabel)}
                    {confidenceGrade && metaChip(`신뢰 ${confidenceGrade}`, accent)}
                    {ratioTier && metaChip(ratioTier)}
                    {isBuildingCat && metaChip('토지 대입 + 건물 별도', PRICE_METHOD_ACCENTS.building)}
                </>
            )}
        >
            {hasRange && (
                <div
                    className="rounded-xl px-4 py-3"
                    style={{
                        background: `linear-gradient(to bottom right, ${hexToRgba(accent, 0.12)}, ${hexToRgba(accent, 0.05)})`,
                        border: `1px solid ${hexToRgba(accent, 0.3)}`,
                    }}
                >
                    <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: hexToRgba(accent, 0.85) }}>토지 대입 추정 범위</span>
                    <p className="text-xl font-black mt-0.5 leading-none" style={{ color: accent }}>
                        {landMin === landMax
                            ? `${formatEokCompact(landMin)}원`
                            : `${formatEokCompact(landMin)} ~ ${formatEokCompact(landMax)}원`}
                    </p>
                    <p className="text-[10px] text-white/35 mt-1.5">
                        비교사례 {landSpectrum?.count ?? comparables.length}건 · 보정 단가 × {targetArea.toLocaleString()}㎡
                    </p>
                </div>
            )}

            {comparables.length === 0 ? (
                <span className="text-white/38 text-xs leading-relaxed block">
                    인근 실거래 사례 중 위 매물과 동일 면적, 토지 중요 항목과 동일한 거래 사례가 없습니다.{" "}
                    <span className="text-sky-400 font-bold">{regionName}</span> 실제 거래가는 상단 탭 항목에서 검토하세요
                </span>
            ) : (
                <>
                    {['land', 'building'].includes(categoryStr) && (meta.tier1Comparables || meta.tier2Comparables) ? (
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <span className="text-white/70 text-[11px] font-bold">
                                    엄격 필터 · {(meta.tier1Comparables || []).length}건
                                </span>
                                {(!meta.tier1Comparables || meta.tier1Comparables.length === 0) ? (
                                    <span className="text-white/38 text-[11px]">부합하는 사례가 없습니다.</span>
                                ) : (
                                    <ComparableHorizontalScroll
                                        items={meta.tier1Comparables || []}
                                        targetArea={targetArea}
                                        startIndex={0}
                                        accent={accent}
                                    />
                                )}
                            </div>
                            {meta.tier2Comparables && meta.tier2Comparables.length > 0 && (
                                <div className="flex flex-col gap-2 pt-3 border-t border-white/5">
                                    <span className="text-white/50 text-[11px] font-semibold">
                                        완화 기준 · {meta.tier2Comparables.length}건
                                    </span>
                                    <ComparableHorizontalScroll
                                        items={meta.tier2Comparables}
                                        targetArea={targetArea}
                                        startIndex={(meta.tier1Comparables || []).length}
                                        accent={accent}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <ComparableHorizontalScroll
                            items={comparables}
                            targetArea={targetArea}
                            accent={accent}
                        />
                    )}
                </>
            )}
        </PriceReasonMethodCard>
    );
};

const resolveBuildingVitals = (mergedData: any) => {
    const titleList = mergedData?.rawData?.vitals?.building?.title
        || mergedData?.vitals?.building?.title
        || [];
    const title = Array.isArray(titleList) && titleList.length > 0 ? titleList[0] : {};
    const useAprDay = String(title.useAprDay || '');
    const buildYear = useAprDay.length >= 4 ? parseInt(useAprDay.substring(0, 4), 10) : null;
    const grossFloorArea = parseFloat(title.totArea || mergedData?.totalArea_sqm || mergedData?.area || '0') || 0;
    const grnd = parseInt(title.grndFlrCnt || '0', 10) || 0;
    const ugrnd = parseInt(title.ugrndFlrCnt || '0', 10) || 0;
    const floorText = grnd > 0
        ? (ugrnd > 0 ? `지상 ${grnd}층 · 지하 ${ugrnd}층` : `지상 ${grnd}층`)
        : '';
    const elapsedYears = buildYear ? new Date().getFullYear() - buildYear : null;

    return {
        bldNm: title.bldNm || '',
        structure: title.strctCdNm || '',
        usage: title.mainPurpsCdNm || '',
        buildYear,
        buildYearLabel: buildYear ? `${buildYear}년` : '',
        elapsedYears,
        grossFloorArea,
        floorText,
        vlRat: title.vlRat,
        bcRat: title.bcRat,
    };
};

const BuildingResidualSection = ({
    meta,
    spectrum,
    comparables,
    targetArea,
    estimatedTotalWon,
    mergedData,
}: {
    meta: any;
    spectrum: any;
    comparables: any[];
    targetArea: number;
    estimatedTotalWon: number;
    mergedData: any;
}) => {
    const [expanded, setExpanded] = React.useState(false);
    const buildingResidualWon = Number(meta.buildingResidualValue) || 0;
    const buildingFloorAi = spectrum?.buildingFloor || '';
    const noteParsed = parseBuildingValueNote(meta.buildingValueNote || '');
    const vitals = resolveBuildingVitals(mergedData);
    const grossFloorArea = vitals.grossFloorArea > 0
        ? vitals.grossFloorArea
        : (Number(meta.target?.totalArea) || Number(meta.target?.totalArea_sqm) || 0);

    const displayWon = buildingResidualWon > 0
        ? buildingResidualWon
        : (noteParsed?.totalFromNote || 0);

    if (!displayWon && !buildingFloorAi) return null;

    const perSqm = displayWon > 0 && grossFloorArea > 0
        ? Math.round(displayWon / grossFloorArea)
        : (noteParsed?.structureIndex != null
            ? Math.round(
                NTS_BASE_PRICE_PER_SQM
                * (noteParsed.structureIndex || 1)
                * (noteParsed.usageIndex || 1)
                * (noteParsed.locationIndex || 1)
                * (noteParsed.residualRate || 1)
            )
            : 0);

    const landSpectrum = getLandAdjSpectrum(comparables, targetArea);
    const landMin = landSpectrum?.min ?? (estimatedTotalWon > 0 ? estimatedTotalWon : 0);
    const landMax = landSpectrum?.max ?? landMin;
    const hasLandRange = landMin > 0;
    const combinedMin = hasLandRange ? landMin + displayWon : 0;
    const combinedMax = hasLandRange ? landMax + displayWon : 0;
    const aiMismatch = buildingFloorAi && displayWon > 0
        && !buildingFloorAi.includes(String(Math.round(displayWon / 100000000)))
        && !buildingFloorAi.replace(/[^\d]/g, '').includes(String(Math.round(displayWon / 10000)).slice(0, 4));
    const accent = PRICE_METHOD_ACCENTS.building;
    const landAccent = PRICE_METHOD_ACCENTS.comparables;

    return (
        <PriceReasonMethodCard
            icon={Building}
            title="건축물 연식 고려, 잔존 가치를 검토합니다."
            accent={accent}
            chips={(
                <>
                    {metaChip('원가법 하한', accent)}
                    {metaChip('토지가 미포함')}
                    {metaChip('시장가 아님', PRICE_METHOD_ACCENTS.official)}
                </>
            )}
        >
            <div
                className="rounded-2xl bg-white/[0.02] overflow-hidden"
                style={{
                    border: `1px solid ${hexToRgba(accent, 0.25)}`,
                    boxShadow: `0 0 0 1px ${hexToRgba(accent, 0.08)}`,
                }}
            >
                <div
                    className="mx-4 mt-3.5 mb-3 rounded-xl px-4 py-3"
                    style={{
                        background: `linear-gradient(to bottom right, ${hexToRgba(accent, 0.15)}, ${hexToRgba(accent, 0.08)})`,
                        border: `1px solid ${hexToRgba(accent, 0.3)}`,
                    }}
                >
                    <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: hexToRgba(accent, 0.85) }}>건물 잔존가 (원가법)</span>
                    <p className="text-2xl font-black mt-0.5 leading-none" style={{ color: accent }}>
                        {formatEokCompact(displayWon)}원
                    </p>
                    {(perSqm > 0 || grossFloorArea > 0) && (
                        <p className="text-[10px] text-white/35 mt-1.5">
                            {perSqm > 0 && <>㎡당 {formatSqmManwon(perSqm)}</>}
                            {perSqm > 0 && grossFloorArea > 0 && ' × '}
                            {grossFloorArea > 0 && <>연면적 {grossFloorArea.toLocaleString()}㎡</>}
                        </p>
                    )}
                    {aiMismatch && (
                        <p className="text-[9px] text-white/25 mt-1">AI 서술: {buildingFloorAi}</p>
                    )}
                </div>

                {/* Building vitals */}
                {(vitals.structure || vitals.usage || vitals.buildYearLabel || vitals.floorText) && (
                    <div className="px-4 pb-3 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-white/30">
                        {vitals.bldNm && <span className="text-white/45 font-semibold">{vitals.bldNm}</span>}
                        {vitals.usage && <span>{vitals.usage}</span>}
                        {vitals.structure && <span>{vitals.structure}</span>}
                        {vitals.buildYearLabel && (
                            <span>
                                준공 {vitals.buildYearLabel}
                                {vitals.elapsedYears != null && vitals.elapsedYears > 0 && ` (경과 ${vitals.elapsedYears}년)`}
                            </span>
                        )}
                        {vitals.floorText && <span>{vitals.floorText}</span>}
                        {vitals.vlRat && <span>용적률 {vitals.vlRat}%</span>}
                        {vitals.bcRat && <span>건폐율 {vitals.bcRat}%</span>}
                    </div>
                )}

                {/* Accordion: 산출식 */}
                <button
                    type="button"
                    onClick={() => setExpanded(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-2 border-t border-white/5 text-[10px] text-white/40 hover:text-white/60 hover:bg-white/[0.02] transition-colors"
                >
                    <span>산출식 · 지수 상세</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
                {expanded && (
                    <div className="px-4 pb-3.5 flex flex-col gap-1.5 border-t border-white/5 bg-black/10">
                        <div className="flex justify-between text-[10px]">
                            <span className="text-white/35">국세청 기준가</span>
                            <span className="text-white/70 font-mono">{formatSqmManwon(NTS_BASE_PRICE_PER_SQM)}</span>
                        </div>
                        {noteParsed?.structureIndex != null && (
                            <div className="flex justify-between text-[10px]">
                                <span className="text-white/35">구조지수{vitals.structure ? ` (${vitals.structure})` : ''}</span>
                                <span className="text-white/70 font-mono">×{noteParsed.structureIndex}</span>
                            </div>
                        )}
                        {noteParsed?.usageIndex != null && (
                            <div className="flex justify-between text-[10px]">
                                <span className="text-white/35">용도지수{vitals.usage ? ` (${vitals.usage})` : ''}</span>
                                <span className="text-white/70 font-mono">×{noteParsed.usageIndex}</span>
                            </div>
                        )}
                        {noteParsed?.locationIndex != null && (
                            <div className="flex justify-between text-[10px]">
                                <span className="text-white/35">위치지수 (공시지가 구간)</span>
                                <span className="text-white/70 font-mono">×{noteParsed.locationIndex}</span>
                            </div>
                        )}
                        {noteParsed?.residualRate != null && (
                            <div className="flex justify-between text-[10px]">
                                <span className="text-white/35">잔가율 (연식 반영)</span>
                                <span className="text-white/70 font-mono">×{noteParsed.residualRate}</span>
                            </div>
                        )}
                        {perSqm > 0 && (
                            <div className="flex justify-between text-[10px] pt-0.5 border-t border-white/5">
                                <span className="text-white/35">㎡당 건물가</span>
                                <span className="font-semibold" style={{ color: accent }}>{formatSqmManwon(perSqm)}</span>
                            </div>
                        )}
                        {grossFloorArea > 0 && (
                            <div className="flex justify-between text-[10px]">
                                <span className="text-white/35">× 연면적</span>
                                <span className="text-white/70">{grossFloorArea.toLocaleString()}㎡</span>
                            </div>
                        )}
                        {meta.buildingValueNote && (
                            <p className="text-[9px] text-white/30 leading-relaxed pt-1">{meta.buildingValueNote}</p>
                        )}
                    </div>
                )}
            </div>

            {/* 토지 + 건물 합산 */}
            {hasLandRange && displayWon > 0 && (
                <div
                    className="p-3 rounded-xl flex flex-col gap-2"
                    style={{
                        background: `linear-gradient(to bottom right, rgba(255,255,255,0.03), ${hexToRgba(accent, 0.05)})`,
                        border: `1px solid ${hexToRgba(accent, 0.12)}`,
                    }}
                >
                    <div className="flex items-center gap-1.5 text-[10px] text-white/45 font-semibold">
                        <Layers className="w-3.5 h-3.5" style={{ color: hexToRgba(accent, 0.75) }} />
                        빌딩 총 가치 참고 (토지 + 건물)
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                        <span className="text-white/35">토지 대입 (비교사례)</span>
                        <span className="font-semibold" style={{ color: landAccent }}>
                            {landMin === landMax
                                ? formatEokCompact(landMin)
                                : `${formatEokCompact(landMin)} ~ ${formatEokCompact(landMax)}`}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                        <span className="text-white/35">건물 잔존 (원가법)</span>
                        <span className="font-semibold" style={{ color: accent }}>{formatEokCompact(displayWon)}</span>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex justify-between items-center">
                        <span className="text-white/50 text-xs font-bold">합산 참고 범위</span>
                        <span className="text-white font-black text-base">
                            {combinedMin === combinedMax
                                ? formatEokCompact(combinedMin)
                                : `${formatEokCompact(combinedMin)} ~ ${formatEokCompact(combinedMax)}`}
                        </span>
                    </div>
                    {(spectrum?.min || spectrum?.max) && (
                        <p className="text-[9px] text-white/25">
                            AI 스펙트럼: {spectrum.min || '-'} · {spectrum.max || '-'}
                        </p>
                    )}
                </div>
            )}

            <p className="text-white/25 text-[9px] leading-relaxed">
                ※ 국세청 신축가격기준액 기준 하한선이며 시장가·임대수익·리모델링 가치는 반영되지 않습니다.
            </p>
        </PriceReasonMethodCard>
    );
};

const resolveOfficialPerSqm = (meta: any, attached: any, targetArea: number) => {
    const cbd = meta.cbdMultiplierEstimate;
    if (cbd?.officialPerSqm > 0) return Number(cbd.officialPerSqm);
    const opr = meta.officialPriceRatio?.targetOfficialPerSqm;
    if (opr > 0) return Number(opr);
    const minMult = Number(attached?.minMult) || 0;
    const minTotal = Number(attached?.minTotal) || 0;
    if (minMult > 0 && minTotal > 0 && targetArea > 0) {
        return Math.round(minTotal / (minMult * targetArea));
    }
    return 0;
};

const OfficialMultiplierSection = ({
    attached,
    meta,
    comparables,
    targetArea,
    isListAppended,
    estimateNarrative,
    onMapOpen,
}: {
    attached: any;
    meta: any;
    comparables: any[];
    targetArea: number;
    isListAppended?: boolean;
    estimateNarrative?: string;
    onMapOpen?: (samples: any[]) => void;
}) => {
    const [expanded, setExpanded] = React.useState(false);

    // v21: 동적 공시지가 배율법 UI 렌더링
    const opr = meta.officialPriceRatio;
    if (opr && (opr.dynamicStatus === 'dynamic' || opr.dynamicStatus === 'fallback')) {
        const isDynamic = opr.dynamicStatus === 'dynamic';
        const accent = isDynamic ? PRICE_METHOD_ACCENTS.official : PRICE_METHOD_ACCENTS.regional;
        const title = isDynamic ? "공시지가 동적 배율 정밀 산출" : "공시지가 보수적 하드코딩 배율";
        const estimatedTotal = (opr.estimatedPerSqm || 0) * targetArea;

        return (
            <PriceReasonMethodCard
                icon={Percent}
                title={title}
                accent={accent}
                chips={(
                    <>
                        {metaChip(isDynamic ? '정밀 산출' : '보수적 산출', accent)}
                        {metaChip(`반경 ${opr.searchRadius || 1000}m`)}
                        {metaChip(`실거래 ${opr.sampleCount || 0}건`)}
                        {opr.samples && opr.samples.length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (onMapOpen) {
                                        onMapOpen(opr.samples);
                                    }
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ml-auto"
                                style={{
                                    backgroundColor: hexToRgba(accent, 0.1),
                                    border: `1px solid ${hexToRgba(accent, 0.3)}`,
                                    color: accent,
                                }}
                            >
                                <Map className="w-3.5 h-3.5" />
                                지도 보기
                            </button>
                        )}
                    </>
                )}
            >
                <div
                    className="rounded-2xl bg-white/[0.02] overflow-hidden"
                    style={{
                        border: `1px solid ${hexToRgba(accent, 0.25)}`,
                        boxShadow: `0 0 0 1px ${hexToRgba(accent, 0.08)}`,
                    }}
                >
                    <div
                        className="mx-4 mt-3.5 mb-3 rounded-xl px-4 py-3"
                        style={{
                            background: `linear-gradient(to bottom right, ${hexToRgba(accent, 0.12)}, ${hexToRgba(accent, 0.05)})`,
                            border: `1px solid ${hexToRgba(accent, 0.3)}`,
                        }}
                    >
                        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: hexToRgba(accent, 0.85) }}>
                            {isDynamic ? "동적 배율 추정 시세" : "보수적 배율 추정 시세"}
                        </span>
                        <p className="text-2xl font-black mt-0.5 leading-none" style={{ color: accent }}>
                            {formatEokCompact(estimatedTotal)}
                        </p>
                        {opr.appliedMultiplier > 0 && (
                            <p className="text-[10px] text-white/35 mt-1.5">
                                평당 {formatPrice(opr.estimatedPerPyeong)} ({opr.appliedMultiplier}배 적용)
                            </p>
                        )}
                    </div>

                    <div className="px-4 pb-3 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-white/30">
                        <span>용도지역 {opr.zoningCat || '-'}</span>
                        <span>적용 배율 {opr.appliedMultiplier}배</span>
                        {opr.targetOfficialPerSqm > 0 && targetArea > 0 && (
                            <span>
                                {formatSqmManwon(opr.targetOfficialPerSqm)} × {targetArea.toLocaleString()}㎡
                            </span>
                        )}
                    </div>

                    <div className="mx-4 mb-3 pt-3 border-t border-white/5">
                        <p className="text-white/60 text-xs leading-relaxed whitespace-pre-wrap">
                            {isDynamic
                                ? `반경 ${opr.searchRadius}m 내 유사 실거래 ${opr.sampleCount}건의 공시지가 대비 실제 거래가 배율(중간값 ${opr.appliedMultiplier}배)을 동적으로 추출하여 대상지에 대입한 정밀 산출 결과입니다.`
                                : `반경 ${opr.searchRadius}m 내 유의미한 실거래 사례가 부족하여(${opr.sampleCount}건), 통계적으로 검증된 보수적 하드코딩 배율(${opr.appliedMultiplier}배)을 안전하게 적용했습니다.`}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setExpanded(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-2 border-t border-white/5 text-[10px] text-white/40 hover:text-white/60 hover:bg-white/[0.02] transition-colors"
                    >
                        <span>산출식 · 배율 상세</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                    {expanded && (
                        <div className="px-4 pb-3.5 flex flex-col gap-1.5 border-t border-white/5 bg-black/10">
                            {opr.targetOfficialPerSqm > 0 && (
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-white/35">개별공시지가</span>
                                    <span className="text-white/70 font-mono">{formatSqmManwon(opr.targetOfficialPerSqm)}</span>
                                </div>
                            )}
                            {targetArea > 0 && (
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-white/35">대상 토지면적</span>
                                    <span className="text-white/70">{targetArea.toLocaleString()}㎡</span>
                                </div>
                            )}
                            <div className="flex justify-between text-[10px]">
                                <span className="text-white/35">적용 배율 × 공시지가</span>
                                <span className="font-semibold font-mono" style={{ color: accent }}>{opr.appliedMultiplier}배 → {formatEokCompact(estimatedTotal)}</span>
                            </div>
                            <p className="text-[9px] text-white/30 leading-relaxed pt-1">
                                ※ 건물 가치는 포함되지 않은 순수 토지가치(공시지가 기준) 산출액입니다.
                            </p>
                        </div>
                    )}
                </div>
            </PriceReasonMethodCard>
        );
    }

    if (!attached) return null;

    const minTotal = Number(attached.minTotal) || 0;
    const maxTotal = Number(attached.maxTotal) || 0;
    const midTotal = Number(attached.midTotal) || 0;
    const minMult = Number(attached.minMult) || 0;
    const maxMult = Number(attached.maxMult) || 0;
    const midMult = Number(attached.midMult) || 0;
    const zoning = attached.zoning || meta.cbdMultiplierEstimate?.zoning || '-';
    const officialPerSqm = resolveOfficialPerSqm(meta, attached, targetArea);
    const cbdGrade = meta.cbdMultiplierEstimate?.grade || '';

    const landSpectrum = getLandAdjSpectrum(comparables, targetArea);
    const compMin = landSpectrum?.min || 0;
    const compMax = landSpectrum?.max || 0;
    const hasCompContrast = compMin > 0 && minTotal > 0 && (minTotal > compMax * 1.5 || maxTotal > compMax * 2);

    const accent = PRICE_METHOD_ACCENTS.official;
    const landAccent = PRICE_METHOD_ACCENTS.comparables;

    return (
        <PriceReasonMethodCard
            icon={Percent}
            title="공시지가 배율 추정 (사례 부족 시)"
            accent={accent}
            chips={(
                <>
                    {metaChip('공시지가 기반', accent)}
                    {metaChip('보조 추정')}
                    {cbdGrade && metaChip(`CBD ${cbdGrade}`, PRICE_METHOD_ACCENTS.building)}
                </>
            )}
        >
            <div
                className="rounded-2xl bg-white/[0.02] overflow-hidden"
                style={{
                    border: `1px solid ${hexToRgba(accent, 0.25)}`,
                    boxShadow: `0 0 0 1px ${hexToRgba(accent, 0.08)}`,
                }}
            >
                <div
                    className="mx-4 mt-3.5 mb-3 rounded-xl px-4 py-3"
                    style={{
                        background: `linear-gradient(to bottom right, ${hexToRgba(accent, 0.12)}, ${hexToRgba(accent, 0.05)})`,
                        border: `1px solid ${hexToRgba(accent, 0.3)}`,
                    }}
                >
                    <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: hexToRgba(accent, 0.85) }}>공시 배율 추정 범위</span>
                    <p className="text-2xl font-black mt-0.5 leading-none" style={{ color: accent }}>
                        {formatEokCompact(minTotal)} ~ {formatEokCompact(maxTotal)}원
                    </p>
                    {midTotal > 0 && (
                        <p className="text-[10px] text-white/35 mt-1.5">
                            중간값 {formatEokCompact(midTotal)}원 ({midMult}배)
                        </p>
                    )}
                </div>

                <div className="px-4 pb-3 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-white/30">
                    <span>용도지역 {zoning}</span>
                    <span>배율 {minMult}~{maxMult}배</span>
                    {officialPerSqm > 0 && targetArea > 0 && (
                        <span>
                            {formatSqmManwon(officialPerSqm)} × {targetArea.toLocaleString()}㎡
                        </span>
                    )}
                </div>

                {estimateNarrative && String(estimateNarrative).trim() && (
                    <div className="mx-4 mb-3 pt-3 border-t border-white/5">
                        <p className="text-white/60 text-xs leading-relaxed whitespace-pre-wrap">
                            {String(estimateNarrative).trim()}
                        </p>
                    </div>
                )}

                {hasCompContrast && (
                    <div className="mx-4 mb-3 p-2.5 rounded-xl bg-red-500/5 border border-red-500/15 flex flex-col gap-1">
                        <span className="text-[9px] font-semibold text-red-400/90">실거래 대입과 큰 차이</span>
                        <div className="flex justify-between text-[10px]">
                            <span className="text-white/35">비교사례 대입 (토지)</span>
                            <span className="font-semibold" style={{ color: landAccent }}>
                                {compMin === compMax
                                    ? formatEokCompact(compMin)
                                    : `${formatEokCompact(compMin)} ~ ${formatEokCompact(compMax)}`}
                            </span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                            <span className="text-white/35">공시 배율 추정</span>
                            <span className="font-semibold" style={{ color: accent }}>
                                {formatEokCompact(minTotal)} ~ {formatEokCompact(maxTotal)}
                            </span>
                        </div>
                        <p className="text-[9px] text-white/30 leading-relaxed pt-0.5">
                            공시 배율법은 CBD·입지 프리미엄을 반영해 실거래 대입보다 높게 나올 수 있습니다. 판단 시 실거래 대입을 우선 참고하세요.
                        </p>
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => setExpanded(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-2 border-t border-white/5 text-[10px] text-white/40 hover:text-white/60 hover:bg-white/[0.02] transition-colors"
                >
                    <span>산출식 · 배율 상세</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
                {expanded && (
                    <div className="px-4 pb-3.5 flex flex-col gap-1.5 border-t border-white/5 bg-black/10">
                        {officialPerSqm > 0 && (
                            <div className="flex justify-between text-[10px]">
                                <span className="text-white/35">개별공시지가</span>
                                <span className="text-white/70 font-mono">{formatSqmManwon(officialPerSqm)}</span>
                            </div>
                        )}
                        {targetArea > 0 && (
                            <div className="flex justify-between text-[10px]">
                                <span className="text-white/35">대상 토지면적</span>
                                <span className="text-white/70">{targetArea.toLocaleString()}㎡</span>
                            </div>
                        )}
                        <div className="flex justify-between text-[10px]">
                            <span className="text-white/35">최저 배율 × 공시지가</span>
                            <span className="text-white/70 font-mono">{minMult}배 → {formatEokCompact(minTotal)}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                            <span className="text-white/35">중간 배율 × 공시지가</span>
                            <span className="font-semibold font-mono" style={{ color: accent }}>{midMult}배 → {formatEokCompact(midTotal)}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                            <span className="text-white/35">최고 배율 × 공시지가</span>
                            <span className="text-white/70 font-mono">{maxMult}배 → {formatEokCompact(maxTotal)}</span>
                        </div>
                        <p className="text-[9px] text-white/30 leading-relaxed pt-1">
                            ※ 용도지역({zoning})과 CBD 등급({cbdGrade || '-'})에 따른 배율표를 적용합니다. 건물 가치는 포함되지 않습니다.
                        </p>
                    </div>
                )}
            </div>

            <div className="p-4 bg-white/5 rounded-2xl flex items-start gap-3">
                <Info className="w-4 h-4 text-white/40 shrink-0 mt-0.5" />
                <p className="text-white/50 text-[11px] leading-relaxed font-medium">
                    ※ 인근 유사 거래사례 수량이 부족한 경우, 해당 용도지역의 평균 공시지가 거래배율을 적용하여 산출한 참고 가격입니다.
                </p>
            </div>
        </PriceReasonMethodCard>
    );
};

const resolveRegionalTrade = (t: any, isRent: boolean) => {
    const addr = `${t.sggNm || t.시군구 || ''} ${t.umdNm || t.법정동 || ''} ${t.jibun || t.지번 || ''}`.trim();
    const year = t.dealYear || t.년 || '';
    const month = String(t.dealMonth || t.월 || '').padStart(2, '0');
    const day = t.dealDay || t.일 || '';
    const dateStr = year ? `${year}.${month}${day ? `.${day}` : ''}` : '-';

    const deposit = t.deposit ?? t.보증금액;
    const monthly = t.monthlyRent ?? t.월세금액;
    const dealAmt = t.dealAmount ?? t.거래금액;

    let priceLabel = '';
    let priceWon = 0;
    if (isRent || (deposit != null && deposit !== '')) {
        const depWon = normalizeDealAmountWon(deposit);
        const monWon = normalizeDealAmountWon(monthly);
        priceLabel = monthly != null && String(monthly) !== '0' && monWon > 0
            ? `보증금 ${formatKoreanCurrency(depWon)} / 월세 ${formatKoreanCurrency(monWon)}`
            : `전세 ${formatKoreanCurrency(depWon)}`;
        priceWon = depWon;
    } else {
        priceWon = normalizeDealAmountWon(dealAmt);
        priceLabel = `매매 ${formatEokCompact(priceWon)}원`;
    }

    const area = Number(t.excluUseAr || t.exArea || t.area || t.plottage || t.totArea || t.buildingAr) || 0;
    const floor = t.floor || t.층 || '';
    const buildYear = t.buildYear || t.건축년도 || '';

    return { addr, dateStr, priceLabel, priceWon, area, floor, buildYear };
};

const RegionalTradeRow = ({ t, isRent }: { t: any; isRent: boolean }) => {
    const m = resolveRegionalTrade(t, isRent);
    return (
        <div className="flex items-start justify-between gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-white/45 font-mono">{m.dateStr}</span>
                    {m.floor && <span className="text-[9px] text-white/30">{m.floor}층</span>}
                    {m.buildYear && <span className="text-[9px] text-white/30">{m.buildYear}년</span>}
                </div>
                <p className="text-[11px] text-white/55 truncate mt-0.5">{m.addr || '주소 미상'}</p>
                {m.area > 0 && (
                    <span className="text-[9px] text-white/30">{m.area.toLocaleString()}㎡</span>
                )}
            </div>
            <span className="text-[11px] text-white/70 font-semibold shrink-0 text-right">{m.priceLabel}</span>
        </div>
    );
};

const REGIONAL_TRADES_VISIBLE = 3;

const RegionalTradesReferenceSection = ({ groups, onMapOpen }: { groups: any[]; onMapOpen?: () => void }) => {
    const [expandedGroups, setExpandedGroups] = React.useState<Record<number, boolean>>({});

    if (!groups || groups.length === 0) return null;

    const totalCount = groups.reduce((sum, g) => sum + (Array.isArray(g.data) ? g.data.length : 0), 0);
    const accent = PRICE_METHOD_ACCENTS.regional;

    // 좌표 있는 거래만 지도 표시 가능 (building_trades DB 전환 후 lat/lng 존재)
    const hasCoords = groups.some(g =>
        Array.isArray(g.data) && g.data.some((t: any) => t.lat && t.lng)
    );

    return (
        <PriceReasonMethodCard
            icon={MapPin}
            title="주변 최근 실거래가 (참고사항)"
            accent={accent}
            chips={(
                <>
                    {metaChip(`총 ${totalCount}건`, accent)}
                    {metaChip('참고용', accent)}
                    {metaChip('대입 미적용')}
                    {hasCoords && onMapOpen && (
                        <button
                            type="button"
                            onClick={onMapOpen}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                            style={{
                                backgroundColor: hexToRgba(accent, 0.1),
                                border: `1px solid ${hexToRgba(accent, 0.3)}`,
                                color: accent,
                            }}
                        >
                            <Map className="w-3.5 h-3.5" />
                            지도 보기
                        </button>
                    )}
                </>
            )}
        >
            <div className="flex flex-col gap-4">
                {groups.map((group: any, idx: number) => {
                    const items = Array.isArray(group.data) ? group.data : [];
                    if (items.length === 0) return null;
                    const isRent = (group.type || '').includes('전월세');
                    const isExpanded = expandedGroups[idx] ?? false;
                    const visible = isExpanded ? items : items.slice(0, REGIONAL_TRADES_VISIBLE);

                    return (
                        <div key={idx} className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                                <div className="flex items-center gap-2">
                                    <Store className="w-3.5 h-3.5" style={{ color: hexToRgba(accent, 0.65) }} />
                                    <span className="text-white/70 text-xs font-bold">{group.type}</span>
                                </div>
                                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-white/5 text-white/40 border border-white/10">
                                    {items.length}건
                                </span>
                            </div>
                            <div className="p-2 flex flex-col gap-1.5">
                                {visible.map((t: any, i: number) => (
                                    <RegionalTradeRow key={i} t={t} isRent={isRent} />
                                ))}
                            </div>
                            {items.length > REGIONAL_TRADES_VISIBLE && (
                                <button
                                    type="button"
                                    onClick={() => setExpandedGroups(prev => ({ ...prev, [idx]: !isExpanded }))}
                                    className="w-full py-2 border-t border-white/5 text-[10px] text-white/35 hover:text-white/55 hover:bg-white/[0.02] transition-colors"
                                >
                                    {isExpanded ? '접기' : `... 외 ${items.length - REGIONAL_TRADES_VISIBLE}건 더 보기`}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </PriceReasonMethodCard>
    );
};

const resolveUserPriceWon = (meta: any, mergedData: any): number => {
    if (meta.userPriceWon > 0) return Number(meta.userPriceWon);
    const raw = findDeepValue(mergedData, 'price') || findDeepValue(mergedData, 'sale_price');
    if (!raw) return 0;
    const num = Number(String(raw).replace(/,/g, '')) || 0;
    return num > 1000000 ? num : num * 10000;
};

const PriceSpectrumNarrativeSection = ({
    narrative,
    spectrum,
    meta,
    comparables,
    targetArea,
    estimatedTotalWon,
    attachedMultiplier,
    mergedData,
    compactSummary = true,
}: {
    narrative: string;
    spectrum: any;
    meta: any;
    comparables: any[];
    targetArea: number;
    estimatedTotalWon: number;
    attachedMultiplier: any;
    mergedData: any;
    compactSummary?: boolean;
}) => {
    if (!narrative) return null;

    const landSpectrum = getLandAdjSpectrum(comparables, targetArea);
    const landMin = landSpectrum?.min ?? (estimatedTotalWon > 0 ? estimatedTotalWon : 0);
    const landMax = landSpectrum?.max ?? landMin;
    const buildingWon = Number(meta.buildingResidualValue) || 0;
    const combinedMin = landMin > 0 && buildingWon > 0 ? landMin + buildingWon : 0;
    const combinedMax = landMax > 0 && buildingWon > 0 ? landMax + buildingWon : 0;
    const userPrice = resolveUserPriceWon(meta, mergedData);

    const paragraphs = narrative.split(/\n+/).map(p => p.trim()).filter(Boolean);

    const userVsCombined = userPrice > 0 && combinedMax > 0
        ? userPrice > combinedMax
            ? 'above'
            : userPrice < combinedMin
                ? 'below'
                : 'within'
        : null;

    const showUserPriceBlock = userPrice > 0;
    const accent = PRICE_METHOD_ACCENTS.narrative;
    const landAccent = PRICE_METHOD_ACCENTS.comparables;
    const buildingAccent = PRICE_METHOD_ACCENTS.building;

    return (
        <PriceReasonMethodCard
            icon={Sparkles}
            title="현 매물의 분석 추정 가격"
            accent={accent}
            chips={(
                <>
                    {metaChip('AI 해설', accent)}
                    {userVsCombined === 'above' && metaChip('제시가 높음', PRICE_METHOD_ACCENTS.official)}
                    {userVsCombined === 'below' && metaChip('제시가 낮음', '#10b981')}
                    {userVsCombined === 'within' && metaChip('범위 내', '#94a3b8')}
                </>
            )}
        >
            {showUserPriceBlock && (
                <div
                    className="rounded-xl px-4 py-3 flex flex-col gap-2"
                    style={{
                        background: `linear-gradient(to bottom right, rgba(255,255,255,0.03), ${hexToRgba(accent, 0.05)})`,
                        border: `1px solid ${hexToRgba(accent, 0.15)}`,
                    }}
                >
                    <span className="text-[10px] text-white/40 font-semibold">제시가 vs 추정 범위</span>
                    <div className="flex justify-between items-center">
                        <span className="text-white/50 text-xs font-bold">제시 매매가</span>
                        <span className={`font-black text-lg ${userVsCombined === 'above' ? 'text-amber-400'
                            : userVsCombined === 'below' ? 'text-emerald-400'
                                : 'text-white'
                            }`}>
                            {formatEokCompact(userPrice)}원
                        </span>
                    </div>
                    {combinedMax > 0 && (
                        <p className="text-[10px] text-white/35">
                            실거래 기반 합산 참고: {formatEokCompact(combinedMin)} ~ {formatEokCompact(combinedMax)}
                        </p>
                    )}
                    {userVsCombined === 'above' && combinedMax > 0 && (
                        <p className="text-[10px] text-amber-400/80 leading-relaxed">
                            제시가가 실거래 기반 합산 범위보다 높습니다.
                        </p>
                    )}
                </div>
            )}

            {!compactSummary && landMin > 0 && (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-2">
                    <span className="text-[10px] text-white/40 font-semibold">핵심 수치 한눈에</span>
                    <div className="flex justify-between items-center text-[11px]">
                        <span className="text-white/35">토지 대입</span>
                        <span className="font-semibold" style={{ color: landAccent }}>
                            {landMin === landMax
                                ? formatEokCompact(landMin)
                                : `${formatEokCompact(landMin)} ~ ${formatEokCompact(landMax)}`}
                        </span>
                    </div>
                    {buildingWon > 0 && (
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="text-white/35">건물 잔존</span>
                            <span className="font-semibold" style={{ color: buildingAccent }}>{formatEokCompact(buildingWon)}</span>
                        </div>
                    )}
                </div>
            )}

            <div className="flex flex-col gap-2.5">
                {paragraphs.map((p, i) => (
                    <p key={i} className="text-white/65 text-xs leading-relaxed">{p}</p>
                ))}
            </div>
        </PriceReasonMethodCard>
    );
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

const resolveBuildingIncomeInputs = (mergedData: any) => {
    const buildingData = findDeepValue(mergedData, 'buildingData');
    const isRentEstimated = buildingData?.isRentEstimated === true;

    if (isRentEstimated) {
        const depositWon = parseFloat(String(buildingData?.estimatedDeposit)) || 0;
        const monthlyRentWon = parseFloat(String(buildingData?.totalEstimatedMonthlyRent)) || 0;
        return { depositWon, monthlyRentWon, isEstimated: true, isEmpty: false, buildingData };
    }

    const depositRaw =
        findDeepValue(mergedData, 'totalDeposit')
        ?? findDeepValue(mergedData, 'total_deposit')
        ?? buildingData?.deposit
        ?? findDeepValue(mergedData, 'deposit');
    const rentRaw =
        findDeepValue(mergedData, 'totalMonthlyRent')
        ?? findDeepValue(mergedData, 'total_monthly_rent')
        ?? buildingData?.monthlyRent
        ?? buildingData?.monthly_rent
        ?? findDeepValue(mergedData, 'monthlyRent')
        ?? findDeepValue(mergedData, 'monthly_rent');

    const hasDeposit = depositRaw !== null && depositRaw !== undefined && String(depositRaw).trim() !== '';
    const hasRent = rentRaw !== null && rentRaw !== undefined && String(rentRaw).trim() !== '';

    const depositWon = normalizeIncomeInputWon(depositRaw);
    const monthlyRentWon = normalizeIncomeInputWon(rentRaw);

    const isEmpty = !hasDeposit || !hasRent || (depositWon <= 0 && monthlyRentWon <= 0);
    return { depositWon, monthlyRentWon, isEstimated: false, isEmpty, buildingData };
};

const resolveIncomeCapRates = (mergedData: any, ai: any) => {
    const metadata = ai?.analysisMetadata || mergedData?.analysisMetadata || {};

    let officeCapRate = parseFloat(String(
        metadata.officeCapRate
        ?? mergedData?.officeCapRate
        ?? findDeepValue(mergedData, 'officeCapRate')
        ?? metadata.capRate
        ?? mergedData?.capRate
        ?? 0,
    )) || 0;

    if (officeCapRate <= 0) {
        const ind = mergedData?.marketIndicators || findDeepValue(mergedData, 'marketIndicators');
        const incomeSeries = ind?.yieldRates?.income?.data;
        if (Array.isArray(incomeSeries) && incomeSeries.length > 0) {
            const sorted = [...incomeSeries].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
            officeCapRate = parseFloat(String(sorted[sorted.length - 1]?.value)) || 0;
        }
    }

    const macro = mergedData?.macroIndicators || findDeepValue(mergedData, 'macroIndicators');
    let householdLoanRate = parseFloat(String(
        metadata.householdLoanRate
        ?? mergedData?.householdLoanRate
        ?? findDeepValue(mergedData, 'householdLoanRate')
        ?? macro?.loanRate?.value
        ?? 0,
    )) || 0;

    if (householdLoanRate <= 0) {
        householdLoanRate = 4.43;
    }

    const capRate = officeCapRate > 0 ? officeCapRate : householdLoanRate;
    const isRoneBased = officeCapRate > 0;

    return { capRate, householdLoanRate, isRoneBased };
};

const formatIncomePriceEok = (won: number): string => {
    if (!won || won <= 0) return '-';
    if (won >= 100000000) return `${(won / 100000000).toFixed(1)}억`;
    return `${(won / 10000).toFixed(0)}억`;
};

const FloorBreakdownTable = ({
    floorBreakdown,
    accent,
}: {
    floorBreakdown: any[];
    accent: string;
}) => (
    <div className="flex flex-col gap-2.5">
        <span className="text-white/50 text-xs font-bold">[층별 보정계수 산출 내역]</span>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/10 text-white/40 font-bold">
                            <th className="p-3">층</th>
                            <th className="p-3">용도</th>
                            <th className="p-3 text-right">면적</th>
                            <th className="p-3 text-center">최종계수</th>
                            <th className="p-3 text-right">추정월세</th>
                        </tr>
                    </thead>
                    <tbody>
                        {floorBreakdown.map((f, index) => {
                            const isNonRental = f.isNonRental === true;
                            const floor = f.floor?.toString() || '-';
                            const usage = f.usage?.toString() || '-';
                            const area = parseFloat(String(f.area)) || 0;
                            const finalCoeff = parseFloat(String(f.finalCoeff)) || 0;
                            const monthlyRent = parseFloat(String(f.monthlyRent)) || 0;

                            return (
                                <tr key={index} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02]">
                                    <td className="p-3 font-semibold text-white">{floor}</td>
                                    <td className={`p-3 ${isNonRental ? 'text-white/30' : 'text-white/80'}`}>{usage}</td>
                                    <td className={`p-3 text-right ${isNonRental ? 'text-white/30' : 'text-white/80'}`}>
                                        {Math.round(area).toLocaleString()}㎡
                                    </td>
                                    <td
                                        className={`p-3 text-center font-bold ${isNonRental ? 'text-white/30' : ''}`}
                                        style={isNonRental ? undefined : { color: accent }}
                                    >
                                        {isNonRental ? '—' : finalCoeff.toFixed(2)}
                                    </td>
                                    <td className={`p-3 text-right font-bold ${isNonRental ? 'text-white/30' : 'text-white'}`}>
                                        {isNonRental ? '비임대' : `${Math.round(monthlyRent).toLocaleString()}원`}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

const IncomeApproachSection = ({
    mergedData,
    ai,
    categoryStr,
}: {
    mergedData: any;
    ai: any;
    categoryStr: string;
}) => {
    const lowerCat = categoryStr.toLowerCase().trim();
    if (lowerCat !== 'building' && lowerCat !== '빌딩') return null;

    const accent = PRICE_METHOD_ACCENTS.income;
    const { depositWon, monthlyRentWon, isEstimated, isEmpty, buildingData } = resolveBuildingIncomeInputs(mergedData);

    if (isEmpty) {
        return (
            <PriceReasonMethodCard
                icon={TrendingUp}
                title="수익환원법 기반 빌딩 추정가"
                accent={accent}
                chips={(
                    <>
                        {metaChip('수익환원법', accent)}
                        {metaChip('빌딩 전용', accent)}
                    </>
                )}
            >
                <div className="rounded-2xl bg-white/[0.02] border border-white/5 px-4 py-8 flex flex-col items-center justify-center gap-3 text-center">
                    <Info className="w-7 h-7 text-white/30" />
                    <p className="text-white/60 text-sm font-bold leading-relaxed">
                        보증금과 총월세를 입력하지 않아
                        <br />
                        수익환원법이 산출되지 않았습니다.
                    </p>
                    <p className="text-white/35 text-[11px] leading-relaxed max-w-[280px]">
                        수집 정보에 보증금/월세가 누락되어 임대수익 분석을 생략합니다. 직접 보증금과 월세를 기입하시면 정확한 빌딩 추정가가 계산됩니다.
                    </p>
                </div>
            </PriceReasonMethodCard>
        );
    }

    const { capRate, householdLoanRate, isRoneBased } = resolveIncomeCapRates(mergedData, ai);
    const depositIncome = depositWon * (householdLoanRate / 100);
    const annualRentIncome = monthlyRentWon * 12;

    const estimatedPrice = isEstimated
        ? (parseFloat(String(buildingData?.estimatedPrice)) || 0)
        : (capRate > 0 ? annualRentIncome / (capRate / 100) : 0);

    const estimatedPriceWithDeposit = isEstimated
        ? (parseFloat(String(buildingData?.estimatedPriceWithDeposit)) || 0)
        : (capRate > 0 ? (annualRentIncome + depositIncome) / (capRate / 100) : 0);

    const floorBreakdown = Array.isArray(buildingData?.floorBreakdown) ? buildingData.floorBreakdown : [];

    return (
        <PriceReasonMethodCard
            icon={TrendingUp}
            title="수익환원법 기반 빌딩 추정가"
            accent={accent}
            chips={(
                <>
                    {metaChip('수익환원법', accent)}
                    {metaChip(`CAP ${capRate.toFixed(2)}%`)}
                    {metaChip('빌딩 전용', accent)}
                    {isEstimated && metaChip('자동 추정', accent)}
                </>
            )}
        >
            <div className="flex flex-col gap-4">
                <div className="space-y-2">
                    <span className="text-white/50 text-xs font-bold">
                        {isEstimated ? '[자동 추정된 임대 정보]' : '[입력된 임대 정보]'}
                    </span>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-3">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-white/70">
                                <Lock className="w-4 h-4 text-white/40" />
                                <span>총 보증금</span>
                            </div>
                            <span className="text-white font-extrabold">{Math.round(depositWon).toLocaleString()} 원</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-white/70">
                                <Coins className="w-4 h-4 text-white/40" />
                                <span>총 월세</span>
                            </div>
                            <span className="text-white font-extrabold">{Math.round(monthlyRentWon).toLocaleString()} 원</span>
                        </div>
                    </div>
                </div>

                {isEstimated && floorBreakdown.length > 0 && (
                    <FloorBreakdownTable floorBreakdown={floorBreakdown} accent={accent} />
                )}

                <div className="space-y-2">
                    <span className="text-white/50 text-xs font-bold">[수익 산출]</span>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-white/70 font-bold">연간 순영업소득 (NOI)</span>
                            <span className="text-white font-extrabold">{Math.round(annualRentIncome).toLocaleString()} 원/년</span>
                        </div>
                        <div className="text-white/40 text-[10px] text-right -mt-2">
                            {isEstimated
                                ? `(추정 월세 ${Math.round(monthlyRentWon).toLocaleString()}원 × 12개월)`
                                : `(입력 월세 ${Math.round(monthlyRentWon).toLocaleString()}원 × 12개월)`}
                        </div>
                        {depositWon > 0 && (
                            <>
                                <div className="h-px w-full bg-white/10" />
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-white/70 font-bold">보증금 운용수익 (참고)</span>
                                        <span className="text-white/40 text-[10px]">가계대출금리 {householdLoanRate.toFixed(2)}% 기준</span>
                                    </div>
                                    <span className="text-white font-extrabold">{Math.round(depositIncome).toLocaleString()} 원/년</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <span className="text-white/50 text-xs font-bold">[추정 결과]</span>
                    <div
                        className="p-5 rounded-2xl flex flex-col gap-4 relative overflow-hidden"
                        style={{
                            background: `linear-gradient(to bottom right, ${hexToRgba(accent, 0.12)}, transparent)`,
                            border: `1px solid ${hexToRgba(accent, 0.25)}`,
                        }}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Calculator className="w-16 h-16" style={{ color: accent }} />
                        </div>
                        <div className="flex items-center justify-between text-sm relative z-10">
                            <div className="flex flex-col">
                                <span className="font-bold" style={{ color: accent }}>적용 환원율 (CAP Rate)</span>
                                {isRoneBased ? (
                                    <span className="text-white/40 text-[10px]">R-ONE 오피스 소득수익률 기준</span>
                                ) : (
                                    <span className="text-[10px]" style={{ color: hexToRgba(accent, 0.75) }}>
                                        ※ R-ONE 데이터 미존재 · 가계대출금리 대체 적용
                                    </span>
                                )}
                            </div>
                            <span className="text-white font-extrabold">{capRate.toFixed(2)}%</span>
                        </div>
                        <div className="h-px w-full bg-white/10 relative z-10" />
                        <div className="flex items-center justify-between relative z-10">
                            <span className="text-white font-black">▶ 빌딩 추정가 (NOI 기준)</span>
                            <span className="text-xl font-black" style={{ color: accent }}>
                                약 {formatIncomePriceEok(estimatedPrice)} 원
                            </span>
                        </div>
                        <div className="text-white/30 text-[10px] relative z-10 text-right">
                            ({Math.round(estimatedPrice).toLocaleString()} 원)
                        </div>
                        {depositWon > 0 && estimatedPriceWithDeposit !== estimatedPrice && (
                            <>
                                <div className="h-px w-full bg-white/5 relative z-10" />
                                <div className="flex items-center justify-between relative z-10 text-xs">
                                    <span className="text-white/60 font-bold">※ 보증금 운용수익 포함 시 (참고)</span>
                                    <span className="text-white/80 font-bold">
                                        약 {(estimatedPriceWithDeposit / 100000000).toFixed(1)}억 원
                                    </span>
                                </div>
                                <div className="text-white/30 text-[9px] relative z-10 text-right -mt-3">
                                    ({Math.round(estimatedPriceWithDeposit).toLocaleString()} 원)
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl flex items-start gap-3">
                    <Info className="w-4 h-4 text-white/40 shrink-0 mt-0.5" />
                    <div className="text-white/50 text-[11px] leading-relaxed font-medium space-y-1">
                        <p>
                            ※ 빌딩 추정가 = 연간 순영업소득(NOI) ÷ 캡레이트(환원율).{' '}
                            {isRoneBased
                                ? 'R-ONE 오피스 소득수익률(분기)을 연환산하여 적용.'
                                : '가계대출금리를 환원율로 대체 적용한 참고치입니다.'}
                        </p>
                        <p>
                            ※ 보증금 운용수익은 가계대출금리({householdLoanRate.toFixed(2)}%) 기준으로 산출한 참고치이며
                            메인 추정가 계산에서는 제외되었습니다.
                        </p>
                    </div>
                </div>

                {isEstimated && (
                    <div
                        className="p-4 rounded-2xl flex items-start gap-3"
                        style={{
                            backgroundColor: hexToRgba(accent, 0.06),
                            border: `1px solid ${hexToRgba(accent, 0.2)}`,
                        }}
                    >
                        <Sparkles className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accent }} />
                        <div className="text-[11px] leading-relaxed font-bold" style={{ color: hexToRgba(accent, 0.9) }}>
                            사용자가 보증금과 월세를 입력하지 않아, 주변 임대료 시세 평균(R-ONE 및 실거래)을 바탕으로
                            자동 추정한 값입니다. 정확한 분석을 원하시면 실제 임대료를 직접 입력해 주세요.
                        </div>
                    </div>
                )}
            </div>
        </PriceReasonMethodCard>
    );
};

const resolveBuildingStores = (mergedData: any): any[] => {
    const commercial =
        mergedData?.commercialData
        ?? mergedData?.rawData?.commercialData
        ?? findDeepValue(mergedData, 'commercialData');
    const stores = commercial?.buildingStores;
    return Array.isArray(stores) ? stores : [];
};

const BuildingStoresSection = ({
    mergedData,
    categoryStr,
}: {
    mergedData: any;
    categoryStr: string;
}) => {
    const lowerCat = categoryStr.toLowerCase().trim();
    if (lowerCat !== 'building' && lowerCat !== '빌딩') return null;

    const stores = resolveBuildingStores(mergedData);
    const accent = PRICE_METHOD_ACCENTS.regional;

    return (
        <PriceReasonMethodCard
            icon={Store}
            title="입점 상가 정보"
            accent={accent}
            chips={(
                <>
                    {metaChip('소상공인시장진흥공단', accent)}
                    {stores.length > 0 && metaChip(`총 ${stores.length}개 점포`, accent)}
                </>
            )}
        >
            {stores.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {stores.map((store: any, i: number) => (
                        <div
                            key={i}
                            className="bg-white/[0.03] px-3.5 py-2.5 rounded-xl border border-white/[0.06] flex flex-col gap-1 min-w-0"
                        >
                            <div className="flex items-center justify-between gap-2 min-w-0">
                                <span className="shrink-0 text-[10px] font-semibold bg-emerald-400/10 text-emerald-400 px-2 py-0.5 rounded-md">
                                    {store.flrNoNm || '-'}
                                </span>
                                <span className="text-[10px] font-medium text-white/40 truncate">
                                    {store.indsLclsNm}{store.indsSclsNm ? ` > ${store.indsSclsNm}` : ''}
                                </span>
                            </div>
                            <p className="text-[13px] font-bold text-white/80 truncate">
                                {store.bizesNm || '-'}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-white/40 py-4 text-center">
                    해당 건물 등록된 상가 임대 내역 데이터가 오류로 인해 불러오지 못할 수 있습니다. (소상공인시장진흥공단)
                </p>
            )}
        </PriceReasonMethodCard>
    );
};

// helper: filter items based on category
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

const SHORT_VERDICT_LABELS = [
    '매우 고평가', '매우 저평가', '고평가', '저평가',
    '적정 수준', '적정가', '적정',
    '선반영', '미반영', '주의', '위험', '적합',
];

const getScoreTier = (score: number) => {
    if (score >= 80) return { label: '우수', color: '#34d399' };
    if (score >= 60) return { label: '양호', color: '#0EA5E9' };
    if (score >= 40) return { label: '보통', color: '#fbbf24' };
    return { label: '검토 필요', color: '#f87171' };
};

const extractShortLabel = (...sources: (string | undefined | null)[]): string | null => {
    for (const raw of sources) {
        if (!raw) continue;
        const text = String(raw).trim();
        if (!text) continue;
        for (const label of SHORT_VERDICT_LABELS) {
            if (text.includes(label)) return label;
        }
        if (text.length <= 8 && !/[.!?]/.test(text)) return text;
    }
    return null;
};

const getVerdictBadgeStyle = (label: string) => {
    if (label.includes('저평가') || label === '미반영') {
        return { color: '#10b981', borderColor: '#10b98144', backgroundColor: '#10b98114' };
    }
    if (label.includes('고평가') || label === '선반영') {
        return { color: '#f59e0b', borderColor: '#f59e0b44', backgroundColor: '#f59e0b14' };
    }
    if (label.includes('적정')) {
        return { color: '#94a3b8', borderColor: '#94a3b844', backgroundColor: '#94a3b814' };
    }
    if (label === '주의' || label === '위험') {
        return { color: '#f87171', borderColor: '#f8717144', backgroundColor: '#f8717114' };
    }
    const tier = getScoreTier(0);
    return { color: tier.color, borderColor: `${tier.color}44`, backgroundColor: `${tier.color}14` };
};


export type AiReportShortsSection = 'summary' | 'mustCheck';

export default function AiReportView({
    ai,
    mergedData,
    analysisMetadata: analysisMetadataProp,
    onTriggerAnalysis,
    isCheckingAccess,
    shortsMode = false,
    shortsSections,
}: {
    ai: any;
    mergedData?: any;
    analysisMetadata?: any;
    onTriggerAnalysis?: () => void;
    isCheckingAccess?: boolean;
    shortsMode?: boolean;
    shortsSections?: AiReportShortsSection[];
}) {
    const aiStatus = mergedData?.ai_analysis_status || 'pending';
    const resolvedAnalysisMetadata = React.useMemo(
        () => analysisMetadataProp || ai?.analysisMetadata || mergedData?.analysisMetadata || {},
        [analysisMetadataProp, ai?.analysisMetadata, mergedData?.analysisMetadata],
    );
    const riskFactsContext = React.useMemo(
        () => ({ mergedData, analysisMetadata: resolvedAnalysisMetadata }),
        [mergedData, resolvedAnalysisMetadata],
    );
    const [isMapModalOpen, setIsMapModalOpen] = React.useState(false);
    const [mapCustomComparables, setMapCustomComparables] = React.useState<any[] | null>(null);
    const [activeAptGroupKey, setActiveAptGroupKey] = React.useState<string | null>(null);

    const categoryStr = String(mergedData?.category || 'land');

    const regionName = React.useMemo(() => {
        const rawRegion = mergedData?.regionInfo?.fullName || mergedData?.vitals?.regionInfo?.fullName || mergedData?.regionName || '';
        if (rawRegion) {
            const parts = rawRegion.split(' ').filter(Boolean);
            if (parts.length > 1) {
                return parts.slice(1).join(' ');
            }
            return parts[0];
        }
        const addr = mergedData?.address || '';
        if (addr) {
            const parts = addr.split(' ').filter(Boolean);
            if (parts.length >= 2) {
                if (parts[0].endsWith('시') || parts[0].endsWith('도')) {
                    return parts[1];
                }
                return `${parts[0]} ${parts[1]}`;
            }
            return parts[0] || '';
        }
        return '해당 지역';
    }, [mergedData]);

    // Target Area Calculation
    let targetArea = 0;
    try {
        const meta = ai?.analysisMetadata || {};
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
    } catch (_) { }

    const renderPriceReasonMethods = (spectrum: any) => {
        if (!spectrum) return null;
        const lowerCat = categoryStr.toLowerCase().trim();
        const isApartmentCat = lowerCat === 'apartment' || categoryStr.trim() === '아파트';
        if (isApartmentCat) return null;

        const narrative = spectrum.narrative || '';
        const meta = ai.analysisMetadata || {};
        const comparables = Array.isArray(meta.comparables) ? meta.comparables : [];
        const attachedTrades = Array.isArray(meta.uiAttachedRegionalTrades) ? meta.uiAttachedRegionalTrades : [];
        const attachedMultiplier = meta.uiAttachedMultiplier;
        const isBuildingCat = categoryStr === 'building' || categoryStr === 'store';
        const estimatedTotalWon = targetArea > 0 && meta.estimatedPricePerSqm
            ? Number(meta.estimatedPricePerSqm) * targetArea
            : Number(meta.estimatedTotalPrice) || 0;
        const officialMultiplierEstimate = (ai['5_priceReasonableness'] || {}).officialMultiplierEstimate;

        return (
            <div className="flex flex-col gap-4">
                <LandComparableValueSection
                    comparables={comparables}
                    meta={meta}
                    targetArea={targetArea}
                    categoryStr={categoryStr}
                    isBuildingCat={isBuildingCat}
                    regionName={regionName}
                />
                <OfficialMultiplierSection
                    attached={attachedMultiplier}
                    meta={meta}
                    comparables={comparables}
                    targetArea={targetArea}
                    isListAppended={meta.isListAppended}
                    estimateNarrative={officialMultiplierEstimate}
                    onMapOpen={(samples) => {
                        setMapCustomComparables(samples);
                        setIsMapModalOpen(true);
                    }}
                />
                <BuildingResidualSection
                    meta={meta}
                    spectrum={spectrum}
                    comparables={comparables}
                    targetArea={targetArea}
                    estimatedTotalWon={estimatedTotalWon}
                    mergedData={mergedData}
                />
                <RegionalTradesReferenceSection
                    groups={attachedTrades}
                    onMapOpen={() => {
                        const allRegionalData = attachedTrades.flatMap(g => Array.isArray(g.data) ? g.data : []);
                        setMapCustomComparables(allRegionalData);
                        setIsMapModalOpen(true);
                    }}
                />
                <PriceSpectrumNarrativeSection
                    narrative={narrative}
                    spectrum={spectrum}
                    meta={meta}
                    comparables={comparables}
                    targetArea={targetArea}
                    estimatedTotalWon={estimatedTotalWon}
                    attachedMultiplier={attachedMultiplier}
                    mergedData={mergedData}
                    compactSummary
                />
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
    const lowerCat = categoryStr.toLowerCase().trim();
    const isLand = lowerCat === 'land' || categoryStr.trim() === '토지';
    const isBuildingCat = lowerCat === 'building' || lowerCat === '빌딩' || lowerCat === 'store' || lowerCat === '상가';
    const showLandPriceNotes = isLand || isBuildingCat;
    const isApartment = lowerCat === 'apartment' || categoryStr.trim() === '아파트';

    const compRisk = ai['1_comprehensiveRisk'] || {};
    const priceReas = ai['5_priceReasonableness'] || {};
    const overallScore = typeof (compRisk.totalScore || compRisk.score) === 'number' ? (compRisk.totalScore || compRisk.score) : 0;
    const summaryText = compRisk.coreJudgement || mergedData?.detectiveNote || "상세 분석 리포트가 파싱을 완료했습니다.";

    const scoreTier = getScoreTier(overallScore);
    const finalVerdict = ai['8_finalVerdict'];
    const verdictText = typeof finalVerdict === 'object'
        ? (finalVerdict?.verdict || finalVerdict?.verdic)
        : (typeof finalVerdict === 'string' ? finalVerdict : undefined);
    const priceLabel = extractShortLabel(
        priceReas.conclusion,
        priceReas.gap,
        priceReas.opinion,
        priceReas.priceSpectrum?.narrative,
        verdictText,
    );
    const summaryBadges: { label: string; color: string; borderColor: string; backgroundColor: string }[] = [
        {
            label: scoreTier.label,
            color: scoreTier.color,
            borderColor: `${scoreTier.color}44`,
            backgroundColor: `${scoreTier.color}14`,
        },
    ];
    if (priceLabel && priceLabel !== scoreTier.label) {
        summaryBadges.push({ label: priceLabel, ...getVerdictBadgeStyle(priceLabel) });
    }

    // ──────────────────────────────────────────
    // 📊 레이더 차트 및 미니바 데이터 필터링
    // ──────────────────────────────────────────
    const radarMap: any = {};
    if (compRisk.scoreItems) {
        Object.entries(compRisk.scoreItems).forEach(([k, v]: [string, any]) => {
            if (!shouldHideItem(k, categoryStr)) {
                radarMap[k] = (v !== null && typeof v === 'object') ? (v.score || 0) : (typeof v === 'number' ? v : 0);
            }
        });
    }

    const labelMap: Record<string, string> = {
        'nearbySales': '인근 실거래가', 'tradeVolume': '거래량', 'amenities': '생활 편의시설',
        'regulatoryOutlook': '규제 전망', 'population': '인구 현황', 'landRegulation': '토지 이용 규제',
        'landShape': '토지 형상', 'buildingAgePhoto': '건물 노후도(사진)', 'buildingAgeRegister': '건물 노후도(대장)',
        'rentProfitability': '임대 수익성'
    };

    // const scoreItemDescriptions: Record<string, string> = {
    //     'nearbySales': '대상지 주변의 실제 실거래 사례들과의 단가 비교를 통해 호가의 적정성을 분석한 리스크 평가 지수입니다.',
    //     'tradeVolume': '해당 필지 인근의 토지 거래 빈도와 최근 시장 유동성 수준을 분석한 거래 활성 지수입니다.',
    //     'amenities': '대형 마트, 병원, 은행, 상권, 공원 등 주변 생활 밀착형 인프라에 대한 접근성 및 편리함을 나타냅니다.',
    //     'regulatoryOutlook': '지자체 개발 계획, 도시계획조례 방향 및 미래 용도지구 지정 가능성에 대한 전망을 분석한 지수입니다.',
    //     'population': '배후 가구수 변화, 전입/전출 유동 인구 현황 및 연령대 분포를 분석해 수요 안정성을 평가합니다.',
    //     'landRegulation': '용도지역/지구 한도 내 건폐율, 용적률 제한 및 공법상 개발 행위 제한 리스크를 평가한 지수입니다.',
    //     'landShape': '토지의 모양(장방형, 부정형 등), 고저, 지세 경사도 및 도로 접면 폭에 따른 개발 유용성 점수입니다.',
    //     'buildingAgePhoto': '현장 실사 사진 상의 외벽 크랙, 설비 및 시설물 손상도 등을 분석해 실제 건물 노후 수준을 측정합니다.',
    //     'buildingAgeRegister': '건축물대장 상 승인 연도 및 법적 경과 연수 기준 잔존 내구 연한을 가치 감가로 산출한 지수입니다.',
    //     'rentProfitability': '인근 공실률 동향과 평균 월세 시세를 종합 분석하여 기대 임대 소득 안정성을 평가합니다.'
    // };

    // const radarData = Object.entries(radarMap).map(([key, value]) => {
    //     return { subject: labelMap[key] || key, A: value, fullMark: 10 };
    // });

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
        'scarcityMarket': { icon: ShieldAlert, label: '희소성 시장', color: '#fad2e1' },
        'growthMarket': { icon: TrendingUp, label: '성장 시장', color: '#bcd4e6' },
        'supplyMarket': { icon: BarChart3, label: '공급 시장', color: '#c5dedd' },
        'shrinkingMarket': { icon: TrendingDown, label: '축소 시장', color: '#fde2e4' },
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

    // 파스텔 색상 목록 (RiskBubbleChart · 미니바와 동일)
    const pastelColors = [...REPORT_PASTEL_PALETTE];

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

        const buildingTitleArr = mergedData?.vitals?.building?.title ?? mergedData?.rawData?.vitals?.building?.title;
        const bldNm = (Array.isArray(buildingTitleArr) && buildingTitleArr.length > 0)
            ? (buildingTitleArr[0]?.bldNm || null)
            : null;

        const detailsList = [];
        if (bldNm) detailsList.push({ label: '건축물명', value: bldNm, icon: Building2 });
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
    // [토지 가치 정밀 검증 원장 Section]
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
        const showLocationStep = isLand || isBuilding || isHouse;
        const showZoningStep = isLand || isBuilding;

        const ledgerTitle = isBuilding
            ? '빌딩 프리미엄 검증 및 분석'
            : isHouse
                ? '주택 프리미엄 검증 및 분석'
                : '토지 프리미엄 검증 및 분석';

        let targetArea = 0;
        try {
            const t = meta.target || {};
            const directTargetArea = meta.targetArea !== undefined && meta.targetArea !== null
                ? parseFloat(meta.targetArea.toString())
                : null;
            if (directTargetArea !== null && directTargetArea > 0) {
                targetArea = directTargetArea;
            } else if (isBuilding) {
                targetArea = parseFloat(t.totalArea_sqm || mergedData?.totalArea_sqm || t.area_sqm || mergedData?.area || '0');
            } else if (isHouse) {
                targetArea = parseFloat(t.exclusiveArea_sqm || t.area_sqm || mergedData?.area || mergedData?.exclusiveArea_sqm || '0');
            } else {
                targetArea = parseFloat(t.area_sqm || t.land?.area_sqm || mergedData?.area || mergedData?.area_sqm || '0');
            }
        } catch (_) { }

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
                                            <a
                                                href={detail.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1 rounded transition-all"
                                                style={{
                                                    backgroundColor: hexToRgba(LEDGER_ACCENTS.multipliers, 0.1),
                                                    color: LEDGER_ACCENTS.multipliers,
                                                }}
                                            >
                                                <ExternalLink className="w-2.5 h-2.5" />
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <span className="text-[11px] font-bold mt-1" style={{ color: LEDGER_ACCENTS.comparables }}>
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
            const hosaeDetails = hosaeAdj.details || [];
            tiles.push({
                name: "호재 보정 (Hosae)",
                factor: hosaeAdj.applied ? (hosaeAdj.factor || 1.0) : 1.0,
                desc: hosaeDetails.length > 0
                    ? (hosaeAdj.applied
                        ? `인근 호재 ${hosaeDetails.length}건 반영`
                        : '(참고) 단가 보정 미적용')
                    : (hosaeAdj.reason || '인근 호재 미감지 — 보정 없음'),
                infoText: "개발 계획, 교통망 신설, 구역 지정 등 인근 지역의 미래 가치 상승 요인(호재)에 따른 가치 상승분을 보정하여 반영합니다.",
                customDescElement: hosaeDetails.length > 0 ? renderHosaeDetails() : undefined
            });
        }

        return (
            <div className="flex flex-col gap-5">
                <LedgerSummaryCard
                    title={ledgerTitle}
                    showMapButton={comparables.length > 0}
                    onMapOpen={() => setIsMapModalOpen(true)}
                />
                <LedgerComparablesSection
                    categoryStr={categoryStr}
                    isBuilding={isBuilding}
                    isHouse={isHouse}
                    comparables={comparables}
                    tier1Comparables={meta.tier1Comparables}
                    tier2Comparables={meta.tier2Comparables}
                    targetArea={meta.areaAdjustment?.targetArea || targetArea}
                    confidenceGrade={meta.confidenceGrade || ''}
                />
                <LedgerMultipliersSection tiles={tiles} />
                {showLocationStep && (
                    <LedgerLocationSection
                        cbdGrade={cbdGrade}
                        cbdScore={cbdScore}
                        cbdEst={cbdEst}
                        targetArea={meta.areaAdjustment?.targetArea || targetArea}
                        isBuildingOrHouse={isBuilding || isHouse}
                    />
                )}
                {showZoningStep && (
                    <LedgerZoningChangeSection comment={zoningChangeComment} />
                )}
            </div>
        );
    };

    // ──────────────────────────────────────────
    // 🏢 [아파트 가치 정밀 검증 원장 Section]
    // ──────────────────────────────────────────
    const renderApartmentValuationLedgerSection = () => {
        let meta = ai.analysisMetadata;
        if (!meta || Object.keys(meta).length === 0) return null;

        const complexGroups = meta.complexGroups || [];
        const hasComplexGroups = complexGroups.length > 0;
        
        let currentGroupKey = activeAptGroupKey;
        if (!currentGroupKey && hasComplexGroups) {
            // 초기 로드시 타겟 매물과 일치하는 탭 선택 시도
            const txType = mergedData?.transactionType || mergedData?.transaction_type || ai.userSubmittedData?.transactionType || '매매';
            const areaKey = Math.round(targetArea);
            const targetKey = `${areaKey}_${txType}`;
            const found = complexGroups.find((g: any) => g.groupKey === targetKey);
            currentGroupKey = found ? targetKey : complexGroups[0].groupKey;
        }

        let activeMeta = meta;
        let activeTxType = '매매';
        
        if (hasComplexGroups && currentGroupKey) {
            const activeGroup = complexGroups.find((g: any) => g.groupKey === currentGroupKey) || complexGroups[0];
            if (activeGroup) {
                activeMeta = activeGroup.metadata || meta;
                activeTxType = activeGroup.transactionType;
            }
        } else {
            activeTxType = mergedData?.transactionType || mergedData?.transaction_type || ai.userSubmittedData?.transactionType || '매매';
        }

        const transactionType = activeTxType;

        const comparables = Array.isArray(activeMeta.comparables) ? activeMeta.comparables : [];
        const aptTarget = activeMeta.apartmentTarget || {};
        const marketSummary = Array.isArray(activeMeta.marketSummary) ? activeMeta.marketSummary : [];

        const estPerSqm = activeMeta.estimatedPricePerSqm || 0;
        const estPerPyeong = activeMeta.estimatedPricePerPyeong || 0;
        const weightedPerSqm = activeMeta.weightedPricePerSqm || estPerSqm;
        const weightedPerPyeong = activeMeta.weightedPricePerPyeong || estPerPyeong;

        const estimatedTotal = activeMeta.estimatedTotalPrice || 0;
        const weightedTotal = activeMeta.weightedTotalPrice || 0;
        const priceGap = activeMeta.priceGapPercent || 0;
        const userPriceWon = activeMeta.userPriceWon || 0;

        const confidenceGrade = activeMeta.confidenceGrade || '-';
        const confidenceScore = activeMeta.confidenceScore || 0;
        const sampleCount = activeMeta.priceSampleCount || comparables.length;

        const accentColor = LEDGER_ACCENTS.comparables;
        const accentBuilding = LEDGER_ACCENTS.multipliers;
        const accentOfficial = LEDGER_ACCENTS.location;
        const accentZoning = LEDGER_ACCENTS.zoning;

        const stepHeader = (stepNum: string, title: string, stepAccent: string) => (
            <div className="flex items-center gap-2 mt-6 mb-3">
                <div style={{ backgroundColor: stepAccent }} className="w-[18px] h-[18px] flex items-center justify-center text-[#0f172a] rounded-full text-[10px] font-black">{stepNum}</div>
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
            <div
                className="p-6 bg-[#0f172a]/55 rounded-[40px]"
                style={{
                    border: `1px solid ${hexToRgba(accentColor, 0.2)}`,
                    boxShadow: `0 0 25px ${hexToRgba(accentColor, 0.04)}`,
                }}
            >
                {/* Header */}
                <div className="flex justify-between items-center gap-2 pb-4 border-b border-white/5 mb-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="p-2 rounded-xl"
                            style={{
                                backgroundColor: hexToRgba(accentColor, 0.12),
                                border: `1px solid ${hexToRgba(accentColor, 0.3)}`,
                            }}
                        >
                            <Building className="w-4 h-4" style={{ color: accentColor }} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white text-base font-bold tracking-tight">프리미엄 분석</span>
                            <span className="text-white/38 text-[11px] font-medium">{aptTarget.aptName || ''}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {comparables.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setIsMapModalOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 hover:text-white rounded-xl text-xs font-bold transition-all"
                                style={{
                                    backgroundColor: hexToRgba(accentColor, 0.1),
                                    border: `1px solid ${hexToRgba(accentColor, 0.25)}`,
                                    color: accentColor,
                                }}
                            >
                                <Map className="w-3.5 h-3.5" />
                                <span>지도</span>
                            </button>
                        )}
                        <div style={{
                            borderColor: confidenceGrade === 'A' ? '#007f5f' : confidenceGrade === 'B' ? accentColor : '#f59e0b',
                            color: confidenceGrade === 'A' ? '#10b981' : confidenceGrade === 'B' ? accentColor : '#f59e0b',
                            backgroundColor: confidenceGrade === 'A' ? 'rgba(0,127,95,0.15)' : confidenceGrade === 'B' ? hexToRgba(accentColor, 0.12) : 'rgba(245,158,11,0.12)'
                        }} className="px-2 py-1 rounded-lg border text-[9px] font-black whitespace-nowrap">
                            신뢰도 {confidenceGrade} ({confidenceScore}점)
                        </div>
                    </div>
                </div>

                {/* 탭 UI */}
                {hasComplexGroups && (
                    <div className="flex flex-col gap-3 mb-6 bg-black/20 p-4 rounded-3xl border border-white/5">
                        {/* 거래유형 탭 */}
                        <div className="flex gap-2 pb-3 border-b border-white/5">
                            {['매매', '전세', '월세'].map(txType => {
                                const hasType = complexGroups.some((g: any) => g.transactionType === txType);
                                if (!hasType) return null;
                                const isActive = activeTxType === txType;
                                return (
                                    <button
                                        key={txType}
                                        onClick={() => {
                                            const firstOfThisType = complexGroups.find((g: any) => g.transactionType === txType);
                                            if (firstOfThisType) setActiveAptGroupKey(firstOfThisType.groupKey);
                                        }}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${isActive ? 'bg-white/10 text-white border border-white/20' : 'text-white/40 border border-transparent hover:text-white/70'}`}
                                    >
                                        {txType}
                                    </button>
                                );
                            })}
                        </div>
                        {/* 면적 탭 */}
                        <div className="flex gap-2 flex-wrap">
                            {complexGroups
                                .filter((g: any) => g.transactionType === activeTxType)
                                .sort((a: any, b: any) => a.area - b.area)
                                .map((g: any) => {
                                    const isActive = currentGroupKey === g.groupKey;
                                    return (
                                        <button
                                            key={g.groupKey}
                                            onClick={() => setActiveAptGroupKey(g.groupKey)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${isActive ? `bg-[${accentColor}]/20 text-[${accentColor}] border border-[${accentColor}]/40` : 'text-white/30 border border-white/5 hover:text-white/60 bg-white/5'}`}
                                            style={isActive ? { color: accentColor, backgroundColor: hexToRgba(accentColor, 0.15), borderColor: hexToRgba(accentColor, 0.4) } : {}}
                                        >
                                            {g.area}㎡
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                )}

                {/* Step 1: 비교사례 요약 */}
                {stepHeader('1', `1단계: 비교사례 요약 (${sampleCount}건)`, accentColor)}
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
                                <div key={index} style={{ borderColor: isSame ? hexToRgba(accentColor, 0.2) : 'rgba(255,255,255,0.08)' }} className="min-w-[210px] max-w-[210px] p-4 bg-white/5 border rounded-2xl flex flex-col gap-2 shrink-0 snap-center">
                                    <div className="flex justify-between items-center gap-1.5">
                                        <div className="flex items-center gap-1 min-w-[70%]">
                                            {isSame && (
                                                <span style={{ color: accentColor, backgroundColor: hexToRgba(accentColor, 0.15) }} className="px-1 py-0.5 rounded text-[8px] font-bold">동일</span>
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
                                        <span>
                                            {transactionType === '월세' || (c.monthlyRent && c.monthlyRent > 0)
                                                ? `보증금 ${dealAmountStr} / 월 ${c.monthlyRent > 0 ? formatKoreanCurrency(c.monthlyRent).replace(' 원', '') : '0'}`
                                                : transactionType === '전세'
                                                    ? `보증금 ${dealAmountStr}`
                                                    : `거래가 ${dealAmountStr}`
                                            }
                                        </span>
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
                {stepHeader('2', '2단계: 추정 단가 산출 (시점수정 적용)', accentBuilding)}
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
                {stepHeader('3', '3단계: 최종 추정가 산출', accentOfficial)}
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-3">
                    {transactionType === '월세' ? (
                        <>
                            <span className="text-white/50 text-[11px]">대상 면적 {aptTarget.exclusiveArea ? parseFloat(aptTarget.exclusiveArea.toString()).toFixed(1) : '-'}㎡ 기준 전/월세 시장 평균가</span>
                            <div className="flex flex-col gap-2.5 mt-1">
                                <div className="flex justify-between items-center bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                                    <span className="text-white/60 text-xs">추정 보증금</span>
                                    <span style={{ color: accentColor }} className="text-lg font-black select-all">
                                        {activeMeta.rentTarget?.estimatedWolseDeposit > 0 ? formatKoreanCurrency(activeMeta.rentTarget.estimatedWolseDeposit) : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                                    <span className="text-white/60 text-xs">추정 월세</span>
                                    <span style={{ color: accentColor }} className="text-lg font-black select-all">
                                        {activeMeta.rentTarget?.estimatedWolseMonthly > 0 ? `${formatKoreanCurrency(activeMeta.rentTarget.estimatedWolseMonthly)}/월` : '-'}
                                    </span>
                                </div>
                            </div>

                            {/* 월세 제시가 vs 추정가 비교 */}
                            {(() => {
                                const uDep = mergedData?.userSubmittedData?.deposit || mergedData?.deposit || 0;
                                const uRent = mergedData?.userSubmittedData?.monthlyRent || mergedData?.monthlyRent || 0;
                                const uDepWon = uDep > 10000000 ? uDep : uDep * 10000;
                                const uRentWon = uRent > 1000000 ? uRent : uRent * 10000;
                                const estDep = activeMeta.rentTarget?.estimatedWolseDeposit || 0;
                                const estRent = activeMeta.rentTarget?.estimatedWolseMonthly || 0;

                                if (uDepWon > 0 || uRentWon > 0) {
                                    return (
                                        <div className="mt-2 p-3 border border-white/5 bg-white/2 rounded-xl flex flex-col gap-2 text-xs">
                                            <div className="flex justify-between text-white/50">
                                                <span>제시 조건</span>
                                                <span className="font-bold text-white">
                                                    보증금 {formatKoreanCurrency(uDepWon)} / 월 {formatKoreanCurrency(uRentWon)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-white/50">
                                                <span>시장 평균</span>
                                                <span className="font-bold text-sky-400">
                                                    보증금 {estDep > 0 ? formatKoreanCurrency(estDep) : '-'} / 월 {estRent > 0 ? formatKoreanCurrency(estRent) : '-'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </>
                    ) : (
                        <>
                            <span className="text-white/50 text-[11px]">
                                {transactionType === '전세' 
                                    ? `대상 면적 ${aptTarget.exclusiveArea ? parseFloat(aptTarget.exclusiveArea.toString()).toFixed(1) : '-'}㎡ 기준 적정 전세가`
                                    : `대상 면적 ${aptTarget.exclusiveArea ? parseFloat(aptTarget.exclusiveArea.toString()).toFixed(1) : '-'}㎡ × 추정 단가`
                                }
                            </span>
                            <div className="flex items-end gap-2 mt-1">
                                <span className="text-white/60 text-xs mb-0.5">추정가</span>
                                <span style={{ color: accentColor }} className="text-2xl font-black leading-none select-all">
                                    {estimatedTotal > 0 ? formatKoreanCurrency(estimatedTotal) : '-'}
                                </span>
                            </div>
                            {weightedTotal > 0 && Math.abs(weightedTotal - estimatedTotal) > 1000 && transactionType !== '전세' && (
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
                        </>
                    )}
                </div>

                {/* Step 4: 시장 분석 코멘트 */}
                {stepHeader('4', '4단계: 시장 분석 코멘트', accentZoning)}
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

    const renderAiSummarySection = () => (
        <div className="relative overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#0f172a]/50 p-6 lg:p-8">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/[0.04] via-transparent to-transparent" />
            <div className="absolute top-0 inset-x-10 h-px bg-gradient-to-r from-transparent via-sky-400/25 to-transparent" />
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-10">
                <div className="shrink-0 flex justify-center">
                    <PremiumRiskGauge score={overallScore} />
                </div>
                <div className="flex-1 min-w-0 text-center lg:text-left">
                    <div className="flex items-center gap-3 mb-5 flex-wrap justify-center lg:justify-start">
                        <div className="flex items-center gap-2.5 shrink-0">
                            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/25 via-cyan-500/10 to-transparent border border-sky-400/30 shadow-[0_0_16px_rgba(14,165,233,0.18)]">
                                <div className="absolute inset-0 rounded-xl bg-sky-400/[0.06] pointer-events-none" />
                                <Search className="relative w-[18px] h-[18px] text-sky-300" strokeWidth={2.25} />
                            </div>
                            <span className="text-sm lg:text-[15px] font-bold tracking-tight text-white/95">
                                AI 탐정{' '}
                                <span className="bg-gradient-to-r from-sky-200 via-cyan-200 to-sky-300 bg-clip-text text-transparent">
                                    분석 결과
                                </span>
                            </span>
                        </div>
                        {summaryBadges.map(({ label, color, borderColor, backgroundColor }) => (
                            <span
                                key={label}
                                className="text-[11px] font-black px-2.5 py-1 rounded-full border"
                                style={{ color, borderColor, backgroundColor }}
                            >
                                {label}
                            </span>
                        ))}
                    </div>
                    <div className="text-white/90 text-[15px] lg:text-base leading-[1.75] font-medium min-h-[72px]">
                        {shortsMode ? (
                            <span>{summaryText}</span>
                        ) : (
                            <Typewriter text={summaryText} delay={30} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderMustCheckSection = (showWhenEmpty = false) => {
        if (mustCheck.length === 0) {
            if (!showWhenEmpty) return null;
            return (
                <div className="p-6 bg-[#0f172a]/55 border border-[#fde2e4]/20 rounded-[40px] text-white/40 text-sm text-center">
                    중요 체크리스트 없음
                </div>
            );
        }
        return (
            <div className="p-6 bg-[#0f172a]/55 border border-[#fde2e4]/20 rounded-[40px] shadow-[0_0_25px_rgba(253,226,228,0.04)]">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-[#fde2e4]/12 border border-[#fde2e4]/30 rounded-xl">
                        <CheckSquare className="w-4 h-4 text-[#fde2e4]" />
                    </div>
                    <span className="text-white text-base font-bold tracking-tight">중요 체크리스트</span>
                </div>
                <div className="flex flex-col gap-3">
                    {(shortsMode ? mustCheck.slice(0, 4) : mustCheck).map((q, i) => (
                        <div key={i} className="p-4 bg-white/2 border border-white/5 rounded-2xl flex gap-3 items-start">
                            <CheckSquare className="w-4 h-4 text-[#fde2e4] shrink-0 mt-0.5" />
                            <span className="text-white/70 text-xs leading-relaxed">{String(q)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (shortsSections && shortsSections.length > 0) {
        return (
            <div className="shorts-ai-section space-y-0">
                {shortsSections.includes('summary') && renderAiSummarySection()}
                {shortsSections.includes('mustCheck') && renderMustCheckSection(true)}
            </div>
        );
    }

    return (
        <div className="space-y-6">


            {/* 1. 종합 분석 요약 */}
            {renderAiSummarySection()}

            {/* 2. 입력 상세 정보 */}
            {renderUserDetailedInfoSection()}

            {/* 3. 세부 리스크 평가 항목 */}
            {Object.keys(radarMap).length > 0 && (
                <div className="p-6 bg-[#0f172a] rounded-[40px] border border-white/5 shadow-[0_0_25px_rgba(14,165,233,0.04)]">
                    <div className="flex items-center gap-2 mb-5">
                        <Zap className="w-4 h-4 text-[#0ea5e9]" />
                        <span className="text-white text-base font-bold">세부 리스크 평가 항목</span>
                    </div>
                    <motion.div
                        className="flex flex-col gap-3"
                        initial={shortsMode ? false : 'hidden'}
                        animate={shortsMode ? false : 'visible'}
                        variants={{
                            hidden: {},
                            visible: { transition: { staggerChildren: 0.07 } },
                        }}
                    >
                        {Object.entries(compRisk.scoreItems || {})
                            .filter(([key, item]: [string, any]) => {
                                if (shouldHideItem(key, categoryStr)) return false;
                                if (item === null) return false;
                                if (typeof item === 'object' && item.score === null) return false;
                                return true;
                            })
                            .map(([key, item]: [string, any], idx) => {
                                const label = labelMap[key] || key;
                                const customColor = pastelColors[idx % pastelColors.length];
                                const facts = buildRiskItemFacts(key, riskFactsContext);
                                const card = (
                                    <MiniBar
                                        label={label}
                                        score={item !== null && typeof item === 'object' ? (item.score ?? 0) : (typeof item === 'number' ? item : 0)}
                                        reason={item !== null && typeof item === 'object' ? item.reason : undefined}
                                        facts={facts.length > 0 ? facts : undefined}
                                        max={10}
                                        customColor={customColor}
                                        animate={!shortsMode}
                                    />
                                );
                                if (shortsMode) {
                                    return <div key={key}>{card}</div>;
                                }
                                return (
                                    <motion.div key={key} variants={RISK_CARD_VARIANTS}>
                                        {card}
                                    </motion.div>
                                );
                            })}
                    </motion.div>
                </div>
            )}

            {/* 4. 예상 가격 타당성 검증 */}
            {Object.keys(priceReas).length > 0 && (
                <div className="flex flex-col gap-5">
                    {/* 요약 */}
                    <div
                        className="p-6 bg-[#0f172a] rounded-[40px] flex flex-col gap-4"
                        style={{
                            border: `1px solid ${hexToRgba(PRICE_METHOD_ACCENTS.summary, 0.2)}`,
                            boxShadow: `0 0 25px ${hexToRgba(PRICE_METHOD_ACCENTS.summary, 0.04)}`,
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="p-2 rounded-xl"
                                style={{
                                    backgroundColor: hexToRgba(PRICE_METHOD_ACCENTS.summary, 0.12),
                                    border: `1px solid ${hexToRgba(PRICE_METHOD_ACCENTS.summary, 0.3)}`,
                                }}
                            >
                                <DollarSign className="w-4 h-4" style={{ color: PRICE_METHOD_ACCENTS.summary }} />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-white text-base font-bold tracking-tight">종합 데이터로 현 매물의 가격을 분석합니다
                                </span>

                            </div>
                        </div>

                        {priceReas.conclusion && (
                            <span className="text-white text-sm font-bold leading-relaxed">{priceReas.conclusion}</span>
                        )}

                        {priceReas.gap && (
                            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-2 text-white/50 text-xs">
                                    <TrendingUp className="w-4 h-4 text-[#10b981]" />
                                    <span>제시가 vs 비준가격 차이</span>
                                </div>
                                <span className="text-[#10b981] text-sm font-black">{priceReas.gap}</span>
                            </div>
                        )}

                        {priceReas.opinion && (
                            <span className="text-white/50 text-xs leading-relaxed border-t border-white/5 pt-3">{priceReas.opinion}</span>
                        )}
                    </div>

                    <IncomeApproachSection
                        mergedData={mergedData}
                        ai={ai}
                        categoryStr={categoryStr}
                    />

                    <BuildingStoresSection
                        mergedData={mergedData}
                        categoryStr={categoryStr}
                    />

                    {/* 방법론별 독립 카드 + 보조 참고 카드 */}
                    {priceReas.priceSpectrum && renderPriceReasonMethods(priceReas.priceSpectrum)}

                    {showLandPriceNotes && priceReas.cbdEstimate && (
                        priceSubCard(MapPin, '도심 중심업무지구(CBD) 추정', String(priceReas.cbdEstimate), PRICE_METHOD_ACCENTS.building)
                    )}

                    {showLandPriceNotes && priceReas.officialMultiplierEstimate && !ai.analysisMetadata?.uiAttachedMultiplier && (
                        priceSubCard(Percent, '공시지가 배율 추정', String(priceReas.officialMultiplierEstimate), PRICE_METHOD_ACCENTS.official)
                    )}

                    {showLandPriceNotes && priceReas.zoningChangeNote && (
                        priceSubCard(TrendingUp, '토지 용도지역 변경 동향', String(priceReas.zoningChangeNote), PRICE_METHOD_ACCENTS.narrative)
                    )}

                    {/* priceSpectrum 없을 때 아파트 레거시 서브 카드 */}
                    {isApartment && priceReas.estimatedTotalPriceNote && !ai.analysisMetadata?.complexGroups && (
                        priceSubCard(Coins, '최종 추정가 산출', String(priceReas.estimatedTotalPriceNote), PRICE_METHOD_ACCENTS.comparables)
                    )}

                    {isApartment && priceReas.marketSummaryComment && !ai.analysisMetadata?.complexGroups && (
                        priceSubCard(BarChart3, '시장 분석 코멘트', stripEmojis(String(priceReas.marketSummaryComment)), PRICE_METHOD_ACCENTS.regional)
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
                    {([
                        ...(['investmentValue', 'reconstruction', 'outlook'] as const).filter(
                            (key) => inDepth[key] && String(inDepth[key]).trim() !== ''
                        ),
                        ...Object.keys(inDepth).filter(
                            (k) => !['scarcityMarket', 'growthMarket', 'supplyMarket', 'shrinkingMarket', 'investmentValue', 'reconstruction', 'historicalStory', 'outlook'].includes(k)
                        ),
                    ] as string[])
                        .filter((key) => {
                        if (!inDepth[key] || String(inDepth[key]).trim() === '') return false;
                        const meta = inDepthCategories[key];
                        const label = meta?.label || key;
                        return !shouldHideItem(key, categoryStr) && !shouldHideItem(label, categoryStr);
                    }).map((key) => {
                        const value = inDepth[key];
                        const meta = inDepthCategories[key] || { icon: Search, label: key, color: '#94a3b8' };
                        const Icon = meta.icon;
                        return (
                            <div key={key} className="p-6 bg-[#0f172a] rounded-[40px] border border-white/5">
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
            {renderMustCheckSection()}

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
                <div className="fixed inset-0 z-[999] flex items-end justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => { setIsMapModalOpen(false); setMapCustomComparables(null); }} />
                    <div className="relative w-full max-w-4xl h-[85vh] bg-white rounded-t-[32px] overflow-hidden flex flex-col z-10 animate-in slide-in-from-bottom duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.35)]">
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
                                    <span className="text-slate-900 text-base font-black">
                                        {mapCustomComparables ? '주변 실거래 지도' : '비교사례 위치 지도'}
                                    </span>
                                    <span className="text-slate-500 text-[11px] font-medium">
                                        마커에 실거래가(억) 표시 · 클릭 시 상세 정보
                                        {mapCustomComparables
                                            ? ` · ${mapCustomComparables.length}건`
                                            : ai.analysisMetadata?.comparables?.length
                                                ? ` · ${ai.analysisMetadata.comparables.length}건`
                                                : ''}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => { setIsMapModalOpen(false); setMapCustomComparables(null); }}
                                className="p-2 rounded-xl hover:bg-slate-900/5 text-slate-400 hover:text-slate-700 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 p-3 bg-slate-100">
                            <ComparableMap 
                                mapData={ai.analysisMetadata} 
                                category={categoryStr} 
                                targetArea={targetArea} 
                                customComparables={mapCustomComparables || undefined}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
