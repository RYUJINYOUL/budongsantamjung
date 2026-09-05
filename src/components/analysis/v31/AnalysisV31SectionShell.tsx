'use client';

import React from 'react';
import AnalysisV31SectionTitle from './AnalysisV31SectionTitle';
import type { V31SectionMeta } from '../../../lib/analysisV31Helpers';

type Props = {
  id: string;
  meta: V31SectionMeta;
  orderClass?: string;
  children: React.ReactNode;
};

export default function AnalysisV31SectionShell({ id, meta, orderClass, children }: Props) {
  return (
    <section
      id={id}
      className={`analysis-v31-section analysis-v31-section-shell${orderClass ? ` ${orderClass}` : ''}`}
    >
      <AnalysisV31SectionTitle
        number={meta.number}
        title={meta.title}
        description={meta.description}
      />
      {children}
    </section>
  );
}
