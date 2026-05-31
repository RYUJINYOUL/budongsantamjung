import fs from 'fs';
import path from 'path';

const src = path.join('src', 'app', 'analyze', '[id]', 'AnalysisClientPage.tsx');
const out = path.join('src', 'lib', 'marketRone.ts');
const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/);
let chunk = lines.slice(287, 875).join('\n');
chunk = chunk
  .replace(/^const sortedSeriesPoints/m, 'export const sortedSeriesPoints')
  .replace(/^const trendFromDelta/m, 'export const trendFromDelta')
  .replace(/^const fmt /m, 'export const fmt ')
  .replace(/^const parseIndicatorSeries/m, 'export const parseIndicatorSeries')
  .replace(/^const parseRecentIndexBenchmark/m, 'export const parseRecentIndexBenchmark')
  .replace(/^interface MarketInsightItem[\s\S]*?\n\}/m, '')
  .replace(/^const generateMarketInsights/m, 'export const generateMarketInsights');

const header = `// R-ONE market indicator helpers

export interface MarketInsightItem {
    label: string;
    compactTitle?: boolean;
    showChangeOnChip?: boolean;
    body: string;
    trend?: string;
    changeLabel?: string;
    subLine?: string;
    headlineValue?: string;
    headlineUnit?: string;
}

`;

fs.writeFileSync(out, header + chunk, 'utf8');
console.log('Wrote', out);
