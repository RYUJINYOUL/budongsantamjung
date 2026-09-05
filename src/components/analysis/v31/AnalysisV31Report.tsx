'use client';

import React from 'react';
import AnalysisV31BenefitSection from './AnalysisV31BenefitSection';
import AnalysisV31DetectiveHero from './AnalysisV31DetectiveHero';
import AnalysisV31DevelopmentSection from './AnalysisV31DevelopmentSection';
import AnalysisV31Footer from './AnalysisV31Footer';
import AnalysisV31Header from './AnalysisV31Header';
import AnalysisV31MarketSection from './AnalysisV31MarketSection';
import AnalysisV31Nav from './AnalysisV31Nav';
import AnalysisV31PriceSection from './AnalysisV31PriceSection';
import AnalysisV31RiskSection from './AnalysisV31RiskSection';
import AnalysisV31Summary from './AnalysisV31Summary';
import {
  BUILDING_V31_NAV,
  LAND_V31_NAV,
} from '../../../lib/analysisV31Helpers';
import './analysis-v31.css';

type Props = {
  ai: any;
  mergedData?: Record<string, unknown> | null;
  analysisMetadata?: Record<string, unknown> | null;
  category: 'land' | 'building';
  reportId?: string;
};

export default function AnalysisV31Report({
  ai,
  mergedData,
  analysisMetadata,
  category,
  reportId,
}: Props) {
  const navItems = category === 'building' ? BUILDING_V31_NAV : LAND_V31_NAV;

  return (
    <div className="analysis-v31">
      <AnalysisV31Header
        ai={ai}
        mergedData={mergedData}
        category={category}
        reportId={reportId}
      />
      <AnalysisV31DetectiveHero ai={ai} mergedData={mergedData} />
      <AnalysisV31Summary
        ai={ai}
        mergedData={mergedData}
        analysisMetadata={analysisMetadata}
        category={category}
      />
      <AnalysisV31Nav items={navItems} />
      <div className="analysis-v31-body">
        <AnalysisV31PriceSection
          ai={ai}
          mergedData={mergedData}
          analysisMetadata={analysisMetadata}
          category={category}
        />
        <AnalysisV31DevelopmentSection
          ai={ai}
          mergedData={mergedData}
          analysisMetadata={analysisMetadata}
          category={category}
        />
        <AnalysisV31BenefitSection
          ai={ai}
          mergedData={mergedData}
          analysisMetadata={analysisMetadata}
          category={category}
        />
        <AnalysisV31MarketSection
          ai={ai}
          mergedData={mergedData}
          analysisMetadata={analysisMetadata}
          category={category}
        />
        <AnalysisV31RiskSection
          ai={ai}
          mergedData={mergedData}
          category={category}
        />
        <AnalysisV31Footer
          ai={ai}
          mergedData={mergedData}
          analysisMetadata={analysisMetadata}
        />
      </div>
    </div>
  );
}
