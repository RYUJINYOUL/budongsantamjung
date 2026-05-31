'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

const GRADIENTS: [string, string][] = [
  ['#EDDCD2', '#FFF1E6'],
  ['#C5DEDD', '#DBE7E4'],
  ['#FFF1E6', '#EDDCD2'],
  ['#D6E2E9', '#BCD4E6'],
  ['#FDE2E4', '#FAD2E1'],
  ['#DBE7E4', '#C5DEDD'],
  ['#FAD2E1', '#FDE2E4'],
  ['#BCD4E6', '#D6E2E9'],
  ['#F0EFEB', '#DBE7E4'],
];

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface BubbleItem {
  label: string;
  score: number;
}

interface RiskBubbleChartProps {
  items: BubbleItem[];
  className?: string;
}

function getBaseRadius(score: number, layoutScale = 1) {
  const normalized = score > 10 ? score / 10 : score;
  return (24 + Math.min(Math.max(normalized * 4.5, 0), 45)) * layoutScale;
}

function getLayoutScale(width: number) {
  return width >= 1024 ? 1.38 : 1;
}

function getBubbleCenter(
  i: number,
  n: number,
  width: number,
  height: number,
  animVal: number,
  layoutScale: number,
) {
  const cx = width / 2;
  const cy = height / 2;
  const orbitalRadiusX = width * (layoutScale > 1 ? 0.38 : 0.36);
  const orbitalRadiusY = height * (layoutScale > 1 ? 0.28 : 0.24);
  const angle = i * ((2 * Math.PI) / n) - Math.PI / 2;
  const phase = animVal * 2 * Math.PI + (i * Math.PI) / 3;
  const floatX = Math.sin(phase) * 5;
  const floatY = Math.cos(phase * 1.3) * 5;
  return {
    x: cx + Math.cos(angle) * orbitalRadiusX + floatX,
    y: cy + Math.sin(angle) * orbitalRadiusY + floatY,
  };
}

export default function RiskBubbleChart({ items, className = '' }: RiskBubbleChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef(0);
  const scalesRef = useRef<number[]>(items.map(() => 1));
  const targetScalesRef = useRef<number[]>(items.map(() => 1));
  const selectedRef = useRef<number | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    scalesRef.current = items.map(() => 1);
    targetScalesRef.current = items.map(() => 1);
    selectedRef.current = null;
  }, [items]);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, animVal: number) => {
      ctx.clearRect(0, 0, width, height);
      const n = items.length;
      if (n === 0) return;

      const layoutScale = getLayoutScale(width);

      const drawBubble = (i: number) => {
        const item = items[i];
        const center = getBubbleCenter(i, n, width, height, animVal, layoutScale);
        const scale = scalesRef.current[i] ?? 1;
        const radius = getBaseRadius(item.score, layoutScale) * scale;
        const [c0, c1] = GRADIENTS[i % GRADIENTS.length];

        // Aura
        const aura = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius * 1.5);
        aura.addColorStop(0, hexToRgba(c1, 0.35 + 0.15 * (scale - 1)));
        aura.addColorStop(1, hexToRgba(c1, 0));
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Bubble fill
        const bubbleGrad = ctx.createLinearGradient(center.x - radius, center.y - radius, center.x + radius, center.y + radius);
        bubbleGrad.addColorStop(0, hexToRgba(c0, 0.85));
        bubbleGrad.addColorStop(1, hexToRgba(c1, 0.7));
        ctx.fillStyle = bubbleGrad;
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Border ring
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 1.5 + (scale - 1);
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Score text
        const scoreStr = Number(item.score).toFixed(1);
        const scoreFontSize = Math.min(Math.max(radius * 0.4, 11), layoutScale > 1 ? 28 : 24);
        ctx.font = `900 ${scoreFontSize}px var(--font-noto-sans-kr, sans-serif)`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 1;
        ctx.fillText(scoreStr, center.x, center.y - radius * 0.12);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Label
        const displayLabel =
          scale > 1.25
            ? item.label
            : item.label.length > 5
              ? `${item.label.slice(0, 4)}..`
              : item.label;
        const labelFontSize = Math.min(Math.max(radius * 0.28, 8.5), layoutScale > 1 ? 18 : 16);
        ctx.font = `800 ${labelFontSize}px var(--font-noto-sans-kr, sans-serif)`;
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fillText(displayLabel, center.x, center.y + radius * 0.22);
      };

      const selected = selectedRef.current;
      for (let i = 0; i < n; i++) {
        if (i !== selected) drawBubble(i);
      }
      if (selected !== null && selected < n) drawBubble(selected);
    },
    [items],
  );

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      animRef.current = (animRef.current + 0.0025) % 1;
      for (let i = 0; i < items.length; i++) {
        scalesRef.current[i] += (targetScalesRef.current[i] - scalesRef.current[i]) * 0.16;
      }

      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        const dpr = window.devicePixelRatio || 1;
        const { width, height } = container.getBoundingClientRect();
        if (width > 0 && height > 0) {
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            draw(ctx, width, height, animRef.current);
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw, items.length]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { width, height } = container.getBoundingClientRect();
    const n = items.length;
    let clicked: number | null = null;

    const layoutScale = getLayoutScale(width);

    for (let i = 0; i < n; i++) {
      const center = getBubbleCenter(i, n, width, height, animRef.current, layoutScale);
      const radius = getBaseRadius(items[i].score, layoutScale) * (scalesRef.current[i] ?? 1);
      const dist = Math.hypot(x - center.x, y - center.y);
      if (dist <= radius * 1.35) {
        clicked = i;
        break;
      }
    }

    if (clicked !== null) {
      if (selectedRef.current === clicked) {
        selectedRef.current = null;
        targetScalesRef.current = items.map(() => 1);
      } else {
        selectedRef.current = clicked;
        targetScalesRef.current = items.map((_, i) => (i === clicked ? 1.45 : 1));
      }
    } else {
      selectedRef.current = null;
      targetScalesRef.current = items.map(() => 1);
    }
    setTick(t => t + 1);
  };

  if (items.length === 0) return null;

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none cursor-pointer"
        onPointerDown={handlePointerDown}
      />
    </div>
  );
}
