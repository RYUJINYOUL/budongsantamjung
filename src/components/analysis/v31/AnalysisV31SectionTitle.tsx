'use client';

import React from 'react';

type Props = {
  number: string;
  title: string;
  description?: string;
};

export default function AnalysisV31SectionTitle({ number, title, description }: Props) {
  return (
    <div className="analysis-v31-section-title">
      <span className="analysis-v31-section-number">{number}</span>
      <div>
        <h2 className="analysis-v31-section-heading">{title}</h2>
        {description && <p className="analysis-v31-section-desc">{description}</p>}
      </div>
    </div>
  );
}
