#!/usr/bin/env node
/**
 * Pilot batch20 — 프론트 노출용 API 메타 검증 (재분석 없음)
 *
 * Usage:
 *   node scripts/verifyBatch20FrontendExposure.js
 *   BACKEND_URL=https://api.tamjung.me node scripts/verifyBatch20FrontendExposure.js
 */
const fs = require('fs');
const path = require('path');

const BACKEND_URL = process.env.BACKEND_URL || 'https://api.tamjung.me';
const SUMMARY_PATH = path.resolve(
  __dirname,
  '../../ddangpago-backend/output/ddangya-analyze-pilot/batch20-last-summary.json',
);

const REPORT_IDS = [
  16896, 16897, 16898, 16899, 16900, 16901, 16902, 16904, 16905, 16906,
  16907, 16908, 16909, 16910, 16911, 16912, 16913, 16914, 16915, 16916,
];

function pickHojae(meta) {
  const opr = meta?.officialPriceRatio || {};
  const obs = opr.observedRatio || meta?.observedRatio || {};
  return {
    hojaeTier: obs.hojaeTier ?? meta.hojaeTier,
    hojaeTierReason: obs.hojaeTierReason ?? meta.hojaeTierReason,
    hojaeTierLabel: obs.hojaeTierLabel ?? meta.hojaeTierLabel,
  };
}

async function fetchReport(id) {
  const res = await fetch(`${BACKEND_URL}/api/land/detective/report/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} report ${id}`);
  const json = await res.json();
  const report = json.report || json;
  const aiRaw = report.ai_summary ?? json.ai_summary;
  const ai = typeof aiRaw === 'string' ? JSON.parse(aiRaw) : aiRaw;
  return { report, ai };
}

async function main() {
  console.log(`\n# Batch20 프론트 노출 데이터 검증 (${REPORT_IDS.length}건)\n`);
  console.log(`Backend: ${BACKEND_URL}\n`);
  console.log('| reportId | marketProof | userMsg | compareDongs | hojaeTier | targetArea | cohort |');
  console.log('| --- | --- | --- | --- | --- | --- | --- |');

  const issues = [];

  for (const id of REPORT_IDS) {
    try {
      const { ai } = await fetchReport(id);
      const meta = ai?.analysisMetadata || {};
      const mp = meta.marketProof || {};
      const hojae = pickHojae(meta);
      const opr = meta.officialPriceRatio || {};
      const hasCohort = ['cohort', 'cohort_relaxed'].includes(String(opr.dynamicStatus || ''));

      const row = [
        id,
        mp.status || '-',
        mp.userMessage ? `${mp.userMessage.length}자` : '없음',
        (mp.compareDongs || []).length,
        hojae.hojaeTier ?? '-',
        meta.targetArea ?? '-',
        hasCohort ? Number(opr.appliedMultiplier || 0).toFixed(2) : '-',
      ].join(' | ');

      console.log(`| ${row} |`);

      if (!mp.userMessage) issues.push(`${id}: marketProof.userMessage 없음`);
      if (!meta.targetArea) issues.push(`${id}: targetArea 없음`);
      if (hasCohort && hojae.hojaeTier == null) {
        issues.push(`${id}: cohort인데 hojaeTier 없음 (UI chip만 생략)`);
      }
    } catch (e) {
      issues.push(`${id}: ${e.message}`);
      console.log(`| ${id} | ERROR | - | - | - | - | - |`);
    }
  }

  console.log('\n## 이슈');
  if (!issues.length) {
    console.log('없음 — API 메타는 프론트 노출 준비 완료');
  } else {
    for (const i of issues) console.log(`- ${i}`);
  }

  if (fs.existsSync(SUMMARY_PATH)) {
    const summary = JSON.parse(fs.readFileSync(SUMMARY_PATH, 'utf8'));
    console.log(`\n로컬 summary: ok=${summary.ok}/${summary.total} (${summary.finishedAt})`);
  }

  console.log('\n로컬 화면 확인: cd 토지지옥 && npm run dev → /analyze/{reportId}');
  console.log('확인 포인트: 가격 스냅샷 하단 marketProof · Tier 유사도 라벨 · 토지 면적 라벨 · 호재 tier chip\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
