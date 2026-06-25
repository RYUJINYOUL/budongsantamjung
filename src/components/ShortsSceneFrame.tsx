'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface ShortsSceneFrameProps {
    sceneId: number;
    label: string;
    children: ReactNode;
}

const FRAME_PAD = 28;

/** 쇼츠 9:16 (1080×1920 비율) 미리보기·캡처 프레임 — 내용이 넘치면 자동 축소 */
export default function ShortsSceneFrame({ sceneId, label, children }: ShortsSceneFrameProps) {
    const frameRef = useRef<HTMLElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const fit = () => {
            const frame = frameRef.current;
            const inner = innerRef.current;
            if (!frame || !inner) return;

            inner.style.transform = 'none';
            inner.style.width = '100%';

            const availableH = frame.clientHeight - FRAME_PAD * 2;
            const contentH = inner.scrollHeight;
            const contentW = inner.scrollWidth;
            const availableW = frame.clientWidth - FRAME_PAD * 2;

            if (contentH <= 0) return;

            const scaleH = availableH / contentH;
            const scaleW = contentW > availableW ? availableW / contentW : 1;
            const next = Math.min(1, scaleH, scaleW);
            setScale(Number(next.toFixed(4)));
        };

        fit();
        const ro = new ResizeObserver(() => fit());
        if (frameRef.current) ro.observe(frameRef.current);
        if (innerRef.current) ro.observe(innerRef.current);

        const t = setTimeout(fit, 400);
        const t2 = setTimeout(fit, 1500);

        return () => {
            ro.disconnect();
            clearTimeout(t);
            clearTimeout(t2);
        };
    }, [children]);

    return (
        <section
            ref={frameRef}
            data-shorts-scene={sceneId}
            data-shorts-label={label}
            className="relative w-full aspect-[9/16] max-h-[min(100vh,960px)] bg-[#0a0a0c] overflow-hidden rounded-[24px] border border-white/[0.1] shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
        >
            <div
                className="absolute inset-0 flex items-start justify-center overflow-hidden"
                style={{ padding: FRAME_PAD }}
            >
                <div
                    ref={innerRef}
                    className="w-full origin-top"
                    style={{
                        transform: scale < 1 ? `scale(${scale})` : undefined,
                        transformOrigin: 'top center',
                    }}
                >
                    {children}
                </div>
            </div>
        </section>
    );
}
