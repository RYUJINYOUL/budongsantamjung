'use client';

import React from 'react';
import { resolveReportHeader } from '../../../lib/analysisV31Extractors';

type Props = {
  ai: Record<string, unknown>;
  mergedData?: Record<string, unknown> | null;
  category: 'land' | 'building';
  reportId?: string;
};

export default function AnalysisV31Header({ ai, mergedData, category, reportId }: Props) {
  const h = resolveReportHeader(ai, mergedData, reportId);

  return (
    <header className="analysis-v31-page-header">
      <div className="analysis-v31-breadcrumb">{h.breadcrumb}</div>
      <div className="analysis-v31-title-row">
        <div>
          <h1 className="analysis-v31-title">{h.title}</h1>
          {h.subtitle && <div className="analysis-v31-address">{h.subtitle}</div>}
        </div>
        <div className="analysis-v31-updated">{h.updated}</div>
      </div>
    </header>
  );
}
