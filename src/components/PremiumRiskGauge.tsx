'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface PremiumRiskGaugeProps {
    score: number;
    grade: string;
    size?: 'md' | 'lg';
}

export default function PremiumRiskGauge({ score, grade, size = 'lg' }: PremiumRiskGaugeProps) {
    const activeColor = '#0EA5E9';
    const [displayScore, setDisplayScore] = React.useState(0);
    const [flash, setFlash] = React.useState(false);

    React.useEffect(() => {
        let raf = 0;
        const start = performance.now();
        const duration = 1500;
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
        score >= 80 ? '우수' : score >= 60 ? '양호' : score >= 40 ? '보통' : '검토 필요';
    const tierColor =
        score >= 80 ? '#34d399' : score >= 60 ? '#0EA5E9' : score >= 40 ? '#fbbf24' : '#f87171';

    const radius = size === 'lg' ? 72 : 58;
    const circumference = radius * Math.PI * 2;
    const dashOffset = circumference - circumference * (displayScore / 100);
    const boxClass = size === 'lg' ? 'w-44 h-44 lg:w-48 lg:h-48' : 'w-36 h-36';
    const scoreClass = size === 'lg' ? 'text-[42px] lg:text-[44px]' : 'text-[34px]';

    const handleTap = () => {
        setFlash(true);
        window.setTimeout(() => setFlash(false), 400);
    };

    return (
        <motion.div
            className="flex flex-col items-center gap-3 select-none cursor-pointer"
            onClick={handleTap}
            animate={{ scale: flash ? [1, 1.06, 1] : 1 }}
            transition={{ duration: 0.35 }}
        >
            <div className={`relative ${boxClass} flex items-center justify-center`}>
                <div
                    className="absolute inset-3 rounded-full transition-opacity duration-300"
                    style={{
                        opacity: flash ? 0.85 : 0.35,
                        boxShadow: `0 0 ${flash ? 48 : 28}px ${activeColor}55, 0 0 ${flash ? 24 : 12}px rgba(255,255,255,0.15)`,
                    }}
                />
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 192 192">
                    <circle cx="96" cy="96" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
                    <circle
                        cx="96"
                        cy="96"
                        r={radius}
                        fill="none"
                        stroke={activeColor}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        className="transition-all duration-300 ease-out"
                        style={{ filter: `drop-shadow(0 0 6px ${activeColor}88)` }}
                    />
                </svg>
                <div className="relative z-10 flex flex-col items-center">
                    <span
                        className={`${scoreClass} font-black text-white leading-none`}
                        style={{ textShadow: `0 0 14px ${activeColor}99` }}
                    >
                        {displayScore}
                    </span>
                    <span className="text-[10px] font-bold text-white/60 tracking-[0.25em] mt-1">AI 종합 평가</span>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
                <span
                    className="text-[11px] font-black px-2.5 py-1 rounded-full border"
                    style={{
                        color: tierColor,
                        borderColor: `${tierColor}44`,
                        backgroundColor: `${tierColor}14`,
                    }}
                >
                    {tierLabel}
                </span>
                <span
                    className="text-sm font-black text-white px-3.5 py-1.5 rounded-xl border transition-all duration-300"
                    style={{
                        borderColor: flash ? `${activeColor}88` : `${activeColor}40`,
                        backgroundColor: flash ? `${activeColor}28` : `${activeColor}14`,
                        boxShadow: flash ? `0 0 16px ${activeColor}44` : 'none',
                    }}
                >
                    {grade}
                </span>
            </div>
        </motion.div>
    );
}
