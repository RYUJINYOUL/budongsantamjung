'use client';

import type { ReactNode } from 'react';
import { BarChart3, MapPin } from 'lucide-react';
import {
  formatCompareComplexShortName,
  type CompareMetricCard,
  type CompareMetricCardEntry,
} from '../../lib/apartmentCompareMomentumBreakdown';
import { SHORTS_WIDTH, SHORTS_HEIGHT, SHORTS_BG } from '../../lib/shortsSceneData';
import { getCompareScoreCardTitle } from '../../lib/compareScoreCardScenes';
import {
  buildCompareScoreCoverLines,
  COMPARE_SCORE_COVER_SCENE_ID,
  type CompareScoreCoverContext,
} from '../../lib/compareScoreCoverCard';

export type { CompareScoreCoverContext } from '../../lib/compareScoreCoverCard';

function CompareScoreCanvas({
  sceneId,
  label,
  children,
  preview = false,
}: {
  sceneId: number;
  label: string;
  children: ReactNode;
  preview?: boolean;
}) {
  const className =
    'compare-score-native-canvas relative flex flex-col overflow-hidden text-white select-none';
  const style = {
    width: SHORTS_WIDTH,
    height: SHORTS_HEIGHT,
    backgroundColor: SHORTS_BG,
    flexShrink: 0,
  } as const;

  if (preview) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <section
      data-shorts-scene={sceneId}
      data-compare-score-scene={sceneId}
      data-shorts-label={label}
      className={className}
      style={style}
    >
      {children}
    </section>
  );
}

function CompareScoreBrandBar({ aptCount }: { aptCount: number }) {
  return (
    <div className="shrink-0 flex items-center justify-between px-14 pt-14 pb-9 border-b border-white/[0.08]">
      <div className="flex items-center gap-5 min-w-0">
        <div className="w-[72px] h-[72px] shrink-0 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
          <BarChart3 className="w-9 h-9 text-emerald-300" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <p className="text-[40px] font-black tracking-tight leading-none">부동산탐정 아파트 비교</p>
        </div>
      </div>
      <span className="shrink-0 ml-4 text-[32px] font-bold text-white/55 text-right leading-snug">
        {aptCount}개 단지
      </span>
    </div>
  );
}

function CompareScoreFooter() {
  return (
    <div className="shrink-0 mt-auto px-14 py-10 border-t border-white/[0.08] flex justify-between items-center gap-6">
      <span className="text-[33px] text-white font-medium leading-snug">부동산탐정 · 아파트 비교</span>
      <span className="text-[33px] text-white font-semibold shrink-0">www.tamjung.me</span>
    </div>
  );
}

function NativeCompareScoreRing({
  score,
  centerText,
  scoreText,
  color,
  boxSize,
}: {
  score: number;
  centerText: string;
  scoreText?: string | null;
  color: string;
  boxSize: number;
}) {
  const radius = boxSize * 0.38;
  const stroke = Math.max(8, boxSize * 0.045);
  const pct = Math.min(Math.max(score, 0), 100);
  const circumference = radius * Math.PI * 2;
  const dashOffset = circumference - (circumference * pct) / 100;
  const hasDualLine = Boolean(scoreText && centerText !== '—');
  const primaryFontSize = hasDualLine
    ? boxSize * 0.17
    : centerText.length > 4
      ? boxSize * 0.16
      : centerText.length > 3
        ? boxSize * 0.2
        : boxSize * 0.24;

  return (
    <div className="relative shrink-0" style={{ width: boxSize, height: boxSize }}>
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox={`0 0 ${boxSize} ${boxSize}`}>
        <circle
          cx={boxSize / 2}
          cy={boxSize / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <circle
          cx={boxSize / 2}
          cy={boxSize / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={centerText === '—' ? circumference : dashOffset}
          style={{ filter: `drop-shadow(0 0 8px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center px-2">
        <div className="flex flex-col items-center leading-none">
          <span
            className="font-black text-white tabular-nums"
            style={{ fontSize: primaryFontSize }}
          >
            {centerText}
          </span>
          {hasDualLine && (
            <span
              className="font-bold text-white/65 tabular-nums mt-2"
              style={{ fontSize: boxSize * 0.13 }}
            >
              {scoreText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function gridConfig(count: number): { cols: number; ringSize: number; gap: number } {
  if (count <= 1) return { cols: 1, ringSize: 280, gap: 48 };
  if (count === 2) return { cols: 2, ringSize: 260, gap: 56 };
  if (count === 3) return { cols: 3, ringSize: 220, gap: 40 };
  return { cols: 2, ringSize: 220, gap: 48 };
}

function AptRingCell({
  entry,
  ringSize,
  showScoreSuffix,
}: {
  entry: CompareMetricCardEntry;
  ringSize: number;
  showScoreSuffix?: boolean;
}) {
  const displayScore = entry.ring.centerText === '—' ? 0 : entry.ring.ringScore;
  const centerText =
    showScoreSuffix && entry.ring.centerText !== '—' && !entry.ring.scoreText
      ? `${entry.ring.centerText}점`
      : entry.ring.centerText;

  return (
    <div className="flex flex-col items-center gap-6 min-w-0">
      <NativeCompareScoreRing
        score={displayScore}
        centerText={centerText}
        scoreText={entry.ring.scoreText}
        color={entry.ring.color}
        boxSize={ringSize}
      />
      <p
        className="text-[36px] font-black text-white/80 text-center leading-tight break-keep max-w-full"
        style={{ wordBreak: 'keep-all' }}
      >
        {formatCompareComplexShortName(entry.complexName)}
      </p>
    </div>
  );
}

const SCENE_ID_BY_KEY: Record<string, number> = {
  total: 1,
  cagr3y: 2,
  yoy1y: 3,
  rise6m: 4,
  upside: 5,
  livability: 6,
  risk: 7,
};

function coverFontSize(text: string, base: number, min: number) {
  const len = text.length;
  if (len > 36) return min;
  if (len > 28) return base * 0.82;
  if (len > 20) return base * 0.9;
  return base;
}

export function CompareScoreCoverScene({
  cover,
  preview = false,
}: {
  cover: CompareScoreCoverContext;
  preview?: boolean;
}) {
  const lines = buildCompareScoreCoverLines(cover);
  if (!lines) return null;

  const aptCount = cover.complexNames.length;
  const aptFontSize = coverFontSize(lines.aptLine, 52, 36);
  const workplaceFontSize = lines.workplaceLine ? coverFontSize(lines.workplaceLine, 48, 34) : 48;
  const commuteFontSize = 56;

  return (
    <CompareScoreCanvas sceneId={COMPARE_SCORE_COVER_SCENE_ID} label="표지" preview={preview}>
      <CompareScoreBrandBar aptCount={aptCount} />
      <div className="flex-1 flex flex-col items-center justify-center px-14 min-h-0 text-center">
        <div className="w-full max-w-[920px] flex flex-col items-center gap-6">
          {lines.workplaceLine && (
            <div className="flex items-center justify-center gap-4">
              <MapPin className="w-10 h-10 text-emerald-400 shrink-0" strokeWidth={2.2} />
              <p
                className="font-black text-white leading-tight break-keep"
                style={{ fontSize: workplaceFontSize, wordBreak: 'keep-all' }}
              >
                {lines.workplaceLine}
              </p>
            </div>
          )}

          {lines.commuteLine && (
            <p
              className="font-black text-emerald-300 leading-none tracking-tight"
              style={{ fontSize: commuteFontSize }}
            >
              {lines.commuteLine}
            </p>
          )}

          <div className="w-full rounded-[32px] border border-white/10 bg-white/[0.03] px-10 py-12">
            <p
              className="font-black text-white leading-[1.35] break-keep"
              style={{ fontSize: aptFontSize, wordBreak: 'keep-all' }}
            >
              {lines.aptLine}
            </p>
          </div>

          <p className="text-[44px] font-black text-white/75 tracking-[0.2em]">{lines.suffix}</p>
        </div>
      </div>
      <CompareScoreFooter />
    </CompareScoreCanvas>
  );
}

export function CompareScoreMetricScene({
  card,
  preview = false,
}: {
  card: CompareMetricCard;
  preview?: boolean;
}) {
  const sceneId = SCENE_ID_BY_KEY[card.metric.key] ?? 0;
  const cardTitle = getCompareScoreCardTitle(card.metric.key, card.metric.label);
  const { cols, ringSize, gap } = gridConfig(card.entries.length);

  return (
    <CompareScoreCanvas sceneId={sceneId} label={cardTitle} preview={preview}>
      <CompareScoreBrandBar aptCount={card.entries.length} />
      <div className="flex-1 flex flex-col justify-center px-12 min-h-0">
        <div className="text-center mb-10">
          <p className="text-[52px] font-black text-white leading-tight tracking-tight">{cardTitle}</p>
        </div>
        <div
          className="mx-auto w-full max-w-[920px] grid place-items-center"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap,
          }}
        >
          {card.entries.map((entry) => (
            <AptRingCell
              key={entry.aptKey}
              entry={entry}
              ringSize={ringSize}
              showScoreSuffix={card.metric.group !== 'momentum'}
            />
          ))}
        </div>
      </div>
      <CompareScoreFooter />
    </CompareScoreCanvas>
  );
}

export default function CompareScoreNativeFrames({
  metricCards,
  cover,
}: {
  metricCards: CompareMetricCard[];
  cover?: CompareScoreCoverContext | null;
}) {
  return (
    <>
      {cover && buildCompareScoreCoverLines(cover) && (
        <CompareScoreCoverScene cover={cover} />
      )}
      {metricCards.map((card) => (
        <CompareScoreMetricScene key={card.metric.key} card={card} />
      ))}
    </>
  );
}
