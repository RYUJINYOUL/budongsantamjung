'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface PremiumRiskGaugeProps {
    score: number;
    size?: 'md' | 'lg' | 'shorts';
}

const SIZE_CONFIG = {
    md: {
        radius: 58,
        box: 'w-36 h-36',
        score: 'text-[34px]',
        label: 'text-[10px] tracking-[0.25em] mt-1',
        stroke: 12,
        glowInset: 'inset-3',
        flashGlow: { outer: 48, inner: 24 },
    },
    lg: {
        radius: 72,
        box: 'w-44 h-44 lg:w-48 lg:h-48',
        score: 'text-[42px] lg:text-[44px]',
        label: 'text-[10px] tracking-[0.25em] mt-1',
        stroke: 12,
        glowInset: 'inset-3',
        flashGlow: { outer: 48, inner: 24 },
    },
    shorts: {
        radius: 72,
        box: 'w-[360px] h-[360px]',
        score: 'text-[96px]',
        label: 'text-[20px] tracking-[0.3em] mt-3',
        stroke: 18,
        glowInset: 'inset-5',
        flashGlow: { outer: 72, inner: 36 },
    },
} as const;

export default function PremiumRiskGauge({ score, size = 'lg' }: PremiumRiskGaugeProps) {
    const activeColor = '#0EA5E9';
    const [displayScore, setDisplayScore] = React.useState(0);
    const [flash, setFlash] = React.useState(false);
    const cfg = SIZE_CONFIG[size];

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

    const radius = cfg.radius;
    const circumference = radius * Math.PI * 2;
    const dashOffset = circumference - circumference * (displayScore / 100);

    const handleTap = () => {
        setFlash(true);
        window.setTimeout(() => setFlash(false), 400);
    };

    return (
        <motion.div
            className="flex flex-col items-center select-none cursor-pointer"
            onClick={handleTap}
            animate={{ scale: flash ? [1, 1.06, 1] : 1 }}
            transition={{ duration: 0.35 }}
        >
            <div className={`relative ${cfg.box} flex items-center justify-center`}>
                <div
                    className={`absolute ${cfg.glowInset} rounded-full transition-opacity duration-300`}
                    style={{
                        opacity: flash ? 0.85 : 0.35,
                        boxShadow: `0 0 ${flash ? cfg.flashGlow.outer : 28}px ${activeColor}55, 0 0 ${flash ? cfg.flashGlow.inner : 12}px rgba(255,255,255,0.15)`,
                    }}
                />
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 192 192">
                    <circle cx="96" cy="96" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={cfg.stroke} />
                    <circle
                        cx="96"
                        cy="96"
                        r={radius}
                        fill="none"
                        stroke={activeColor}
                        strokeWidth={cfg.stroke}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        className="transition-all duration-300 ease-out"
                        style={{ filter: `drop-shadow(0 0 6px ${activeColor}88)` }}
                    />
                </svg>
                <div className="relative z-10 flex flex-col items-center">
                    <span
                        className={`${cfg.score} font-black text-white leading-none`}
                        style={{ textShadow: `0 0 14px ${activeColor}99` }}
                    >
                        {displayScore}
                    </span>
                    <span className={`${cfg.label} font-bold text-white/60`}>AI 종합 평가</span>
                </div>
            </div>
        </motion.div>
    );
}
