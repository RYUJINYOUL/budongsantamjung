'use client';

import React from 'react';
import AnalysisV31SectionTitle from './AnalysisV31SectionTitle';
import { V31_SHOW_FINANCE_PARTNER_CTA } from '../../../lib/analysisV31Helpers';
import { extractFinalVerdictDetails, extractRiskDetailRows } from '../../../lib/analysisV31Extractors';

type Props = {
  ai: Record<string, unknown>;
  mergedData?: Record<string, unknown> | null;
  category: 'land' | 'building';
};

function scoreBarColor(score: number): string {
  if (score >= 8) return '#97c459';
  if (score >= 6) return '#fac775';
  if (score >= 4) return '#fac775';
  return '#f09595';
}

export default function AnalysisV31RiskSection({ ai, mergedData, category }: Props) {
  const compRisk = (ai['1_comprehensiveRisk'] || {}) as Record<string, unknown>;
  const meta = (ai.analysisMetadata || {}) as Record<string, unknown>;
  const categoryStr = String(mergedData?.category || category);
  const items = extractRiskDetailRows(ai, mergedData, categoryStr);
  const mustCheckObj = ai['6_mustCheckList'] || {};
  const mustCheck = Array.isArray(mustCheckObj) ? mustCheckObj : Object.values(mustCheckObj as object);
  const verdict = extractFinalVerdictDetails(ai);

  const overallScore = typeof compRisk.totalScore === 'number'
    ? compRisk.totalScore
    : (typeof compRisk.score === 'number' ? compRisk.score : 0);

  if (items.length === 0) return null;

  const topItems = [...items].sort((a, b) => b.displayScore - a.displayScore).slice(0, 6);
  const confidenceGrade = String(meta.confidenceGrade || 'C');
  const comparables = Array.isArray(meta.comparables) ? meta.comparables.length : 0;

  return (
    <section id="analysis-v31-risk" className="analysis-v31-section">
      <AnalysisV31SectionTitle
        number="05"
        title="리스크 · 현장확인"
        description={`세부 리스크 ${items.length}항목 · 체크리스트 · AI 한계`}
      />

      <div className="analysis-v31-card">
        <div className="analysis-v31-card-title">세부 리스크 평가 · 점수 + 근거</div>
        <div className="analysis-v31-risk-detail-list">
          {items.map(({ key, label, score, maxWeight, scoreLabel, facts }) => (
            <div key={key} className="analysis-v31-risk-detail-row">
              <div>
                <div className="analysis-v31-risk-detail-name">{label}</div>
                {facts.length > 0 && (
                  <ul className="analysis-v31-risk-detail-facts">
                    {facts.slice(0, 3).map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                )}
                <div className="analysis-v31-risk-detail-bar">
                  <div
                    className="analysis-v31-risk-detail-bar-fill"
                    style={{
                      width: `${Math.min(100, (score / 10) * 100)}%`,
                      backgroundColor: scoreBarColor(score),
                    }}
                  />
                </div>
              </div>
              <div />
              <div className="analysis-v31-risk-detail-score">{scoreLabel}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="analysis-v31-card">
        <div className="analysis-v31-card-title">세부 리스크 · 한눈 요약</div>
        <div className="analysis-v31-risk-score-grid">
          {topItems.map(({ label, score, displayScore, scoreLabel, facts }) => (
            <div key={label} className="analysis-v31-risk-score">
              <div className="analysis-v31-risk-score-num">{displayScore}</div>
              <div>
                <div className="analysis-v31-risk-score-title">{label}</div>
                <div className="analysis-v31-risk-score-desc">{facts[0] || '-'}</div>
                <div className="analysis-v31-risk-bar">
                  <div
                    className="analysis-v31-risk-bar-fill"
                    style={{
                      width: `${Math.min(100, (score / 10) * 100)}%`,
                      backgroundColor: scoreBarColor(score),
                    }}
                  />
                </div>
                <div className="analysis-v31-risk-score-desc">{scoreLabel}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {mustCheck.length > 0 && (
        <div className="analysis-v31-card">
          <div className="analysis-v31-card-title">현장 체크리스트</div>
          <div className="analysis-v31-checklist">
            {mustCheck.map((q, i) => (
              <div key={i} className="analysis-v31-checklist-item">
                <span className="analysis-v31-checklist-box" />
                <span>{String(q)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="analysis-v31-card analysis-v31-ai-limit">
        <div className="analysis-v31-card-title">⚠ AI 분석의 한계</div>
        <div>
          공개 데이터·AI 모델 기반 참고자료. 비교사례 {comparables}건 · 신뢰 {confidenceGrade}
          {Number(meta.conditionRelaxLevel) > 0 ? ` · Level ${meta.conditionRelaxLevel}` : ''} · 공시지가 배율법 적용.
          실제 매매·투자 전 권리관계·규제·현장·인허가·개발비용 반드시 확인.
          금융 연결 시 참고 LTV·담보 맥락이며 승인·금리 확정 아님.
        </div>
      </div>

      {verdict && (
        <details className="analysis-v31-details">
          <summary>최종 판정 · 분석 근거 · 전제 조건 (원문)</summary>
          <div className="analysis-v31-details-body">
            <p><strong>결론: {verdict.verdict}{verdict.grade !== '-' ? ` (등급 ${verdict.grade})` : ''}</strong></p>
            {verdict.reason !== '-' && <p><strong>분석 근거:</strong> {verdict.reason}</p>}
            {verdict.condition && <p><strong>전제 조건:</strong> {verdict.condition}</p>}
            <p>
              <strong>데이터:</strong> {String(meta.method || '공시지가배율')} · 비교사례 {comparables}건 · 신뢰 {confidenceGrade}
              {Number(meta.conditionRelaxLevel) > 0 ? ` · Level ${meta.conditionRelaxLevel}` : ''}.
            </p>
          </div>
        </details>
      )}

      {V31_SHOW_FINANCE_PARTNER_CTA && (
        <div className="analysis-v31-finance-cta">
          <div>
            <h4>대출 상담 희망</h4>
            <p>이 분석 맥락(제시가·추정·리스크·호재)으로 금융 파트너 연결 · opt-in 후 상담</p>
          </div>
          <button type="button" className="analysis-v31-finance-btn">상담 연결하기</button>
        </div>
      )}
    </section>
  );
}
