'use client';

import React from 'react';

interface MiniScoreRingProps {
    label: string;
    score: number;
    max?: number;
    color?: string;
    size?: 'sm' | 'md' | 'lg';
}

const SIZE_CONFIG = {
    sm: { box: 40, radius: 15, stroke: 3.5, font: 'text-[10px]', label: false },
    md: { box: 68, radius: 26, stroke: 5, font: 'text-sm', label: true },
    lg: { box: 72, radius: 28, stroke: 5, font: 'text-sm', label: true },
} as const;

export default function MiniScoreRing({
    label,
    score,
    max = 100,
    color = '#0EA5E9',
    size = 'md',
}: MiniScoreRingProps) {
    const cfg = SIZE_CONFIG[size];
    const pct = Math.min(Math.max((score / max) * 100, 0), 100);
    const circumference = cfg.radius * Math.PI * 2;
    const dashOffset = circumference - (circumference * pct) / 100;
    const viewBox = cfg.box;

    return (
        <div className={`flex flex-col items-center gap-2 text-center ${label ? '' : 'gap-0'}`}>
            <div className="relative shrink-0" style={{ width: cfg.box, height: cfg.box }}>
                <svg
                    className="absolute inset-0 w-full h-full -rotate-90"
                    viewBox={`0 0 ${viewBox} ${viewBox}`}
                >
                    <circle
                        cx={viewBox / 2}
                        cy={viewBox / 2}
                        r={cfg.radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth={cfg.stroke}
                    />
                    <circle
                        cx={viewBox / 2}
                        cy={viewBox / 2}
                        r={cfg.radius}
                        fill="none"
                        stroke={color}
                        strokeWidth={cfg.stroke}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        style={{ filter: `drop-shadow(0 0 4px ${color}66)` }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`${cfg.font} font-bold text-white`}>{score}</span>
                </div>
            </div>
            {label && cfg.label && (
                <span className="text-[10px] text-white/45 font-medium leading-tight line-clamp-2 max-w-[72px]">
                    {label}
                </span>
            )}
        </div>
    );
}

interface AmenityOverviewGaugeProps {
    score: number;
}

export function AmenityOverviewGauge({ score }: AmenityOverviewGaugeProps) {
    const activeColor = '#0EA5E9';
    const [displayScore, setDisplayScore] = React.useState(0);

    React.useEffect(() => {
        let raf = 0;
        const start = performance.now();
        const duration = 1400;
        const tick = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplayScore(Math.round(score * eased));
            if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [score]);

    const tierLabel =
        displayScore >= 80 ? '우수' : displayScore >= 60 ? '양호' : displayScore >= 40 ? '보통' : '검토';
    const tierColor =
        displayScore >= 80 ? '#34d399' : displayScore >= 60 ? '#0EA5E9' : displayScore >= 40 ? '#fbbf24' : '#f87171';

    const radius = 58;
    const circumference = radius * Math.PI * 2;
    const dashOffset = circumference - circumference * (displayScore / 100);

    return (
        <div className="flex flex-col items-center gap-2.5 shrink-0">
            <div className="relative w-36 h-36 flex items-center justify-center">
                <div
                    className="absolute inset-2 rounded-full opacity-35"
                    style={{ boxShadow: `0 0 28px ${activeColor}55` }}
                />
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 144 144">
                    <circle cx="72" cy="72" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                    <circle
                        cx="72"
                        cy="72"
                        r={radius}
                        fill="none"
                        stroke={activeColor}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        style={{ filter: `drop-shadow(0 0 6px ${activeColor}88)` }}
                    />
                </svg>
                <div className="relative z-10 flex flex-col items-center">
                    <span
                        className="text-[34px] font-black text-white leading-none"
                        style={{ textShadow: `0 0 14px ${activeColor}99` }}
                    >
                        {displayScore}
                    </span>
                    <span className="text-[9px] font-bold text-white/55 tracking-[0.2em] mt-1">생활권 점수</span>
                </div>
            </div>
            <span
                className="text-[11px] font-bold px-2.5 py-1 rounded-full border"
                style={{
                    color: tierColor,
                    borderColor: `${tierColor}44`,
                    backgroundColor: `${tierColor}14`,
                }}
            >
                {tierLabel}
            </span>
        </div>
    );
}

export function parseAmenityDistance(value: unknown): number {
    if (value == null) return 99999;
    const parsed = parseInt(String(value).replace(/[^0-9]/g, ''), 10);
    return Number.isNaN(parsed) ? 99999 : parsed;
}

export function distanceToAmenityScore(distanceM: number): number {
    if (distanceM <= 300) return 100;
    if (distanceM <= 500) return 90;
    if (distanceM <= 800) return 80;
    if (distanceM <= 1200) return 68;
    if (distanceM <= 2000) return 52;
    if (distanceM <= 3000) return 38;
    return 22;
}

export function amenityCategoryScore(items: unknown[]): number {
    if (!Array.isArray(items) || items.length === 0) return 0;
    const nearest = Math.min(...items.map((item: any) => parseAmenityDistance(item?.distance)));
    const countBonus = Math.min(items.length * 4, 16);
    return Math.min(100, Math.round(distanceToAmenityScore(nearest) * 0.84 + countBonus));
}

export function amenityOverallScore(scores: number[]): number {
    const valid = scores.filter((s) => s > 0);
    if (valid.length === 0) return 0;
    return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}
