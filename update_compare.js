const fs = require('fs');
const path = '/Users/cloud/토지지옥/src/app/compare/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Imports
content = content.replace(
  "import { useState } from 'react';",
  "import React, { useState } from 'react';"
);
content = content.replace(
  "import { X, Trophy, AlertCircle, ArrowRight } from 'lucide-react';",
  "import { X, Trophy, AlertCircle, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';\n\nconst BUDGET_CHIPS = [\n  { label: '전체 예산', value: 0 },\n  { label: '3억', value: 30000 },\n  { label: '5억', value: 50000 },\n  { label: '10억', value: 100000 },\n  { label: '20억', value: 200000 },\n  { label: '30억', value: 300000 },\n  { label: '50억', value: 500000 },\n];"
);

// 2. States
content = content.replace(
  "const [error, setError] = useState('');",
  "const [error, setError] = useState('');\n  const [budget, setBudget] = useState<number>(0);\n  const [expandedRow, setExpandedRow] = useState<string | null>(null);"
);

// 3. fetch URL
content = content.replace(
  "const res = await fetch(`http://34.47.121.40/api/land/detective/district-compare?districts=${codes}&names=${names}`);",
  "const res = await fetch(`http://34.47.121.40/api/land/detective/district-compare?districts=${codes}&names=${names}&budget=${budget}`);"
);

// 4. Search UI
const searchUIOld = `        {/* 검색부 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
          <DistrictSearch onSelect={handleSelect} selectedDistricts={selected} />
          
          {error && (
            <div className="flex items-center text-red-600 bg-red-50 p-3 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {selected.map((dist, idx) => (
              <div key={dist.code} className="flex items-center bg-gray-100 rounded-full pl-4 pr-2 py-1.5 shadow-sm border border-gray-200">
                <span className="text-sm font-semibold text-gray-800 mr-2" style={{ color: COLORS[idx] }}>
                  {dist.name}
                </span>
                <button
                  onClick={() => handleRemove(dist.code)}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
            ))}
          </div>`;

const searchUINew = `        {/* 검색부 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
          {error && (
            <div className="flex items-center text-red-600 bg-red-50 p-3 rounded-lg text-sm mb-4">
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-700">시군구 검색 (최대 3개)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {selected.map((dist, idx) => (
                <div key={dist.code} className="flex items-center justify-between bg-gray-50 rounded-xl p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <span className="text-xs font-bold mr-2 text-gray-400">{['①', '②', '③'][idx]}</span>
                    <span className="text-base font-bold text-gray-800" style={{ color: COLORS[idx] }}>
                      {dist.name}
                    </span>
                  </div>
                  <button onClick={() => handleRemove(dist.code)} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              ))}
              
              {selected.length < 3 && (
                <div className="relative rounded-xl shadow-sm border border-gray-200 overflow-visible bg-white min-h-[56px] flex items-center px-2">
                  <DistrictSearch onSelect={handleSelect} selectedDistricts={selected} />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-bold text-gray-700">예산 필터</h3>
            <div className="flex flex-wrap gap-2">
              {BUDGET_CHIPS.map(chip => (
                <button
                  key={chip.value}
                  onClick={() => { setBudget(chip.value); setResult(null); }}
                  className={\`px-4 py-2 rounded-xl text-sm font-semibold transition-colors \${
                    budget === chip.value 
                      ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-500' 
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }\`}
                >
                  {chip.label}{chip.value > 0 ? ' 이하' : ''}
                </button>
              ))}
            </div>
          </div>`;

content = content.replace(searchUIOld, searchUINew);

// 5. Accordion
const accOld = `                      {[
                        { label: '상승률', key: 'appreciation' },
                        { label: '호재', key: 'development' },
                        { label: '거래량', key: 'volume' },
                        { label: '인구', key: 'population' },
                        { label: '학군', key: 'school' },
                        { label: '종합 점수', key: 'total', isTotal: true },
                      ].map((metric) => (
                        <tr key={metric.key} className={metric.isTotal ? "bg-gray-50 font-bold" : "hover:bg-gray-50 transition-colors"}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">{metric.label}</td>
                          {selected.map((dist) => {
                            const val = result.data[dist.code]?.scores[metric.key] || 0;
                            const allVals = selected.map(d => result.data[d.code]?.scores[metric.key] || 0);
                            const isMax = val === Math.max(...allVals) && selected.length > 1 && val > 0;
                            
                            return (
                              <td key={dist.code} className={\`px-4 py-3 whitespace-nowrap text-sm text-right \${isMax ? 'text-indigo-600 font-bold' : 'text-gray-600'}\`}>
                                {val}
                                {metric.isTotal ? '점' : ''}
                              </td>
                            )
                          })}
                        </tr>
                      ))}`;

const accNew = `                      {[
                        { label: '상승률', key: 'appreciation' },
                        { label: '호재', key: 'development' },
                        { label: '거래량', key: 'volume' },
                        { label: '인구', key: 'population' },
                        { label: '학군', key: 'school' },
                        { label: '종합 점수', key: 'total', isTotal: true },
                      ].map((metric) => {
                        const isExpanded = expandedRow === metric.key;
                        
                        return (
                          <React.Fragment key={metric.key}>
                            <tr 
                              onClick={() => !metric.isTotal && setExpandedRow(isExpanded ? null : metric.key)}
                              className={\`\${metric.isTotal ? "bg-gray-50 font-bold" : "hover:bg-gray-50 cursor-pointer transition-colors"} \${isExpanded ? 'bg-indigo-50/30' : ''}\`}
                            >
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium flex items-center">
                                {!metric.isTotal && (
                                  <span className="mr-1 text-gray-400">
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </span>
                                )}
                                {metric.label}
                              </td>
                              {selected.map((dist) => {
                                const val = result.data[dist.code]?.scores[metric.key] || 0;
                                const allVals = selected.map(d => result.data[d.code]?.scores[metric.key] || 0);
                                const isMax = val === Math.max(...allVals) && selected.length > 1 && val > 0;
                                
                                return (
                                  <td key={dist.code} className={\`px-4 py-3 whitespace-nowrap text-sm text-right \${isMax ? 'text-indigo-600 font-bold' : 'text-gray-600'}\`}>
                                    {val}
                                    {metric.isTotal ? '점' : ''}
                                  </td>
                                )
                              })}
                            </tr>
                            
                            {isExpanded && !metric.isTotal && (
                              <tr className="bg-indigo-50/20">
                                <td colSpan={selected.length + 1} className="px-4 py-4 border-t border-indigo-100">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {selected.map((dist, idx) => {
                                      const details = result.data[dist.code]?.details?.[metric.key];
                                      if (!details) return null;
                                      
                                      let detailText = '';
                                      if (metric.key === 'appreciation') {
                                        detailText = \`6개월 \${details.sixMonth > 0 ? '+' : ''}\${details.sixMonth}% / 1년 \${details.oneYear > 0 ? '+' : ''}\${details.oneYear}%\`;
                                      } else if (metric.key === 'development') {
                                        detailText = \`\${details.totalCount}건 (\${details.topItems?.join(', ')} 등)\`;
                                      } else if (metric.key === 'volume') {
                                        detailText = \`최근 \${details.sixMonthCount}건 (전년비 \${details.yoyChange > 0 ? '+' : ''}\${details.yoyChange}%)\`;
                                      } else if (metric.key === 'population') {
                                        detailText = \`순유입 \${details.netMigration > 0 ? '+' : ''}\${details.netMigration}명 (\${details.threeYearTrend})\`;
                                      } else if (metric.key === 'school') {
                                        detailText = \`학급당 \${details.avgStudentsPerClass}명 / 학생수 증감 \${details.studentGrowthRate > 0 ? '+' : ''}\${details.studentGrowthRate}%\`;
                                      }
                                      
                                      return (
                                        <div key={\`detail-\${dist.code}\`} className="flex flex-col space-y-1 p-3 rounded-xl bg-white shadow-sm border border-indigo-100/50">
                                          <span className="text-xs font-bold" style={{ color: COLORS[idx] }}>{dist.name}</span>
                                          <span className="text-sm font-semibold text-gray-700">{detailText}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}`;

content = content.replace(accOld, accNew);

// 6. Update AI Ranking button href
content = content.replace(
  "href={`/?panel=ranking&sigunguCd=${dist.code}&sigunguName=${encodeURIComponent(dist.name)}`}",
  "href={`/?panel=ranking&sigunguCd=${dist.code}&sigunguName=${encodeURIComponent(dist.name)}${budget > 0 ? `&minBudget=0&maxBudget=${budget}` : ''}`}"
);

fs.writeFileSync(path, content, 'utf8');
console.log('Update successful');
