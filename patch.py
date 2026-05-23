import sys

filename = 'src/app/analyze/[id]/AnalysisClientPage.tsx'
with open(filename, 'r', encoding='utf-8') as f:
    lines = f.readlines()

out_lines = []
in_report_tab = False
replaced = False

for i, line in enumerate(lines):
    if line.strip() == "} from 'lucide-react';":
        out_lines.append(line)
        out_lines.append("\nimport AiReportView from '../../../components/AiReportView';\n")
        continue

    if line.strip() == "{activeTab === 'report' && (":
        in_report_tab = True
        out_lines.append(line)
        out_lines.append("""                        <motion.div
                            key="report"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <AiReportView 
                                ai={reportData || {}} 
                                mergedData={report || {}} 
                                onTriggerAnalysis={handleAiAnalysisClick}
                                isCheckingAccess={isCheckingAccess}
                            />
                        </motion.div>
                    )}
""")
        replaced = True
        continue
    
    if in_report_tab:
        if line.strip() == "{activeTab === 'land' && (":
            in_report_tab = False
            out_lines.append(line)
    else:
        out_lines.append(line)

with open(filename, 'w', encoding='utf-8') as f:
    f.writelines(out_lines)

print("Done replacing.")
